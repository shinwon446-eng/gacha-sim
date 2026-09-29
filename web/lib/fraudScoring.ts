/**
 * 출금 자동 부정거래 탐지 (Automated Fraud Scoring) — CLAUDE.md §7-E.
 *
 * 출금 신청 순간 네 가지 신호를 더해 riskScore 를 낸다. 40점 미만이면 자동 승인 경로,
 * 40점 이상이면 관리자 수동 심사(PENDING_ADMIN_REVIEW)로 보낸다.
 * 여기 있는 건 전부 순수 함수다(tests/fraudScoring.test.ts). 판정 근거를 화면에 그대로 보여 준다.
 */

/** 이 점수 이상이면 수동 심사 */
export const REVIEW_THRESHOLD = 40;

export const RISK_POINTS = {
  /** 첫 입금 후 24시간 이내 출금 */
  freshDeposit: 30,
  /** 1회 고액 출금 */
  largeAmount: 25,
  /** 초고속 매크로(봇) 패턴 */
  botSpeed: 50,
  /** 입금 IP 국가 ≠ 출금 IP 국가 / VPN */
  geoMismatch: 20,
} as const;

/** 첫 입금 후 이 시간 안의 출금은 가산 */
export const FRESH_DEPOSIT_MS = 24 * 60 * 60 * 1000;
/** 1회 출금 고액 기준(USDT) */
export const LARGE_WITHDRAW_USDT = 500;
/** 이 간격보다 빠른 연속 스핀은 사람 손으로 보지 않는다 */
export const BOT_SPIN_INTERVAL_MS = 150;

/** 서킷 브레이커 — 1시간 누적 출금이 이 금액을 넘으면 핫월렛 자동 출금을 멈춘다 */
export const CIRCUIT_WINDOW_MS = 60 * 60 * 1000;
export const CIRCUIT_LIMIT_USDT = 3000;

export type RiskFactorKey = keyof typeof RISK_POINTS;

export interface RiskFactor {
  key: RiskFactorKey;
  points: number;
  /** 서버(백엔드)만 판정할 수 있는 신호인지 — preview 모드에서는 평가되지 않음을 화면에 밝힌다 */
  serverOnly?: boolean;
}

export interface RiskInput {
  amountUsdt: number;
  /** 첫 입금 시각(ms). 입금 이력이 없으면 undefined */
  firstDepositAt?: number;
  /** 최근 스핀 시각들(ms, 오름차순 아니어도 됨) */
  spinTimes?: number[];
  /**
   * 직전 입금 IP 국가와 출금 요청 IP 국가의 불일치(또는 VPN) 여부.
   * 클라이언트는 IP 를 알 수 없다 — live 모드에서 백엔드가 준 값만 들어온다(없으면 미평가).
   */
  geoMismatch?: boolean;
  now?: number;
}

export interface RiskAssessment {
  score: number;
  factors: RiskFactor[];
  /** 40점 이상 → 관리자 수동 심사 */
  requiresReview: boolean;
}

/** 연속 스핀 최소 간격(ms). 스핀이 2회 미만이면 Infinity */
export function minSpinInterval(spinTimes: number[] = []): number {
  const t = [...spinTimes].filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (t.length < 2) return Infinity;
  let min = Infinity;
  for (let i = 1; i < t.length; i++) min = Math.min(min, t[i] - t[i - 1]);
  return min;
}

export function assessWithdrawalRisk(input: RiskInput): RiskAssessment {
  const now = input.now ?? Date.now();
  const factors: RiskFactor[] = [];

  if (typeof input.firstDepositAt === "number" && now - input.firstDepositAt < FRESH_DEPOSIT_MS) {
    factors.push({ key: "freshDeposit", points: RISK_POINTS.freshDeposit });
  }
  if (Number.isFinite(input.amountUsdt) && input.amountUsdt > LARGE_WITHDRAW_USDT) {
    factors.push({ key: "largeAmount", points: RISK_POINTS.largeAmount });
  }
  if (minSpinInterval(input.spinTimes) < BOT_SPIN_INTERVAL_MS) {
    factors.push({ key: "botSpeed", points: RISK_POINTS.botSpeed });
  }
  if (input.geoMismatch === true) {
    factors.push({ key: "geoMismatch", points: RISK_POINTS.geoMismatch, serverOnly: true });
  }

  const score = factors.reduce((n, f) => n + f.points, 0);
  return { score, factors, requiresReview: score >= REVIEW_THRESHOLD };
}

/** 1시간 누적 출금액(USDT) — 출금 거래의 절대값 합 */
export function recentWithdrawTotal(withdrawals: { amountUsdt: number; at: string | number }[], now = Date.now()): number {
  const from = now - CIRCUIT_WINDOW_MS;
  const sum = withdrawals.reduce((n, w) => {
    const at = typeof w.at === "number" ? w.at : Date.parse(w.at);
    if (!Number.isFinite(at) || at < from || at > now) return n;
    return n + Math.abs(w.amountUsdt);
  }, 0);
  return +sum.toFixed(2);
}

export interface CircuitState {
  tripped: boolean;
  usedUsdt: number;
  limitUsdt: number;
  /** 남은 자동 출금 한도 */
  remainingUsdt: number;
}

/** 서킷 브레이커 상태 — 넘으면 자동 출금을 멈추고 전부 수동 승인으로 돌린다 */
export function circuitState(withdrawals: { amountUsdt: number; at: string | number }[], now = Date.now()): CircuitState {
  const used = recentWithdrawTotal(withdrawals, now);
  return {
    tripped: used >= CIRCUIT_LIMIT_USDT,
    usedUsdt: used,
    limitUsdt: CIRCUIT_LIMIT_USDT,
    remainingUsdt: +Math.max(0, CIRCUIT_LIMIT_USDT - used).toFixed(2),
  };
}

/** 이번 출금이 수동 심사로 가야 하는가 — 리스크 점수 또는 서킷 브레이커 */
export function needsManualReview(assessment: RiskAssessment, circuit: CircuitState): boolean {
  return assessment.requiresReview || circuit.tripped;
}
