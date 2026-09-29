/**
 * 오토플레이 규칙 — 순수 함수. 컴포넌트는 스핀만 돌리고 여기서 "계속할지"를 묻는다.
 *
 *   · 회전 수: 10 / 25 / 50 / 100 / 무제한(Infinity)
 *   · 자동 환전: 실물·디지털 당첨을 95% USDT 로 즉시 회수해 잔고를 재충전한다 (캐시백은 원래 100% 즉시 적립)
 *   · 스마트 정지: 잭팟(ROYAL/PRESTIGE) 당첨 · 단일 승리 N배 이상 · 손실 한도(Stop Loss) 도달 · 잔고 부족
 */
import type { TierKey } from "./tiers";

export const AUTOPLAY_SPINS = [10, 25, 50, 100, Infinity] as const;
export const AUTOPLAY_DEFAULT_MULTIPLE = 10;
export const BULK_THRESHOLD = 50;
export const OPEN_PRESETS = [1, 5, 10, 50, 100] as const;

export interface AutoplayConfig {
  /** 총 회전 수. Infinity = 무제한 */
  spins: number;
  /** 모든 당첨품 95% USDT 즉시 자동 환전 */
  autoSell: boolean;
  /** 에픽/레전더리(잭팟) 당첨 시 즉시 멈춤 */
  stopOnJackpot: boolean;
  /** 단일 승리가 오픈 가격의 N배 이상이면 중단. null = 사용 안 함 */
  stopOnMultiple: number | null;
  /** 누적 순손실이 이 금액(USDT)에 도달하면 중단. null = 사용 안 함 */
  stopLoss: number | null;
}

export const DEFAULT_AUTOPLAY: AutoplayConfig = {
  spins: 10,
  autoSell: true,
  stopOnJackpot: true,
  stopOnMultiple: null,
  stopLoss: null,
};

export interface AutoplayState {
  /** 완료한 회전 수 */
  done: number;
  /** 누적 투입(USDT) */
  spent: number;
  /** 누적 획득 가치(USDT, 실판매가 기준) */
  won: number;
}

export type StopReason = "spins" | "jackpot" | "multiple" | "stopLoss" | "balance" | "manual" | null;

export const JACKPOT_TIERS: readonly TierKey[] = ["royal", "prestige"];

/** 이번 스핀 결과를 반영한 뒤, 다음 스핀을 돌려도 되는지. 멈춰야 하면 이유를 돌려준다. */
export function stopReasonAfter(config: AutoplayConfig, state: AutoplayState, last: { tier: TierKey; value: number }, price: number): StopReason {
  if (config.stopOnJackpot && JACKPOT_TIERS.includes(last.tier)) return "jackpot";
  if (config.stopOnMultiple !== null && config.stopOnMultiple > 0 && last.value >= price * config.stopOnMultiple) return "multiple";
  if (config.stopLoss !== null && config.stopLoss > 0 && state.spent - state.won >= config.stopLoss) return "stopLoss";
  if (state.done >= config.spins) return "spins";
  return null;
}

/** 다음 스핀 전 — 잔고가 가격보다 적으면 멈춘다 */
export function canAfford(balance: number, price: number): boolean {
  return balance + 1e-9 >= price;
}

export const remainingSpins = (config: AutoplayConfig, done: number): number => (Number.isFinite(config.spins) ? Math.max(0, config.spins - done) : Infinity);

/** 순손익(USDT, 소수 둘째 자리) */
export const netOf = (state: AutoplayState): number => +(state.won - state.spent).toFixed(2);
