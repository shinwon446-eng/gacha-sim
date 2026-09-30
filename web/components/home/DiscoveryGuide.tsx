"use client";
import { ArrowUpRight, Box, MousePointer2, PackageCheck } from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { copyFor } from "@/lib/homeCopy";
export function DiscoveryGuide() {
  const copy = copyFor(useLocale());
  return <section className="discovery-guide page-shell" aria-labelledby="guide-title">
    <div className="guide-heading"><div><p className="eyebrow">{copy.guideEyebrow}</p><h2 id="guide-title">{copy.guideTitle}</h2><p className="guide-intro">{copy.guideBody}</p></div><Link href="/about" className="text-link">{copy.guideMore}<ArrowUpRight size={16} aria-hidden /></Link></div>
    <div className="guide-steps">{[Box, MousePointer2, PackageCheck].map((Icon, i) => <div key={i} className="guide-step"><div className="flex items-center justify-between"><Icon size={26} strokeWidth={1.2} className="text-gold-champagne" aria-hidden /><span className="text-xs tabular-nums text-muted">0{i + 1}</span></div><h3>{copy.steps[i][0]}</h3><p>{copy.steps[i][1]}</p></div>)}</div>
  </section>;
}
