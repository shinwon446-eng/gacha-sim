/**
 * 상품 목업 데이터셋 — 단일 원천(single source of truth).
 *
 * 스키마는 지정된 형태를 그대로 따른다:
 *   id, name_en, name_zh, price_usd, guaranteed_min_value, probability_table, image_placeholder
 *
 * 규칙
 *  - 이모지 금지. 마케팅성 과장 표현 금지. 톤은 미니멀·냉정·정확.
 *  - probability_table 의 weight 합계는 박스마다 정확히 100 이어야 한다 (tests 에서 검증).
 *  - image_placeholder 는 AssetPlate 에 렌더되는 애셋 코드다. 2~6자 대문자 A-Z0-9, 하이픈 1개 허용.
 *  - guaranteed_min_value 는 probability_table 내 최저 value_usd 와 일치해야 한다 (tests 에서 검증).
 */

export interface CatalogEntry {
  item_id: string;
  name_en: string;
  name_zh: string;
  /** 실판매가(USD). 라인 등급 산출의 유일한 기준. */
  value_usd: number;
  /** 상대 가중치. 박스 내 합계 100. */
  weight: number;
  /** 가중치에서 파생된 공시 확률(%). weight 합계가 100이므로 수치상 동일하다. */
  probability_pct: number;
  /** 인증서 / 인보이스 식별자 */
  cert: string;
  image_placeholder: string;
}

export interface CatalogBox {
  id: string;
  name_en: string;
  name_zh: string;
  /** 1회 재생 가격(USD) */
  price_usd: number;
  /** 최저 보장가(USD) — 어떤 결과든 이 값 이상의 실판매가를 수령한다 */
  guaranteed_min_value: number;
  image_placeholder: string;
  probability_table: CatalogEntry[];
}

/** 확률은 가중치에서 파생한다. 수기 입력 금지. */
const entry = (
  item_id: string,
  name_en: string,
  name_zh: string,
  value_usd: number,
  weight: number,
  cert: string,
  image_placeholder: string,
): CatalogEntry => ({ item_id, name_en, name_zh, value_usd, weight, probability_pct: weight, cert, image_placeholder });

export const CATALOG: CatalogBox[] = [
  {
    id: "black-label-apex-tech",
    name_en: "BLACK LABEL: Apex Tech",
    name_zh: "黑标系列：顶峰数码",
    price_usd: 69,
    guaranteed_min_value: 69,
    image_placeholder: "BL-APX",
    probability_table: [
      entry("bl-mbp16", "MacBook Pro 16 M4 Max 128GB", "MacBook Pro 16 M4 Max 128GB", 6999, 0.2, "APPLE-SN-MBP-M4X-01", "M4MAX"),
      entry("bl-vision", "Apple Vision Pro 1TB", "Apple Vision Pro 1TB", 3899, 0.5, "APPLE-SN-VP-77A2", "AVP"),
      entry("bl-fold", "Galaxy Z Fold 6 1TB", "三星 Galaxy Z Fold 6 1TB", 1899, 2, "SAMSUNG-SN-ZF6-4410", "ZF6"),
      entry("bl-iphone", "iPhone 16 Pro Max 1TB", "iPhone 16 Pro Max 1TB", 1599, 2, "APPLE-SN-IP-19C4", "IP16"),
      entry("bl-ipad", "iPad Pro 13 M4 2TB", "iPad Pro 13 M4 2TB", 1499, 3, "APPLE-SN-IPP-M4-77", "IPP13"),
      entry("bl-watch", "Apple Watch Ultra 2", "Apple Watch Ultra 2", 799, 6, "APPLE-SN-AWU2-0311", "AWU2"),
      entry("bl-airpods", "AirPods Pro 2", "AirPods Pro 2", 249, 18, "APPLE-SN-AP-88F1", "APP2"),
      entry("bl-charger", "Anker 140W GaN Charger", "Anker 140W 氮化镓充电器", 99, 30, "ANKER-SN-A2696", "GAN140"),
      entry("bl-cable", "Thunderbolt 4 Cable 1m", "雷雳 4 线缆 1米", 69, 38.3, "APPLE-ACC-TB4", "TB4"),
    ],
  },
  {
    id: "overclock-battle-station",
    name_en: "OVERCLOCK: Battle Station",
    name_zh: "超频领域：战术装备",
    price_usd: 45,
    guaranteed_min_value: 39,
    image_placeholder: "OC-BTL",
    probability_table: [
      entry("oc-rig", "Full Build: Ryzen 9 9950X + RTX 5080", "整机：锐龙 9 9950X + RTX 5080", 3499, 0.15, "BUILD-INV-9950X-5080", "RIG-01"),
      entry("oc-5090", "NVIDIA RTX 5090 Founders Edition", "英伟达 RTX 5090 公版", 1999, 0.4, "NVIDIA-SN-FE5090-2207", "RTX90"),
      entry("oc-g9", "Samsung Odyssey OLED G9 49", "三星 Odyssey OLED G9 49英寸", 1299, 1.5, "SAMSUNG-SN-G9-8812", "ODY-G9"),
      entry("oc-deck", "Steam Deck OLED 1TB", "Steam Deck OLED 1TB", 649, 5, "VALVE-SN-SD-0C31", "SD-O"),
      entry("oc-chair", "Secretlab TITAN Evo", "Secretlab TITAN Evo 人体工学椅", 549, 5, "SECRETLAB-SN-TE-5530", "TTN-E"),
      entry("oc-keeb", "Wooting 60HE Keyboard", "Wooting 60HE 磁轴键盘", 199, 12, "WOOTING-SN-60HE-1184", "W60HE"),
      entry("oc-mouse", "Logitech G Pro X Superlight 2", "罗技 G Pro X Superlight 2", 159, 15, "LOGI-SN-GPXSL2-0092", "GPX2"),
      entry("oc-deckmk2", "Elgato Stream Deck MK.2", "Elgato Stream Deck MK.2", 149, 20, "ELGATO-SN-SDMK2-3301", "SDMK2"),
      entry("oc-cable", "Braided USB-C Cable Set", "编织 USB-C 线缆套装", 39, 40.95, "ACC-USBC-SET-04", "UC-SET"),
    ],
  },
  {
    id: "studio-zero-sound-stage",
    name_en: "STUDIO ZERO: Sound Stage",
    name_zh: "零号影音：声学工坊",
    // 가격은 guaranteed_min_value × REFUND_RATE 를 반드시 초과해야 한다.
    // 그렇지 않으면 최악의 결과조차 회수가만으로 원금을 넘겨 무위험 차익이 생긴다. (tests 에서 강제)
    price_usd: 60,
    guaranteed_min_value: 59,
    image_placeholder: "SZ-SND",
    probability_table: [
      entry("sz-genelec", "Genelec 8341A SAM Pair", "真力 8341A 有源监听音箱 一对", 5800, 0.1, "GENELEC-SN-8341A-PR-0417", "GEN41"),
      entry("sz-u87", "Neumann U 87 Ai", "纽曼 U 87 Ai 电容话筒", 3600, 0.2, "NEUMANN-SN-U87AI-9920", "U87AI"),
      entry("sz-apollo", "Universal Audio Apollo x8p", "Universal Audio Apollo x8p 声卡", 2999, 0.5, "UA-SN-APX8P-2261", "APX8P"),
      entry("sz-hd800", "Sennheiser HD 800 S", "森海塞尔 HD 800 S", 1699, 1.2, "SENN-SN-HD800S-5518", "HD800"),
      entry("sz-focal", "Focal Clear MG", "Focal Clear MG 头戴耳机", 1499, 1.5, "FOCAL-SN-CLRMG-3307", "CLRMG"),
      entry("sz-audeze", "Audeze LCD-X", "Audeze LCD-X 平板耳机", 1199, 2, "AUDEZE-SN-LCDX-7741", "LCD-X"),
      entry("sz-sm7b", "Shure SM7B", "舒尔 SM7B 动圈话筒", 399, 8, "SHURE-SN-SM7B-1096", "SM7B"),
      entry("sz-m50x", "Audio-Technica ATH-M50x", "铁三角 ATH-M50x", 169, 22, "ATH-SN-M50X-4432", "M50X"),
      entry("sz-mogami", "Mogami Gold XLR 3m", "Mogami 黄金 XLR 线 3米", 59, 64.5, "MOGAMI-GOLD-XLR-3M", "MOG-X"),
    ],
  },
];

export const CATALOG_MAP: Record<string, CatalogBox> = Object.fromEntries(CATALOG.map((b) => [b.id, b]));

/** 박스의 최저 보장가를 probability_table 에서 실제로 계산한다 (선언값 검증용). */
export const computeGuaranteedMin = (box: CatalogBox): number =>
  Math.min(...box.probability_table.map((e) => e.value_usd));

/** 가중치 합계 — 100 이어야 한다. */
export const weightSum = (box: CatalogBox): number =>
  box.probability_table.reduce((s, e) => s + e.weight, 0);
