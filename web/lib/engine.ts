// 확률/부스터/티어 엔진 — 서버(API 라우트)와 정적 데모 폴백이 공유하는 순수 로직.
// 프로덕션 원칙: 난수와 확률 계산은 서버에서만 실행하고, 클라이언트에는 결과만 내려준다.
import type { Box, Item, Tier } from "./types";

/** pity 가 이 값에 도달하면 부스터 활성화 */
export const BOOSTER_THRESHOLD = 10;
/** 부스터 발동 시 상위 등급(SSR/SR) 가중치 배수 */
export const BOOST_MULT = 5;
/** 게스트 무료체험 임시 보관 시간 — 09:59 카운트다운 스펙 */
export const TRIAL_DURATION_MS = 599 * 1000;

export type UserTier = "Bronze" | "Silver" | "Gold" | "VIP";

/** 누적 결제액(USDT) 기준 등급별 SSR 가중치 배율 */
export const TIER_TABLE: { name: UserTier; min: number; mult: number }[] = [
  { name: "VIP", min: 3000, mult: 1.5 },
  { name: "Gold", min: 1000, mult: 1.3 },
  { name: "Silver", min: 300, mult: 1.15 },
  { name: "Bronze", min: 0, mult: 1 },
];

export const tierFor = (totalSpent: number) => TIER_TABLE.find((t) => totalSpent >= t.min)!;

export const isBoosterActive = (pityCount: number): boolean => pityCount >= BOOSTER_THRESHOLD;

const TOP_TIERS: Tier[] = ["SSR", "SR"];

export interface RollOpts {
  boost: boolean;
  /** 유저 등급 배율 — SSR 가중치에 곱해진다 */
  tierMult: number;
}

/** 부스터/등급 배율이 적용된 가중치 목록 */
export function effectiveItems(items: Item[], opts: RollOpts): { item: Item; w: number }[] {
  return items.map((item) => {
    let w = item.weight;
    if (item.tier === "SSR") w *= opts.tierMult;
    if (opts.boost && TOP_TIERS.includes(item.tier)) w *= BOOST_MULT;
    return { item, w };
  });
}

export function pickWeightedAdjusted(items: Item[], opts: RollOpts, rand: () => number = Math.random): Item {
  const list = effectiveItems(items, opts);
  const total = list.reduce((s, e) => s + e.w, 0);
  let r = rand() * total;
  for (const e of list) {
    r -= e.w;
    if (r <= 0) return e.item;
  }
  return list[list.length - 1].item;
}

export const rollOnce = (box: Box, opts: RollOpts, rand: () => number = Math.random): Item =>
  pickWeightedAdjusted(box.items, opts, rand);

/** 특정 등급의 합산 확률(%) — 부스터 툴팁의 "1.5% → 7.5%" 표기에 사용 */
export function tierProbWith(box: Box, tier: Tier, opts: RollOpts): number {
  const list = effectiveItems(box.items, opts);
  const total = list.reduce((s, e) => s + e.w, 0);
  return (list.filter((e) => e.item.tier === tier).reduce((s, e) => s + e.w, 0) / total) * 100;
}

export interface PullState {
  pityCount: number;
  totalSpent: number;
}

export interface PullResult {
  items: Item[];
  pityCount: number;
  boosterTriggered: boolean;
  tier: UserTier;
}

/**
 * count 회 연속 뽑기 상태 머신.
 * - pity >= 10 인 상태에서 뽑으면 부스터 적용(SSR/SR x5) 후 0으로 리셋
 * - SSR 자연 당첨 시에도 리셋
 * - 그 외에는 +1 (상한 10)
 */
export function runPulls(box: Box, count: number, state: PullState, rand: () => number = Math.random): PullResult {
  const { name: tier, mult } = tierFor(state.totalSpent);
  let pity = state.pityCount;
  let triggered = false;
  const items: Item[] = [];

  for (let i = 0; i < count; i++) {
    const boost = isBoosterActive(pity);
    const item = rollOnce(box, { boost, tierMult: mult }, rand);
    items.push(item);
    if (boost) {
      triggered = true;
      pity = 0;
    } else if (item.tier === "SSR") {
      pity = 0;
    } else {
      pity = Math.min(pity + 1, BOOSTER_THRESHOLD);
    }
  }
  return { items, pityCount: pity, boosterTriggered: triggered, tier };
}

// ── 게스트 무료체험 전용 상품 풀 (꽝 없음 — 모든 항목이 당첨) ──
// 표시되는 상품이 곧 실제 추첨 풀이며, 확률도 그대로 공개한다.
const G = {
  amber: "linear-gradient(135deg,#3a1d00 0%,#b45309 55%,#fcd34d 100%)",
  teal: "linear-gradient(135deg,#042f2e 0%,#0d9488 55%,#5eead4 100%)",
  slate: "linear-gradient(135deg,#0f172a 0%,#334155 55%,#94a3b8 100%)",
  violet: "linear-gradient(135deg,#1e0a3c 0%,#6d28d9 55%,#c4b5fd 100%)",
  rose: "linear-gradient(135deg,#4a0416 0%,#be123c 55%,#fda4af 100%)",
};

export const TRIAL_POOL: Item[] = [
  { id: "t-buds", name: "무선 이어버드", tier: "SR", value: 45, weight: 10, cert: "TRIAL-BUDS", emoji: "🎧", art: G.violet },
  { id: "t-coffee", name: "커피 기프티콘 5만원권", tier: "SR", value: 38, weight: 15, cert: "TRIAL-COFFEE", emoji: "☕", art: G.amber },
  { id: "t-mouse", name: "게이밍 마우스", tier: "R", value: 35, weight: 20, cert: "TRIAL-MOUSE", emoji: "🖱️", art: G.slate },
  { id: "t-charger", name: "고속 무선 충전기", tier: "R", value: 25, weight: 25, cert: "TRIAL-CHARGER", emoji: "🔌", art: G.teal },
  { id: "t-chicken", name: "치킨 콤보 기프티콘 (3만원권)", tier: "R", value: 22, weight: 30, cert: "TRIAL-CHICKEN", emoji: "🍗", art: G.rose },
];

export const TRIAL_MAP: Record<string, Item> = Object.fromEntries(TRIAL_POOL.map((i) => [i.id, i]));
