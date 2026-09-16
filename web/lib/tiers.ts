/**
 * 등급 체계 — 가치(Value) 축 단일화.
 *
 * 설계 규칙
 *  1. 등급은 저장하지 않고 "실판매가 ÷ 오픈 가격" 배수에서 파생한다.
 *     데이터에 손으로 박아두면 가격이 바뀌는 순간 조용히 거짓말이 된다.
 *  2. 색은 카테고리를 뜻하지 않는다. 골드가 "명품"이 아니라 "지불액의 6~20배"다.
 *     카테고리는 행 제목과 필터가 이미 말하고 있으므로 색까지 쓰지 않는다.
 *  3. accent / deep 두 색만 원천으로 두고 글로우는 알파 변형으로 파생한다.
 */

import type { ProductBox, ProductItem } from "./products";

export type TierKey = "dream" | "highend" | "pro" | "standard";

export interface Tier {
  key: TierKey;
  label: string;
  /** 뱃지 텍스트 / 보더 기본색 */
  accent: string;
  /** 그라디언트 하단, 눌린 색 */
  deep: string;
  /** 지불액 대비 하한 배수(이상) */
  minMultiple: number;
  /** 배수 구간 표기 */
  range: string;
}

/** 배수 내림차순. tierOf 가 위에서부터 훑는다. */
export const TIERS: Tier[] = [
  { key: "dream", label: "DREAM", accent: "#FF4655", deep: "#A32734", minMultiple: 20, range: "20배 이상" },
  { key: "highend", label: "HIGH-END", accent: "#FFD700", deep: "#8C7400", minMultiple: 6, range: "6~20배" },
  { key: "pro", label: "PRO", accent: "#00D2FF", deep: "#00708A", minMultiple: 2, range: "2~6배" },
  { key: "standard", label: "STANDARD", accent: "#A0AEC0", deep: "#5A6474", minMultiple: 0, range: "2배 미만" },
];

export const TIER_BY_KEY: Record<TierKey, Tier> = Object.fromEntries(
  TIERS.map((t) => [t.key, t]),
) as Record<TierKey, Tier>;

/** 등급 인덱스. 낮을수록 상위. 정렬·비교에 쓴다. */
export const tierIndex = (key: TierKey): number => TIERS.findIndex((t) => t.key === key);

/** 실판매가와 지불액의 배수로 등급을 정한다. */
export function tierOf(value: number, price: number): Tier {
  const mult = price > 0 ? value / price : 0;
  return TIERS.find((t) => mult >= t.minMultiple) ?? TIERS[TIERS.length - 1];
}

export const tierOfItem = (item: ProductItem, box: ProductBox): Tier => tierOf(item.value, box.price);

/** rgba 글로우. accent 가 항상 6자리 hex 라는 전제 위에서만 동작한다. */
export function glow(accent: string, alpha: number): string {
  const n = parseInt(accent.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export interface TierSlice {
  tier: Tier;
  /** 해당 등급 항목들의 드롭 확률 합계(%) */
  rate: number;
  count: number;
  /** 구간 내 최고 실판매가 */
  best: number;
}

/**
 * 박스의 등급별 확률 분포. 상위 등급부터 내림차순이며 항목이 없는 등급은 빠진다.
 * 합계는 항상 100 (드롭테이블 자체가 100 이므로).
 */
export function tierBreakdown(box: ProductBox): TierSlice[] {
  const acc = new Map<TierKey, TierSlice>();
  for (const item of box.items) {
    const tier = tierOf(item.value, box.price);
    const cur = acc.get(tier.key);
    if (cur) {
      cur.rate += item.dropRate;
      cur.count += 1;
      cur.best = Math.max(cur.best, item.value);
    } else {
      acc.set(tier.key, { tier, rate: item.dropRate, count: 1, best: item.value });
    }
  }
  return TIERS.filter((t) => acc.has(t.key)).map((t) => {
    const s = acc.get(t.key)!;
    return { ...s, rate: +s.rate.toFixed(4) };
  });
}

/** 박스 최고 실판매가 항목의 등급 — 카드 보더/뱃지 색을 정한다. */
export const boxTopTier = (box: ProductBox): Tier =>
  tierOf(Math.max(...box.items.map((i) => i.value)), box.price);

/** 박스 최저 실판매가 항목의 등급 — 최소 보장 구성의 등급. */
export const boxFloorTier = (box: ProductBox): Tier => tierOf(box.guaranteedMin, box.price);

/** 최고 실판매가 / 지불액 배수. 카드의 핵심 후크. */
export const topMultiple = (box: ProductBox): number =>
  Math.max(...box.items.map((i) => i.value)) / box.price;

/** 지불액 이상(1배 이상)의 실물을 받을 확률 합계(%). */
export const breakEvenRate = (box: ProductBox): number =>
  +box.items
    .filter((i) => i.value >= box.price)
    .reduce((s, i) => s + i.dropRate, 0)
    .toFixed(4);

export const formatMultiple = (m: number): string =>
  m >= 100 ? `${Math.round(m)}배` : m >= 10 ? `${m.toFixed(0)}배` : `${m.toFixed(1)}배`;
