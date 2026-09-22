/**
 * 택배사 실시간 배송조회 링크 (CLAUDE.md §5-B-2, PROMPTS 2-5).
 * 국내(KR)는 CJ대한통운·우체국, 해외는 DHL·FedEx. 링크는 각 택배사 공식 조회 페이지 형식이다.
 * 운송장은 물류 API(live 모드)가 발급한 것만 표시한다 — 번호를 지어내지 않는다.
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

