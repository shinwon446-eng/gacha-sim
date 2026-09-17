/**
 * 택배사 실시간 배송조회 링크 (CLAUDE.md §5-B-2, PROMPTS 2-5).
 * 국내(KR)는 CJ대한통운·우체국, 해외는 DHL·FedEx. 링크는 각 택배사 공식 조회 페이지 형식이다.
 * 정적 데모에는 물류 백엔드가 없으므로 운송장은 모의 발급되며, 링크는 형식만 맞는 가짜 번호를 가리킨다 — 화면에 명시한다.
 */
import type { CountryCode } from "@/lib/shipping";

export type CarrierKey = "CJ" | "EPOST" | "DHL" | "FEDEX";

export interface CarrierMeta {
  key: CarrierKey;
  /** 조회 URL — {no} 자리에 운송장 번호 */
  trackUrl: (trackingNumber: string) => string;
  /** 운송장 번호 형식 검사 */
  pattern: RegExp;
  /** 국내/해외 */
  domestic: boolean;
}

export const CARRIERS: Record<CarrierKey, CarrierMeta> = {
  CJ: { key: "CJ", trackUrl: (n) => `https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=${n}`, pattern: /^\d{10,12}$/, domestic: true },
  EPOST: { key: "EPOST", trackUrl: (n) => `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${n}`, pattern: /^\d{13}$/, domestic: true },
  DHL: { key: "DHL", trackUrl: (n) => `https://www.dhl.com/kr-ko/home/tracking/tracking-express.html?submit=1&tracking-id=${n}`, pattern: /^\d{10}$/, domestic: false },
  FEDEX: { key: "FEDEX", trackUrl: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}`, pattern: /^\d{12}$/, domestic: false },
};

/** 수취국 → 택배사. KR 은 CJ대한통운, 그 외는 DHL (데모 기본값) */
export function pickCarrier(country: CountryCode): CarrierKey {
  return country === "KR" ? "CJ" : "DHL";
}

export function trackingUrl(carrier: CarrierKey, trackingNumber: string): string {
  return CARRIERS[carrier].trackUrl(trackingNumber);
}

export function isValidTrackingNumber(carrier: CarrierKey, trackingNumber: string): boolean {
  return CARRIERS[carrier].pattern.test(trackingNumber);
}

/** 모의 운송장 번호 — 택배사 형식에 맞는 자릿수. 실제로 존재하지 않는 번호다. */
export function mockTrackingNumber(carrier: CarrierKey, seed = Date.now()): string {
  const len = carrier === "EPOST" ? 13 : carrier === "FEDEX" ? 12 : carrier === "DHL" ? 10 : 12;
  let x = seed >>> 0;
  let out = "";
  while (out.length < len) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    out += String(x % 10);
  }
  return out;
}

/** 데모: 배송 신청 후 이 시간이 지나면 창고 웹훅을 흉내 내 운송장을 발급한다 */
export const DEMO_LABEL_DELAY_MS = 20_000;
