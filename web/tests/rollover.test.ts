// 롤오버(자금세탁 방지) 규정 — 진행률·충족·잔여 개봉액
import test from "node:test";
import assert from "node:assert/strict";
import { ROLLOVER_MULTIPLIER, rolloverMet, rolloverProgress, rolloverRemaining } from "../lib/rollover";

test("요구 배수는 입금액의 100%", () => {
  assert.equal(ROLLOVER_MULTIPLIER, 1);
});

test("진행률 = min(100, floor(개봉/입금 × 100))", () => {
  assert.equal(rolloverProgress(0, 100), 0);
  assert.equal(rolloverProgress(49.9, 100), 49);
  assert.equal(rolloverProgress(50, 100), 50);
  assert.equal(rolloverProgress(99.99, 100), 99);
  assert.equal(rolloverProgress(100, 100), 100);
  assert.equal(rolloverProgress(500, 100), 100, "초과분은 100 으로 상한");
});

test("입금이 없으면 1 USDT 개봉으로 충족 — 입금 자금이 아닌 잔액은 묶지 않는다", () => {
  assert.equal(rolloverProgress(0, 0), 0);
  assert.equal(rolloverProgress(1, 0), 100);
  assert.ok(rolloverMet(1, 0));
});

test("충족 판정은 100% 이상에서만 참", () => {
  assert.equal(rolloverMet(99.99, 100), false);
  assert.equal(rolloverMet(100, 100), true);
  assert.equal(rolloverMet(120, 100), true);
});

test("잔여 개봉액", () => {
  assert.equal(rolloverRemaining(0, 100), 100);
  assert.equal(rolloverRemaining(42.5, 100), 57.5);
  assert.equal(rolloverRemaining(100, 100), 0);
  assert.equal(rolloverRemaining(150, 100), 0);
});

test("음수·NaN 입력에도 0~100 을 벗어나지 않는다", () => {
  assert.equal(rolloverProgress(Number.NaN, 100), 0);
  assert.equal(rolloverProgress(-50, 100), 0);
  assert.equal(rolloverProgress(50, Number.NaN), 100, "입금 기록이 깨지면 묶지 않는다");
  assert.equal(rolloverRemaining(0, -100), 0);
});
