/**
 * 롤오버(Wager Requirement) — 자금세탁·삼자사기 방지 규정 (CLAUDE.md §7).
 *
 * 입금 → 즉시 출금(세탁) 경로를 막기 위해, 입금액의 100% 이상을 박스 개봉에 소진해야 출금을 열어 준다.
 * 계산은 전부 순수 함수다(테스트: tests/rollover.test.ts). 금액 단위는 USDT.
 *
 *   진행률 = min(100, floor(총개봉액 / max(1, 총입금액) × 100))
 *
 * 입금한 적이 없는 계정(max(1, 0) = 1)은 1 USDT 만 개봉해도 100% 가 된다 — 입금 자금이 아니면 묶지 않는다.
 */

/** 요구 배수 — 입금액의 1.0배(100%) */
export const ROLLOVER_MULTIPLIER = 1;

/** 0~100 정수 진행률 */
export function rolloverProgress(totalWagered: number, totalDeposited: number): number {
  const wagered = Number.isFinite(totalWagered) ? Math.max(0, totalWagered) : 0;
  const deposited = Number.isFinite(totalDeposited) ? Math.max(0, totalDeposited) : 0;
  return Math.min(100, Math.floor((wagered / Math.max(1, deposited * ROLLOVER_MULTIPLIER)) * 100));
}

/** 출금 가능 여부 */
export function rolloverMet(totalWagered: number, totalDeposited: number): boolean {
  return rolloverProgress(totalWagered, totalDeposited) >= 100;
}

/** 100% 까지 남은 개봉 금액(USDT) */
export function rolloverRemaining(totalWagered: number, totalDeposited: number): number {
  const required = Math.max(0, totalDeposited) * ROLLOVER_MULTIPLIER;
  return +Math.max(0, required - Math.max(0, totalWagered)).toFixed(2);
}

/* ── 2단계: 안티 그라인딩 가중치 (2026-09-23) ─────────────────────────────
 * 바닥 환전율이 높은 상자는 사실상 손실이 거의 없다 — 그런 상자만 반복해서(그라인딩)
 * 롤오버를 채우고 빠져나가는 세탁을 막기 위해, 저위험 상자는 개봉액의 일부만 인정한다.
 *   rolloverContribution = boxPrice × (isLowRisk ? 0.3 : 1.0)
 */

/** 이 비율 이상이면 초저위험 상자 */
export const LOW_RISK_FLOOR_RATIO = 0.9;
/** 초저위험 상자의 롤오버 인정 비율 */
export const LOW_RISK_WEIGHT = 0.3;
/** 일반(중·고위험) 상자의 인정 비율 */
export const NORMAL_WEIGHT = 1;

/** 바닥 환전율(0~1) → 초저위험 여부 */
export function isLowRiskBox(floorRatio: number): boolean {
  return Number.isFinite(floorRatio) && floorRatio >= LOW_RISK_FLOOR_RATIO;
}

/** 바닥 환전율 → 롤오버 인정 가중치 */
export function rolloverWeight(floorRatio: number): number {
  return isLowRiskBox(floorRatio) ? LOW_RISK_WEIGHT : NORMAL_WEIGHT;
}

/** 이번 개봉이 롤오버에 얼마나 잡히는지 (USDT) */
export function rolloverContribution(spentUsdt: number, floorRatio: number): number {
  const spent = Number.isFinite(spentUsdt) ? Math.max(0, spentUsdt) : 0;
  return +(spent * rolloverWeight(floorRatio)).toFixed(2);
}

/** 필요 롤오버 = 크립토 입금액 × 요구 배수 (카드 입금분은 애초에 온체인 출금이 불가하므로 제외) */
export function requiredRollover(totalDepositedCrypto: number): number {
  const deposited = Number.isFinite(totalDepositedCrypto) ? Math.max(0, totalDepositedCrypto) : 0;
  return +(deposited * ROLLOVER_MULTIPLIER).toFixed(2);
}
