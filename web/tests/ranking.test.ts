import test from "node:test";
import assert from "node:assert/strict";
import {
  MIN_RANK_MULTIPLE,
  PRIZE_SPLIT_USDT,
  WEEKLY_PRIZE_POOL_USDT,
  formatCountdown,
  myRank,
  openSlots,
  rankRows,
  seasonWindow,
  withinSeason,
  type RankEntry,
} from "../lib/ranking";

const entry = (over: Partial<RankEntry> & { key: string; valueUsdt: number; price: number; at: string }): RankEntry => ({
  who: "u_test***",
  boxSlug: "dollar-apple",
  itemId: "i1",
  mine: false,
  ...over,
});

test("상금 분배 합계는 총 상금 풀과 같다", () => {
  assert.equal(PRIZE_SPLIT_USDT.reduce((a, b) => a + b, 0), WEEKLY_PRIZE_POOL_USDT);
});

test("시즌 구간은 UTC 월요일 00:00 에서 시작해 정확히 7일", () => {
  // 2026-09-23 은 수요일
  const w = seasonWindow(Date.UTC(2026, 8, 23, 13, 30));
  assert.equal(new Date(w.startsAt).toISOString(), "2026-09-21T00:00:00.000Z");
  assert.equal(w.endsAt - w.startsAt, 7 * 24 * 60 * 60 * 1000);
  // 월요일 자정 직후는 그 주의 시작점 그대로
  assert.equal(seasonWindow(Date.UTC(2026, 8, 21, 0, 0, 1)).startsAt, w.startsAt);
  // 일요일 23:59 도 같은 시즌
  assert.equal(seasonWindow(Date.UTC(2026, 8, 27, 23, 59)).startsAt, w.startsAt);
  // 다음 월요일은 다음 시즌
  assert.equal(seasonWindow(Date.UTC(2026, 8, 28, 0, 0)).startsAt, w.endsAt);
});

test("카운트다운 포맷 — D-일 HH:MM:SS, 음수는 0 으로", () => {
  assert.equal(formatCountdown((2 * 86400 + 14 * 3600 + 22 * 60 + 5) * 1000), "D-2 14:22:05");
  assert.equal(formatCountdown(0), "D-0 00:00:00");
  assert.equal(formatCountdown(-5000), "D-0 00:00:00");
});

test("시즌 밖 기록은 랭킹에 들어오지 않는다", () => {
  const season = seasonWindow(Date.UTC(2026, 8, 23));
  const kept = withinSeason(
    [
      entry({ key: "in", valueUsdt: 1000, price: 1, at: "2026-09-22T10:00:00.000Z" }),
      entry({ key: "before", valueUsdt: 1000, price: 1, at: "2026-09-20T10:00:00.000Z" }),
      entry({ key: "after", valueUsdt: 1000, price: 1, at: "2026-09-30T10:00:00.000Z" }),
      entry({ key: "bad", valueUsdt: 1000, price: 1, at: "not-a-date" }),
    ],
    season,
  );
  assert.deepEqual(kept.map((e) => e.key), ["in"]);
});

test("바닥 캐시백(하한 미만)은 상위권을 도배하지 못한다", () => {
  const rows = rankRows([
    entry({ key: "cashback1", valueUsdt: 46, price: 50, at: "2026-09-22T01:00:00.000Z" }),
    entry({ key: "cashback2", valueUsdt: 0.85, price: 1, at: "2026-09-22T02:00:00.000Z" }),
    entry({ key: "jackpot", valueUsdt: 129, price: 1, at: "2026-09-22T03:00:00.000Z" }),
  ]);
  assert.deepEqual(rows.map((r) => r.key), ["jackpot"]);
  assert.equal(rows[0].rank, 1);
  assert.equal(rows[0].prizeUsdt, PRIZE_SPLIT_USDT[0]);
  assert.ok(129 / 1 >= MIN_RANK_MULTIPLE);
});

test("랭킹은 배수 내림차순, 동률이면 가치·시각 순", () => {
  const rows = rankRows([
    entry({ key: "a", valueUsdt: 200, price: 1, at: "2026-09-22T03:00:00.000Z" }),
    entry({ key: "b", valueUsdt: 4000, price: 20, at: "2026-09-22T01:00:00.000Z" }), // 200x, 가치 더 큼
    entry({ key: "c", valueUsdt: 1500, price: 1, at: "2026-09-22T02:00:00.000Z" }), // 1500x
  ]);
  assert.deepEqual(rows.map((r) => r.key), ["c", "b", "a"]);
  assert.deepEqual(rows.map((r) => r.rank), [1, 2, 3]);
});

test("남은 자리는 가짜 당첨자 대신 공석으로 열린다", () => {
  assert.deepEqual(openSlots(0).map((s) => s.rank), [1, 2, 3, 4, 5]);
  assert.deepEqual(openSlots(3).map((s) => s.prizeUsdt), [PRIZE_SPLIT_USDT[3], PRIZE_SPLIT_USDT[4]]);
  assert.deepEqual(openSlots(5), []);
});

test("내 순위 — 랭크에 있으면 그 순위, 없으면 마지막 뒤, 기록 없으면 null", () => {
  const rows = rankRows([
    entry({ key: "mine", valueUsdt: 129, price: 1, at: "2026-09-22T03:00:00.000Z", mine: true }),
    entry({ key: "other", valueUsdt: 5000, price: 1, at: "2026-09-22T01:00:00.000Z" }),
  ]);
  assert.equal(myRank(rows, 129), 1 + rows.findIndex((r) => r.mine));
  assert.equal(myRank([], 0), null);
  assert.equal(myRank([], 5), 1);
});
