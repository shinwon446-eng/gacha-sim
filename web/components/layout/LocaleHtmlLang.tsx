"use client";

import { useEffect } from "react";
import { LOCALE_LANG, type Locale } from "@/i18n/routing";

/** 루트 레이아웃은 로케일을 모르므로, 여기서 <html lang> 을 맞춘다. */
export function LocaleHtmlLang({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = LOCALE_LANG[locale];
  }, [locale]);
  return null;
}

export default LocaleHtmlLang;
