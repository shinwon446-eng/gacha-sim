"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ROLL_RANGE } from "@/lib/fairness";
import { VisualVerifier } from "@/components/fairness/VisualVerifier";
import { ProofFeed } from "@/components/fairness/ProofFeed";
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
        <nav className="flex items-center gap-4 whitespace-nowrap text-xs text-muted">
          <Link href="/" className="transition-colors hover:text-white">
            {t("nav.boxes")}
          </Link>
          <Link href="/inventory" className="transition-colors hover:text-white">
            {t("nav.inventory")}
          </Link>
          <span className="font-semibold text-white">{t("nav.fairness")}</span>
          <Link href="/community" className="transition-colors hover:text-white">
            {t("nav.community")}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSelector />
          <CurrencySelector />
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-[4%] pt-8 md:pt-10">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-gold-champagne" strokeWidth={2.2} />
          <span className="caption-luxury">{t("fairness.eyebrow")}</span>
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">{t("fairness.title")}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-secondary">{t("fairness.subtitle")}</p>

        {/* 1. 3-Step 1-Click 비주얼 검증기 (전문가 모드 안에 hex 검증기) */}
        <VisualVerifier className="mt-6" />

        {/* 2·3. 실지급/실배송 라이브 피드 + 지급 준비금 */}
        <h2 className="mt-10 font-display text-2xl font-bold uppercase tracking-tight text-white">{t("proof.title")}</h2>
        <ProofFeed className="mt-4" />

        {/* 원리 — 수식은 맨 아래로 */}
        <details className="mt-10 rounded-lg border border-hairline bg-obsidian p-4">
          <summary className="cursor-pointer text-xs font-semibold text-muted hover:text-white">{t("fairness.eyebrow")}</summary>
          <div className="border-metallic-gold mt-3 rounded-lg bg-canvas px-4 py-3 font-mono text-xs leading-relaxed text-gold-champagne">
            {t("fairness.formula", { range: ROLL_RANGE.toLocaleString("en-US") })}
          </div>
          <ol className="mt-3 grid gap-3 md:grid-cols-3">
            {(["step1", "step2", "step3"] as const).map((k, i) => (
              <li key={k} className="border-metallic-subtle rounded-lg bg-surface p-4">
                <div className="font-display text-2xl font-bold text-gold-champagne">0{i + 1}</div>
                <p className="mt-2 text-xs leading-relaxed text-secondary">{t(`fairness.${k}`)}</p>
              </li>
            ))}
          </ol>
        </details>
      </section>
    </main>
  );
}
