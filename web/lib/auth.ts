/** Authentication types and legacy phone formatting helpers. Real email authentication is in lib/account.ts. */
import type { AccountProvider } from "./account";
export type AuthProvider = AccountProvider;
export type AuthMode = "login" | "signup" | "recover";


/** Available entry points are independent of the selected account transport. */
export function providerConfigured(provider: AuthProvider): boolean {
  return ["email", "google", "apple", "microsoft"].includes(provider);
}

/** Whether the application provides any sign-in entry point. */
export const anyProviderConfigured = (): boolean =>
  (["google", "apple", "microsoft", "phone", "email"] as const).some(providerConfigured);

/* ─────────────────────────── 휴대폰 번호 ─────────────────────────── */

export interface PhoneSpec {
  /** 국가 번호 — "+82" */
  dial: string;
  flag: string;
  /** 하이픈 그룹 자릿수. 합이 전체 자릿수다 */
  groups: number[];
  /** 그룹이 이것보다 짧은 번호도 허용할 때의 대체 그룹(한국 10자리 등) */
  altGroups?: number[];
  /** 빠른 입력 칩이 채우는 번호 — 실제로 존재하지 않는 자리수만 쓴다(남의 번호를 채우지 않는다) */
  quickFill: string;
}

/** 로케일 기본값과 선택지. 순서가 곧 화면의 알약 순서다. */
export const PHONE_SPECS: readonly PhoneSpec[] = [
  { dial: "+82", flag: "🇰🇷", groups: [3, 4, 4], altGroups: [3, 3, 4], quickFill: "01000000000" },
  { dial: "+1", flag: "🇺🇸", groups: [3, 3, 4], quickFill: "4155550100" },
  { dial: "+86", flag: "🇨🇳", groups: [3, 4, 4], quickFill: "13800000000" },
  { dial: "+81", flag: "🇯🇵", groups: [2, 4, 4], quickFill: "9000000000" },
] as const;

export const DIAL_BY_LOCALE: Record<string, string> = { ko: "+82", en: "+1", zh: "+86" };

export function specFor(dial: string): PhoneSpec {
  return PHONE_SPECS.find((s) => s.dial === dial) ?? PHONE_SPECS[0];
}

export const digitsOnly = (raw: string): string => raw.replace(/\D+/g, "");

/** 그 국가에서 유효한 자릿수 조합을 길이순으로 */
function groupOptions(spec: PhoneSpec): number[][] {
  return spec.altGroups ? [spec.groups, spec.altGroups] : [spec.groups];
}

const sum = (g: number[]): number => g.reduce((a, b) => a + b, 0);

/** 숫자만 쳐도 하이픈이 붙는다. 자릿수를 넘기면 잘라낸다. */
export function formatPhone(raw: string, dial: string): string {
  const spec = specFor(dial);
  const max = Math.max(...groupOptions(spec).map(sum));
  const d = digitsOnly(raw).slice(0, max);
  // 짧은 형식의 자릿수를 정확히 채웠으면 그 형식으로 끊는다(한국 10자리 = 3-3-4)
  const exact = groupOptions(spec).find((g) => sum(g) === d.length);
  const groups = exact ?? spec.groups;
  const out: string[] = [];
  let i = 0;
  for (const g of groups) {
    if (i >= d.length) break;
    out.push(d.slice(i, i + g));
    i += g;
  }
  if (i < d.length) out.push(d.slice(i));
  return out.join("-");
}

/** 그 국가의 유효 자릿수를 정확히 채웠는가 */
export function isPhoneComplete(raw: string, dial: string): boolean {
  const d = digitsOnly(raw);
  return groupOptions(specFor(dial)).some((g) => sum(g) === d.length);
}

/**
 * 표시용 마스킹 — 앞 그룹과 뒤 4자리만 남긴다. `010-****-5678`
 * 전체 번호는 어디에도 저장하지 않는다(로컬 세션이 들고 있는 건 이 마스킹 문자열뿐이다).
 */
export function maskPhone(raw: string, dial: string): string {
  const d = digitsOnly(raw);
  const spec = specFor(dial);
  const exact = groupOptions(spec).find((g) => sum(g) === d.length) ?? spec.groups;
  const head = d.slice(0, exact[0]);
  const tail = d.slice(-4);
  return `${head}-****-${tail}`;
}

/* ─────────────────────────── OTP ─────────────────────────── */

export const OTP_LENGTH = 6;

/** @deprecated Compatibility helper only. Never used for authentication or sent to a user. */
export function newLocalOtp(): string {
  return String(Math.floor(Math.random() * 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

/* ─────────────────────────── 계정 식별 ─────────────────────────── */

/** 마스킹 핸들 — 공급자 계정의 표시 이름. 실명·이메일은 만들지 않는다. */
export function localHandle(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `voila_${h.toString(36).slice(0, 6)}`;
}

/** 공급자 표시명 — 토스트·뱃지에서 쓴다 */
export const PROVIDER_LABEL: Record<AuthProvider, string> = { google: "Google", apple: "Apple", microsoft: "Microsoft", phone: "Phone", email: "Email" };
