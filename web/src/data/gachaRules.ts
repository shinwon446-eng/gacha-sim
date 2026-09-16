/**
 * 글로벌 가챠 규칙 — 확률은 등급에서 파생한다.
 *
 *  - 등급별 총 확률(TIER_SHARE)만 선언하고, 항목 확률은 같은 등급 안에서 균등 분배한다.
 *    항목마다 손으로 확률을 적으면 합계가 100 을 벗어나는 사고가 반드시 난다.
 *  - 난수는 Math.random 을 쓰지 않는다. crypto.getRandomValues 로 48비트 → [0,1).
 *  - 이 파일은 표시·데모용이다. 실제 서비스의 추첨은 서버에서만 한다.
 */

import { GACHA_ITEMS, type GachaItem } from "./gachaItems";

export type GachaTier = GachaItem["tier"];

/** 등급별 총 확률(%). 합계 100. S 에 1 BTC 가 있으므로 S 는 0.05% 다. */
export const TIER_SHARE: Record<GachaTier, number> = { S: 0.05, A: 0.95, B: 14, C: 85 };

export const TIER_ORDER: GachaTier[] = ["S", "A", "B", "C"];

export const TIER_LABEL: Record<GachaTier, string> = {
  S: "LEGENDARY",
  A: "EPIC",
  B: "RARE",
  C: "COMMON",
};

/** 정가 기준 목표 환원율. 가격은 여기서 역산된다 — 손으로 정하지 않는다. */
export const TARGET_RTP = 0.85;

export interface GachaOdds {
  item: GachaItem;
  /** 항목 확률(%) */
  probability: number;
}

/** 전 항목의 확률표. 등급 순 → 밸류 내림차순. 합계는 정확히 100. */
export function oddsTable(items: GachaItem[] = GACHA_ITEMS): GachaOdds[] {
  const byTier = new Map<GachaTier, GachaItem[]>();
  for (const it of items) byTier.set(it.tier, [...(byTier.get(it.tier) ?? []), it]);
  const out: GachaOdds[] = [];
  for (const tier of TIER_ORDER) {
    const group = (byTier.get(tier) ?? []).sort((a, b) => b.usdtValue - a.usdtValue);
    if (group.length === 0) continue;
    const each = TIER_SHARE[tier] / group.length;
    for (const item of group) out.push({ item, probability: each });
  }
  return out;
}

/** 기대 수령 밸류(USDT) */
export const expectedValueUsdt = (items: GachaItem[] = GACHA_ITEMS): number =>
  oddsTable(items).reduce((s, o) => s + (o.item.usdtValue * o.probability) / 100, 0);

/**
 * 1회 오픈 가격(USDT) = ceil(EV / TARGET_RTP) 를 5 단위로 올림.
 * 항목 값이 바뀌면 가격이 따라 움직이므로 무위험 차익이 구조적으로 생기지 않는다.
 */
export const PULL_PRICE_USDT: number = Math.ceil(expectedValueUsdt() / TARGET_RTP / 5) * 5;

/** 지불액 이상을 받을 확률(%) */
export const breakEvenUsdt = (price = PULL_PRICE_USDT, items: GachaItem[] = GACHA_ITEMS): number =>
  +oddsTable(items)
    .filter((o) => o.item.usdtValue >= price)
    .reduce((s, o) => s + o.probability, 0)
    .toFixed(4);

/** [0,1) 균등 난수. 브라우저 crypto 가 없으면 throw — 조용히 Math.random 으로 떨어지지 않는다. */
export function secureUnit(): number {
  const g = globalThis.crypto;
  if (!g?.getRandomValues) throw new Error("crypto.getRandomValues 를 쓸 수 없는 환경");
  const buf = new Uint32Array(2);
  g.getRandomValues(buf);
  // 상위 16비트 + 하위 32비트 = 48비트
  return ((buf[0] & 0xffff) * 2 ** 32 + buf[1]) / 2 ** 48;
}

/** 확률표에 따라 1개를 뽑는다. rand 는 테스트에서 주입한다. */
export function pickGachaItem(rand: () => number = secureUnit, items: GachaItem[] = GACHA_ITEMS): GachaItem {
  const table = oddsTable(items);
  let r = rand() * 100;
  for (const o of table) {
    r -= o.probability;
    if (r < 0) return o.item;
  }
  // 부동소수 누적 오차로 끝까지 왔으면 마지막(최저) 항목
  return table[table.length - 1].item;
}

export const formatUsdt = (n: number): string =>
  n.toLocaleString("en-US", { maximumFractionDigits: n < 1 ? 2 : 0 }) + " USDT";

export const formatOdds = (p: number): string =>
  p >= 10 ? p.toFixed(1) + "%" : p >= 1 ? p.toFixed(2) + "%" : p.toFixed(3) + "%";
