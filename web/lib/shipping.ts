/**
 * 실물 배송 규칙 (PROMPTS 5-2, CLAUDE.md §5-C).
 *   · 국가별 통관 식별자: KR 개인통관고유부호(PCCC, P + 12자리), CN 居民身份证(18자리)
 *   · 배송비: 데모 정액. FREE_SHIPPING_EVENT 가 켜지면 0.
 */

export const COUNTRIES = ["KR", "US", "CN", "JP", "SG", "HK", "TW", "GB", "DE", "FR", "AU", "CA", "AE"] as const;
export type CountryCode = (typeof COUNTRIES)[number];

/** 전액 무료 배송 이벤트 (2026-09-23 운영자 지시) — 켜져 있으면 모든 국가 배송비 0 */
export const FREE_SHIPPING_EVENT = true;

/** 데모 정액 배송비(USDT) — 관세·부가세는 수취 시 별도 */
export const SHIPPING_FEE_USDT: Record<CountryCode, number> = {
  KR: 15, JP: 25, CN: 30, HK: 25, TW: 25, SG: 30,
  US: 35, CA: 38, GB: 38, DE: 38, FR: 38, AU: 42, AE: 40,
};

export const shippingFee = (country: CountryCode): number => (FREE_SHIPPING_EVENT ? 0 : SHIPPING_FEE_USDT[country]);

export interface ShippingAddress {
  recipient: string;
  country: CountryCode;
  phone: string;
  postalCode: string;
  address: string;
  /** KR: PCCC / CN: 身份证 / 그 외: 없음 */
  customsId?: string;
}

export type CustomsKind = "pccc" | "residentId" | "none";

export const customsKindFor = (country: CountryCode): CustomsKind => (country === "KR" ? "pccc" : country === "CN" ? "residentId" : "none");

/** PCCC: 'P' + 숫자 12자리 */
export const isValidPccc = (s: string): boolean => /^P\d{12}$/.test(s.trim().toUpperCase());
/** 中国居民身份证: 17자리 숫자 + 검증코드(숫자 또는 X) */
export const isValidResidentId = (s: string): boolean => /^\d{17}[\dXx]$/.test(s.trim());

export type AddressError = "recipient" | "phone" | "postalCode" | "address" | "customsId";

export function validateAddress(a: ShippingAddress): AddressError[] {
  const errs: AddressError[] = [];
  if (a.recipient.trim().length < 2) errs.push("recipient");
  if (!/^\+?[\d\s\-()]{7,20}$/.test(a.phone.trim())) errs.push("phone");
  if (a.postalCode.trim().length < 3) errs.push("postalCode");
  if (a.address.trim().length < 8) errs.push("address");
  const kind = customsKindFor(a.country);
  if (kind === "pccc" && !isValidPccc(a.customsId ?? "")) errs.push("customsId");
  if (kind === "residentId" && !isValidResidentId(a.customsId ?? "")) errs.push("customsId");
  return errs;
}

/* ── 실물 배송 신뢰 패키지 (2026-09-23) ──────────────────────────────────
 * 무료 배송 이벤트·정품 검수·분실 보상은 전부 "운영자가 내건 약속"이다.
 * 화면에 0.00 USDT 무료라고 적으면 실제로도 0 을 청구해야 한다 — 표기와 청구가 어긋나지 않게 여기서 한 곳으로 묶는다.
 */

/** 휴대폰 자동 하이픈 — 010-1234-5678 (KR). 그 외 국가는 숫자·기호만 정리한다. */
export function formatPhoneKR(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

/** 관세청 유니패스 개인통관고유부호 발급 */
export const UNIPASS_URL = "https://unipass.customs.go.kr/csp/persIndex.do";

/** 위조품 적발 시 보상 배수 — 운영자 정책 (법적 문서에도 같은 수치가 적혀 있어야 한다) */
export const COUNTERFEIT_COMPENSATION_MULTIPLE = 3;
