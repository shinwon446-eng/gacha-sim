/**
 * 글로벌 출고 허브 5곳, /about ④ 글로벌 네트워크 섹션의 데이터.
 *
 * ⚠️ **물류사, 감정 기관의 실명은 넣지 않는다.** 계약이 없는 제3자 이름을 화면에 붙이면 그 회사가 우리 배송을
 *    보증하는 것처럼 보이는 허위 보증이 된다(CLAUDE.md §10, 부록 C). 그래서 각 허브는 **서비스 등급**만 적는다
 *    ("국제 특송 프라이오리티", "고가품 보안 특송"). 실제 계약이 체결되면 바꿀 곳은 딱 한 군데다, *    `scripts/gen-messages.py` 의 `about.h{CODE}Partner` 문자열(세 로케일).
 *
 * 배송 소요일, 통관 부담, 보증 조건은 **운영자가 집행하는 정책**이다. 집행하지 않을 항목은 이 표에서 내린다.
 * 좌표는 등거리원통도법(equirectangular)을 위도 15N~60N 구간으로 늘린 SVG viewBox 400×200 기준이다.
 */
export interface ShippingHub {
  code: "KR" | "JP" | "US" | "AE" | "GB";
  flag: string;
  /** 탭에 쓰는 짧은 도시명 (about.hubKR …) */
  tabKey: string;
  /** 스트림 카드에 쓰는 전체 도시명 (about.cSeoul …) */
  cityKey: string;
  /** 스펙 4줄 (about.hKRPartner …) */
  partnerKey: string;
  leadKey: string;
  dutyKey: string;
  warrantyKey: string;
  /** 스트림 카드가 쓰는 대표 박스 슬러그, 최고 구성품을 썸네일, 금액으로 쓴다 */
  slug: string;
  /** 그 도시에서 되는 일 (about.globalCap1 …) */
  capKey: string;
  x: number;
  y: number;
}

export const SHIPPING_HUBS: readonly ShippingHub[] = [
  {
    code: "KR",
    flag: "🇰🇷",
    tabKey: "hubKR",
    cityKey: "cSeoul",
    partnerKey: "hKRPartner",
    leadKey: "hKRLead",
    dutyKey: "hKRDuty",
    warrantyKey: "hKRWarranty",
    slug: "vault-submariner",
    capKey: "globalCap1",
    x: 341,
    y: 100,
  },
  {
    code: "JP",
    flag: "🇯🇵",
    tabKey: "hubJP",
    cityKey: "cTokyo",
    partnerKey: "hJPPartner",
    leadKey: "hJPLead",
    dutyKey: "hJPDuty",
    warrantyKey: "hJPWarranty",
    slug: "vault-handbag",
    capKey: "globalCap1",
    x: 355,
    y: 106,
  },
  {
    code: "US",
    flag: "🇺🇸",
    tabKey: "hubUS",
    cityKey: "cNewYork",
    partnerKey: "hUSPartner",
    leadKey: "hUSLead",
    dutyKey: "hUSDuty",
    warrantyKey: "hUSWarranty",
    slug: "jackpot-cybertruck",
    capKey: "globalCap3",
    x: 118,
    y: 89,
  },
  {
    code: "AE",
    flag: "🇦🇪",
    tabKey: "hubAE",
    cityKey: "cDubai",
    partnerKey: "hAEPartner",
    leadKey: "hAELead",
    dutyKey: "hAEDuty",
    warrantyKey: "hAEWarranty",
    slug: "vault-gold",
    capKey: "globalCap2",
    x: 281,
    y: 144,
  },
  {
    code: "GB",
    flag: "🇬🇧",
    tabKey: "hubGB",
    cityKey: "cLondon",
    partnerKey: "hGBPartner",
    leadKey: "hGBLead",
    dutyKey: "hGBDuty",
    warrantyKey: "hGBWarranty",
    slug: "starter-macbook",
    capKey: "globalCap3",
    x: 200,
    y: 50,
  },
] as const;

/** 허브를 잇는 황금 아크, 활성 허브에서 나머지 넷으로 뻗는다 */
export function arcsFrom(hub: ShippingHub): { key: string; d: string }[] {
  return SHIPPING_HUBS.filter((h) => h.code !== hub.code).map((h) => {
    const mx = (hub.x + h.x) / 2;
    // 두 점 거리에 비례해 위로 부풀린다, 대권 항로처럼 보이게
    const lift = Math.min(58, Math.hypot(h.x, hub.x, h.y, hub.y) * 0.34);
    const my = (hub.y + h.y) / 2, lift;
    return { key: `${hub.code}-${h.code}`, d: `M ${hub.x} ${hub.y} Q ${mx} ${my} ${h.x} ${h.y}` };
  });
}
