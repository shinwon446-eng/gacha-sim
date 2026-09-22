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

// ── 2단계: 안티 그라인딩 가중치
import { LOW_RISK_FLOOR_RATIO, LOW_RISK_WEIGHT, isLowRiskBox, requiredRollover, rolloverContribution, rolloverWeight } from "../lib/rollover";

test("바닥 환전율 90% 이상은 초저위험 — 개봉액의 30%만 인정", () => {
  assert.equal(LOW_RISK_FLOOR_RATIO, 0.9);
  assert.equal(LOW_RISK_WEIGHT, 0.3);
  assert.equal(isLowRiskBox(0.95), true);
  assert.equal(isLowRiskBox(0.9), true);
  assert.equal(isLowRiskBox(0.899), false);
  assert.equal(rolloverWeight(0.92), 0.3);
  assert.equal(rolloverWeight(0.85), 1);
});

test("인정액 = 개봉액 × 가중치", () => {
  assert.equal(rolloverContribution(100, 0.95), 30, "잭팟 100 USDT 는 30 만 인정");
  assert.equal(rolloverContribution(100, 0.85), 100, "1달러·스타터 계열은 전액 인정");
  assert.equal(rolloverContribution(50, 0.92), 15);
  assert.equal(rolloverContribution(0, 0.85), 0);
  assert.equal(rolloverContribution(-10, 0.85), 0);
});

test("필요 롤오버는 크립토 입금액 기준 — 카드 입금분은 빠진다", () => {
  assert.equal(requiredRollover(250), 250);
  assert.equal(requiredRollover(0), 0);
  assert.equal(requiredRollover(Number.NaN), 0);
});

test("그라인딩 시나리오: 저위험 상자만 돌리면 진행률이 훨씬 느리게 오른다", () => {
  // 100 USDT 입금 후 95% 환급 잭팟 상자를 100 USDT 어치 돌린 경우
  const lowRisk = rolloverContribution(100, 0.95);
  assert.equal(rolloverProgress(lowRisk, 100), 30, "아직 30%");
  // 같은 금액을 일반 상자로 돌리면 100%
  assert.equal(rolloverProgress(rolloverContribution(100, 0.85), 100), 100);
});
