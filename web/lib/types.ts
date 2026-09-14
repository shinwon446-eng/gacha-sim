export type Tier = "SSR" | "SR" | "R" | "N";
export type Category = "tech" | "tcg" | "luxury";

export interface Item {
  id: string;
  name: string;
  tier: Tier;
  /** 실시간 시세(USD) */
  value: number;
  /** 상대 가중치. 박스 내 합계로 나눠 확률을 계산한다. */
  weight: number;
  /** 인증서/인보이스 식별자 (PSA 번호, 딜러십 인보이스 등) */
  cert: string;
  emoji: string;
  /** CSS background (이미지 폴백) */
  art: string;
  /** 검증된 로컬 제품 사진 (public/images/products/...) */
  image?: string;
}

export interface Box {
  id: string;
  title: string;
  subtitle: string;
  category: Category;
  /** 1회 오픈 가격(USDT) */
  price: number;
  art: string;
  emoji: string;
  /** 대표 이미지 — 기본값은 최고 등급 상품의 사진 */
  image?: string;
  tagline: string;
  description: string;
  items: Item[];
  featured?: boolean;
  badge?: string;
}

export type OwnedStatus = "owned" | "shipped" | "refunded";

export interface OwnedItem {
  uid: string;
  boxId: string;
  item: Item;
  obtainedAt: number;
  status: OwnedStatus;
  tracking?: string;
}

export interface OpenEvent {
  id: string;
  user: string;
  boxId: string;
  item: Item;
  at: number;
  /** 샘플 데이터 여부 — UI에 DEMO 태그로 표시된다 */
  isDemo?: boolean;
}

export const TIER_META: Record<
  Tier,
  { label: string; color: string; text: string; glow: string; ring: string }
> = {
  SSR: {
    label: "SSR 신화급",
    color: "#FFD700",
    text: "text-gold",
    glow: "shadow-[0_0_60px_rgba(255,215,0,0.6)]",
    ring: "ring-gold",
  },
  SR: {
    label: "SR 전설급",
    color: "#C084FC",
    text: "text-purple-400",
    glow: "shadow-[0_0_40px_rgba(192,132,252,0.5)]",
    ring: "ring-purple-400",
  },
  R: {
    label: "Rare",
    color: "#60A5FA",
    text: "text-blue-400",
    glow: "shadow-[0_0_24px_rgba(96,165,250,0.4)]",
    ring: "ring-blue-400",
  },
  N: {
    label: "Normal",
    color: "#9CA3AF",
    text: "text-gray-400",
    glow: "",
    ring: "ring-gray-500",
  },
};

export const CATEGORY_META: Record<Category, { label: string; anchor: string }> = {
  tech: { label: "테크/사이버트럭", anchor: "row-tech" },
  tcg: { label: "TCG/포켓몬", anchor: "row-tcg" },
  luxury: { label: "럭셔리 시계", anchor: "row-luxury" },
};

export const REFUND_RATE = 0.8;
export const MULTI_DISCOUNT = 0.9;
