"use client";
import { ArrowUpRight, Box, MousePointer2, PackageCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
export function DiscoveryGuide() {
  const t = useTranslations("design");
  return <section className="discovery-guide page-shell" aria-labelledby="guide-title">
    <div className="guide-heading"><div><p className="eyebrow">{t("guideEyebrow")}</p><h2 id="guide-title">{t("guideTitle")}</h2><p className="guide-intro">{t("guideBody")}</p></div><Link href="/about" className="text-link">{t("guideMore")}<ArrowUpRight size={16} aria-hidden /></Link></div>
    <div className="guide-steps">{[Box, MousePointer2, PackageCheck].map((Icon, i) => <div key={i} className="guide-step"><div className="flex items-center justify-between"><Icon size={26} strokeWidth={1.2} className="text-gold-champagne" aria-hidden /><span className="text-xs tabular-nums text-muted">0{i + 1}</span></div><h3>{t("step" + (i+1) + "Title")}</h3><p>{t("step" + (i+1) + "Body")}</p></div>)}</div>
  </section>;
}
