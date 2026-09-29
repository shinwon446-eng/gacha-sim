"use client";

import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "./BrandLogo";
import { LEGAL_GROUPS } from "@/lib/legal";

export function Footer() {
  const t = useTranslations("footer");
  const tr = useTranslations();
  const c = useTranslations("legalCenter");
  const d = useTranslations("legalDocs");
  const linkClass = "flex min-h-11 items-center text-sm text-secondary transition-colors hover:text-white";
  return <footer className="mt-16 border-t border-hairline bg-obsidian text-secondary md:mt-24">
    <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-8 px-5 py-12 sm:px-8 xl:px-12 md:grid-cols-[1.3fr_1fr_1fr] md:gap-16 md:py-16">
      <div className="col-span-2 md:col-span-1"><BrandLogo size="lg" /><p className="mt-5 max-w-[260px] text-base leading-relaxed text-secondary">{t("tagline")}</p><Link href="/about" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm text-gold-champagne">{tr("nav.about")}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link></div>
      <div><h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-white">{t("service")}</h2><ul className="mt-4"><li><Link href="/" className={linkClass}>{tr("nav.boxes")}</Link></li><li><Link href="/inventory" className={linkClass}>{tr("nav.inventory")}</Link></li><li><Link href="/fairness" className={linkClass}>{tr("nav.fairness")}</Link></li><li><Link href="/community" className={linkClass}>{tr("nav.community")}</Link></li></ul></div>
      <div><h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-white">{t("guide")}</h2><ul className="mt-4"><li><Link href="/legal" className={linkClass}>{c("title")}</Link></li><li><Link href="/legal/privacy" className={`${linkClass} font-semibold text-white`}>{d("privacy.title")}</Link></li><li><Link href="/legal/complaints" className={linkClass}>{d("complaints.title")}</Link></li><li><Link href="/legal/faq" className={linkClass}>{d("faq.title")}</Link></li></ul></div>
    </div>
    <div className="mx-auto max-w-[1440px] border-t border-hairline px-5 py-9 sm:px-8 xl:px-12">
      <div className="grid gap-8 md:grid-cols-3">{LEGAL_GROUPS.map(group => <nav key={group.key} aria-label={c(`groups.${group.key}`)}><h2 className="text-xs font-semibold tracking-wide text-white">{c(`groups.${group.key}`)}</h2><ul className="mt-3">{group.docs.map(doc => <li key={doc}><Link href={`/legal/${doc}`} className={`${linkClass} ${doc === "privacy" ? "font-semibold text-white" : ""}`}>{d(`${doc}.title`)}</Link></li>)}</ul></nav>)}</div>
      <div className="mt-8 border-t border-hairline pt-6 text-xs leading-7"><p className="font-medium text-gold-champagne">{c("footerStatus")}</p><p className="mt-2 max-w-3xl">{c("footerBusiness")}</p><Link href="/legal/business" className="inline-flex min-h-11 items-center text-gold-champagne underline underline-offset-4">{c("businessLink")}</Link><p className="mt-4">© 2026 VOILA. All rights reserved.</p></div>
    </div>
  </footer>;
}
export default Footer;
