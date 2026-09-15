/** 시리즈 — 카탈로그의 3개 테마와 1:1 대응한다. */
export type Category = "apex" | "battle" | "sound";

/**
 * 상품 라인업 — 게임식 등급 표기 대신 실판매가 기준의 현실적 구분.
 * 라인은 임의로 붙이지 않고 `value`(실판매가 USD)에서 결정적으로 파생된다. 조작 여지 없음.
 */
export type Line = "jackpot" | "value" | "start";

/** 실판매가(USD) 경계 — 100만원 ≈ $700 */
export const LINE_THRESHOLDS = { jackpot: 700, value: 100 } as const;

export const lineOf = (valueUsd: number): Line =>
  valueUsd >= LINE_THRESHOLDS.jackpot ? "jackpot" : valueUsd >= LINE_THRESHOLDS.value ? "value" : "start";

export interface LineMeta {
  /** 브래킷 등급 표기 — 게임식 등급 약어를 대체한다 */
  grade: "[ORIGINALS]" | "[LIMITED]" | "[STANDARD]";
  label: string;
  short: string;
  desc: string;
  /** 등급 강조색. jackpot 만 크림슨, 나머지는 무채색 */
  color: string;
  /** 크리스프 1px 아웃라인 유틸 클래스명. 확산 글로우는 사용하지 않는다 */
  edge: string;
  /** @deprecated `edge` 사용. 동일한 값을 반환한다. */
  glow: string;
}

export const LINE_META: Record<Line, LineMeta> = {
  jackpot: {
    grade: "[ORIGINALS]",
    label: "초대박 라인업",
    short: "초대박",
    desc: "실판매가 100만원 이상",
    color: "#E50914",
    edge: "edge-crimson",
    glow: "edge-crimson",
  },
  value: {
    grade: "[LIMITED]",
    label: "본전 이상 실속템",
    short: "본전 이상",
    desc: "에어팟 · 스팀덱 · 게이밍 기어 · 스튜디오 마이크",
    color: "#E5E5E5",
    edge: "edge-white",
    glow: "edge-white",
  },
  start: {
    grade: "[STANDARD]",
    label: "스타트 라인업",
    short: "스타트",
    desc: "케이블 · 충전기 등 주변기기",
    color: "#737373",
    edge: "",
    glow: "",
  },
};

/** 확률표·정렬에서 쓰는 고정 순서 */
export const LINE_ORDER: Line[] = ["jackpot", "value", "start"];

export interface Item {
  id: string;
  /** 표시명. 현재 로케일 기본값(en)과 동일하게 유지된다. */
  name: string;
  name_en: string;
  name_zh: string;
  /** 실판매가(USD) — 라인 구분의 유일한 기준 */
  value: number;
  /** 상대 가중치. 박스 내 합계로 나눠 확률을 계산한다. */
  weight: number;
  /** 인증서/인보이스 식별자 (PSA 번호, 딜러십 인보이스 등) */
  cert: string;
  /** 애셋 코드 — 2~6자 대문자 A-Z0-9, 하이픈 1개 허용. AssetPlate 에 렌더된다. */
  code: string;
  /** CSS background */
  art: string;
}

/** 아이템의 라인 (value 에서 파생) */
export const itemLine = (item: Item): Line => lineOf(item.value);

export interface Box {
  id: string;
  title: string;
  name_en: string;
  name_zh: string;
  subtitle: string;
  category: Category;
  /** 1회 재생 가격(USD) */
  price: number;
  /** 최저 보장가(USD) — 어떤 결과든 이 값 이상의 실판매가를 수령한다 */
  guaranteed_min_value: number;
  art: string;
  /** 애셋 코드 — 2~6자 대문자 A-Z0-9, 하이픈 1개 허용. AssetPlate 에 렌더된다. */
  code: string;
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

export const CATEGORY_META: Record<Category, { label: string; label_en: string; label_zh: string; anchor: string }> = {
  apex: { label: "BLACK LABEL", label_en: "BLACK LABEL: Apex Tech", label_zh: "黑标系列：顶峰数码", anchor: "row-apex" },
  battle: { label: "OVERCLOCK", label_en: "OVERCLOCK: Battle Station", label_zh: "超频领域：战术装备", anchor: "row-battle" },
  sound: { label: "STUDIO ZERO", label_en: "STUDIO ZERO: Sound Stage", label_zh: "零号影音：声学工坊", anchor: "row-sound" },
};

export const REFUND_RATE = 0.8;
export const MULTI_DISCOUNT = 0.9;
