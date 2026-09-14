import type { Box, Item, Tier } from "./types";

/** 가중치 기반 무작위 추출 */
export function pickWeighted(items: Item[], rand: () => number = Math.random): Item {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rand() * total;
  for (const it of items) {
    r -= it.weight;
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

/** 아이템별 확률(%) */
export function itemProbability(box: Box, item: Item): number {
  const total = box.items.reduce((s, i) => s + i.weight, 0);
  return (item.weight / total) * 100;
}

/** 티어별 확률(%) */
export function tierProbabilities(box: Box): Record<Tier, number> {
  const out: Record<Tier, number> = { SSR: 0, SR: 0, R: 0, N: 0 };
  for (const it of box.items) out[it.tier] += itemProbability(box, it);
  return out;
}

export function formatProb(p: number): string {
  if (p >= 10) return p.toFixed(1) + "%";
  if (p >= 1) return p.toFixed(2) + "%";
  return p.toFixed(3) + "%";
}

export const TIER_ORDER: Tier[] = ["SSR", "SR", "R", "N"];

export function bestOf(items: Item[]): Item {
  return [...items].sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || b.value - a.value)[0];
}

export function topItem(box: Box): Item {
  return bestOf(box.items);
}
