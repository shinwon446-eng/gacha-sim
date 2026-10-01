// 오토플레이 규칙 — 정지 조건 · 잔고 · 남은 회전
import test from "node:test";
import assert from "node:assert/strict";
import { AUTOPLAY_SPINS, BULK_THRESHOLD, DEFAULT_AUTOPLAY, OPEN_PRESETS, canAfford, netOf, remainingSpins, stopReasonAfter, type AutoplayConfig } from "../lib/autoplay";

const base: AutoplayConfig = { ...DEFAULT_AUTOPLAY, spins: 10, stopOnJackpot: true, stopOnMultiple: null, stopLoss: null };

test("프리셋: 회전 수 10/25/50/100/∞, 개봉 수량 1/5/10/50/100, 대량 개봉 임계 50", () => {
  assert.deepEqual([...AUTOPLAY_SPINS], [10, 25, 50, 100, Infinity]);
  assert.deepEqual([...OPEN_PRESETS], [1, 5, 10, 50, 100]);
  assert.equal(BULK_THRESHOLD, 50);
  assert.equal(DEFAULT_AUTOPLAY.stopOnJackpot, true);
});

test("잭팟(ROYAL/PRESTIGE) 당첨 시 즉시 정지 — 기본 켜짐, 끄면 계속", () => {
  const st = { done: 1, spent: 1, won: 1000 };
  assert.equal(stopReasonAfter(base, st, { tier: "royal", value: 1000 }, 1), "jackpot");
  assert.equal(stopReasonAfter(base, st, { tier: "prestige", value: 100 }, 1), "jackpot");
  assert.equal(stopReasonAfter({ ...base, stopOnJackpot: false }, st, { tier: "royal", value: 1000 }, 1), null);
  assert.equal(stopReasonAfter(base, st, { tier: "curated", value: 0.85 }, 1), null);
});

test("단일 승리 N배 이상 · 손실 한도 · 회전 수 소진", () => {
  const cfg = { ...base, stopOnJackpot: false, stopOnMultiple: 10 };
  assert.equal(stopReasonAfter(cfg, { done: 1, spent: 5, won: 50 }, { tier: "executive", value: 50 }, 5), "multiple");
  assert.equal(stopReasonAfter(cfg, { done: 1, spent: 5, won: 20 }, { tier: "executive", value: 20 }, 5), null);
  const sl = { ...base, stopOnJackpot: false, stopLoss: 3 };
  assert.equal(stopReasonAfter(sl, { done: 4, spent: 4, won: 0.9 }, { tier: "curated", value: 0.85 }, 1), "stopLoss");
  assert.equal(stopReasonAfter(sl, { done: 2, spent: 2, won: 1.7 }, { tier: "curated", value: 0.85 }, 1), null);
  assert.equal(stopReasonAfter(base, { done: 10, spent: 10, won: 8.5 }, { tier: "curated", value: 0.85 }, 1), "spins");
  assert.equal(stopReasonAfter({ ...base, spins: Infinity }, { done: 10_000, spent: 1, won: 1 }, { tier: "curated", value: 0.85 }, 1), null);
});

test("잔고 · 남은 회전 · 순손익", () => {
  assert.ok(canAfford(1, 1));
  assert.ok(!canAfford(0.99, 1));
  assert.equal(remainingSpins(base, 3), 7);
  assert.equal(remainingSpins({ ...base, spins: Infinity }, 3), Infinity);
  assert.equal(netOf({ done: 3, spent: 3, won: 2.55 }), -0.45);
});
