"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ROLL_RANGE } from "@/lib/fairness";
import { FairnessVerifier } from "@/components/fairness/FairnessVerifier";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { CurrencySelector } from "@/components/layout/CurrencySelector";

/** /fairness — Provably Fair 설명 + 검증기 (PROMPTS 3-1-2) */
export default function FairnessPage() {
  const t = useTranslations();
  return (
    <main className="min-h-screen bg-canvas pb-24">
      <header className="sticky top-0 z-40 flex items-center gap-5 border-b border-hairline bg-obsidian/90 px-[4%] py-4 backdrop-blur-md">
        <Link href="/" className="font-display text-xl font-bold uppercase leading-none tracking-tight text-crimson">
          Gachaflix
        </Link>
        <nav className="flex items-center gap-4 text-xs text-muted">
          <Link href="/" className="transition-colors hover:text-white">
            {t("nav.boxes")}
          </Link>
          <span className="font-semibold text-white">{t("nav.fairness")}</span>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSelector />
          <CurrencySelector />
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-[4%] pt-12">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-gold-champagne" strokeWidth={2.2} />
          <span className="caption-luxury">{t("fairness.eyebrow")}</span>
        </div>
        <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight text-white md:text-5xl">{t("fairness.title")}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-secondary">{t("fairness.subtitle")}</p>

        <div className="border-metallic-gold mt-6 rounded-lg bg-obsidian px-4 py-3 font-mono text-xs leading-relaxed text-gold-champagne">
          {t("fairness.formula", { range: ROLL_RANGE.toLocaleString("en-US") })}
        </div>

        <ol className="mt-6 grid gap-3 md:grid-cols-3">
          {(["step1", "step2", "step3"] as const).map((k, i) => (
            <li key={k} className="border-metallic-subtle rounded-lg bg-surface p-4">
              <div className="font-display text-2xl font-bold text-gold-champagne">0{i + 1}</div>
              <p className="mt-2 text-xs leading-relaxed text-secondary">{t(`fairness.${k}`)}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10">
          <FairnessVerifier />
        </div>
      </section>
    </main>
  );
}
