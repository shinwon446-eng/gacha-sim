import { itemLine, LINE_ORDER, type Box, type Item, type Line } from "./types";

/** 아이템별 확률(%) */
export function itemProbability(box: Box, item: Item): number {
  const total = box.items.reduce((s, i) => s + i.weight, 0);
  return (item.weight / total) * 100;
}

/** 라인별 합산 확률(%) */
export function lineProbabilities(box: Box): Record<Line, number> {
  const out: Record<Line, number> = { jackpot: 0, value: 0, start: 0 };
  for (const it of box.items) out[itemLine(it)] += itemProbability(box, it);
  return out;
}

export function formatProb(p: number): string {
  if (p >= 10) return p.toFixed(1) + "%";
  if (p >= 1) return p.toFixed(2) + "%";
  return p.toFixed(3) + "%";
}

/** 라인 우선 → 실판매가 순으로 가장 좋은 아이템 */
export function bestOf(items: Item[]): Item {
  return [...items].sort(
    (a, b) => LINE_ORDER.indexOf(itemLine(a)) - LINE_ORDER.indexOf(itemLine(b)) || b.value - a.value,
  )[0];
}

/** 박스의 1등 상품 */
export const topItem = (box: Box): Item => bestOf(box.items);

/** 박스 내 특정 라인의 아이템 목록 (실판매가 내림차순) */
export const itemsOfLine = (box: Box, line: Line): Item[] =>
  box.items.filter((i) => itemLine(i) === line).sort((a, b) => b.value - a.value);
