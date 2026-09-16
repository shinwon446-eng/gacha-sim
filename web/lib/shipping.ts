/**
 * 실물 배송 규칙 (PROMPTS 5-2, CLAUDE.md §5-C).
 *   · 국가별 통관 식별자: KR 개인통관고유부호(PCCC, P + 12자리), CN 居民身份证(18자리)
 *   · 배송비: 데모 정액. FREE_SHIPPING_EVENT 가 켜지면 0.
 */

export const COUNTRIES = ["KR", "US", "CN", "JP", "SG", "HK", "TW", "GB", "DE", "FR", "AU", "CA", "AE"] as const;
export type CountryCode = (typeof COUNTRIES)[number];

export const FREE_SHIPPING_EVENT = false;

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
