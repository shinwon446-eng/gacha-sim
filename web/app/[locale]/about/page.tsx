"use client";

import { useTranslations } from "next-intl";
import { ArrowUpRight, ArrowRight, Box, Fingerprint, PackageCheck, ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ProductArt } from "@/components/box/ProductArt";
import { BOXES } from "@/lib/products";
import { useProductText } from "@/lib/useProductText";

const STEPS = [Box, Fingerprint, PackageCheck];

export default function AboutPage() {
  const t = useTranslations("editorialPages");
  const { boxTitle } = useProductText();
  const feature = BOXES.find((box) => box.slug === "vault-submariner") ?? BOXES[0];
  return (
    <main className="min-h-screen bg-canvas">
      <SiteHeader />
      <div className="mx-auto max-w-[1440px] px-6 lg:px-14">
        <section className="grid items-center gap-10 py-14 md:grid-cols-2 md:gap-16 md:py-24">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-champagne">THE WORLD OF VOILA</p>
            <h1 className="mt-6 max-w-xl break-keep text-4xl font-semibold leading-[1.18] tracking-[-0.045em] text-white md:text-[56px]">{t("aboutTitle")}</h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-muted">{t("aboutBody")}</p>
            <Link href="/#boxes" className="mt-8 inline-flex min-h-12 items-center gap-6 rounded-md bg-[#f1eee7] px-6 text-sm font-semibold text-obsidian transition-colors hover:bg-white">{t("explore")}<ArrowUpRight className="h-4 w-4" /></Link>
          </div>
          <div className="relative aspect-square overflow-hidden rounded-lg border border-hairline bg-surface">
            <ProductArt image={feature.image} alt={boxTitle(feature)} accent="#d9c39a" glowStrength={0.04} bordered={false} priority />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-obsidian p-6 pt-16">
              <div><p className="text-xs tracking-[0.16em] text-muted">VOILA SELECTION</p><p className="mt-2 text-base text-white">{boxTitle(feature)}</p></div>
              <span className="text-xs text-gold-champagne">01</span>
            </div>
          </div>
        </section>
        <section className="border-t border-hairline py-14 md:py-20">
          <div className="grid gap-5 md:grid-cols-[1fr_1.4fr] md:gap-16"><p className="text-xs uppercase tracking-[0.2em] text-gold-champagne">HOW IT WORKS</p><div><h2 className="text-3xl font-semibold tracking-[-0.035em] text-white md:text-4xl">{t("stepsTitle")}</h2><p className="mt-4 text-base leading-7 text-muted">{t("stepsBody")}</p></div></div>
          <ol className="mt-10 grid gap-8 md:mt-14 md:grid-cols-3 md:gap-10">{STEPS.map((Icon, i) => <li key={i} className="border-t border-hairline pt-6"><div className="flex items-center justify-between"><span className="text-xs tabular-nums text-muted">0{i + 1}</span><Icon className="h-5 w-5 text-gold-champagne" strokeWidth={1.5} /></div><h3 className="mt-8 text-xl font-medium text-white">{t(`step${i + 1}Title`)}</h3><p className="mt-3 text-sm leading-7 text-muted">{t(`step${i + 1}Body`)}</p></li>)}</ol>
        </section>
        <section className="grid gap-8 rounded-lg border border-hairline bg-surface p-7 md:grid-cols-[1fr_1.3fr] md:gap-16 md:p-12">
          <div><Fingerprint className="h-8 w-8 text-gold-champagne" strokeWidth={1.3} /><h2 className="mt-5 text-3xl font-semibold tracking-tight text-white">{t("trustTitle")}</h2></div>
          <div><p className="text-base leading-8 text-muted">{t("trustBody")}</p><Link href="/fairness" className="mt-6 inline-flex min-h-11 items-center gap-3 text-sm font-medium text-gold-champagne">{t("verify")}<ArrowRight className="h-4 w-4" /></Link></div>
        </section>
        <section className="grid gap-8 py-16 md:grid-cols-[1fr_1.4fr] md:gap-16 md:py-24">
          <div><p className="text-xs uppercase tracking-[0.2em] text-gold-champagne">GOOD TO KNOW</p><h2 className="mt-5 text-3xl font-semibold tracking-tight text-white">{t("faqTitle")}</h2></div>
          <div className="border-t border-hairline">{[1, 2, 3].map((n) => <details key={n} className="group border-b border-hairline"><summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-5 py-5 text-base font-medium text-white [&::-webkit-details-marker]:hidden">{t(`faq${n}Q`)}<ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" /></summary><p className="pb-6 pr-6 text-sm leading-7 text-muted">{t(`faq${n}A`)}</p></details>)}</div>
        </section>
      </div>
    </main>
  );
}
