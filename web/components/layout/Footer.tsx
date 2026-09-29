"use client";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Globe2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "./BrandLogo";
import { LanguageSelector } from "./LanguageSelector";
import { LEGAL_GROUPS } from "@/lib/legal";

/** One footer, one link per policy. The platform signature remains intact. */
export function Footer() {
  const t = useTranslations("footer");
  const c = useTranslations("legalCenter");
  const d = useTranslations("legalDocs");
  const r = useTranslations("refinement");
  return <footer className="border-t border-hairline bg-[#0d0e0f] text-secondary">
    <div className="page-shell py-10 md:py-14">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_2.4fr] lg:gap-16">
        <div>
          <BrandLogo size="lg" />
          <p className="mt-4 max-w-xs text-sm leading-7 text-muted">{t("tagline")}</p>
          <Link href="/legal" className="mt-5 inline-flex min-h-11 items-center gap-3 text-sm font-medium text-gold-champagne">{c("title")}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
        <div className="grid gap-7 sm:grid-cols-3 sm:gap-6">
          {LEGAL_GROUPS.map(group => <nav key={group.key} aria-label={c(`groups.${group.key}`)} className="border-t border-hairline pt-5 sm:border-0 sm:pt-0">
            <h2 className="mb-3 text-sm font-semibold text-white">{c(`groups.${group.key}`)}</h2>
            <ul className="grid grid-cols-2 gap-x-4 sm:block">{group.docs.map(doc => <li key={doc}><Link href={`/legal/${doc}`} className={`flex min-h-11 items-center py-2 text-[13px] leading-5 transition-colors hover:text-gold-champagne ${doc === "privacy" ? "font-semibold text-white" : "text-muted"}`}>{d(`${doc}.title`)}</Link></li>)}</ul>
          </nav>)}
        </div>
      </div>
      <div className="mt-9 grid gap-5 border-t border-hairline pt-6 md:grid-cols-[1fr_auto] md:items-start">
        <div className="max-w-3xl text-xs leading-6 text-muted"><p className="font-medium text-secondary">{c("footerStatus")}</p><p className="mt-1">{c("footerBusiness")}</p><p className="mt-2">{r("languageScope")}</p></div>
        <div className="flex items-center gap-3"><Globe2 className="h-4 w-4 text-muted" aria-hidden="true" /><LanguageSelector /></div>
      </div>
      <div className="mt-6 flex flex-wrap justify-between gap-3 text-xs text-muted"><span>&copy; 2026 VOILA. All rights reserved.</span><span>OPEN IT, OWN IT.</span></div>
    </div>
  </footer>;
}
export default Footer;
