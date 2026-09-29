// 확률/부스터/등급 엔진 — 순수 로직.
// 프로덕션 원칙: 난수와 확률 계산은 서버에서만 실행하고, 클라이언트에는 결과만 내려준다.
import { itemLine, type Box, type Item, type Line } from "./types";

/** pity 가 이 값에 도달하면 부스터 활성화 */
export const BOOSTER_THRESHOLD = 10;
/** 부스터 발동 시 [초대박 라인업] 가중치 배수 */
export const BOOST_MULT = 5;

export type UserTier = "Bronze" | "Silver" | "Gold" | "VIP";

/** 누적 결제액(USDT) 기준 등급별 [초대박] 가중치 배율 */
export const TIER_TABLE: { name: UserTier; min: number; mult: number }[] = [
  { name: "VIP", min: 3000, mult: 1.5 },
  { name: "Gold", min: 1000, mult: 1.3 },
  { name: "Silver", min: 300, mult: 1.15 },
  { name: "Bronze", min: 0, mult: 1 },
];

export const tierFor = (totalSpent: number) => TIER_TABLE.find((t) => totalSpent >= t.min)!;

export const isBoosterActive = (pityCount: number): boolean => pityCount >= BOOSTER_THRESHOLD;

/** 부스터가 끌어올리는 라인 */
const BOOSTED_LINE: Line = "jackpot";

export interface RollOpts {
  boost: boolean;
  /** 유저 등급 배율 — [초대박] 가중치에 곱해진다 */
  tierMult: number;
}

/** 부스터/등급 배율이 적용된 가중치 목록 */
export function effectiveItems(items: Item[], opts: RollOpts): { item: Item; w: number }[] {
  return items.map((item) => {
    let w = item.weight;
    if (itemLine(item) === BOOSTED_LINE) {
      w *= opts.tierMult;
      if (opts.boost) w *= BOOST_MULT;
    }
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

/** 특정 라인의 합산 확률(%) — 부스터 안내의 확률 변환 표기에 사용 */
export function lineProbWith(box: Box, line: Line, opts: RollOpts): number {
  const list = effectiveItems(box.items, opts);
  const total = list.reduce((s, e) => s + e.w, 0);
  return (list.filter((e) => itemLine(e.item) === line).reduce((s, e) => s + e.w, 0) / total) * 100;
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
 * - pity >= 10 인 상태에서 뽑으면 부스터 적용([초대박] x5) 후 0으로 리셋
 * - [초대박] 자연 당첨 시에도 리셋
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
    } else if (itemLine(item) === BOOSTED_LINE) {
      pity = 0;
    } else {
      pity = Math.min(pity + 1, BOOSTER_THRESHOLD);
    }
  }
  return { items, pityCount: pity, boosterTriggered: triggered, tier };
}
