// 엔진 단위/통계 테스트 — Node 내장 러너 (타입 스트리핑 사용, Node 22.18+ / 24)
//   npm test
import test from "node:test";
import assert from "node:assert/strict";
import {
  runPulls,
  tierProbWith,
  effectiveItems,
  tierFor,
  isBoosterActive,
  pickWeightedAdjusted,
  BOOSTER_THRESHOLD,
  BOOST_MULT,
  TRIAL_POOL,
} from "../lib/engine.ts";
import { getBox, BOXES } from "../lib/data.ts";

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

test("pity: 10회 도달 시 부스터 활성화, 발동 후 0으로 리셋", () => {
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
  assert.equal(seen[9], BOOSTER_THRESHOLD, "10번째 뽑기 후 게이지 만충");
  assert.equal(isBoosterActive(seen[9]), true);
  assert.equal(firedAt, 10, "11번째 뽑기에서 부스터 발동");
  assert.equal(seen[10], 0, "발동 후 게이지 리셋");
});

test("부스터: 상위 등급 가중치가 정확히 5배", () => {
  const base = effectiveItems(box.items, { boost: false, tierMult: 1 });
  const boosted = effectiveItems(box.items, { boost: true, tierMult: 1 });
  for (let i = 0; i < base.length; i++) {
    const tier = base[i].item.tier;
    const expected = tier === "SSR" || tier === "SR" ? base[i].w * BOOST_MULT : base[i].w;
    assert.equal(boosted[i].w, expected, `${base[i].item.id} (${tier})`);
  }
});

test("부스터: SSR 확률이 상승한다 (가중치 5배 → 확률은 5배 미만)", () => {
  const b = tierProbWith(box, "SSR", { boost: false, tierMult: 1 });
  const a = tierProbWith(box, "SSR", { boost: true, tierMult: 1 });
  assert.ok(a > b, "부스트 시 SSR 확률 상승");
  const ratio = a / b;
  // 분모(전체 가중치)도 함께 커지므로 배율은 5배에 근접하되 그보다 작다
  assert.ok(ratio > 4 && ratio < BOOST_MULT, `실제 배율 ${ratio.toFixed(2)}x`);
});

test("등급 배율: 누적 결제액에 따라 Bronze→VIP", () => {
  assert.equal(tierFor(0).name, "Bronze");
  assert.equal(tierFor(300).name, "Silver");
  assert.equal(tierFor(1000).name, "Gold");
  assert.equal(tierFor(5000).name, "VIP");
  assert.ok(tierFor(5000).mult > tierFor(0).mult);
});

test("통계: 부스트 표본의 상위 등급 출현율이 유의하게 높다 (N=200k)", () => {
  const N = 200_000;
  const count = (boost: boolean) => {
    const rand = seeded(boost ? 7 : 13);
    let top = 0;
    for (let i = 0; i < N; i++) {
      const t = pickWeightedAdjusted(box.items, { boost, tierMult: 1 }, rand).tier;
      if (t === "SSR" || t === "SR") top++;
    }
    return top / N;
  };
  const base = count(false);
  const boosted = count(true);
  const expected = tierProbWith(box, "SSR", { boost: true, tierMult: 1 }) / 100 +
    tierProbWith(box, "SR", { boost: true, tierMult: 1 }) / 100;
  assert.ok(boosted > base * 3, `base=${(base * 100).toFixed(2)}% boosted=${(boosted * 100).toFixed(2)}%`);
  assert.ok(Math.abs(boosted - expected) < 0.01, `기대 ${(expected * 100).toFixed(2)}% vs 실측 ${(boosted * 100).toFixed(2)}%`);
});

test("게스트 체험 풀: 꽝 없음 + 가중치 합 100", () => {
  assert.equal(TRIAL_POOL.reduce((s, i) => s + i.weight, 0), 100);
  assert.ok(TRIAL_POOL.every((i) => i.value > 0), "모든 항목이 실제 가치를 가진다");
});

test("10연속 뽑기는 정확히 10개를 반환한다", () => {
  const r = runPulls(box, 10, { pityCount: 0, totalSpent: 0 }, seeded(99));
  assert.equal(r.items.length, 10);
});
