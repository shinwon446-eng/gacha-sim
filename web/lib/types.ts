export type Category = "tech" | "tcg" | "luxury";

/**
 * 상품 라인업 — 게임식 등급 표기 대신 실판매가 기준의 현실적 구분.
 * 라인은 임의로 붙이지 않고 `value`(실판매가 USD)에서 결정적으로 파생된다 → 조작 여지 없음.
 */
export type Line = "jackpot" | "value" | "start";

/** 실판매가(USD) 경계 — 100만원 ≈ $700 */
export const LINE_THRESHOLDS = { jackpot: 700, value: 100 } as const;

export const lineOf = (valueUsd: number): Line =>
  valueUsd >= LINE_THRESHOLDS.jackpot ? "jackpot" : valueUsd >= LINE_THRESHOLDS.value ? "value" : "start";

export const LINE_META: Record<
  Line,
  { label: string; short: string; desc: string; color: string; glow: string }
> = {
  jackpot: {
    label: "초대박 라인업",
    short: "초대박",
    desc: "실판매가 100만원 이상 — 최신 아이폰·맥북·명품",
    color: "#FFD700",
    glow: "shadow-[0_0_60px_rgba(255,215,0,0.6)]",
  },
  value: {
    label: "본전 이상 실속템",
    short: "본전 이상",
    desc: "에어팟·인기 게이밍 기어·백화점 상품권 5~10만원대",
    color: "#38BDF8",
    glow: "shadow-[0_0_28px_rgba(56,189,248,0.45)]",
  },
  start: {
    label: "스타트 라인업",
    short: "스타트",
    desc: "필수 액세서리·모바일 기프티콘",
    color: "#9CA3AF",
    glow: "",
  },
};

/** 확률표·정렬에서 쓰는 고정 순서 */
export const LINE_ORDER: Line[] = ["jackpot", "value", "start"];

export interface Item {
  id: string;
  name: string;
  /** 실판매가(USD) — 라인 구분의 유일한 기준 */
  value: number;
  /** 상대 가중치. 박스 내 합계로 나눠 확률을 계산한다. */
  weight: number;
  /** 인증서/인보이스 식별자 (PSA 번호, 딜러십 인보이스 등) */
  cert: string;
  emoji: string;
  /** CSS background */
  art: string;
}

/** 아이템의 라인 (value 에서 파생) */
export const itemLine = (item: Item): Line => lineOf(item.value);

export interface Box {
  id: string;
  title: string;
  subtitle: string;
  category: Category;
  /** 1회 오픈 가격(USDT) */
  price: number;
  art: string;
  emoji: string;
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

export const CATEGORY_META: Record<Category, { label: string; anchor: string }> = {
  tech: { label: "테크/사이버트럭", anchor: "row-tech" },
  tcg: { label: "TCG/포켓몬", anchor: "row-tcg" },
  luxury: { label: "럭셔리 시계", anchor: "row-luxury" },
};

export const REFUND_RATE = 0.8;
export const MULTI_DISCOUNT = 0.9;
