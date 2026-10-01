// 출금 부정거래 탐지 — 리스크 점수, 봇 패턴, 서킷 브레이커
import test from "node:test";
import assert from "node:assert/strict";
import {
  BOT_SPIN_INTERVAL_MS,
  CIRCUIT_LIMIT_USDT,
  FRESH_DEPOSIT_MS,
  LARGE_WITHDRAW_USDT,
  REVIEW_THRESHOLD,
  assessWithdrawalRisk,
  circuitState,
  minSpinInterval,
  needsManualReview,
  recentWithdrawTotal,
} from "../lib/fraudScoring";

const NOW = Date.parse("2026-09-23T12:00:00.000Z");
const ago = (ms: number) => NOW - ms;

test("기준값: 40점 심사, 24시간, 500 USDT, 150ms, 3,000 USDT/시간", () => {
  assert.equal(REVIEW_THRESHOLD, 40);
  assert.equal(FRESH_DEPOSIT_MS, 86400000);
  assert.equal(LARGE_WITHDRAW_USDT, 500);
  assert.equal(BOT_SPIN_INTERVAL_MS, 150);
  assert.equal(CIRCUIT_LIMIT_USDT, 3000);
});

test("신호가 없으면 0점 · 자동 승인", () => {
  const r = assessWithdrawalRisk({ amountUsdt: 100, firstDepositAt: ago(FRESH_DEPOSIT_MS + 1), now: NOW });
  assert.equal(r.score, 0);
  assert.equal(r.requiresReview, false);
});

test("① 첫 입금 24시간 이내 출금 +30 (그것만으로는 자동 승인)", () => {
  const r = assessWithdrawalRisk({ amountUsdt: 100, firstDepositAt: ago(3 * 60 * 60 * 1000), now: NOW });
  assert.equal(r.score, 30);
  assert.equal(r.requiresReview, false, "30점은 임계 미만");
});

test("② 500 USDT 초과 고액 +25", () => {
  assert.equal(assessWithdrawalRisk({ amountUsdt: 500, now: NOW }).score, 0, "500 은 경계값 — 초과가 아님");
  assert.equal(assessWithdrawalRisk({ amountUsdt: 500.01, now: NOW }).score, 25);
});

test("①+② 합산 55점 → 수동 심사", () => {
  const r = assessWithdrawalRisk({ amountUsdt: 900, firstDepositAt: ago(60 * 60 * 1000), now: NOW });
  assert.equal(r.score, 55);
  assert.equal(r.requiresReview, true);
  assert.deepEqual(r.factors.map((f) => f.key), ["freshDeposit", "largeAmount"]);
});

test("③ 150ms 미만 연속 스핀은 매크로로 보고 +50 (단독으로 심사행)", () => {
  const bot = [NOW - 1000, NOW - 900, NOW - 800, NOW - 700];
  assert.equal(minSpinInterval(bot), 100);
  const r = assessWithdrawalRisk({ amountUsdt: 50, spinTimes: bot, now: NOW });
  assert.equal(r.score, 50);
  assert.equal(r.requiresReview, true);
});

test("③ 사람이 누른 간격(수백 ms~수 초)은 가산 없음", () => {
  const human = [NOW - 9000, NOW - 5000, NOW - 1200];
  assert.ok(minSpinInterval(human) >= BOT_SPIN_INTERVAL_MS);
  assert.equal(assessWithdrawalRisk({ amountUsdt: 50, spinTimes: human, now: NOW }).score, 0);
  assert.equal(minSpinInterval([NOW]), Infinity, "스핀 1회로는 판단하지 않는다");
  assert.equal(minSpinInterval([]), Infinity);
});

test("④ IP 국가 불일치/VPN 은 서버 판정 신호 — 값이 없으면 평가하지 않는다", () => {
  assert.equal(assessWithdrawalRisk({ amountUsdt: 50, now: NOW }).score, 0);
  const r = assessWithdrawalRisk({ amountUsdt: 50, geoMismatch: true, now: NOW });
  assert.equal(r.score, 20);
  assert.equal(r.factors[0].serverOnly, true);
});

test("1시간 창 밖의 출금은 누적에서 빠진다", () => {
  const list = [
    { amountUsdt: -1000, at: new Date(ago(10 * 60 * 1000)).toISOString() },
    { amountUsdt: -1500, at: new Date(ago(50 * 60 * 1000)).toISOString() },
    { amountUsdt: -900, at: new Date(ago(2 * 60 * 60 * 1000)).toISOString() },
  ];
  assert.equal(recentWithdrawTotal(list, NOW), 2500);
});

test("서킷 브레이커: 1시간 3,000 USDT 초과 시 자동 출금 중지", () => {
  const under = circuitState([{ amountUsdt: -2500, at: ago(5 * 60 * 1000) }], NOW);
  assert.equal(under.tripped, false);
  assert.equal(under.remainingUsdt, 500);

  const over = circuitState(
    [
      { amountUsdt: -2500, at: ago(5 * 60 * 1000) },
      { amountUsdt: -600, at: ago(1 * 60 * 1000) },
    ],
    NOW,
  );
  assert.equal(over.tripped, true);
  assert.equal(over.usedUsdt, 3100);
  assert.equal(over.remainingUsdt, 0);
});

test("서킷이 열리면 리스크 0점이어도 수동 승인으로 돌린다", () => {
  const safe = assessWithdrawalRisk({ amountUsdt: 30, now: NOW });
  const tripped = circuitState([{ amountUsdt: -3000, at: ago(60 * 1000) }], NOW);
  assert.equal(needsManualReview(safe, tripped), true);
  assert.equal(needsManualReview(safe, circuitState([], NOW)), false);
});
