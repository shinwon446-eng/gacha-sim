// 데일리 프리 박스 — 확률표·쿨다운·구간 매핑
import test from "node:test";
import assert from "node:assert/strict";
import { DAILY_COOLDOWN_MS, DAILY_MAX_USDT, DAILY_MIN_USDT, DAILY_REWARDS, canOpenDaily, dailyExpectedValue, formatCountdown, nextAvailableAt, rewardForRoll } from "../lib/dailyBox";
import { ROLL_RANGE, rollRanges } from "../lib/fairness";

test("확률표 합 100, 보상 0.1 ~ 1.0 USDT, 기대값 < 0.3", () => {
  assert.equal(DAILY_REWARDS.reduce((s, r) => s + r.dropRate, 0), 100);
  for (const r of DAILY_REWARDS) assert.ok(r.amount >= DAILY_MIN_USDT && r.amount <= DAILY_MAX_USDT);
  assert.ok(dailyExpectedValue() < 0.3, String(dailyExpectedValue()));
  assert.doesNotThrow(() => rollRanges(DAILY_REWARDS));
});

test("롤 → 보상: 구간 경계가 확률표와 일치한다", () => {
  assert.equal(rewardForRoll(0).amount, 0.1);
  assert.equal(rewardForRoll(449_999).amount, 0.1);
  assert.equal(rewardForRoll(450_000).amount, 0.2);
  assert.equal(rewardForRoll(ROLL_RANGE - 1).amount, 1.0);
  assert.equal(rewardForRoll(ROLL_RANGE - 30_000).amount, 1.0);
  assert.equal(rewardForRoll(ROLL_RANGE - 30_001).amount, 0.7);
});

test("24h 쿨다운: 처음엔 열 수 있고, 연 뒤 24시간 전까지 잠긴다", () => {
  assert.ok(canOpenDaily(null));
  const at = new Date(1_800_000_000_000).toISOString();
  assert.equal(nextAvailableAt(at), 1_800_000_000_000 + DAILY_COOLDOWN_MS);
  assert.ok(!canOpenDaily(at, 1_800_000_000_000 + DAILY_COOLDOWN_MS - 1));
  assert.ok(canOpenDaily(at, 1_800_000_000_000 + DAILY_COOLDOWN_MS));
  assert.equal(formatCountdown(3_661_000), "01:01:01");
  assert.equal(formatCountdown(-5), "00:00:00");
});
