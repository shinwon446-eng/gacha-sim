/**
 * 일일 무료 상자 (CLAUDE.md §7-A, PROMPTS 4-1).
 *   · 24시간마다 1회. 로그인이 없으므로 브라우저(localStorage) 단위로 센다 — 실서비스는 계정 단위.
 *   · 보상 0.1 ~ 1.0 USDT. 결과는 유료 박스와 같은 Provably Fair 엔진(HMAC 롤 → 구간)으로 정해진다.
 *     카드 선택은 연출일 뿐 결과를 바꾸지 않는다 — 화면에 그 사실을 적는다.
 */
import { determineItem, type WithProbability } from "@/lib/fairness";

export interface DailyReward extends WithProbability {
  /** USDT */
  amount: number;
  /** 등급 색 — 연출용 */
  tone: "curated" | "executive" | "prestige" | "royal";
}

/** 확률표 — 합 100. 기대값 ≈ 0.243 USDT */
export const DAILY_REWARDS: DailyReward[] = [
  { amount: 0.1, dropRate: 45, tone: "curated" },
  { amount: 0.2, dropRate: 25, tone: "curated" },
  { amount: 0.3, dropRate: 12, tone: "executive" },
  { amount: 0.5, dropRate: 10, tone: "executive" },
  { amount: 0.7, dropRate: 5, tone: "prestige" },
  { amount: 1.0, dropRate: 3, tone: "royal" },
];

export const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const DAILY_MIN_USDT = 0.1;
export const DAILY_MAX_USDT = 1.0;

export const dailyExpectedValue = (): number => +DAILY_REWARDS.reduce((s, r) => s + (r.amount * r.dropRate) / 100, 0).toFixed(4);

export function rewardForRoll(roll: number): DailyReward {
  return determineItem(roll, DAILY_REWARDS);
}

/** 다음 오픈 가능 시각(ms). 한 번도 안 열었으면 0. */
export function nextAvailableAt(lastOpenedAt: string | null): number {
  return lastOpenedAt ? new Date(lastOpenedAt).getTime() + DAILY_COOLDOWN_MS : 0;
}

export function canOpenDaily(lastOpenedAt: string | null, now = Date.now()): boolean {
  return now >= nextAvailableAt(lastOpenedAt);
}

/** 남은 시간 → "HH:MM:SS" */
export function formatCountdown(msLeft: number): string {
  const s = Math.max(0, Math.floor(msLeft / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
