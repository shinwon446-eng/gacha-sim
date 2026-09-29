/**
 * Google OTP (TOTP, RFC 6238 / RFC 4226), 실제 표준 구현.
 *
 * 여기서 만든 시크릿은 **진짜 Google Authenticator 앱이 읽는다**. QR 은 표준 `otpauth://totp/...` URI 이고,
 * 검증은 HMAC-SHA1 기반 동적 절단(dynamic truncation)이라 앱이 보여 주는 코드와 수학적으로 일치해야만 통과한다.
 * 흉내 낸 검사(입력값이 6자리면 통과 같은 것)는 만들지 않는다, 그런 관문은 아무것도 막지 못한다.
 *
 * ⚠️ **클라이언트 검증만으로는 자산을 지키지 못한다.** 기기를 장악한 공격자는 저장소를 고쳐 관문을 지나갈 수 있다.
 *    이 모듈은 ⑴ 올바른 UX, 시크릿 발급, 코드 검증 로직을 제공하고 ⑵ 서버가 붙으면 같은 시크릿, 같은 규칙으로
 *    서버가 재검증하도록 계약을 맞춰 둔다. 실제 자산 보호는 서버 검증이 붙은 뒤에 성립한다(`lib/account.ts`).
 */

export const TOTP_DIGITS = 6;
export const TOTP_PERIOD_SEC = 30;
/** 시계 오차 허용, 앞뒤 한 칸(±30초). RFC 6238 권장 범위. */
export const TOTP_WINDOW = 1;
/** 시크릿 길이(Base32 문자 수), 16자 = 80비트, RFC 4226 최소 128비트 권장보다 짧지만 GA 호환 관례값 */
export const TOTP_SECRET_LENGTH = 16;

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Base32(RFC 4648, 패딩 없음) 인코딩 */
export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** Base32 디코딩, 공백, 하이픈, 소문자, 패딩을 모두 받아들인다(유저가 손으로 옮겨 적는 값이다) */
export function base32Decode(secret: string): Uint8Array {
  const clean = secret.replace(/[\s-]+/g, "").replace(/=+$/, "").toUpperCase();
  if (!clean || /[^A-Z2-7]/.test(clean)) throw new Error("invalid base32");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | BASE32_ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Uint8Array.from(out);
}

/** 새 시크릿, 암호학적 난수에서만 만든다(Math.random 금지) */
export function newTotpSecret(length = TOTP_SECRET_LENGTH): string {
  const bytes = new Uint8Array(Math.ceil((length * 5) / 8));
  globalThis.crypto.getRandomValues(bytes);
  return base32Encode(bytes).slice(0, length);
}

/** 사람이 옮겨 적기 쉽게 4자씩 끊는다, 검증은 공백을 무시하므로 그대로 입력해도 된다 */
export const groupSecret = (secret: string): string => (secret.match(/.{1,4}/g) ?? []).join(" ");

/**
 * Google Authenticator 가 읽는 표준 URI.
 * 라벨은 `issuer:account` 형태이며 둘 다 퍼센트 인코딩한다(계정에 `:` 가 들어가도 깨지지 않게).
 */
export function otpauthUri({ secret, account, issuer = "VOILA" }: { secret: string; account: string; issuer?: string }): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const params = new URLSearchParams({
    secret: secret.replace(/\s+/g, ""),
    issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SEC),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** 8바이트 빅엔디언 카운터 */
function counterBytes(counter: number): Uint8Array {
  const buf = new Uint8Array(8);
  let value = Math.floor(counter);
  for (let i = 7; i >= 0; i -= 1) {
    buf[i] = value & 255;
    value = Math.floor(value / 256);
  }
  return buf;
}

/** HOTP(RFC 4226), 주어진 카운터의 코드 */
export async function hotp(secret: string, counter: number, digits = TOTP_DIGITS): Promise<string> {
  const key = base32Decode(secret);
  const cryptoKey = await globalThis.crypto.subtle.importKey("raw", key as BufferSource, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const mac = new Uint8Array(await globalThis.crypto.subtle.sign("HMAC", cryptoKey, counterBytes(counter) as BufferSource));
  // 동적 절단, 마지막 니블이 가리키는 4바이트에서 31비트를 취한다
  const offset = mac[mac.length - 1] & 0x0f;
  const binary = ((mac[offset] & 0x7f) << 24) | ((mac[offset + 1] & 0xff) << 16) | ((mac[offset + 2] & 0xff) << 8) | (mac[offset + 3] & 0xff);
  return String(binary % 10 ** digits).padStart(digits, "0");
}

export const totpCounter = (atMs: number = Date.now(), period = TOTP_PERIOD_SEC): number => Math.floor(atMs / 1000 / period);

/** 지금 유효한 코드 */
export async function totpNow(secret: string, atMs: number = Date.now()): Promise<string> {
  return hotp(secret, totpCounter(atMs));
}

/** 이번 코드가 몇 초 뒤에 바뀌는지 */
export function totpSecondsRemaining(atMs: number = Date.now(), period = TOTP_PERIOD_SEC): number {
  return period - Math.floor(atMs / 1000) % period;
}

/**
 * 코드 검증, 앞뒤 `window` 칸까지 허용한다(기기 시계 오차).
 * 길이, 숫자 형식이 맞지 않으면 HMAC 을 계산하지도 않고 거절한다.
 */
export async function verifyTotp(secret: string, code: string, atMs: number = Date.now(), window = TOTP_WINDOW): Promise<boolean> {
  const clean = code.replace(/\s+/g, "");
  if (!new RegExp(`^\\d{${TOTP_DIGITS}}$`).test(clean)) return false;
  const base = totpCounter(atMs);
  for (let drift = -window; drift <= window; drift += 1) {
    if (await hotp(secret, base + drift) === clean) return true;
  }
  return false;
}
