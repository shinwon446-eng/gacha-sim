"use client";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/format";
import { LOCALES, LOCALE_LABEL, type Locale } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";
export function LanguageSelector({ className }: { className?: string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("header");
  const router = useRouter();
  const pathname = usePathname();
  const choose = (next: Locale) => {
    if (next === locale) return;
    try { localStorage.setItem("gachaflix.locale", next); } catch { /* Navigation remains available without storage. */ }
    router.replace(`${pathname}${window.location.search}${window.location.hash}`, { locale: next });
  };
  return <div className={cn("relative", className)}><select aria-label={t("language")} value={locale} onChange={(event) => choose(event.target.value as Locale)} className="h-11 min-w-[94px] appearance-none rounded-lg border border-hairline bg-obsidian pl-3 pr-7 text-xs font-medium text-secondary hover:text-white">{LOCALES.map((value) => <option key={value} value={value}>{LOCALE_LABEL[value]}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2.5 top-4 h-3 w-3 text-muted" aria-hidden="true" /></div>;
}
export default LanguageSelector;
