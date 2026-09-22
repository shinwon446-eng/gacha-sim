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
