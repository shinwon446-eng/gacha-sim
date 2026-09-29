/**
 * VOILA catalogue. Every published box uses an exact million-slot wave schedule.
 * The schedule is calibrated against cash-equivalent payouts at 95% expected RTP.
 * Prices are in USDT. Product images resolve through productImages.ts.
 */

import { imageFor, type ProductImage } from "./productImages";
import { REFUND_RATE } from "./types";

export type BoxCategory = "dollar" | "tech" | "luxury" | "jackpot";

export interface CategoryFilter {
  key: BoxCategory | "all";
  label: string;
}

/** 라벨은 messages `categories.*` 가 로케일별로 덮어쓴다, 여기 값은 한국어 기본값 */
export const CATEGORY_FILTERS: CategoryFilter[] = [
  { key: "all", label: "전체" },
  { key: "dollar", label: "1달러의 행복" },
  { key: "tech", label: "애플&테크" },
  { key: "luxury", label: "명품&시계" },
  { key: "jackpot", label: "슈퍼카&골드바" },
];

export type SortKey = "featured" | "price-asc" | "price-desc" | "popularity";

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "추천순" },
  { key: "price-asc", label: "가격 낮은순" },
  { key: "price-desc", label: "가격 높은순" },
  { key: "popularity", label: "인기순" },
];

/**
 * physical, 실물(배송 또는 95% 즉시 회수)
 * digital, 글로벌 디지털 자산(기프트카드 코드 발송 또는 95% 즉시 회수, 배송, 관세 없음)
 * cash, USDT 즉시 캐시백. 개봉 즉시 100% 잔액에 적립된다(보관함을 거치지 않음)
 */
export type ItemKind = "physical" | "digital" | "cash";

export interface ProductItem {
  id: string;
  name: string;
  nameEn: string;
  kind: ItemKind;
  /** 실판매가(USDT, 소수 둘째 자리까지). cash 는 적립 금액 그 자체 */
  value: number;
  /** 드롭 확률(%). 박스 내 합계 100 */
  dropRate: number;
  code: string;
  tone: string;
  image: ProductImage;
  imageUrl: string | null;
}

export interface ProductBox {
  id: string;
  slug: string;
  title: string;
  titleEn: string;
  /** 1회 오픈 가격(USDT) */
  price: number;
  /** 최저 실판매가(USDT), items 에서 파생 */
  guaranteedMin: number;
  category: BoxCategory;
  code: string;
  tone: string;
  badge: string;
  image: ProductImage;
  imageUrl: string | null;
  tagline: string;
  trendingRank?: number;
  releasedAt: string;
  popularity: number;
  items: ProductItem[];
}

const T = {
  slate: "linear-gradient(135deg,#0d0d0d 0%,#242424 48%,#3d3d3d 78%,#0d0d0d 100%)",
  graphite: "linear-gradient(135deg,#0a0a0a 0%,#1e1e1e 50%,#333333 82%,#0a0a0a 100%)",
  coal: "linear-gradient(135deg,#060606 0%,#161616 55%,#262626 100%)",
  steel: "linear-gradient(135deg,#101010 0%,#2c2c2c 45%,#5a5a5a 80%,#101010 100%)",
};

/** Catalogue prizes. Published probabilities are assigned by withWaveSchedule. */
type ItemSpec = [id: string, name: string, nameEn: string, value: number, code: string, tone: string, kind?: ItemKind];

interface BoxSpec {
  slug: string;
  title: string;
  titleEn: string;
  category: BoxCategory;
  code: string;
  tone: string;
  badge: string;
  tagline: string;
  /** 1회 오픈 가격, 스펙 고정값 */
  price: number;
  trendingRank?: number;
  releasedAt: string;
  popularity: number;
  items: ItemSpec[];
}

/** 정가 기준 환원율 밴드, 상한은 1/REFUND_RATE(현금 차익 방지) */
export const RETAIL_RTP_MIN = 0.93;
export const RETAIL_RTP_MAX = 1 / REFUND_RATE;
/** 바닥 즉시 환전액 / 가격 밴드 */
export const FLOOR_CASH_MIN = 0.5;
export const FLOOR_CASH_MAX = 0.96;

/** 즉시 회수액(USDT), 실물, 디지털은 실판매가의 95%, USDT 캐시백은 100% */
export const sellValueOf = (item: Pick<ProductItem, "kind" | "value">): number => +(item.kind === "cash" ? item.value : item.value * REFUND_RATE).toFixed(2);
export const isCashItem = (item: Pick<ProductItem, "kind">): boolean => item.kind === "cash";

const violations: string[] = [];
const cents = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-9;

function buildBox(spec: BoxSpec): ProductBox {
  if (!cents(spec.price)) throw new Error(`${spec.slug}: price must use cents`);
  const items: ProductItem[] = spec.items
    .map(([id, name, nameEn, value, code, tone, kind = "physical"]) => {
      if (!cents(value)) throw new Error(`${id}: value must use cents`);
      const image = imageFor(id);
      return { id, name, nameEn, kind, value, dropRate: 0, code, tone, image, imageUrl: image.src };
    });
  const image = imageFor(spec.slug);
  return {
    id: spec.slug,
    slug: spec.slug,
    title: spec.title,
    titleEn: spec.titleEn,
    price: spec.price,
    guaranteedMin: 0,
    category: spec.category,
    code: spec.code,
    tone: spec.tone,
    badge: spec.badge,
    image,
    imageUrl: image.src,
    tagline: spec.tagline,
    trendingRank: spec.trendingRank,
    releasedAt: spec.releasedAt,
    popularity: spec.popularity,
    items,
  };
}

const SPECS: BoxSpec[] = [
  // ── 🔥 1달러의 행복 ─────────────────────────────────────────
  {
    slug: "dollar-apple",
    title: "1달러 애플 박스",
    titleEn: "one dollar apple box",
    category: "dollar",
    code: "DAP",
    tone: T.graphite,
    badge: "1달러",
    tagline: "1달러로 아이폰 16 프로 도전. 0.5배 즉시 캐시백부터 15배 이상 상품까지.",
    price: 1,
    trendingRank: 1,
    releasedAt: "2026-09-18",
    popularity: 184200,
    items: [
      ["da-iphone16", "아이폰 16 프로 256GB", "iPhone 16 Pro 256GB", 1000, "IP16P", T.graphite],
      ["aud-airpods", "에어팟 맥스 USB-C", "AirPods Max USB-C", 549, "APMX", T.slate],
      ["da-watchse", "애플워치 SE 3", "Apple Watch SE 3", 249, "AWSE", T.slate],
      ["da-airpods4", "에어팟 4 ANC", "AirPods 4 ANC", 129, "APD4", T.slate],
      ["gc-apple100", "애플 기프트카드 $100", "Apple Gift Card $100", 100, "AGC1", T.coal, "digital"],
      ["usdt-50", "50 USDT 인스턴트 드롭", "50 USDT Instant Drop", 50, "U50", T.coal, "cash"],
    ],
  },
  {
    slug: "dollar-galaxy",
    title: "1달러 갤럭시 박스",
    titleEn: "one dollar galaxy box",
    category: "dollar",
    code: "DGX",
    tone: T.graphite,
    badge: "1달러",
    tagline: "1달러로 갤럭시 Z 폴드8 도전. 0.5배 즉시 캐시백부터 15배 이상 상품까지.",
    price: 1,
    trendingRank: 8,
    releasedAt: "2026-09-18",
    popularity: 121400,
    items: [
      ["flg-fold", "갤럭시 Z 폴드8 1TB", "Galaxy Z Fold8 1TB", 2000, "ZF8", T.graphite],
      ["flg-flip", "갤럭시 Z 플립8", "Galaxy Z Flip8", 1100, "ZFL8", T.graphite],
      ["da-buds", "갤럭시 버즈4 프로", "Galaxy Buds4 Pro", 199, "GB4P", T.slate],
      ["gc-amazon100", "아마존 글로벌 기프트카드 $100", "Amazon Global Gift Card $100", 100, "AMZ1", T.coal, "digital"],
      ["da-charger", "삼성 45W 초고속 충전기", "Samsung 45W Charger", 39, "S45W", T.coal],
      ["usdt-50", "50 USDT 인스턴트 드롭", "50 USDT Instant Drop", 50, "U50", T.coal, "cash"],
    ],
  },
  {
    slug: "dollar-gaming",
    title: "1달러 게이밍 박스",
    titleEn: "one dollar gaming box",
    category: "dollar",
    code: "DGM",
    tone: T.graphite,
    badge: "1달러",
    tagline: "1달러로 RTX 5090, 스위치 2 도전. 0.5배 즉시 캐시백부터 15배 이상 상품까지.",
    price: 1,
    trendingRank: 3,
    releasedAt: "2026-09-18",
    popularity: 143900,
    items: [
      ["gpu-5090", "지포스 RTX 5090 파운더스", "RTX 5090 Founders", 2300, "5090", T.graphite],
      ["dg-ps5", "플레이스테이션 5 슬림", "PlayStation 5 Slim", 499, "PS5S", T.slate],
      ["dg-switch2", "닌텐도 스위치 2", "Nintendo Switch 2", 449, "NSW2", T.slate],
      ["gpu-kb", "웃키 HE65 자석축 키보드", "Wooting HE65", 199, "HE65", T.slate],
      ["gc-steam50", "스팀 월렛 $50", "Steam Wallet $50", 50, "STM5", T.coal, "digital"],
      ["usdt-50", "50 USDT 인스턴트 드롭", "50 USDT Instant Drop", 50, "U50", T.coal, "cash"],
    ],
  },
  // ── ⚡ 커피&버거 스타터 (3 ~ 5 USDT) ────────────────────────
  {
    slug: "starter-ps5",
    title: "PS5 프로 스타터 박스",
    titleEn: "ps5 pro starter box",
    category: "tech",
    code: "SPS",
    tone: T.slate,
    badge: "테크",
    tagline: "3달러로 PS5 프로 도전. 0.5배 즉시 캐시백부터 15배 이상 상품까지.",
    price: 3,
    trendingRank: 6,
    releasedAt: "2026-09-18",
    popularity: 98700,
    items: [
      ["sp-ps5pro", "플레이스테이션 5 프로", "PlayStation 5 Pro", 700, "PS5P", T.slate],
      ["sp-switch2", "닌텐도 스위치 2", "Nintendo Switch 2", 449, "SW2B", T.slate],
      ["sp-headset", "소니 인존 H9 헤드셋", "Sony INZONE H9", 299, "INZ9", T.slate],
      ["sp-dualsense", "듀얼센스 엣지 컨트롤러", "DualSense Edge", 199, "DSEG", T.coal],
      ["gc-steam50", "스팀 월렛 $50", "Steam Wallet $50", 50, "STM5", T.coal, "digital"],
      ["sp-gift", "PSN 기프트카드 10 USDT", "PSN Gift Card 10 USDT", 10, "PSNG", T.coal, "digital"],
    ],
  },
  {
    slug: "starter-macbook",
    title: "맥북 프로 M4 박스",
    titleEn: "macbook pro m4 box",
    category: "tech",
    code: "SMB",
    tone: T.slate,
    badge: "테크",
    tagline: "5달러로 맥북 프로 M4 맥스 도전. 0.5배 즉시 캐시백부터 15배 이상 상품까지.",
    price: 5,
    trendingRank: 2,
    releasedAt: "2026-09-18",
    popularity: 162300,
    items: [
      ["apx-mbp", "맥북 프로 16 M4 맥스", "MacBook Pro 16 M4 Max", 5720, "MBP16", T.slate],
      ["gtc-ipadpro", "아이패드 프로 11 M5", "iPad Pro 11 M5", 1300, "IPP11", T.graphite],
      ["gtc-mba", "맥북 에어 13 M4", "MacBook Air 13 M4", 1220, "MBA13", T.graphite],
      ["gc-apple500", "애플 기프트카드 $500", "Apple Gift Card $500", 500, "AGC5", T.coal, "digital"],
      ["flg-buds", "에어팟 프로 3", "AirPods Pro 3", 249, "APP3", T.slate],
      ["gc-apple100", "애플 기프트카드 $100", "Apple Gift Card $100", 100, "AGC1", T.coal, "digital"],
    ],
  },
  {
    slug: "starter-phone",
    title: "아이폰 17 프로 박스",
    titleEn: "iphone 17 pro box",
    category: "tech",
    code: "SPH",
    tone: T.slate,
    badge: "테크",
    tagline: "5달러로 아이폰 17 프로 맥스 도전. 0.5배 즉시 캐시백부터 15배 이상 상품까지.",
    price: 5,
    trendingRank: 9,
    releasedAt: "2026-09-18",
    popularity: 90100,
    items: [
      ["flg-iphone", "아이폰 17 프로 맥스 1TB", "iPhone 17 Pro Max 1TB", 2594, "IP17M", T.graphite],
      ["flg-pixel", "픽셀 10 프로 XL", "Pixel 10 Pro XL", 1100, "PX10", T.graphite],
      ["flg-watch", "애플워치 울트라 3", "Apple Watch Ultra 3", 799, "AWU3", T.slate],
      ["sp2-airpods", "에어팟 4", "AirPods 4", 129, "AP4", T.slate],
      ["gc-amazon100", "아마존 글로벌 기프트카드 $100", "Amazon Global Gift Card $100", 100, "AMZ1", T.coal, "digital"],
      ["usdt-50", "50 USDT 인스턴트 드롭", "50 USDT Instant Drop", 50, "U50", T.coal, "cash"],
    ],
  },
  // ── 👑 럭셔리 볼트 (20 ~ 50 USDT) ───────────────────────────
  {
    slug: "vault-submariner",
    title: "롤렉스 서브마리너 컬렉션",
    titleEn: "rolex submariner collection",
    category: "luxury",
    code: "VSB",
    tone: T.steel,
    badge: "워치",
    tagline: "20달러로 롤렉스 서브마리너 도전. 0.5배 즉시 캐시백부터 15배 이상 상품까지.",
    price: 20,
    trendingRank: 4,
    releasedAt: "2026-09-18",
    popularity: 131600,
    items: [
      ["rlx-sub", "롤렉스 서브마리너 126610LN", "Rolex Submariner 126610LN", 15600, "SUBM", T.steel],
      ["rlx-omega", "오메가 스피드마스터 프로", "Omega Speedmaster Pro", 7100, "SPDM", T.graphite],
      ["rlx-tudor", "튜더 블랙베이 58", "Tudor Black Bay 58", 3830, "BB58", T.graphite],
      ["rlx-seiko", "세이코 프로스펙스 마린마스터", "Seiko Prospex Marinemaster", 935, "PRSX", T.slate],
      ["rlx-hamilton", "해밀턴 카키 필드 메카니컬", "Hamilton Khaki Field Mech", 500, "HMLT", T.slate],
      ["usdt-100", "100 USDT 인스턴트 드롭", "100 USDT Instant Drop", 100, "U100", T.coal, "cash"],
    ],
  },
  {
    slug: "vault-omega",
    title: "스위스 럭셔리 워치 컬렉션",
    titleEn: "swiss luxury watch collection",
    category: "luxury",
    code: "VOM",
    tone: T.steel,
    badge: "워치",
    tagline: "25달러로 오메가, 튜더, 티쏘 도전. 0.5배 즉시 캐시백부터 15배 이상 상품까지.",
    price: 25,
    releasedAt: "2026-09-18",
    popularity: 74800,
    items: [
      ["sws-omega", "오메가 아쿠아테라 150M", "Omega Aqua Terra 150M", 5800, "AQTR", T.steel],
      ["sws-tudor", "튜더 펠라고스 39", "Tudor Pelagos 39", 4400, "PLGS", T.graphite],
      ["sws-longines", "론진 스피릿 줄루 5", "Longines Spirit Zulu 5", 2300, "LGZ5", T.graphite],
      ["sws-oris", "오리스 아퀴스 데이트", "Oris Aquis Date", 2100, "ORIS", T.slate],
      ["sws-tissot", "티쏘 PRX 파워매틱 80", "Tissot PRX Powermatic 80", 650, "PRX", T.slate],
      ["usdt-100", "100 USDT 인스턴트 드롭", "100 USDT Instant Drop", 100, "U100", T.coal, "cash"],
    ],
  },
  {
    slug: "vault-handbag",
    title: "에르메스 & 샤넬 부티크",
    titleEn: "hermes and chanel boutique",
    category: "luxury",
    code: "VHB",
    tone: T.steel,
    badge: "럭셔리",
    tagline: "30달러로 에르메스 버킨 도전. 0.5배 즉시 캐시백부터 15배 이상 상품까지.",
    price: 30,
    trendingRank: 10,
    releasedAt: "2026-09-18",
    popularity: 83200,
    items: [
      ["grl-birkin25", "에르메스 버킨 25 크로커다일", "Hermès Birkin 25 Croc", 60000, "BRKN", T.steel],
      ["lth-chanel", "샤넬 클래식 플랩 미디움", "Chanel Classic Flap Medium", 11000, "CHNL", T.graphite],
      ["grl-dior", "디올 레이디 디올 미디움", "Dior Lady Dior Medium", 4500, "LDDR", T.graphite],
      ["grl-polene", "폴렌 넘버원 나노", "Polène Numéro Un Nano", 380, "PLN1", T.slate],
      ["glx-scarf", "에르메스 트윌리 스카프", "Hermès Twilly Scarf", 305, "TWLY", T.slate],
      ["usdt-100", "100 USDT 인스턴트 드롭", "100 USDT Instant Drop", 100, "U100", T.coal, "cash"],
    ],
  },
  // ── 🚀 슈퍼카 & 골드바 잭팟 ─────────────────────────────────
  {
    slug: "vault-gold",
    title: "순금 골드바 컬렉션",
    titleEn: "pure gold bar collection",
    category: "jackpot",
    code: "VGD",
    tone: T.steel,
    badge: "골드",
    tagline: "50달러로 골드바 1kg 도전. 0.5배 즉시 캐시백부터 15배 이상 상품까지.",
    price: 50,
    trendingRank: 7,
    releasedAt: "2026-09-18",
    popularity: 95400,
    items: [
      ["vg-gold1kg", "골드바 1kg (99.99%)", "Gold Bar 1kg (99.99%)", 100000, "AU1K", T.steel],
      ["rlx-daytona", "롤렉스 데이토나 116500LN", "Rolex Daytona 116500LN", 42000, "DYTN", T.steel],
      ["vg-gold100g", "골드바 100g", "Gold Bar 100g", 10000, "AU100", T.graphite],
      ["vg-gold10g", "골드바 10g", "Gold Bar 10g", 1000, "AU10", T.graphite],
      ["vg-coin", "골드 코인 1/10oz", "Gold Coin 1/10 oz", 320, "AUCN", T.slate],
      ["vg-silver", "실버바 100g", "Silver Bar 100g", 120, "AG100", T.slate],
    ],
  },
  {
    slug: "jackpot-cybertruck",
    title: "테슬라 사이버트럭 에디션",
    titleEn: "tesla cybertruck edition",
    category: "jackpot",
    code: "JCT",
    tone: T.steel,
    badge: "드림 박스",
    tagline: "100달러로 사이버트럭 도전. 0.5배 즉시 캐시백부터 15배 이상 상품까지.",
    price: 100,
    trendingRank: 5,
    releasedAt: "2026-09-18",
    popularity: 110800,
    items: [
      ["ctd-cybertruck", "테슬라 사이버트럭 사이버비스트", "Tesla Cybertruck Cyberbeast", 130000, "CYBR", T.steel],
      ["ctd-model3", "테슬라 모델 3 퍼포먼스", "Tesla Model 3 Performance", 47000, "M3P", T.steel],
      ["ctd-visionpro", "애플 비전 프로 1TB", "Apple Vision Pro 1TB", 3910, "AVP", T.graphite],
      ["ctd-segway", "세그웨이 GT3 프로 전동 스쿠터", "Segway GT3 Pro", 2900, "GT3P", T.graphite],
      ["ctd-dji", "DJI 에어 3S 플라이 모어", "DJI Air 3S Fly More", 1350, "AIR3", T.slate],
      ["ctd-helmet", "슈베르트 C5 헬멧", "Schuberth C5 Helmet", 650, "C5", T.slate],
    ],
  },
  {
    slug: "jackpot-supercar",
    title: "포르쉐 911 슈퍼카 에디션",
    titleEn: "porsche 911 supercar edition",
    category: "jackpot",
    code: "JSC",
    tone: T.steel,
    badge: "드림 박스",
    tagline: "100달러로 포르쉐 911 도전. 0.5배 즉시 캐시백부터 15배 이상 상품까지.",
    price: 100,
    releasedAt: "2026-09-18",
    popularity: 88600,
    items: [
      ["js-porsche", "포르쉐 911 카레라", "Porsche 911 Carrera", 130000, "P911", T.steel],
      ["js-modely", "테슬라 모델 Y 롱레인지", "Tesla Model Y Long Range", 45000, "MDLY", T.steel],
      ["js-ducati", "두카티 파니갈레 V2", "Ducati Panigale V2", 18000, "PNGL", T.graphite],
      ["urb-vanmoof", "반무프 S5 전기자전거", "VanMoof S5", 3200, "VMS5", T.graphite],
      ["ctd-brompton", "브롬톤 P라인 어반", "Brompton P Line Urban", 2200, "BRMP", T.slate],
      ["urb-garmin", "가민 엣지 1050 사이클링 컴퓨터", "Garmin Edge 1050", 700, "EDGE", T.slate],
    ],
  },
];

export const CATALOG_ODDS_VERSION = "2026-09-30-wave-95-v1";

// One unit is one outcome in a million, or 0.0001%. The fixed bands leave 28%
// of outcomes at or above 0.99x. Existing catalogue prizes each keep one slot;
// the 15x digital prize takes the rest of the 1% surge band.
const SLOTS = 1_000_000;
const FLOOR_SLOTS = [460_000, 260_000, 170_000] as const;
const RECOVERY_SLOTS = 100_000;
const SURGE_SLOTS = 10_000;
const TARGET_CASH_RTP = 0.95;
const CASH_RTP_MIN = 0.945;
const CASH_RTP_MAX = 0.955;

function waveItem(value: number, kind: "cash" | "digital", role: "cashback" | "drop" | "gift", slots: number): ProductItem {
  const amount = +value.toFixed(2);
  const id = `wave-${role}-${Math.round(amount * 100)}`;
  const image = imageFor(id);
  const label = role === "cashback" ? "즉시 캐시백" : role === "drop" ? "인스턴트 드롭" : "디지털 기프트카드";
  const labelEn = role === "cashback" ? "Instant Cashback" : role === "drop" ? "Instant Drop" : "Digital Gift Card";
  return { id, name: `${amount} USDT ${label}`, nameEn: `${amount} USDT ${labelEn}`, kind, value: amount,
    dropRate: slots / 10_000, code: `W${role[0].toUpperCase()}${Math.round(amount * 100)}`, tone: T.coal, image, imageUrl: image.src };
}

function withWaveSchedule(box: ProductBox): ProductBox {
  const price = box.price;
  const premium = box.items.map((item) => ({ ...item, dropRate: 1 / 10_000 }));
  if (premium.length >= SURGE_SLOTS) throw new Error(`${box.slug}: too many catalogue prizes`);
  const fixed = [
    waveItem(price * 0.5, "cash", "cashback", FLOOR_SLOTS[0]),
    waveItem(price * 0.8, "cash", "cashback", FLOOR_SLOTS[1]),
    waveItem(price * 0.99, "cash", "cashback", FLOOR_SLOTS[2]),
    waveItem(price * 15, "digital", "gift", SURGE_SLOTS - premium.length),
    ...premium,
  ];
  const fixedReturn = fixed.reduce((sum, item) => sum + sellValueOf(item) * item.dropRate / 100, 0) / price;
  // A 2x gift card pays 1.9x cash equivalent; a 5x instant drop pays 5x.
  // Solve the remaining 10% recovery budget against the actual prize values.
  const recoveryTwoValue = sellValueOf({ kind: "digital", value: price * 2 }) / price;
  const recoveryFiveValue = 5;
  const fiveSlots = Math.max(1, Math.min(RECOVERY_SLOTS - 1,
    Math.round((TARGET_CASH_RTP - fixedReturn - 0.1 * recoveryTwoValue)
      * SLOTS / (recoveryFiveValue - recoveryTwoValue))));
  const items = [
    ...fixed,
    waveItem(price * 2, "digital", "gift", RECOVERY_SLOTS - fiveSlots),
    waveItem(price * 5, "cash", "drop", fiveSlots),
  ].sort((a, b) => a.dropRate - b.dropRate || b.value - a.value);
  const slots = items.reduce((sum, item) => sum + Math.round(item.dropRate * 10_000), 0);
  const cashRtp = items.reduce((sum, item) => sum + sellValueOf(item) * item.dropRate / 100, 0) / price;
  const retailRtp = items.reduce((sum, item) => sum + item.value * item.dropRate / 100, 0) / price;
  const ids = new Set(items.map((item) => item.id));
  if (slots !== SLOTS || ids.size !== items.length) violations.push(`${box.slug}: invalid slot total or duplicate item id`);
  if (cashRtp < CASH_RTP_MIN || cashRtp > CASH_RTP_MAX) violations.push(`${box.slug}: cash RTP ${cashRtp}`);
  if (retailRtp < RETAIL_RTP_MIN || retailRtp >= RETAIL_RTP_MAX) violations.push(`${box.slug}: retail RTP ${retailRtp}`);
  return { ...box, guaranteedMin: price * 0.5, items };
}

export const BOXES: ProductBox[] = SPECS.map(buildBox).map(withWaveSchedule);

if (violations.length > 0) {
  throw new Error(["상품 데이터셋 불변식 위반", ...violations].join("\n  - "));
}

export const BOX_BY_SLUG: Record<string, ProductBox> = Object.fromEntries(BOXES.map((b) => [b.slug, b]));
export const getBoxBySlug = (slug: string): ProductBox | undefined => BOX_BY_SLUG[slug];

// ── 파생 계산 ──────────────────────────────────────────────

/** 정가 기준 기대값(USDT). 바닥이 가격에 붙은 박스는 price 를 넘을 수 있다, 현금 환산은 항상 미만. */
export const expectedValue = (box: ProductBox): number => box.items.reduce((s, i) => s + (i.value * i.dropRate) / 100, 0);
/** 정가 기준 환원율 */
export const retailReturn = (box: ProductBox): number => expectedValue(box) / box.price;
/** Cash-equivalent expected return from the published probability table. */
export const cashReturn = (box: ProductBox): number => box.items.reduce((s, i) => s + (sellValueOf(i) * i.dropRate) / 100, 0) / box.price;
/** 바닥 즉시 환전액(USDT), 바닥 등급은 USDT 캐시백이라 100% 적립. "꽝이어도 이만큼은 돌아온다" */
export const floorCash = (box: ProductBox): number => +box.guaranteedMin.toFixed(2);
/** 바닥 환전액 / 가격 */
export const floorRatio = (box: ProductBox): number => floorCash(box) / box.price;
/** 바닥 보장, 모든 박스가 참(빌더가 밴드를 강제). 표기 조건용으로 남긴다. */
export const isValueGuaranteed = (box: ProductBox): boolean => floorRatio(box) >= FLOOR_CASH_MIN;

export const dropTable = (box: ProductBox): ProductItem[] => [...box.items].sort((a, b) => b.value - a.value);
export const ceilingValue = (box: ProductBox): number => Math.max(...box.items.map((i) => i.value));

// ── 행(Row) 셀렉터 ─────────────────────────────────────────

/** TOP 10, trendingRank 우선, 나머지는 인기순 */
export const trending = (limit = 10): ProductBox[] =>
  [...BOXES]
    .filter((b) => typeof b.trendingRank === "number")
    .sort((a, b) => a.trendingRank! - b.trendingRank!)
    .concat([...BOXES].filter((b) => typeof b.trendingRank !== "number").sort((a, b) => b.popularity - a.popularity))
    .slice(0, limit);

const rowOf = (c: BoxCategory) => (): ProductBox[] => BOXES.filter((b) => b.category === c).sort((a, b) => b.popularity - a.popularity);
/** 🔥 1달러의 행복 */
export const dollarRow = rowOf("dollar");
/** ⚡ 애플&테크 */
export const techRow = rowOf("tech");
/** 👑 명품&시계 */
export const luxuryRow = rowOf("luxury");
/** 🚗 슈퍼카&골드바 */
export const jackpotRow = rowOf("jackpot");

/** 히어로, 1 USDT 박스 우선 */
export const heroBox = (): ProductBox => dollarRow()[0] ?? trending(1)[0];

export const byCategory = (key: BoxCategory | "all"): ProductBox[] => (key === "all" ? BOXES : BOXES.filter((b) => b.category === key));

export function sortBoxes(list: ProductBox[], key: SortKey): ProductBox[] {
  const out = [...list];
  switch (key) {
    case "price-asc":
      return out.sort((a, b) => a.price - b.price);
    case "price-desc":
      return out.sort((a, b) => b.price - a.price);
    case "popularity":
      return out.sort((a, b) => b.popularity - a.popularity);
    default:
      return out.sort((a, b) => (a.trendingRank ?? 99) - (b.trendingRank ?? 99) || b.popularity - a.popularity);
  }
}

/** Preserve the full published million-slot resolution in every probability label. */
export const formatRate = (r: number): string => `${Number(r.toFixed(4))}%`;

export { REFUND_RATE };
