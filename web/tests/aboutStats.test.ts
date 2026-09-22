import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTHENTICITY_COMPENSATION_MULTIPLE,
  BOX_COUNT,
  CATEGORY_COUNT,
  GIFT_BOX_ASSUMED_REFUND_RATE,
  INSTANT_SELLBACK_RATE,
  MUTABLE_RESULTS,
  SHIPPING_SLA_HOURS,
  attemptsRange,
  effectiveAttempts,
  publishedOddsRows,
  rtpRangePct,
  totalJackpotValueUsdt,
} from "../lib/aboutStats";
import { BOXES, dropTable } from "../lib/products";

test("잭팟 총액은 각 박스 최고 상품 가치의 합 — 지어낸 값이 아니다", () => {
  const manual = +BOXES.reduce((s, b) => s + dropTable(b)[0].value, 0).toFixed(2);
  assert.equal(totalJackpotValueUsdt(), manual);
  assert.ok(manual > 0);
});

test("공개 확률 줄 수 = 전 박스 구성품 수", () => {
  assert.equal(publishedOddsRows(), BOXES.reduce((s, b) => s + b.items.length, 0));
  assert.ok(publishedOddsRows() >= BOX_COUNT);
});

test("실질 도전 배수 = 1 / (1 − 환급률)", () => {
  assert.equal(effectiveAttempts(0.95), 20);
  assert.equal(effectiveAttempts(0.9), 10);
  assert.equal(effectiveAttempts(0.85), 6.7);
  // 사은품형(환급 거의 없음)은 사실상 1회
  assert.equal(effectiveAttempts(GIFT_BOX_ASSUMED_REFUND_RATE), 1);
  // 경계: 음수·1 이상·NaN 은 1 로 막는다(무한대 표기 방지)
  assert.equal(effectiveAttempts(1), 1);
  assert.equal(effectiveAttempts(1.5), 1);
  assert.equal(effectiveAttempts(-0.2), 1);
  assert.equal(effectiveAttempts(Number.NaN), 1);
});

test("도전 배수 범위는 실제 라인업의 최소 보장 환급률에서 나온다", () => {
  const r = attemptsRange();
  assert.ok(r.minRate >= 80 && r.maxRate <= 96, `${r.minRate}~${r.maxRate}%`);
  assert.ok(r.min >= 1 && r.max > r.min);
  assert.equal(r.max, effectiveAttempts(r.maxRate / 100));
});

test("RTP 범위는 부록 B 구현값 안에 있다", () => {
  const { min, max } = rtpRangePct();
  assert.ok(min >= 93 && max < 106, `${min}~${max}%`);
  assert.ok(max >= min);
});

test("정책 상수 — 95% 즉시 회수 · 3배 보상 · 24시간 출고 기준 · 사후 변조 가능 결과 0", () => {
  assert.equal(INSTANT_SELLBACK_RATE, 0.95);
  assert.equal(AUTHENTICITY_COMPENSATION_MULTIPLE, 3);
  assert.equal(SHIPPING_SLA_HOURS, 24);
  assert.equal(MUTABLE_RESULTS, 0);
  assert.equal(CATEGORY_COUNT, 4);
});
