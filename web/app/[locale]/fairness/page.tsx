"use client";

import { useTranslations } from "next-intl";
import { Fingerprint, ChevronDown } from "lucide-react";
import { ROLL_RANGE } from "@/lib/fairness";
import { VisualVerifier } from "@/components/fairness/VisualVerifier";
import { ProofFeed } from "@/components/fairness/ProofFeed";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default function FairnessPage() {
  const t = useTranslations();
  const e = useTranslations("editorialPages");
  return (
    <main className="min-h-screen bg-canvas pb-16">
      <SiteHeader />
      <div className="mx-auto max-w-[1440px] px-6 lg:px-14">
        <header className="grid gap-6 border-b border-hairline py-14 md:grid-cols-[1.15fr_1fr] md:items-end md:gap-16 md:py-20"><div><p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold-champagne"><Fingerprint className="h-4 w-4" /> TRANSPARENCY</p><h1 className="mt-6 text-4xl font-semibold leading-[1.2] tracking-[-0.045em] text-white md:text-[52px]">{e("fairTitle")}</h1></div><p className="max-w-lg text-base leading-8 text-muted">{e("fairBody")}</p></header>
        <div className="grid items-start gap-10 py-10 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:gap-10 xl:py-14">
          <VisualVerifier />
          <aside className="min-w-0 rounded-lg border border-hairline p-6 md:p-8"><p className="text-xs uppercase tracking-[0.16em] text-gold-champagne">ACTIVITY RECORDS</p><h2 className="mt-4 text-2xl font-medium tracking-tight text-white">{e("recordsTitle")}</h2><p className="mb-6 mt-3 text-sm leading-7 text-muted">{e("recordsBody")}</p><ProofFeed /></aside>
        </div>
        <details className="group rounded-lg border border-hairline p-6 md:p-8"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-white [&::-webkit-details-marker]:hidden">{e("methodTitle")}<ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" /></summary><p className="mt-6 overflow-x-auto rounded-md bg-surface p-4 font-mono text-xs leading-7 text-gold-champagne">{t("fairness.formula", { range: ROLL_RANGE.toLocaleString("en-US") })}</p><ol className="mt-8 grid gap-8 md:grid-cols-3">{(["step1", "step2", "step3"] as const).map((k, i) => <li key={k}><span className="text-xs tabular-nums text-gold-champagne">0{i + 1}</span><p className="mt-3 text-sm leading-7 text-muted">{t(`fairness.${k}`)}</p></li>)}</ol></details>
      </div>
    </main>
  );
}
