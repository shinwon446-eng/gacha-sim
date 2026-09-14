// 엔진 단위/통계 테스트 — Node 내장 러너 (타입 스트리핑 사용, Node 22.18+ / 24)
//   npm test
import test from "node:test";
import assert from "node:assert/strict";
import {
  runPulls,
  lineProbWith,
  effectiveItems,
  tierFor,
  isBoosterActive,
  pickWeightedAdjusted,
  BOOSTER_THRESHOLD,
  BOOST_MULT,
} from "../lib/engine.ts";
import { getBox, BOXES } from "../lib/data.ts";
import { itemLine, lineOf, LINE_ORDER } from "../lib/types.ts";
import { lineProbabilities, topItem } from "../lib/rng.ts";

const box = getBox("ps5-pro-drop");

/** 재현 가능한 난수 (xorshift) */
function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

test("모든 박스의 가중치 합이 100", () => {
  for (const b of BOXES) {
    const sum = b.items.reduce((s, i) => s + i.weight, 0);
    assert.ok(Math.abs(sum - 100) < 1e-6, `${b.id} 가중치 합 ${sum}`);
  }
});

test("라인업은 실판매가에서 결정적으로 파생된다", () => {
  assert.equal(lineOf(99990), "jackpot");
  assert.equal(lineOf(700), "jackpot");
  assert.equal(lineOf(699), "value");
  assert.equal(lineOf(100), "value");
  assert.equal(lineOf(99), "start");
});

test("모든 박스가 3개 라인업을 모두 포함한다", () => {
  for (const b of BOXES) {
    const lines = new Set(b.items.map(itemLine));
    for (const l of LINE_ORDER) assert.ok(lines.has(l), `${b.id} 에 ${l} 없음`);
  }
});

test("라인별 확률 합이 100%", () => {
  for (const b of BOXES) {
    const p = lineProbabilities(b);
    const sum = p.jackpot + p.value + p.start;
    assert.ok(Math.abs(sum - 100) < 1e-6, `${b.id} 합 ${sum}`);
  }
});

test("부스터: 10회 도달 시 활성화, 발동 후 0으로 리셋", () => {
  const rand = seeded(42);
  let state = { pityCount: 0, totalSpent: 0 };
  const seen: number[] = [];
  let firedAt = -1;

  for (let i = 0; i < 11; i++) {
    const r = runPulls(box, 1, state, rand);
    state = { pityCount: r.pityCount, totalSpent: 0 };
    seen.push(r.pityCount);
    if (r.boosterTriggered && firedAt < 0) firedAt = i;
  }
  assert.equal(seen[9], BOOSTER_THRESHOLD, "10번째 개봉 후 게이지 만충");
  assert.equal(isBoosterActive(seen[9]), true);
  assert.equal(firedAt, 10, "11번째 개봉에서 부스터 발동");
  assert.equal(seen[10], 0, "발동 후 게이지 리셋");
});

test("부스터: [초대박 라인업] 가중치가 정확히 5배", () => {
  const base = effectiveItems(box.items, { boost: false, tierMult: 1 });
  const boosted = effectiveItems(box.items, { boost: true, tierMult: 1 });
  for (let i = 0; i < base.length; i++) {
    const expected = itemLine(base[i].item) === "jackpot" ? base[i].w * BOOST_MULT : base[i].w;
    assert.equal(boosted[i].w, expected, base[i].item.id);
  }
});

test("부스터: 확률 상승 — 가중치 5배이므로 확률 배율은 5배 미만", () => {
  const b = lineProbWith(box, "jackpot", { boost: false, tierMult: 1 });
  const a = lineProbWith(box, "jackpot", { boost: true, tierMult: 1 });
  assert.ok(a > b, "부스트 시 확률 상승");
  assert.ok(a / b < BOOST_MULT, `실제 배율 ${(a / b).toFixed(2)}x 는 ${BOOST_MULT}배 미만이어야 한다`);
});

test("등급 배율: 누적 결제액에 따라 Bronze→VIP", () => {
  assert.equal(tierFor(0).name, "Bronze");
  assert.equal(tierFor(300).name, "Silver");
  assert.equal(tierFor(1000).name, "Gold");
  assert.equal(tierFor(5000).name, "VIP");
  assert.ok(tierFor(5000).mult > tierFor(0).mult);
});

test("통계: 부스트 표본의 [초대박] 출현율이 공시 확률과 일치 (N=200k)", () => {
  const N = 200_000;
  const rate = (boost: boolean) => {
    const rand = seeded(boost ? 7 : 13);
    let hit = 0;
    for (let i = 0; i < N; i++) {
      if (itemLine(pickWeightedAdjusted(box.items, { boost, tierMult: 1 }, rand)) === "jackpot") hit++;
    }
    return hit / N;
  };
  const base = rate(false);
  const boosted = rate(true);
  const expected = lineProbWith(box, "jackpot", { boost: true, tierMult: 1 }) / 100;
  assert.ok(boosted > base, `base=${(base * 100).toFixed(2)}% boosted=${(boosted * 100).toFixed(2)}%`);
  assert.ok(Math.abs(boosted - expected) < 0.01, `기대 ${(expected * 100).toFixed(2)}% vs 실측 ${(boosted * 100).toFixed(2)}%`);
});

test("데모 노출 상품은 데모 박스의 1등 상품이며 [초대박 라인업]이다", () => {
  const demo = getBox("cybertruck-beast");
  const prize = topItem(demo);
  assert.equal(itemLine(prize), "jackpot");
  assert.equal(prize.value, Math.max(...demo.items.map((i) => i.value)));
});

test("10연속 개봉은 정확히 10개를 반환한다", () => {
  const r = runPulls(box, 10, { pityCount: 0, totalSpent: 0 }, seeded(99));
  assert.equal(r.items.length, 10);
});
