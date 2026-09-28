"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { CurrencySelector } from "@/components/layout/CurrencySelector";
import { VaultHero } from "@/components/about/VaultHero";
import { LineupShowcase } from "@/components/about/LineupShowcase";
import { TrustScenes } from "@/components/about/TrustScenes";
import { ImpactStats, FaqAccordion, FinaleCta } from "@/components/about/ImpactStats";

/**
 * /about — 플랫폼 소개 (시네마틱 랜딩).
 *
 *   ① 스크롤 반응형 볼트 리빌 히어로 ② 4대 럭셔리 라인업 실자산 쇼케이스
 *   ③ 스티키 3씬(95% 페이백 · SHA-256 공정성 · 정품 보증/특송) ④ 임팩트 숫자 ⑤ FAQ ⑥ 피날레 CTA
 *
 * SSR 안전: 스크롤·카운터·해시 계산은 전부 `useEffect` / framer-motion 뷰포트 훅 안에서만 돌고,
 * 첫 렌더 값은 서버·클라이언트가 같은 상수다(`window` 직접 참조 없음, `Math.random()` 없음).
 */
export default function AboutPage() {
  const t = useTranslations();
  return (
    <main className="min-h-screen bg-canvas pb-0 md:pb-24">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-hairline bg-obsidian/90 px-[4%] backdrop-blur-md sm:gap-5">
        <BrandLogo />
        <nav className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto whitespace-nowrap text-[11px] text-muted [scrollbar-width:none] sm:gap-4 sm:text-xs">
          <Link href="/" className="hidden transition-colors hover:text-white md:inline">
            {t("nav.boxes")}
          </Link>
          <Link href="/inventory" className="hidden transition-colors hover:text-white md:inline">
            {t("nav.inventory")}
          </Link>
          <Link href="/fairness" className="hidden transition-colors hover:text-white md:inline">
            {t("nav.fairness")}
          </Link>
          <span className="font-semibold text-white">{t("nav.about")}</span>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSelector />
          <CurrencySelector />
        </div>
      </header>

      <VaultHero />
      <LineupShowcase />
      <TrustScenes />
      <ImpactStats />
      <FaqAccordion />
      <FinaleCta />
    </main>
  );
}
