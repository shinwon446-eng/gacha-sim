"use client";

import { useTranslations } from "next-intl";
import { ArrowDown, Check, ChevronDown, Fingerprint, LockKeyhole, Calculator, PackageCheck } from "lucide-react";
import { VisualVerifier } from "@/components/fairness/VisualVerifier";
import { HashExplainer } from "@/components/fairness/HashExplainer";
import { ProofFeed } from "@/components/fairness/ProofFeed";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default function FairnessPage() {
  const t = useTranslations("fairnessGuide");
  const icons = [LockKeyhole, Calculator, PackageCheck];
  return (
    <main className="min-h-screen bg-canvas pb-16">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-5 lg:px-10">
        <header className="border-b border-hairline py-9 md:py-14">
          <p className="flex items-center gap-2 text-xs font-medium tracking-widest text-gold-champagne"><Fingerprint aria-hidden className="h-4 w-4" />{t("eyebrow")}</p>
          <h1 className="mt-4 max-w-3xl whitespace-pre-line text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">{t("title")}</h1>
          <p className="mt-4 max-w-3xl whitespace-pre-line text-base leading-8 text-secondary">{t("intro")}</p>
          <a href="#verify-result" className="mt-6 inline-flex min-h-12 items-center gap-3 rounded-md bg-[#f1eee7] px-5 text-sm font-semibold text-obsidian hover:bg-white">{t("start")}<ArrowDown aria-hidden className="h-4 w-4" /></a>
        </header>
        <section aria-labelledby="fairness-steps" className="py-8 md:py-10">
          <h2 id="fairness-steps" className="text-xl font-medium text-white">{t("stepsTitle")}</h2>
          <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-7 text-muted">{t("hashIntro")}</p>
          <ol className="mt-6 grid gap-3 md:grid-cols-3">
            {icons.map((Icon, i) => <li key={i} className="rounded-lg border border-hairline bg-surface p-5 md:p-6">
              <div className="flex items-center justify-between text-gold-champagne"><Icon aria-hidden className="h-5 w-5" /><span className="text-xs tabular-nums">0{i + 1}</span></div>
              <h3 className="mt-5 text-base font-medium text-white">{t(`step${i + 1}Title`)}</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted">{t(`step${i + 1}Body`)}</p>
            </li>)}
          </ol>
        </section>
        <div id="verify-result" className="scroll-mt-24"><VisualVerifier /></div>
        <section aria-labelledby="fairness-scope" className="my-8 rounded-lg border border-hairline p-5 md:p-7">
          <h2 id="fairness-scope" className="text-lg font-medium text-white">{t("scopeTitle")}</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <div><p className="flex items-center gap-2 text-sm font-medium text-gold-champagne"><Check aria-hidden className="h-4 w-4" />{t("scopeCanTitle")}</p><p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted">{t("scopeCan")}</p></div>
            <div><p className="flex items-center gap-2 text-sm font-medium text-gold-champagne"><Check aria-hidden className="h-4 w-4" />{t("scopeCannotTitle")}</p><p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted">{t("scopeCannot")}</p></div>
          </div>
          <p className="mt-5 border-t border-hairline pt-5 text-sm leading-7 text-secondary">{t("recordSource")}</p>
        </section>
        <HashExplainer />
        <section aria-labelledby="fairness-faq" className="mt-10">
          <h2 id="fairness-faq" className="mb-3 text-xl font-medium text-white">{t("faqTitle")}</h2>
          {(["odds", "loss", "mismatch", "timing"] as const).map((key) => <details key={key} className="group border-b border-hairline py-1">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-medium leading-6 text-white [&::-webkit-details-marker]:hidden">{t(`${key}Question`)}<ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" /></summary>
            <p className="max-w-4xl pb-5 text-sm leading-7 text-muted">{t(`${key}Answer`)}</p>
          </details>)}
        </section>
        <details className="group mt-10 rounded-lg border border-hairline p-5 md:p-7">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-white [&::-webkit-details-marker]:hidden">{t("recordsTitle")}<ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" /></summary>
          <p className="mb-5 mt-2 text-sm leading-7 text-muted">{t("recordsBody")}</p>
          <ProofFeed />
        </details>
      </div>
    </main>
  );
}
