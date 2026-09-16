// 글로벌 가챠 규칙 — 확률·가격·난수
//   npm test
import test from "node:test";
import assert from "node:assert/strict";
import { GACHA_ITEMS, itemsByTier } from "../src/data/gachaItems";
import {
  PULL_PRICE_USDT,
  TARGET_RTP,
  TIER_ORDER,
  TIER_SHARE,
  breakEvenUsdt,
  expectedValueUsdt,
  oddsTable,
  pickGachaItem,
  secureUnit,
} from "../src/data/gachaRules";

test("등급 총 확률 합 100, 항목 확률 합 100, 등급 안에서 균등", () => {
  assert.ok(Math.abs(TIER_ORDER.reduce((s, t) => s + TIER_SHARE[t], 0) - 100) < 1e-9);
  const table = oddsTable();
  assert.equal(table.length, GACHA_ITEMS.length);
  assert.ok(Math.abs(table.reduce((s, o) => s + o.probability, 0) - 100) < 1e-9);
  for (const t of TIER_ORDER) {
    const rows = table.filter((o) => o.item.tier === t);
    const each = TIER_SHARE[t] / itemsByTier(t).length;
    for (const r of rows) assert.ok(Math.abs(r.probability - each) < 1e-12, r.item.id);
  }
});

test("가격은 EV 에서 역산되며 현금 회수 기준 차익이 없다", () => {
  const ev = expectedValueUsdt();
  assert.ok(PULL_PRICE_USDT % 5 === 0, "5 단위");
  assert.ok(PULL_PRICE_USDT >= ev / TARGET_RTP, `가격 ${PULL_PRICE_USDT} < EV/rtp ${ev / TARGET_RTP}`);
  assert.ok(ev < PULL_PRICE_USDT, "EV 가 가격 이상");
  assert.ok(ev * 0.8 < PULL_PRICE_USDT, "80% 환급 기준 차익");
  const r = breakEvenUsdt();
  assert.ok(r > 0 && r < 100, `가격 이상 확률 ${r}`);
});

test("pickGachaItem 은 확률표 경계에서 올바른 항목을 고른다", () => {
  const table = oddsTable();
  assert.equal(pickGachaItem(() => 0).id, table[0].item.id);
  assert.equal(pickGachaItem(() => 0.999999).id, table[table.length - 1].item.id);
  // 첫 항목 확률 바로 뒤는 두 번째 항목
  const edge = table[0].probability / 100 + 1e-9;
  assert.equal(pickGachaItem(() => edge).id, table[1].item.id);
});

test("표본 20만 회에서 등급 출현율이 공시 확률과 일치한다", () => {
  const N = 200_000;
  const count: Record<string, number> = { S: 0, A: 0, B: 0, C: 0 };
  // 결정적 저불일치 수열(골든 비율)로 편향 없이 훑는다
  let x = 0.123456789;
  const rand = () => (x = (x + 0.6180339887498949) % 1);
  for (let i = 0; i < N; i++) count[pickGachaItem(rand).tier] += 1;
  for (const t of TIER_ORDER) {
    const got = (count[t] / N) * 100;
    const tol = Math.max(0.05, TIER_SHARE[t] * 0.08);
    assert.ok(Math.abs(got - TIER_SHARE[t]) <= tol, `${t}: ${got.toFixed(3)}% vs ${TIER_SHARE[t]}% (±${tol})`);
  }
});

test("secureUnit 은 [0,1) 이며 Math.random 을 쓰지 않는다", () => {
  const orig = Math.random;
  Math.random = () => {
    throw new Error("Math.random 호출됨");
  };
  try {
    for (let i = 0; i < 1000; i++) {
      const u = secureUnit();
      assert.ok(u >= 0 && u < 1, String(u));
    }
  } finally {
    Math.random = orig;
  }
});
