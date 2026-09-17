/**
 * 실물 하이엔드 / 트렌드 상품 랜덤박스 데이터셋.
 *
 * 경제 모델 — lib/catalog.ts 의 보장가 방식을 그대로 따른다.
 *   · value / price 는 전부 "정수 USDT". 통화 기호도 소수점도 데이터에 없다.
 *     표기는 오직 lib/formatCurrency.ts 를 통과하며, 선택 통화(USDT/USD/KRW) 하나로만 렌더된다.
 *   · guaranteedMin = 박스 내 최저 실판매가. 어떤 결과든 이 값 이상의 실물을 받는다.
 *   · 무위험 차익 금지의 기준은 "정가"가 아니라 "현금 회수액"이다.
 *     실물을 즉시 환급하면 REFUND_RATE(95%)만 돌려받으므로,
 *     EV × 0.8 < price 가 성립해야 한다. 이건 빌더가 직접 던진다.
 *   · 따라서 정가 기준 기대값(EV)은 price 를 넘을 수 있다.
 *     이를 "환원율 115%" 같은 문구로 표기하면 거짓말이 되므로,
 *     UI 는 정가 기준과 현금 기준을 반드시 함께 표기한다.
 *
 * 이미지 — 이 파일에 URL 을 쓰지 않는다. lib/productImages.ts 가 유일한 경로 원천이다.
 */

import { imageFor, type ProductImage } from "./productImages";

/** 실물 환급 비율. lib/types.ts 의 REFUND_RATE 와 같은 값이며 여기서 재선언하지 않는다. */
import { REFUND_RATE } from "./types";

export type BoxCategory = "mobility" | "tech" | "watch" | "luxury" | "lifestyle";

export interface CategoryFilter {
  key: BoxCategory | "all";
  label: string;
}

export const CATEGORY_FILTERS: CategoryFilter[] = [
  { key: "all", label: "전체" },
  { key: "mobility", label: "모빌리티" },
  { key: "tech", label: "테크" },
  { key: "watch", label: "워치" },
  { key: "luxury", label: "럭셔리" },
  { key: "lifestyle", label: "라이프스타일" },
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
  /** 한국어 표기 상품명 */
  name: string;
  nameEn: string;
  /** 실판매가(정수 USDT) */
  value: number;
  /** 드롭 확률(%). 박스 내 합계 100 */
  dropRate: number;
  /** 플레이스홀더 코드 */
  code: string;
  /** 플레이스홀더 배경 */
  tone: string;
  image: ProductImage;
  /** image.src 의 별칭. 미확보면 null. 경로 원천은 lib/productImages.ts 하나뿐이다. */
  imageUrl: string | null;
}

export interface ProductBox {
  id: string;
  slug: string;
  title: string;
  titleEn: string;
  /** 1회 오픈 가격(정수 USDT) */
  price: number;
  /** 최저 실판매가(USDT) — items 에서 파생된다 */
  guaranteedMin: number;
  category: BoxCategory;
  code: string;
  tone: string;
  badge: string;
  image: ProductImage;
  /** image.src 의 별칭. 미확보면 null. 경로 원천은 lib/productImages.ts 하나뿐이다. */
  imageUrl: string | null;
  /** 히어로 카피 한 줄. 과장 없이 구성만 설명한다. */
  tagline: string;
  /** TRENDING 행 순위(1-N). 해당 없으면 undefined */
  trendingRank?: number;
  releasedAt: string;
  popularity: number;
  items: ProductItem[];
}

// ── 플레이스홀더 톤 — 전부 무광 무채색. 색은 등급 액센트만 담당한다. ──
const T = {
  slate: "linear-gradient(135deg,#0d0d0d 0%,#242424 48%,#3d3d3d 78%,#0d0d0d 100%)",
  graphite: "linear-gradient(135deg,#0a0a0a 0%,#1e1e1e 50%,#333333 82%,#0a0a0a 100%)",
  coal: "linear-gradient(135deg,#060606 0%,#161616 55%,#262626 100%)",
  steel: "linear-gradient(135deg,#101010 0%,#2c2c2c 45%,#5a5a5a 80%,#101010 100%)",
};

/** 마지막 항목에 지정하면 잔여 확률을 자동으로 흡수한다. */
const REST = -1;

type ItemSpec = [
  id: string,
  name: string,
  nameEn: string,
  value: number,
  dropRate: number,
  code: string,
  tone: string,
];

interface BoxSpec {
  slug: string;
  title: string;
  titleEn: string;
  category: BoxCategory;
  code: string;
  tone: string;
  badge: string;
  tagline: string;
  /**
   * 정가 기준 목표 환원율. price 는 여기서 역산된다 — price = prettyCeil(EV / retailRtp).
   * 손으로 가격을 정하면 드롭테이블을 고칠 때마다 조용히 차익 구조가 생긴다.
   * 1 을 넘길 수 있으나 1/REFUND_RATE(≈1.0526) 미만이어야 현금 차익이 막힌다.
   */
  retailRtp: number;
  /** 최소 가치 보장 박스. guaranteedMin >= price 를 빌더가 강제한다. */
  guarantee?: true;
  trendingRank?: number;
  releasedAt: string;
  popularity: number;
  items: ItemSpec[];
}

/** 빌드 중 발견한 데이터 위반. 전부 모아 한 번에 던진다. */
const violations: string[] = [];

/**
 * 가격 올림. 항상 올리는 방향이라 환원율이 목표보다 낮아질 뿐 상한을 넘지 않는다.
 * 100 USDT 미만은 1, 1,000 미만은 5, 그 이상은 10 USDT 단위.
 */
const prettyCeil = (usdt: number): number =>
  usdt < 100 ? Math.ceil(usdt) : usdt < 1000 ? Math.ceil(usdt / 5) * 5 : Math.ceil(usdt / 10) * 10;

function buildBox(spec: BoxSpec): ProductBox {
  const declared = spec.items.filter((i) => i[4] !== REST);
  const restCount = spec.items.length - declared.length;
  if (restCount > 1) throw new Error(`${spec.slug}: REST 는 마지막 1개 항목에만 쓴다`);
  const sum = declared.reduce((s, i) => s + i[4], 0);
  const rest = +(100 - sum).toFixed(4);
  if (restCount === 1 && rest <= 0) throw new Error(`${spec.slug}: 잔여 확률이 0 이하 (${rest})`);
  if (restCount === 0 && Math.abs(sum - 100) > 1e-9) throw new Error(`${spec.slug}: 확률 합 ${sum}`);

  const items: ProductItem[] = spec.items.map(([id, name, nameEn, value, dropRate, code, tone]) => {
    if (!Number.isInteger(value)) throw new Error(`${id}: value 는 정수 USDT 여야 한다 (${value})`);
    const image = imageFor(id);
    return { id, name, nameEn, value, dropRate: dropRate === REST ? rest : dropRate, code, tone, image, imageUrl: image.src };
  });

  const ev = items.reduce((s, i) => s + (i.value * i.dropRate) / 100, 0);
  const guaranteedMin = Math.min(...items.map((i) => i.value));
  const price = prettyCeil(ev / spec.retailRtp);

  // 정가 기준 환원율 밴드. 상한 1.25 를 지키면 현금 차익(EV × 0.8 < price)이 자동으로 성립한다.
  if (spec.retailRtp < 0.7 || spec.retailRtp >= 1 / REFUND_RATE) {
    violations.push(`${spec.slug}: retailRtp ${spec.retailRtp} 이 밴드[0.70, ${(1 / REFUND_RATE).toFixed(4)}) 밖`);
  }
  // 반올림이 상한을 넘기지 않았는지 실측으로 다시 확인한다 — 파생값을 믿지 않는다.
  if (ev * REFUND_RATE >= price) {
    violations.push(
      `${spec.slug}: 현금 기준 기대값 ${Math.round(ev * REFUND_RATE)} >= 가격 ${price} — 무위험 차익`,
    );
  }
  // 최소 가치 보장 박스는 최저 구성의 실판매가가 오픈 가격 이상이어야 문구가 참이 된다.
  if (spec.guarantee && guaranteedMin < price) {
    violations.push(
      `${spec.slug}: 보장 박스인데 최저 실판매가 ${guaranteedMin} < 가격 ${price}` +
        ` (retailRtp 를 ${(ev / guaranteedMin).toFixed(3)} 초과로 올리거나 상위 확률을 낮출 것)`,
    );
  }
  if (!spec.guarantee && guaranteedMin >= price) {
    violations.push(`${spec.slug}: 보장 표기가 없는데 최저 실판매가가 가격 이상 — guarantee 플래그 누락`);
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
  {
    slug: "cybertruck-dream",
    title: "사이버트럭 드림",
    titleEn: "CYBERTRUCK DREAM",
    category: "mobility",
    code: "CTD",
    tone: T.steel,
    badge: "드림 박스",
    tagline: "테슬라 사이버트럭 1대를 최상단에 둔 모빌리티 구성. 최저 구성도 실물로 발송됩니다.",
    retailRtp: 1.05,
    trendingRank: 1,
    releasedAt: "2026-09-01",
    popularity: 98400,
    items: [
      ["ctd-cybertruck", "테슬라 사이버트럭 파운데이션", "Tesla Cybertruck Foundation", 95700, 0.0004, "CYBR", T.steel],
      ["ctd-model3", "테슬라 모델 3 퍼포먼스", "Tesla Model 3 Performance", 47000, 0.0012, "MDL3", T.steel],
      ["ctd-visionpro", "애플 비전 프로 1TB", "Apple Vision Pro 1TB", 3910, 0.02, "VPRO", T.graphite],
      ["ctd-segway", "세그웨이 GT3 프로 전동 스쿠터", "Segway GT3 Pro", 2380, 0.06, "SGWY", T.graphite],
      ["ctd-brompton", "브롬톤 P라인 어반", "Brompton P Line Urban", 2090, 0.09, "BRMP", T.graphite],
      ["ctd-dji", "DJI 에어 3S 플라이 모어", "DJI Air 3S Fly More", 1150, 0.35, "DJI3", T.slate],
      ["ctd-helmet", "슈베르트 C5 헬멧", "Schuberth C5 Helmet", 645, 1.2, "SCHB", T.slate],
      ["ctd-jordan", "나이키 에어 조던 1 레트로 하이", "Nike Air Jordan 1 Retro High", 210, 4.5, "AJ1", T.coal],
      ["ctd-tracker", "애플 에어태그 4팩 + 가죽 홀더", "AirTag 4-Pack + Leather", 93, 12, "ATAG", T.coal],
      ["ctd-cable", "앤커 나일론 충전 케이블 세트", "Anker Nylon Cable Set", 28, REST, "ANKR", T.coal],
    ],
  },
  {
    slug: "urban-mobility",
    title: "어반 모빌리티",
    titleEn: "URBAN MOBILITY",
    category: "mobility",
    code: "URB",
    tone: T.graphite,
    badge: "모빌리티",
    tagline: "도심 이동 수단 중심 구성. 전동 스쿠터와 접이식 자전거가 상단에 배치됩니다.",
    retailRtp: 1.02,
    releasedAt: "2026-08-12",
    popularity: 41200,
    items: [
      ["urb-vanmoof", "반무프 S5 전기자전거", "VanMoof S5", 3110, 0.03, "VNMF", T.steel],
      ["urb-segway", "세그웨이 맥스 G2", "Segway Max G2", 935, 0.3, "MAXG", T.graphite],
      ["urb-brompton", "브롬톤 C라인 익스플로어", "Brompton C Line Explore", 1730, 0.1, "BRMC", T.graphite],
      ["urb-garmin", "가민 엣지 1050 사이클링 컴퓨터", "Garmin Edge 1050", 715, 0.8, "GRMN", T.slate],
      ["urb-helmet", "포크 우르반 I 헬멧", "POC Urbane Helmet", 190, 4, "POCU", T.slate],
      ["urb-lock", "아부스 그래닛 체인락", "ABUS Granit Chain Lock", 135, 7, "ABUS", T.coal],
      ["urb-light", "루모스 스마트 라이트 세트", "Lumos Light Set", 64, 16, "LUMO", T.coal],
      ["urb-bottle", "카멜백 인슐레이티드 보틀", "CamelBak Bottle", 21, REST, "CMBK", T.coal],
    ],
  },
  {
    slug: "apex-workstation",
    title: "에이펙스 워크스테이션",
    titleEn: "APEX WORKSTATION",
    category: "tech",
    code: "APX",
    tone: T.slate,
    badge: "테크",
    tagline: "맥북 프로 M4 맥스를 최상단에 둔 작업 장비 구성. 주변기기까지 실물 발송됩니다.",
    retailRtp: 1.05,
    trendingRank: 2,
    releasedAt: "2026-08-28",
    popularity: 87600,
    items: [
      ["apx-mbp", "맥북 프로 16 M4 맥스 128GB", "MacBook Pro 16 M4 Max", 5720, 0.04, "MBP16", T.steel],
      ["apx-studio", "맥 스튜디오 M4 울트라", "Mac Studio M4 Ultra", 4700, 0.06, "MSTD", T.steel],
      ["apx-xdr", "프로 디스플레이 XDR", "Pro Display XDR", 4340, 0.07, "XDR", T.graphite],
      ["apx-mba", "맥북 에어 15 M4", "MacBook Air 15 M4", 1730, 0.5, "MBA15", T.graphite],
      ["apx-ipad", "아이패드 프로 13 M5", "iPad Pro 13 M5", 1510, 0.7, "IPDP", T.slate],
      ["apx-mx", "로지텍 MX 마스터 4 + MX 키보드", "Logitech MX Master 4 Set", 255, 6, "MXM4", T.coal],
      ["apx-dock", "칼디짓 TS5 플러스 도크", "CalDigit TS5 Plus", 400, 3, "TS5", T.coal],
      ["apx-hub", "앤커 프라임 USB-C 허브", "Anker Prime Hub", 86, 14, "PRIM", T.coal],
      ["apx-sleeve", "베어본 랩톱 슬리브", "Bellroy Laptop Sleeve", 64, 22, "BLRY", T.coal],
      ["apx-cable", "벨킨 240W USB-C 케이블", "Belkin 240W Cable", 21, REST, "BLKN", T.coal],
    ],
  },
  {
    slug: "flagship-phone",
    title: "플래그십 폰",
    titleEn: "FLAGSHIP PHONE",
    category: "tech",
    code: "FLG",
    tone: T.graphite,
    badge: "테크",
    tagline: "최신 플래그십 스마트폰 라인업. 최저 구성도 정품 액세서리로 발송됩니다.",
    retailRtp: 1.05,
    trendingRank: 3,
    releasedAt: "2026-09-08",
    popularity: 92300,
    items: [
      ["flg-fold", "갤럭시 Z 폴드8 1TB", "Galaxy Z Fold8 1TB", 2020, 0.15, "FOLD", T.steel],
      ["flg-iphone", "아이폰 17 프로 맥스 1TB", "iPhone 17 Pro Max 1TB", 1880, 0.2, "IP17", T.steel],
      ["flg-flip", "갤럭시 Z 플립8", "Galaxy Z Flip8", 1080, 0.6, "FLIP", T.graphite],
      ["flg-pixel", "픽셀 10 프로 XL", "Pixel 10 Pro XL", 1010, 0.7, "PXL", T.graphite],
      ["flg-watch", "애플워치 울트라 3", "Apple Watch Ultra 3", 835, 1.1, "AWU3", T.slate],
      ["flg-buds", "에어팟 프로 3", "AirPods Pro 3", 260, 6, "APP3", T.coal],
      ["flg-case", "몬드리안 맥세이프 케이스", "MagSafe Leather Case", 64, 20, "MGSF", T.coal],
      ["flg-charger", "앤커 맥고 3-in-1 충전 스탠드", "Anker MagGo 3-in-1", 100, 12, "MGGO", T.coal],
      ["flg-film", "강화유리 필름 2매 세트", "Tempered Glass 2-Pack", 14, REST, "GLSS", T.coal],
    ],
  },
  {
    slug: "gpu-rig",
    title: "GPU 릭",
    titleEn: "GPU RIG",
    category: "tech",
    code: "GPU",
    tone: T.slate,
    badge: "테크",
    tagline: "그래픽카드와 주변기기 중심 구성. 상단은 RTX 5090 파운더스 에디션입니다.",
    retailRtp: 1.0,
    releasedAt: "2026-07-19",
    popularity: 63500,
    items: [
      ["gpu-5090", "지포스 RTX 5090 파운더스", "RTX 5090 Founders", 2380, 0.1, "5090", T.steel],
      ["gpu-5080", "지포스 RTX 5080", "RTX 5080", 1220, 0.35, "5080", T.graphite],
      ["gpu-cpu", "라이젠 9 9950X3D", "Ryzen 9 9950X3D", 715, 0.9, "9950", T.graphite],
      ["gpu-monitor", "LG 울트라기어 27 OLED 480Hz", "LG UltraGear 27 OLED", 935, 0.6, "OLED", T.slate],
      ["gpu-ssd", "삼성 990 프로 4TB", "Samsung 990 Pro 4TB", 325, 3.5, "990P", T.coal],
      ["gpu-kb", "웃키 HE65 자석축 키보드", "Wooting HE65", 210, 6, "HE65", T.coal],
      ["gpu-mouse", "레이저 바실리스크 V4 프로", "Razer Basilisk V4 Pro", 145, 11, "BSLK", T.coal],
      ["gpu-pad", "아르테무스 XL 데스크 패드", "Artemus XL Deskpad", 43, 24, "ARTX", T.coal],
      ["gpu-fan", "녹투아 NF-A12 3팩", "Noctua NF-A12 3-Pack", 14, REST, "NOCT", T.coal],
    ],
  },
  {
    slug: "camera-studio",
    title: "카메라 스튜디오",
    titleEn: "CAMERA STUDIO",
    category: "tech",
    code: "CAM",
    tone: T.graphite,
    badge: "테크",
    tagline: "미러리스 바디와 단렌즈 중심 구성. 최저 구성은 정품 스트랩 세트입니다.",
    retailRtp: 1.02,
    releasedAt: "2026-06-30",
    popularity: 38900,
    items: [
      ["cam-a1", "소니 알파 1 II 바디", "Sony A1 II Body", 6880, 0.03, "A1II", T.steel],
      ["cam-r5", "캐논 EOS R5 마크 II", "Canon EOS R5 Mark II", 3980, 0.06, "R5II", T.steel],
      ["cam-leica", "라이카 Q3 43", "Leica Q3 43", 6370, 0.035, "LQ43", T.steel],
      ["cam-lens", "소니 FE 50mm F1.2 GM", "Sony FE 50mm F1.2 GM", 1880, 0.25, "50GM", T.graphite],
      ["cam-fuji", "후지필름 X100VI", "Fujifilm X100VI", 1660, 0.3, "X100", T.graphite],
      ["cam-gimbal", "DJI RS 4 프로", "DJI RS 4 Pro", 860, 0.8, "RS4", T.slate],
      ["cam-tripod", "짓조 GT2545T 트래블러", "Gitzo GT2545T", 580, 2, "GTZO", T.coal],
      ["cam-sd", "소니 터프 CFexpress 320GB", "Sony TOUGH CFexpress", 255, 6, "CFEX", T.coal],
      ["cam-bag", "피크디자인 에브리데이 백팩 30L", "Peak Design Everyday 30L", 260, 7, "PKDN", T.coal],
      ["cam-strap", "피크디자인 리쉬 스트랩 세트", "Peak Design Leash Set", 57, REST, "LEASH", T.coal],
    ],
  },
  {
    slug: "reference-audio",
    title: "레퍼런스 오디오",
    titleEn: "REFERENCE AUDIO",
    category: "lifestyle",
    code: "AUD",
    tone: T.slate,
    badge: "오디오",
    tagline: "모니터 스피커와 헤드폰 중심 구성. 최저 구성은 정품 케이블 세트입니다.",
    retailRtp: 0.98,
    releasedAt: "2026-05-21",
    popularity: 31700,
    items: [
      ["aud-genelec", "제네렉 8361A 페어", "Genelec 8361A Pair", 9350, 0.02, "8361", T.steel],
      ["aud-focal", "포칼 유토피아 2022", "Focal Utopia 2022", 4700, 0.05, "UTOP", T.steel],
      ["aud-he1000", "히파이맨 서스바라 언베일드", "HIFIMAN Susvara Unveiled", 6510, 0.03, "SUSV", T.steel],
      ["aud-dac", "채드 애너다이즈 DAC", "Chord Anni DAC", 1220, 0.4, "CHRD", T.graphite],
      ["aud-sony", "소니 WH-1000XM6", "Sony WH-1000XM6", 435, 3, "XM6", T.slate],
      ["aud-airpods", "에어팟 맥스 USB-C", "AirPods Max USB-C", 555, 2.2, "APMX", T.slate],
      ["aud-iem", "무그 MEST MK3 IEM", "Unique Melody MEST MK3", 2380, 0.15, "MEST", T.graphite],
      ["aud-stand", "우드 헤드폰 스탠드", "Walnut Headphone Stand", 64, 18, "WDST", T.coal],
      ["aud-cable", "모가미 2549 밸런스드 케이블", "Mogami 2549 Cable", 36, REST, "MGMI", T.coal],
    ],
  },
  {
    slug: "rolex-vault",
    title: "롤렉스 볼트",
    titleEn: "ROLEX VAULT",
    category: "watch",
    code: "RLX",
    tone: T.steel,
    badge: "워치",
    tagline: "정품 보증서를 동봉한 시계 구성. 상단은 롤렉스 데이토나 116500LN 입니다.",
    retailRtp: 1.05,
    trendingRank: 4,
    releasedAt: "2026-09-04",
    popularity: 79800,
    items: [
      ["rlx-daytona", "롤렉스 데이토나 116500LN", "Rolex Daytona 116500LN", 42000, 0.0018, "DYTN", T.steel],
      ["rlx-sub", "롤렉스 서브마리너 126610LN", "Rolex Submariner 126610LN", 15600, 0.006, "SUBM", T.steel],
      ["rlx-gmt", "롤렉스 GMT 마스터 II 펩시", "Rolex GMT-Master II Pepsi", 20200, 0.004, "GMT2", T.steel],
      ["rlx-ap", "오데마피게 로얄오크 15500ST", "AP Royal Oak 15500ST", 35500, 0.002, "ROAK", T.steel],
      ["rlx-omega", "오메가 스피드마스터 프로", "Omega Speedmaster Pro", 7100, 0.02, "SPDM", T.graphite],
      ["rlx-tudor", "튜더 블랙베이 58", "Tudor Black Bay 58", 3830, 0.05, "BB58", T.graphite],
      ["rlx-seiko", "세이코 프로스펙스 마린마스터", "Seiko Prospex Marinemaster", 935, 0.6, "PRSX", T.slate],
      ["rlx-hamilton", "해밀턴 카키 필드 메카니컬", "Hamilton Khaki Field Mech", 500, 2, "HMLT", T.slate],
      ["rlx-strap", "정품 가죽 스트랩 + 툴 세트", "Leather Strap + Tool Set", 93, 14, "STRP", T.coal],
      ["rlx-roll", "워치 롤 케이스", "Watch Roll Case", 43, REST, "WROL", T.coal],
    ],
  },
  {
    slug: "swiss-watch",
    title: "스위스 워치",
    titleEn: "SWISS WATCH",
    category: "watch",
    code: "SWS",
    tone: T.graphite,
    badge: "워치",
    tagline: "엔트리 스위스 메이드 중심 구성. 모든 구성에 정품 보증서가 포함됩니다.",
    retailRtp: 1.0,
    releasedAt: "2026-04-16",
    popularity: 27400,
    items: [
      ["sws-omega", "오메가 아쿠아테라 150M", "Omega Aqua Terra 150M", 6450, 0.02, "AQTR", T.steel],
      ["sws-tudor", "튜더 펠라고스 39", "Tudor Pelagos 39", 4560, 0.03, "PLG39", T.steel],
      ["sws-longines", "론진 스피릿 제트 5", "Longines Spirit Zulu 5", 2670, 0.08, "SPZL", T.graphite],
      ["sws-oris", "오리스 아퀴스 데이트", "Oris Aquis Date", 2020, 0.14, "AQIS", T.graphite],
      ["sws-tissot", "티쏘 PRX 파워매틱 80", "Tissot PRX Powermatic 80", 715, 1.2, "PRX", T.slate],
      ["sws-hamilton", "해밀턴 재즈마스터 오픈하트", "Hamilton Jazzmaster", 860, 0.9, "JAZZ", T.slate],
      ["sws-certina", "써티나 DS 액션 다이버", "Certina DS Action Diver", 500, 2.5, "DSAC", T.coal],
      ["sws-strap", "스위스 러버 스트랩 2종", "Swiss Rubber Strap x2", 115, 12, "RBST", T.coal],
      ["sws-box", "월넛 워치 박스 6구", "Walnut Watch Box 6", 57, REST, "WBOX", T.coal],
    ],
  },
  {
    slug: "luxury-leather",
    title: "럭셔리 레더",
    titleEn: "LUXURY LEATHER",
    category: "luxury",
    code: "LTH",
    tone: T.steel,
    badge: "럭셔리",
    tagline: "명품 가죽 제품 구성. 정품 인보이스와 더스트백이 함께 발송됩니다.",
    retailRtp: 1.04,
    trendingRank: 5,
    releasedAt: "2026-08-20",
    popularity: 71200,
    items: [
      ["lth-birkin", "에르메스 버킨 30 토고", "Hermès Birkin 30 Togo", 30400, 0.002, "BRKN", T.steel],
      ["lth-kelly", "에르메스 켈리 28", "Hermès Kelly 28", 27500, 0.0025, "KLLY", T.steel],
      ["lth-chanel", "샤넬 클래식 플랩 미디움", "Chanel Classic Flap Medium", 12000, 0.008, "CHNL", T.steel],
      ["lth-lv", "루이비통 카퓌신 MM", "Louis Vuitton Capucines MM", 7100, 0.02, "CAPU", T.graphite],
      ["lth-loewe", "로에베 퍼즐 스몰", "Loewe Puzzle Small", 2820, 0.08, "PZZL", T.graphite],
      ["lth-goyard", "고야드 생루이 PM", "Goyard Saint Louis PM", 1880, 0.15, "GYRD", T.slate],
      ["lth-wallet", "보테가 베네타 인트레치아토 지갑", "Bottega Intrecciato Wallet", 645, 1.6, "BTVN", T.slate],
      ["lth-card", "프라다 사피아노 카드홀더", "Prada Saffiano Cardholder", 280, 5, "PRDA", T.coal],
      ["lth-belt", "몽블랑 리버서블 벨트", "Montblanc Reversible Belt", 335, 4, "MTBL", T.coal],
      ["lth-key", "이탈리안 레더 키홀더", "Italian Leather Key Holder", 36, REST, "KEYH", T.coal],
    ],
  },
  {
    slug: "grail-handbag",
    title: "그레일 핸드백",
    titleEn: "GRAIL HANDBAG",
    category: "luxury",
    code: "GRL",
    tone: T.graphite,
    badge: "럭셔리",
    tagline: "하이엔드 핸드백만으로 구성한 상위 박스. 최저 구성도 명품 정품입니다.",
    retailRtp: 1.05,
    releasedAt: "2026-07-02",
    popularity: 44600,
    items: [
      ["grl-birkin25", "에르메스 버킨 25 크로커다일", "Hermès Birkin 25 Croc", 92800, 0.0008, "BK25", T.steel],
      ["grl-kelly25", "에르메스 켈리 25 셀리에", "Hermès Kelly 25 Sellier", 33300, 0.003, "KL25", T.steel],
      ["grl-chanel19", "샤넬 19 라지", "Chanel 19 Large", 10800, 0.02, "CH19", T.steel],
      ["grl-dior", "디올 레이디 디올 미디움", "Dior Lady Dior Medium", 6670, 0.04, "LADY", T.graphite],
      ["grl-lv", "루이비통 알마 BB 에피", "LV Alma BB Epi", 2530, 0.4, "ALMA", T.graphite],
      ["grl-celine", "셀린느 트리옹프 미디움", "Celine Triomphe Medium", 5000, 0.12, "TRMP", T.graphite],
      ["grl-ysl", "생로랑 루루 스몰", "Saint Laurent Loulou Small", 2380, 0.5, "LOUL", T.slate],
      ["grl-polene", "폴렌 넘버원 나노", "Polène Numéro Un Nano", 500, 6, "PLNE", T.coal],
      ["grl-charm", "레더 백참 + 더스트백", "Leather Bag Charm + Dust Bag", 190, REST, "CHRM", T.coal],
    ],
  },
  {
    slug: "sneaker-drop",
    title: "스니커 드랍",
    titleEn: "SNEAKER DROP",
    category: "lifestyle",
    code: "SNK",
    tone: T.coal,
    badge: "라이프스타일",
    tagline: "한정 발매 스니커 중심 구성. 전 구성 정품 검증 후 발송됩니다.",
    retailRtp: 0.96,
    releasedAt: "2026-08-05",
    popularity: 58300,
    items: [
      ["snk-dior", "에어 조던 1 하이 x 디올", "Air Jordan 1 High x Dior", 9350, 0.012, "DIOR", T.steel],
      ["snk-offwhite", "나이키 덩크 로우 x 오프화이트", "Nike Dunk Low x Off-White", 2820, 0.06, "OFFW", T.graphite],
      ["snk-travis", "에어 조던 1 로우 x 트래비스 스캇", "AJ1 Low x Travis Scott", 1800, 0.12, "TRVS", T.graphite],
      ["snk-yeezy", "이지 부스트 350 V2", "Yeezy Boost 350 V2", 430, 1.4, "YZY", T.slate],
      ["snk-nb", "뉴발란스 990v6 메이드인USA", "New Balance 990v6 USA", 240, 4, "990V6", T.slate],
      ["snk-dunk", "나이키 덩크 로우 레트로", "Nike Dunk Low Retro", 100, 12, "DUNK", T.coal],
      ["snk-sambda", "아디다스 삼바 OG", "Adidas Samba OG", 93, 16, "SMBA", T.coal],
      ["snk-care", "제이슨마크 슈케어 키트", "Jason Markk Care Kit", 28, 26, "JMRK", T.coal],
      ["snk-lace", "프리미엄 왁스 레이스 3종", "Premium Wax Laces x3", 11, REST, "LACE", T.coal],
    ],
  },
  {
    slug: "guaranteed-tech",
    title: "테크 가치 보장",
    titleEn: "GUARANTEED TECH",
    category: "tech",
    code: "GTC",
    tone: T.slate,
    badge: "가치 보장",
    tagline: "모든 구성이 오픈 가격 이상의 실판매가를 가집니다. 최저 구성도 정품 정가 제품입니다.",
    retailRtp: 1.05,
    guarantee: true,
    releasedAt: "2026-09-10",
    popularity: 52100,
    // 보장 박스는 구성 편차를 좁게 유지한다. 95% 환급에서는 "최저 실판매가 >= 오픈 가격"과
    // "최저 실판매가 × 0.95 < 오픈 가격"이 동시에 성립해야 하므로 기대값은 최저가의 1/REFUND_RATE(≈1.0526)배 이하,
    // 즉 상위 구성의 초과 가치 합이 최저가의 약 5% 안에 들어야 한다.
    items: [
      ["gtc-mbp", "맥북 프로 14 M4 프로", "MacBook Pro 14 M4 Pro", 2380, 0.15, "MBP14", T.steel],
      ["gtc-ipadpro", "아이패드 프로 11 M5", "iPad Pro 11 M5", 1300, 0.2, "IPP11", T.graphite],
      ["gtc-mba", "맥북 에어 13 M4", "MacBook Air 13 M4", 1220, 0.2, "MBA13", T.graphite],
      ["gtc-iphone", "아이폰 17 256GB", "iPhone 17 256GB", 980, 0.4, "IP17S", T.graphite],
      ["gtc-watch", "애플워치 시리즈 11 GPS", "Apple Watch Series 11", 435, 1, "AW11", T.slate],
      ["gtc-xm6", "소니 WH-1000XM6", "Sony WH-1000XM6", 435, 1.5, "XM6G", T.slate],
      ["gtc-buds", "갤럭시 버즈4 프로 + 워치8", "Galaxy Buds4 Pro + Watch8", 400, 1.5, "GB4W", T.coal],
      ["gtc-mx", "로지텍 MX 마스터 4 세트", "Logitech MX Master 4 Set", 340, 10, "MXS", T.coal],
      ["gtc-anker", "앤커 727 파워스테이션", "Anker 727 PowerHouse", 320, REST, "A727", T.coal],
    ],
  },
  {
    slug: "guaranteed-luxury",
    title: "럭셔리 가치 보장",
    titleEn: "GUARANTEED LUXURY",
    category: "luxury",
    code: "GLX",
    tone: T.steel,
    badge: "가치 보장",
    tagline: "모든 구성이 오픈 가격 이상의 실판매가를 가집니다. 정품 인보이스가 동봉됩니다.",
    retailRtp: 1.05,
    guarantee: true,
    releasedAt: "2026-09-06",
    popularity: 47800,
    items: [
      ["glx-lv", "루이비통 알마 BB", "LV Alma BB", 2380, 0.08, "ALMB", T.steel],
      ["glx-btv", "보테가 베네타 카세트 미니", "Bottega Cassette Mini", 2090, 0.1, "CSST", T.graphite],
      ["glx-gucci", "구찌 마몽 미니 숄더", "Gucci Marmont Mini", 1730, 0.15, "MRMT", T.graphite],
      ["glx-polene", "폴렌 넘버원 미니", "Polène Numéro Un Mini", 645, 0.5, "PLN1", T.slate],
      ["glx-wallet", "생로랑 모노그램 지갑", "Saint Laurent Wallet", 500, 1, "YSLW", T.slate],
      ["glx-belt", "몽블랑 리버서블 벨트", "Montblanc Belt", 335, 3, "MBBT", T.coal],
      ["glx-scarf", "에르메스 트윌리 스카프", "Hermès Twilly Scarf", 305, 5, "TWLY", T.coal],
      ["glx-key", "델보 레더 키홀더", "Delvaux Leather Key Holder", 285, 8, "DLVX", T.coal],
      ["glx-card", "프라다 사피아노 카드홀더", "Prada Saffiano Cardholder", 280, REST, "PRDC", T.coal],
    ],
  },
  {
    slug: "guaranteed-daily",
    title: "데일리 가치 보장",
    titleEn: "GUARANTEED DAILY",
    category: "lifestyle",
    code: "GDY",
    tone: T.coal,
    badge: "가치 보장",
    tagline: "모든 구성이 오픈 가격 이상의 실판매가를 가집니다. 생활 밀착형 구성입니다.",
    retailRtp: 1.05,
    guarantee: true,
    releasedAt: "2026-09-12",
    popularity: 66900,
    items: [
      ["gdy-breville", "브레빌 바리스타 익스프레스", "Breville Barista Express", 650, 0.15, "BRVL", T.graphite],
      ["gdy-lamp", "루이스폴센 PH 5 미니", "Louis Poulsen PH 5 Mini", 645, 0.15, "PH5", T.slate],
      ["gdy-dyson", "다이슨 슈퍼소닉 뉴럴", "Dyson Supersonic Nural", 505, 0.2, "DYSN", T.steel],
      ["gdy-balmuda", "발뮤다 더 토스터 프로", "BALMUDA The Toaster Pro", 360, 0.3, "BLMD", T.graphite],
      ["gdy-airpods", "에어팟 4 ANC", "AirPods 4 ANC", 180, 0.8, "APD4", T.slate],
      ["gdy-kettle", "발뮤다 더 팟", "BALMUDA The Pot", 115, 2, "BPOT", T.coal],
      ["gdy-towel", "이케우치 오가닉 타월 세트", "Ikeuchi Organic Towel Set", 110, 2, "IKUC", T.coal],
      ["gdy-candle", "딥티크 배스 캔들 300g", "Diptyque Baies 300g", 100, 5, "DPTQ", T.coal],
      ["gdy-mug", "키토 세라믹 머그 4p + 트레이", "Kinto Ceramic Mug x4 + Tray", 98, REST, "KNTO", T.coal],
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

/** 정가 기준 기대값(USDT). price 를 넘을 수 있다 — 현금 환급은 95% 이므로 차익은 생기지 않는다. */
export const expectedValue = (box: ProductBox): number =>
  box.items.reduce((s, i) => s + (i.value * i.dropRate) / 100, 0);

/** 정가 기준 환원율. 1 을 넘을 수 있으므로 단독 표기 금지. */
export const retailReturn = (box: ProductBox): number => expectedValue(box) / box.price;

/** 현금 환급 기준 환원율. 항상 1 미만이다. */
export const cashReturn = (box: ProductBox): number =>
  (expectedValue(box) * REFUND_RATE) / box.price;

/** 최소 보장가가 오픈 가격 이상인 박스 — "최소 가치 보장" 표기가 참이 되는 조건. */
export const isValueGuaranteed = (box: ProductBox): boolean => box.guaranteedMin >= box.price;

/** 정가 내림차순 드롭테이블 */
export const dropTable = (box: ProductBox): ProductItem[] =>
  [...box.items].sort((a, b) => b.value - a.value);

/** 최고 실판매가 */
export const ceilingValue = (box: ProductBox): number => Math.max(...box.items.map((i) => i.value));

// ── 행(Row) 셀렉터 — 메인 홈 4개 행 ────────────────────────

/** Row 1 · TRENDING */
export const trending = (limit = 10): ProductBox[] =>
  [...BOXES]
    .filter((b) => typeof b.trendingRank === "number")
    .sort((a, b) => a.trendingRank! - b.trendingRank!)
    .concat([...BOXES].filter((b) => typeof b.trendingRank !== "number").sort((a, b) => b.popularity - a.popularity))
    .slice(0, limit);

/** Row 2 · HIGH-TECH & MOBILITY */
export const techAndMobility = (): ProductBox[] =>
  BOXES.filter((b) => b.category === "tech" || b.category === "mobility").sort(
    (a, b) => b.popularity - a.popularity,
  );

/** Row 3 · LUXURY & WATCH */
export const luxuryAndWatch = (): ProductBox[] =>
  BOXES.filter((b) => b.category === "luxury" || b.category === "watch").sort(
    (a, b) => b.popularity - a.popularity,
  );

/** Row 4 · GUARANTEED VALUE */
export const guaranteedValue = (): ProductBox[] =>
  BOXES.filter(isValueGuaranteed).sort((a, b) => a.price - b.price);

/** 히어로에 세울 박스 — TRENDING 1순위. */
export const heroBox = (): ProductBox => trending(1)[0];

export const byCategory = (key: BoxCategory | "all"): ProductBox[] =>
  key === "all" ? BOXES : BOXES.filter((b) => b.category === key);

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
      return out.sort(
        (a, b) => (a.trendingRank ?? 99) - (b.trendingRank ?? 99) || b.popularity - a.popularity,
      );
  }
}

export const formatRate = (r: number): string =>
  r >= 10 ? r.toFixed(1) + "%" : r >= 1 ? r.toFixed(2) + "%" : r.toFixed(4) + "%";

export { REFUND_RATE };
