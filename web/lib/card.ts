/**
 * 카드 입력 폼 도우미 — 브랜드 감지 · Luhn · 만료일 · 포맷. 순수 함수.
 * 카드 번호는 화면 검증용으로만 쓰고, 어디로도 전송하지 않는다(실결제는 PG 토큰화가 담당).
 */
export type CardBrand = "visa" | "mastercard" | "unknown";

/** 카드 결제 금액 프리셋(USD) — 1:1 USDT 충전 */
export const CARD_PRESETS_USD = [20, 50, 100, 500] as const;

export const digitsOnly = (s: string): string => s.replace(/\D/g, "");

/** Visa 4… / Mastercard 51–55, 2221–2720 */
export function detectBrand(number: string): CardBrand {
  const d = digitsOnly(number);
  if (/^4/.test(d)) return "visa";
  if (/^5[1-5]/.test(d)) return "mastercard";
  const four = Number(d.slice(0, 4));
  if (d.length >= 4 && four >= 2221 && four <= 2720) return "mastercard";
  return "unknown";
}

/** 4자리 그룹 (최대 16자리) */
export function formatCardNumber(number: string): string {
  return digitsOnly(number).slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function luhnValid(number: string): boolean {
  const d = digitsOnly(number);
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  let dbl = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (dbl) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

/** "MM/YY" 로 포맷 */
export function formatExpiry(s: string): string {
  const d = digitsOnly(s).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

/** 이번 달 이후인지 (now 는 테스트용 주입) */
export function expiryValid(s: string, now = new Date()): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(formatExpiry(s));
  if (!m) return false;
  const mm = Number(m[1]);
  const yy = 2000 + Number(m[2]);
  if (mm < 1 || mm > 12) return false;
  const end = new Date(yy, mm, 0, 23, 59, 59);
  return end.getTime() >= now.getTime();
}

export const cvcValid = (s: string): boolean => /^\d{3}$/.test(digitsOnly(s));
export const holderValid = (s: string): boolean => /^[A-Za-z][A-Za-z .'-]{1,40}$/.test(s.trim());

export const cardMask = (number: string): string => `**** ${digitsOnly(number).slice(-4)}`;
