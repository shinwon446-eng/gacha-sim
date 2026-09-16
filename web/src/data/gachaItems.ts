/**
 * 글로벌 가챠 플랫폼 아이템 30종 — 단일 원천.
 *
 * 규칙
 *  - imageSrc 는 반드시 `/assets/items/${id}.svg`. public/assets/items/ 의 더미 에셋과 확장자·id 가 1:1 이다.
 *    (tests/gachaItems.test.ts 가 파일 존재까지 검증한다.)
 *  - 등급은 usdtValue 와 단조: S > A > B > C 구간이 겹치지 않는다.
 *  - glowColor 는 등급마다 하나. S 버건디-레드 / A 골드 / B 사이언 / C 실버.
 *  - 이름에 이모지·'&' 를 쓰지 않는다 (SVG 텍스트로 그대로 들어간다).
 */

export interface GachaItem {
  id: string;
  name: string;
  category: "crypto" | "watch" | "tech" | "luxury" | "voucher";
  tier: "S" | "A" | "B" | "C";
  usdtValue: number;
  imageSrc: string; // `/assets/items/${id}.svg` (더미 에셋과 확장자 일치 필수)
  glowColor: string;
}

export const TIER_GLOW: Record<GachaItem["tier"], string> = {
  S: "#FF4655",
  A: "#FFD700",
  B: "#00D2FF",
  C: "#A0AEC0",
};

const img = (id: string): string => `/assets/items/${id}.svg`;

export const GACHA_ITEMS: GachaItem[] = [
  // ── Tier S (5) ─────────────────────────────────────────
  { id: "s-btc-1", name: "1 BTC", category: "crypto", tier: "S", usdtValue: 65000, imageSrc: img("s-btc-1"), glowColor: TIER_GLOW.S },
  { id: "s-rolex-daytona", name: "Rolex Daytona 116500LN", category: "watch", tier: "S", usdtValue: 42000, imageSrc: img("s-rolex-daytona"), glowColor: TIER_GLOW.S },
  { id: "s-ap-royal-oak", name: "AP Royal Oak 15500ST", category: "watch", tier: "S", usdtValue: 38000, imageSrc: img("s-ap-royal-oak"), glowColor: TIER_GLOW.S },
  { id: "s-eth-10", name: "10 ETH", category: "crypto", tier: "S", usdtValue: 32000, imageSrc: img("s-eth-10"), glowColor: TIER_GLOW.S },
  { id: "s-hermes-birkin", name: "Hermes Birkin 30 Togo", category: "luxury", tier: "S", usdtValue: 28000, imageSrc: img("s-hermes-birkin"), glowColor: TIER_GLOW.S },

  // ── Tier A (8) ─────────────────────────────────────────
  { id: "a-rolex-submariner", name: "Rolex Submariner 126610LN", category: "watch", tier: "A", usdtValue: 15500, imageSrc: img("a-rolex-submariner"), glowColor: TIER_GLOW.A },
  { id: "a-sol-100", name: "100 SOL", category: "crypto", tier: "A", usdtValue: 15000, imageSrc: img("a-sol-100"), glowColor: TIER_GLOW.A },
  { id: "a-chanel-flap", name: "Chanel Classic Flap Medium", category: "luxury", tier: "A", usdtValue: 11000, imageSrc: img("a-chanel-flap"), glowColor: TIER_GLOW.A },
  { id: "a-omega-speedmaster", name: "Omega Speedmaster Pro", category: "watch", tier: "A", usdtValue: 7000, imageSrc: img("a-omega-speedmaster"), glowColor: TIER_GLOW.A },
  { id: "a-lv-capucines", name: "Louis Vuitton Capucines MM", category: "luxury", tier: "A", usdtValue: 7000, imageSrc: img("a-lv-capucines"), glowColor: TIER_GLOW.A },
  { id: "a-macbook-pro-16", name: "MacBook Pro 16 M4 Max", category: "tech", tier: "A", usdtValue: 4500, imageSrc: img("a-macbook-pro-16"), glowColor: TIER_GLOW.A },
  { id: "a-tudor-bb58", name: "Tudor Black Bay 58", category: "watch", tier: "A", usdtValue: 3800, imageSrc: img("a-tudor-bb58"), glowColor: TIER_GLOW.A },
  { id: "a-eth-1", name: "1 ETH", category: "crypto", tier: "A", usdtValue: 3200, imageSrc: img("a-eth-1"), glowColor: TIER_GLOW.A },

  // ── Tier B (8) ─────────────────────────────────────────
  { id: "b-rtx-5090", name: "GeForce RTX 5090 FE", category: "tech", tier: "B", usdtValue: 2400, imageSrc: img("b-rtx-5090"), glowColor: TIER_GLOW.B },
  { id: "b-goyard-st-louis", name: "Goyard Saint Louis PM", category: "luxury", tier: "B", usdtValue: 1900, imageSrc: img("b-goyard-st-louis"), glowColor: TIER_GLOW.B },
  { id: "b-eth-05", name: "0.5 ETH", category: "crypto", tier: "B", usdtValue: 1600, imageSrc: img("b-eth-05"), glowColor: TIER_GLOW.B },
  { id: "b-ipad-pro-13", name: "iPad Pro 13 M5", category: "tech", tier: "B", usdtValue: 1500, imageSrc: img("b-ipad-pro-13"), glowColor: TIER_GLOW.B },
  { id: "b-iphone-17-pro", name: "iPhone 17 Pro 256GB", category: "tech", tier: "B", usdtValue: 1200, imageSrc: img("b-iphone-17-pro"), glowColor: TIER_GLOW.B },
  { id: "b-voucher-1000", name: "1,000 USDT Voucher", category: "voucher", tier: "B", usdtValue: 1000, imageSrc: img("b-voucher-1000"), glowColor: TIER_GLOW.B },
  { id: "b-tissot-prx", name: "Tissot PRX Powermatic 80", category: "watch", tier: "B", usdtValue: 700, imageSrc: img("b-tissot-prx"), glowColor: TIER_GLOW.B },
  { id: "b-airpods-max", name: "AirPods Max USB-C", category: "tech", tier: "B", usdtValue: 550, imageSrc: img("b-airpods-max"), glowColor: TIER_GLOW.B },

  // ── Tier C (9) ─────────────────────────────────────────
  { id: "c-hamilton-khaki", name: "Hamilton Khaki Field", category: "watch", tier: "C", usdtValue: 500, imageSrc: img("c-hamilton-khaki"), glowColor: TIER_GLOW.C },
  { id: "c-prada-cardholder", name: "Prada Saffiano Cardholder", category: "luxury", tier: "C", usdtValue: 280, imageSrc: img("c-prada-cardholder"), glowColor: TIER_GLOW.C },
  { id: "c-airpods-4", name: "AirPods 4 ANC", category: "tech", tier: "C", usdtValue: 180, imageSrc: img("c-airpods-4"), glowColor: TIER_GLOW.C },
  { id: "c-doge-1000", name: "1,000 DOGE", category: "crypto", tier: "C", usdtValue: 120, imageSrc: img("c-doge-1000"), glowColor: TIER_GLOW.C },
  { id: "c-voucher-100", name: "100 USDT Voucher", category: "voucher", tier: "C", usdtValue: 100, imageSrc: img("c-voucher-100"), glowColor: TIER_GLOW.C },
  { id: "c-anker-hub", name: "Anker Prime USB-C Hub", category: "tech", tier: "C", usdtValue: 90, imageSrc: img("c-anker-hub"), glowColor: TIER_GLOW.C },
  { id: "c-voucher-50", name: "50 USDT Voucher", category: "voucher", tier: "C", usdtValue: 50, imageSrc: img("c-voucher-50"), glowColor: TIER_GLOW.C },
  { id: "c-voucher-25", name: "25 USDT Voucher", category: "voucher", tier: "C", usdtValue: 25, imageSrc: img("c-voucher-25"), glowColor: TIER_GLOW.C },
  { id: "c-usdt-10", name: "10 USDT", category: "crypto", tier: "C", usdtValue: 10, imageSrc: img("c-usdt-10"), glowColor: TIER_GLOW.C },
];

export const GACHA_ITEM_BY_ID: Record<string, GachaItem> = Object.fromEntries(
  GACHA_ITEMS.map((i) => [i.id, i]),
);

export const itemsByTier = (tier: GachaItem["tier"]): GachaItem[] =>
  GACHA_ITEMS.filter((i) => i.tier === tier);
