"use client";

import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "./BrandLogo";
import { SUPPORT } from "@/lib/runtime";

export function Footer() {
  const t = useTranslations("footer");
  const tr = useTranslations();
  const linkClass = "flex min-h-11 items-center text-sm text-secondary transition-colors hover:text-white";
  return <footer className="mt-16 border-t border-hairline bg-obsidian text-secondary md:mt-24">
    <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-8 px-5 py-12 sm:px-8 xl:px-12 md:grid-cols-[1.3fr_1fr_1fr] md:gap-16 md:py-16">
      <div className="col-span-2 md:col-span-1"><BrandLogo size="lg" /><p className="mt-5 max-w-[260px] text-base leading-relaxed text-secondary">{t("tagline")}</p><Link href="/about" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm text-gold-champagne">{tr("nav.about")}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link></div>
      <div><h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-white">{t("service")}</h2><ul className="mt-4"><li><Link href="/" className={linkClass}>{tr("nav.boxes")}</Link></li><li><Link href="/inventory" className={linkClass}>{tr("nav.inventory")}</Link></li><li><Link href="/fairness" className={linkClass}>{tr("nav.fairness")}</Link></li><li><Link href="/community" className={linkClass}>{tr("nav.community")}</Link></li></ul></div>
      <div><h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-white">{t("guide")}</h2><ul className="mt-4"><li><Link href="/legal/terms" className={linkClass}>{t("links.terms")}</Link></li><li><Link href="/legal/privacy" className={linkClass}>{t("links.privacy")}</Link></li><li><Link href="/legal/policy" className={linkClass}>{t("links.policy")}</Link></li><li><Link href="/legal/faq" className={linkClass}>{t("links.faq")}</Link></li></ul></div>
    </div>
    <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 border-t border-hairline px-5 py-6 text-xs sm:px-8 xl:px-12"><p>© 2026 VOILA. All rights reserved.</p><div className="flex flex-wrap gap-x-5"><a href={SUPPORT.telegram} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 hover:text-white">{t("links.telegram")}<ArrowUpRight className="h-3 w-3" aria-hidden="true" /></a><a href={SUPPORT.discord} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 hover:text-white">{t("links.discord")}<ArrowUpRight className="h-3 w-3" aria-hidden="true" /></a></div></div>
  </footer>;
}
export default Footer;
