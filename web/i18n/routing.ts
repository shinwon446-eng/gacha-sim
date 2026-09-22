import { defineRouting } from "next-intl/routing";

/**
 * 로케일 라우팅 (CLAUDE.md §4). URL 접두어 항상 표시: /ko /en /zh
 * 정적 export 라 middleware 가 없다. 루트(/)는 app/page.tsx 가 클라이언트에서 리다이렉트한다.
 */
export const LOCALES = ["ko", "en", "zh"] as const;
export type Locale = (typeof LOCALES)[number];

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: "ko",
  localePrefix: "always",
});

export const LOCALE_LABEL: Record<Locale, string> = { ko: "한국어", en: "English", zh: "中文" };
export const LOCALE_SHORT: Record<Locale, string> = { ko: "KO", en: "EN", zh: "ZH" };
/** html lang 값 */
export const LOCALE_LANG: Record<Locale, string> = { ko: "ko", en: "en", zh: "zh-CN" };
