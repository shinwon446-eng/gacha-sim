/**
 * GACHAFLIX 랜덤박스 데이터셋 — 마이크로 진입(1.00 USDT~) + 하우스 엣지 모델 (CLAUDE.md §1, §3).
 *
 * 경제 모델
 *   · 가격은 스펙에 명시한다(1 / 3 / 5 / 20 / 25 / 30 / 50 / 100 USDT). 확률표에서 EV 를 계산해 빌더가 밴드를 검증한다.
 *   · 정가 기준 환원율 retailRTP = EV / price ∈ [0.93, 1/REFUND_RATE) — 스펙 94~96%, 바닥이 가격에 붙은 잭팟 박스는 100% 를 조금 넘는다.
 *     상한이 1/0.95 미만이므로 현금 환산(× REFUND_RATE)은 항상 price 미만 — 무위험 차익 없음. 하우스 엣지(현금 기준) ≈ 4~12%.
 *   · 바닥 가치 보장: 최저 구성의 즉시 환전액(guaranteedMin × 0.95)이 가격의 80~96% 사이. "꽝이어도 N USDT 는 돌아온다"가 참이 되는 조건.
 *   · 금액은 USDT 소수 둘째 자리까지. 표기는 lib/formatCurrency 만 통과한다.
 *
 * 이미지 — 이 파일에 URL 을 쓰지 않는다. lib/productImages.ts 가 유일한 경로 원천이다.
 */

import { imageFor, type ProductImage } from "./productImages";
import { REFUND_RATE } from "./types";

export type BoxCategory = "dollar" | "tech" | "luxury" | "jackpot";

export interface CategoryFilter {
  key: BoxCategory | "all";
  label: string;
}

/** 라벨은 messages `categories.*` 가 로케일별로 덮어쓴다 — 여기 값은 한국어 기본값 */
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

export interface ProductItem {
  id: string;
  name: string;
  nameEn: string;
  /** 실판매가(USDT, 소수 둘째 자리까지) */
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
  /** 최저 실판매가(USDT) — items 에서 파생 */
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

/** 마지막 항목에 지정하면 잔여 확률을 자동으로 흡수한다. */
const REST = -1;

type ItemSpec = [id: string, name: string, nameEn: string, value: number, dropRate: number, code: string, tone: string];

interface BoxSpec {
  slug: string;
  title: string;
  titleEn: string;
  category: BoxCategory;
  code: string;
  tone: string;
  badge: string;
  tagline: string;
  /** 1회 오픈 가격 — 스펙 고정값 */
  price: number;
  trendingRank?: number;
  releasedAt: string;
  popularity: number;
  items: ItemSpec[];
}

/** 정가 기준 환원율 밴드 — 상한은 1/REFUND_RATE(현금 차익 방지) */
export const RETAIL_RTP_MIN = 0.93;
export const RETAIL_RTP_MAX = 1 / REFUND_RATE;
/** 바닥 즉시 환전액 / 가격 밴드 */
export const FLOOR_CASH_MIN = 0.8;
export const FLOOR_CASH_MAX = 0.96;

const violations: string[] = [];
const cents = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-9;

function buildBox(spec: BoxSpec): ProductBox {
  const declared = spec.items.filter((i) => i[4] !== REST);
  const restCount = spec.items.length - declared.length;
  if (restCount > 1) throw new Error(`${spec.slug}: REST 는 마지막 1개 항목에만 쓴다`);
  const sum = declared.reduce((s, i) => s + i[4], 0);
  const rest = +(100 - sum).toFixed(4);
  if (restCount === 1 && rest <= 0) throw new Error(`${spec.slug}: 잔여 확률이 0 이하 (${rest})`);
  if (restCount === 0 && Math.abs(sum - 100) > 1e-9) throw new Error(`${spec.slug}: 확률 합 ${sum}`);
  if (!cents(spec.price)) throw new Error(`${spec.slug}: price 는 소수 둘째 자리까지 (${spec.price})`);

  const items: ProductItem[] = spec.items.map(([id, name, nameEn, value, dropRate, code, tone]) => {
    if (!cents(value)) throw new Error(`${id}: value 는 소수 둘째 자리까지 (${value})`);
    const image = imageFor(id);
    return { id, name, nameEn, value, dropRate: dropRate === REST ? rest : dropRate, code, tone, image, imageUrl: image.src };
  });

  const ev = items.reduce((s, i) => s + (i.value * i.dropRate) / 100, 0);
  const guaranteedMin = Math.min(...items.map((i) => i.value));
  const price = spec.price;
  const retailRtp = ev / price;
  const floorCash = (guaranteedMin * REFUND_RATE) / price;

  if (retailRtp < RETAIL_RTP_MIN || retailRtp >= RETAIL_RTP_MAX) {
    violations.push(`${spec.slug}: 정가 환원율 ${(retailRtp * 100).toFixed(2)}% 가 밴드[${RETAIL_RTP_MIN * 100}, ${(RETAIL_RTP_MAX * 100).toFixed(2)}) 밖 (EV ${ev.toFixed(4)})`);
  }
  if (ev * REFUND_RATE >= price) violations.push(`${spec.slug}: 현금 기대값 ${(ev * REFUND_RATE).toFixed(2)} >= 가격 ${price} — 무위험 차익`);
  if (floorCash < FLOOR_CASH_MIN || floorCash > FLOOR_CASH_MAX) {
    violations.push(`${spec.slug}: 바닥 환전액 ${(floorCash * 100).toFixed(1)}% 가 밴드[${FLOOR_CASH_MIN * 100}, ${FLOOR_CASH_MAX * 100}] 밖 (최저 ${guaranteedMin})`);
  }

  return {
    id: spec.slug,
    slug: spec.slug,
    title: spec.title,
    titleEn: spec.titleEn,
    price,
    guaranteedMin,
    category: spec.category,
    code: spec.code,
    tone: spec.tone,
    badge: spec.badge,
    image: imageFor(spec.slug),
    imageUrl: imageFor(spec.slug).src,
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
    title: "1달러 애플 잭팟",
    titleEn: "ONE DOLLAR APPLE JACKPOT",
    category: "dollar",
    code: "DAP",
    tone: T.graphite,
    badge: "1달러",
    tagline: "커피값 1달러로 아이폰 16 프로를 노립니다. 꽝이어도 0.85 USDT는 바로 돌아옵니다.",
    price: 1,
    trendingRank: 1,
    releasedAt: "2026-09-18",
    popularity: 184200,
    items: [
      ["da-iphone16", "아이폰 16 프로 256GB", "iPhone 16 Pro 256GB", 1000, 0.0005, "IP16P", T.graphite],
      ["aud-airpods", "에어팟 맥스 USB-C", "AirPods Max USB-C", 549, 0.001, "APMX", T.slate],
      ["da-watchse", "애플워치 SE 3", "Apple Watch SE 3", 249, 0.002, "AWSE", T.slate],
      ["da-airpods4", "에어팟 4 ANC", "AirPods 4 ANC", 129, 0.01, "APD4", T.slate],
      ["da-magsafe", "맥세이프 충전기 25W", "MagSafe Charger 25W", 39, 0.02, "MGSF", T.coal],
      ["da-cable", "애플 USB-C 충전 케이블 1m", "Apple USB-C Cable 1m", 19, 0.05, "APCB", T.coal],
      ["da-sticker", "애플 스티커 팩 + 케이블 타이", "Apple Sticker Pack + Cable Tie", 0.9, REST, "STKR", T.coal],
    ],
  },
  {
    slug: "dollar-galaxy",
    title: "1달러 갤럭시 잭팟",
    titleEn: "ONE DOLLAR GALAXY JACKPOT",
    category: "dollar",
    code: "DGX",
    tone: T.graphite,
    badge: "1달러",
    tagline: "1달러로 갤럭시 Z 폴드8 1TB까지. 안 뜨면 0.85 USDT 즉시 회수.",
    price: 1,
    trendingRank: 8,
    releasedAt: "2026-09-18",
    popularity: 121400,
    items: [
      ["flg-fold", "갤럭시 Z 폴드8 1TB", "Galaxy Z Fold8 1TB", 2000, 0.0002, "ZF8", T.graphite],
      ["flg-flip", "갤럭시 Z 플립8", "Galaxy Z Flip8", 1100, 0.0005, "ZFL8", T.graphite],
      ["da-buds", "갤럭시 버즈4 프로", "Galaxy Buds4 Pro", 199, 0.005, "GB4P", T.slate],
      ["da-charger", "삼성 45W 초고속 충전기", "Samsung 45W Charger", 39, 0.02, "S45W", T.coal],
      ["da-tag", "갤럭시 스마트태그2", "Galaxy SmartTag2", 29, 0.02, "STG2", T.coal],
      ["da-strap", "갤럭시워치 스포츠 스트랩", "Galaxy Watch Sport Band", 15, 0.05, "GWSB", T.coal],
      ["da-sticker2", "갤럭시 스티커 팩 + 케이블 타이", "Galaxy Sticker Pack + Cable Tie", 0.9, REST, "STK2", T.coal],
    ],
  },
  {
    slug: "dollar-gaming",
    title: "1달러 게이밍 잭팟",
    titleEn: "ONE DOLLAR GAMING JACKPOT",
    category: "dollar",
    code: "DGM",
    tone: T.graphite,
    badge: "1달러",
    tagline: "1달러로 RTX 5090부터 스위치 2까지. 스팀 기프트카드도 자주 뜹니다.",
    price: 1,
    trendingRank: 3,
    releasedAt: "2026-09-18",
    popularity: 143900,
    items: [
      ["gpu-5090", "지포스 RTX 5090 파운더스", "RTX 5090 Founders", 2300, 0.0002, "5090", T.graphite],
      ["dg-ps5", "플레이스테이션 5 슬림", "PlayStation 5 Slim", 499, 0.001, "PS5S", T.slate],
      ["dg-switch2", "닌텐도 스위치 2", "Nintendo Switch 2", 449, 0.001, "NSW2", T.slate],
      ["gpu-kb", "웃키 HE65 자석축 키보드", "Wooting HE65", 199, 0.003, "HE65", T.slate],
      ["gpu-mouse", "레이저 바실리스크 V4 프로", "Razer Basilisk V4 Pro", 159, 0.005, "BSK4", T.coal],
      ["dg-gift", "스팀 기프트카드 10 USDT", "Steam Gift Card 10 USDT", 10, 0.1, "STMG", T.coal],
      ["dg-keycap", "아티산 키캡 1개", "Artisan Keycap", 0.9, REST, "KCAP", T.coal],
    ],
  },
  // ── ⚡ 커피&버거 스타터 (3 ~ 5 USDT) ────────────────────────
  {
    slug: "starter-ps5",
    title: "커피값 PS5 스타터",
    titleEn: "COFFEE PS5 STARTER",
    category: "tech",
    code: "SPS",
    tone: T.slate,
    badge: "테크",
    tagline: "3달러로 PS5 프로 노려보세요. 꽝이어도 2.5 USDT는 돌아옵니다.",
    price: 3,
    trendingRank: 6,
    releasedAt: "2026-09-18",
    popularity: 98700,
    items: [
      ["sp-ps5pro", "플레이스테이션 5 프로", "PlayStation 5 Pro", 700, 0.006, "PS5P", T.slate],
      ["sp-switch2", "닌텐도 스위치 2", "Nintendo Switch 2", 449, 0.004, "SW2B", T.slate],
      ["sp-headset", "소니 인존 H9 헤드셋", "Sony INZONE H9", 299, 0.006, "INZ9", T.slate],
      ["sp-dualsense", "듀얼센스 엣지 컨트롤러", "DualSense Edge", 199, 0.015, "DSEG", T.coal],
      ["sp-game", "최신 타이틀 1종 (디지털)", "Latest Title (Digital)", 69, 0.06, "GAME", T.coal],
      ["sp-gift", "PSN 기프트카드 10 USDT", "PSN Gift Card 10 USDT", 10, 0.5, "PSNG", T.coal],
      ["sp-cable", "USB-C 게이밍 케이블 2m", "USB-C Gaming Cable 2m", 2.65, REST, "USBC", T.coal],
    ],
  },
  {
    slug: "starter-macbook",
    title: "커피&버거 맥북 잭팟",
    titleEn: "COFFEE & BURGER MACBOOK JACKPOT",
    category: "tech",
    code: "SMB",
    tone: T.slate,
    badge: "테크",
    tagline: "5달러로 맥북 프로 M4 맥스(1,100배). 꽝이어도 4.2 USDT는 즉시 회수.",
    price: 5,
    trendingRank: 2,
    releasedAt: "2026-09-18",
    popularity: 162300,
    items: [
      ["apx-mbp", "맥북 프로 16 M4 맥스", "MacBook Pro 16 M4 Max", 5720, 0.0015, "MBP16", T.slate],
      ["gtc-ipadpro", "아이패드 프로 11 M5", "iPad Pro 11 M5", 1300, 0.004, "IPP11", T.graphite],
      ["gtc-mba", "맥북 에어 13 M4", "MacBook Air 13 M4", 1220, 0.005, "MBA13", T.graphite],
      ["apx-mx", "로지텍 MX 마스터 4 + MX 키보드", "Logitech MX Master 4 Set", 340, 0.01, "MXS", T.coal],
      ["flg-buds", "에어팟 프로 3", "AirPods Pro 3", 249, 0.02, "APP3", T.slate],
      ["sm-gift", "애플 기프트카드 10 USDT", "Apple Gift Card 10 USDT", 10, 0.5, "APGC", T.coal],
      ["sm-stand", "알루미늄 노트북 스탠드", "Aluminum Laptop Stand", 4.4, REST, "STND", T.coal],
    ],
  },
  {
    slug: "starter-phone",
    title: "5달러 아이폰 17 잭팟",
    titleEn: "FIVE DOLLAR IPHONE 17 JACKPOT",
    category: "tech",
    code: "SPH",
    tone: T.slate,
    badge: "테크",
    tagline: "5달러로 아이폰 17 프로 맥스 1TB. 애플워치 울트라 3도 들어 있습니다.",
    price: 5,
    trendingRank: 9,
    releasedAt: "2026-09-18",
    popularity: 90100,
    items: [
      ["flg-iphone", "아이폰 17 프로 맥스 1TB", "iPhone 17 Pro Max 1TB", 2594, 0.004, "IP17M", T.graphite],
      ["flg-pixel", "픽셀 10 프로 XL", "Pixel 10 Pro XL", 1100, 0.004, "PX10", T.graphite],
      ["flg-watch", "애플워치 울트라 3", "Apple Watch Ultra 3", 799, 0.005, "AWU3", T.slate],
      ["sp2-airpods", "에어팟 4", "AirPods 4", 129, 0.02, "AP4", T.slate],
      ["flg-charger", "앤커 맥고 3-in-1 충전 스탠드", "Anker MagGo 3-in-1", 89, 0.05, "MGGO", T.coal],
      ["sp2-gift", "애플 기프트카드 10 USDT", "Apple Gift Card 10 USDT", 10, 0.8, "APG2", T.coal],
      ["flg-film", "강화유리 필름 2매 세트", "Tempered Glass 2-Pack", 4.4, REST, "FILM", T.coal],
    ],
  },
  // ── 👑 럭셔리 볼트 (20 ~ 50 USDT) ───────────────────────────
  {
    slug: "vault-submariner",
    title: "롤렉스 서브마리너 볼트",
    titleEn: "ROLEX SUBMARINER VAULT",
    category: "luxury",
    code: "VSB",
    tone: T.steel,
    badge: "워치",
    tagline: "20달러로 롤렉스 서브마리너(780배). 꽝이어도 17.5 USDT는 즉시 회수됩니다.",
    price: 20,
    trendingRank: 4,
    releasedAt: "2026-09-18",
    popularity: 131600,
    items: [
      ["rlx-sub", "롤렉스 서브마리너 126610LN", "Rolex Submariner 126610LN", 15600, 0.002, "SUBM", T.steel],
      ["rlx-omega", "오메가 스피드마스터 프로", "Omega Speedmaster Pro", 7100, 0.001, "SPDM", T.graphite],
      ["rlx-tudor", "튜더 블랙베이 58", "Tudor Black Bay 58", 3830, 0.004, "BB58", T.graphite],
      ["rlx-seiko", "세이코 프로스펙스 마린마스터", "Seiko Prospex Marinemaster", 935, 0.005, "PRSX", T.slate],
      ["rlx-hamilton", "해밀턴 카키 필드 메카니컬", "Hamilton Khaki Field Mech", 500, 0.01, "HMLT", T.slate],
      ["rlx-strap", "정품 가죽 스트랩 + 툴 세트", "Leather Strap + Tool Set", 93, 0.05, "STRP", T.coal],
      ["vs-nato", "NATO 스트랩 2종 세트", "NATO Strap 2-Pack", 18.5, REST, "NATO", T.coal],
    ],
  },
  {
    slug: "vault-omega",
    title: "스위스 워치 볼트",
    titleEn: "SWISS WATCH VAULT",
    category: "luxury",
    code: "VOM",
    tone: T.steel,
    badge: "워치",
    tagline: "25달러로 오메가 아쿠아테라부터 티쏘 PRX까지. 바닥은 월넛 워치 박스.",
    price: 25,
    releasedAt: "2026-09-18",
    popularity: 74800,
    items: [
      ["sws-omega", "오메가 아쿠아테라 150M", "Omega Aqua Terra 150M", 5800, 0.003, "AQTR", T.steel],
      ["sws-tudor", "튜더 펠라고스 39", "Tudor Pelagos 39", 4400, 0.003, "PLGS", T.graphite],
      ["sws-longines", "론진 스피릿 줄루 5", "Longines Spirit Zulu 5", 2300, 0.005, "LGZ5", T.graphite],
      ["sws-oris", "오리스 아퀴스 데이트", "Oris Aquis Date", 2100, 0.005, "ORIS", T.slate],
      ["sws-tissot", "티쏘 PRX 파워매틱 80", "Tissot PRX Powermatic 80", 650, 0.02, "PRX", T.slate],
      ["sws-strap", "스위스 러버 스트랩 2종", "Swiss Rubber Strap x2", 60, 0.2, "RUBR", T.coal],
      ["sws-box", "월넛 워치 박스 6구", "Walnut Watch Box 6", 23, REST, "WBOX", T.coal],
    ],
  },
  {
    slug: "vault-handbag",
    title: "명품 핸드백 볼트",
    titleEn: "LUXURY HANDBAG VAULT",
    category: "luxury",
    code: "VHB",
    tone: T.steel,
    badge: "럭셔리",
    tagline: "30달러로 에르메스 버킨 25 크로커다일(2,000배). 꽝이어도 26 USDT 회수.",
    price: 30,
    trendingRank: 10,
    releasedAt: "2026-09-18",
    popularity: 83200,
    items: [
      ["grl-birkin25", "에르메스 버킨 25 크로커다일", "Hermès Birkin 25 Croc", 60000, 0.0003, "BRKN", T.steel],
      ["lth-chanel", "샤넬 클래식 플랩 미디움", "Chanel Classic Flap Medium", 11000, 0.001, "CHNL", T.graphite],
      ["grl-dior", "디올 레이디 디올 미디움", "Dior Lady Dior Medium", 4500, 0.003, "LDDR", T.graphite],
      ["grl-polene", "폴렌 넘버원 나노", "Polène Numéro Un Nano", 380, 0.03, "PLN1", T.slate],
      ["glx-scarf", "에르메스 트윌리 스카프", "Hermès Twilly Scarf", 305, 0.05, "TWLY", T.slate],
      ["glx-key", "델보 레더 키홀더", "Delvaux Leather Key Holder", 285, 0.05, "DLVX", T.coal],
      ["vh-pouch", "레더 파우치 + 더스트백", "Leather Pouch + Dust Bag", 27.5, REST, "POUC", T.coal],
    ],
  },
  // ── 🚀 슈퍼카 & 골드바 잭팟 ─────────────────────────────────
  {
    slug: "vault-gold",
    title: "골드바 볼트",
    titleEn: "GOLD BAR VAULT",
    category: "jackpot",
    code: "VGD",
    tone: T.steel,
    badge: "골드",
    tagline: "50달러로 골드바 1kg(2,000배). 실버바와 골드 코인이 바닥을 받칩니다.",
    price: 50,
    trendingRank: 7,
    releasedAt: "2026-09-18",
    popularity: 95400,
    items: [
      ["vg-gold1kg", "골드바 1kg (99.99%)", "Gold Bar 1kg (99.99%)", 100000, 0.0004, "AU1K", T.steel],
      ["rlx-daytona", "롤렉스 데이토나 116500LN", "Rolex Daytona 116500LN", 42000, 0.0005, "DYTN", T.steel],
      ["vg-gold100g", "골드바 100g", "Gold Bar 100g", 10000, 0.002, "AU100", T.graphite],
      ["vg-gold10g", "골드바 10g", "Gold Bar 10g", 1000, 0.01, "AU10", T.graphite],
      ["vg-coin", "골드 코인 1/10oz", "Gold Coin 1/10 oz", 320, 0.05, "AUCN", T.slate],
      ["vg-silver", "실버바 100g", "Silver Bar 100g", 120, 0.2, "AG100", T.slate],
      ["rlx-roll", "워치 롤 케이스", "Watch Roll Case", 46, REST, "WROL", T.coal],
    ],
  },
  {
    slug: "jackpot-cybertruck",
    title: "사이버트럭 잭팟",
    titleEn: "CYBERTRUCK JACKPOT",
    category: "jackpot",
    code: "JCT",
    tone: T.steel,
    badge: "드림 박스",
    tagline: "100달러로 사이버트럭 사이버비스트(1,300배). 꽝이어도 95 USDT는 돌아옵니다.",
    price: 100,
    trendingRank: 5,
    releasedAt: "2026-09-18",
    popularity: 110800,
    items: [
      ["ctd-cybertruck", "테슬라 사이버트럭 사이버비스트", "Tesla Cybertruck Cyberbeast", 130000, 0.0003, "CYBR", T.steel],
      ["ctd-model3", "테슬라 모델 3 퍼포먼스", "Tesla Model 3 Performance", 47000, 0.0005, "M3P", T.steel],
      ["ctd-visionpro", "애플 비전 프로 1TB", "Apple Vision Pro 1TB", 3910, 0.005, "AVP", T.graphite],
      ["ctd-segway", "세그웨이 GT3 프로 전동 스쿠터", "Segway GT3 Pro", 2900, 0.005, "GT3P", T.graphite],
      ["ctd-dji", "DJI 에어 3S 플라이 모어", "DJI Air 3S Fly More", 1350, 0.01, "AIR3", T.slate],
      ["ctd-helmet", "슈베르트 C5 헬멧", "Schuberth C5 Helmet", 650, 0.02, "C5", T.slate],
      ["jc-diecast", "사이버트럭 다이캐스트 1:18 + 굿즈 세트", "Cybertruck 1:18 Diecast + Merch Set", 100, REST, "DCST", T.coal],
    ],
  },
  {
    slug: "jackpot-supercar",
    title: "슈퍼카 잭팟",
    titleEn: "SUPERCAR JACKPOT",
    category: "jackpot",
    code: "JSC",
    tone: T.steel,
    badge: "드림 박스",
    tagline: "100달러로 포르쉐 911 카레라(1,300배). 두카티와 반무프도 들어 있습니다.",
    price: 100,
    releasedAt: "2026-09-18",
    popularity: 88600,
    items: [
      ["js-porsche", "포르쉐 911 카레라", "Porsche 911 Carrera", 130000, 0.0002, "P911", T.steel],
      ["js-modely", "테슬라 모델 Y 롱레인지", "Tesla Model Y Long Range", 45000, 0.0004, "MDLY", T.steel],
      ["js-ducati", "두카티 파니갈레 V2", "Ducati Panigale V2", 18000, 0.001, "PNGL", T.graphite],
      ["urb-vanmoof", "반무프 S5 전기자전거", "VanMoof S5", 3200, 0.005, "VMS5", T.graphite],
      ["ctd-brompton", "브롬톤 P라인 어반", "Brompton P Line Urban", 2200, 0.005, "BRMP", T.slate],
      ["urb-garmin", "가민 엣지 1050 사이클링 컴퓨터", "Garmin Edge 1050", 700, 0.02, "EDGE", T.slate],
      ["js-model", "포르쉐 911 1:18 모델카 + 굿즈 세트", "Porsche 911 1:18 Model + Merch Set", 100, REST, "MDLC", T.coal],
    ],
  },
];

export const BOXES: ProductBox[] = SPECS.map(buildBox);

if (violations.length > 0) {
  throw new Error(["상품 데이터셋 불변식 위반", ...violations].join("\n  - "));
}

export const BOX_BY_SLUG: Record<string, ProductBox> = Object.fromEntries(BOXES.map((b) => [b.slug, b]));
export const getBoxBySlug = (slug: string): ProductBox | undefined => BOX_BY_SLUG[slug];

// ── 파생 계산 ──────────────────────────────────────────────

/** 정가 기준 기대값(USDT). 바닥이 가격에 붙은 박스는 price 를 넘을 수 있다 — 현금 환산은 항상 미만. */
export const expectedValue = (box: ProductBox): number => box.items.reduce((s, i) => s + (i.value * i.dropRate) / 100, 0);
/** 정가 기준 환원율 */
export const retailReturn = (box: ProductBox): number => expectedValue(box) / box.price;
/** 현금 환급 기준 환원율 — 항상 1 미만. 하우스 엣지 = 1 − 이 값 */
export const cashReturn = (box: ProductBox): number => (expectedValue(box) * REFUND_RATE) / box.price;
/** 바닥 즉시 환전액(USDT) — "꽝이어도 이만큼은 돌아온다" */
export const floorCash = (box: ProductBox): number => +(box.guaranteedMin * REFUND_RATE).toFixed(2);
/** 바닥 환전액 / 가격 */
export const floorRatio = (box: ProductBox): number => floorCash(box) / box.price;
/** 바닥 보장 — 모든 박스가 참(빌더가 밴드를 강제). 표기 조건용으로 남긴다. */
export const isValueGuaranteed = (box: ProductBox): boolean => floorRatio(box) >= FLOOR_CASH_MIN;

export const dropTable = (box: ProductBox): ProductItem[] => [...box.items].sort((a, b) => b.value - a.value);
export const ceilingValue = (box: ProductBox): number => Math.max(...box.items.map((i) => i.value));

// ── 행(Row) 셀렉터 ─────────────────────────────────────────

/** TOP 10 — trendingRank 우선, 나머지는 인기순 */
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

/** 히어로 — 1 USDT 박스 우선 */
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

export const formatRate = (r: number): string => (r >= 10 ? r.toFixed(1) + "%" : r >= 1 ? r.toFixed(2) + "%" : r >= 0.01 ? r.toFixed(3) + "%" : r.toFixed(4) + "%");

export { REFUND_RATE };
