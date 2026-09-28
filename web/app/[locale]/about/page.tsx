"use client";

import { useTranslations } from "next-intl";
import { Rocket } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { CurrencySelector } from "@/components/layout/CurrencySelector";
import { VaultHero } from "@/components/about/VaultHero";
import { LineupShowcase } from "@/components/about/LineupShowcase";
import { TrustScenes } from "@/components/about/TrustScenes";
import { GlobalLiveFeed } from "@/components/about/GlobalLiveFeed";
import { ImpactStats, FaqAccordion, FinaleCta } from "@/components/about/ImpactStats";

/**
 * /about — 플랫폼 소개 (시네마틱 랜딩).
 *
 *   ① 히어로(진입 즉시 슬로건·헤드라인·CTA·상품 4점, 스크롤은 패럴랙스만) ② 4대 라인업 프리미엄 쇼케이스
 *   ③ 스티키 3씬(95% 페이백 목업 · SHA-256 검증 대시보드 · 정품 보증/무료 특송 트래킹)
 *   ④ 글로벌 언박싱·특송 네트워크 ⑤ 임팩트 숫자 ⑥ FAQ ⑦ 피날레 CTA
 *
 * 헤더 내비는 메인과 같은 목적지를 모바일·데스크톱 모두에서 제공한다(홈·보관함·공정성 검증·커뮤니티).
 * 하단 고정 내비에는 커뮤니티·공정성 검증이 없으므로 이 네 개는 헤더에서 **잘리지 않고** 다 보여야 한다
 * — 폭 예산은 EN 기준으로 맞춘다(`Provably Fair` 가 가장 길다, 부록 A ⑤).
 *
 * SSR 안전: 스크롤·카운터·해시는 전부 마운트 후에만 값이 바뀌고 첫 렌더는 서버와 같은 상수다.
 */
export default function AboutPage() {
  const t = useTranslations();
  const links = [
    { href: "/", label: t("nav.boxes") },
    { href: "/inventory", label: t("nav.inventory") },
    { href: "/fairness", label: t("nav.fairness") },
    { href: "/community", label: t("nav.community") },
  ] as const;

  return (
    <main className="min-h-screen bg-canvas pb-0">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-hairline bg-obsidian/90 px-3 backdrop-blur-md sm:gap-4 sm:px-[4%]">
        {/* 375px 에서 로고는 sm(16px) — md(20px)면 내비에 줄 폭이 16px 모자란다 */}
        <BrandLogo size="sm" className="sm:hidden" />
        <BrandLogo className="hidden sm:inline-flex" />
        {/* 네 항목이 375px 에 다 들어가야 한다. 기준 로케일은 항상 **EN**(`Provably Fair` 가 가장 길다 — 부록 A ⑤).
            현재 페이지(`플랫폼 소개`)를 비활성 라벨로 끼워 두면 234px 가 되어 마지막 항목이 잘렸다(2026-09-28 운영자 지적)
            — 자기 페이지 이름은 히어로가 이미 말하므로 뺀다 */}
        <nav className="flex min-w-0 flex-1 items-center gap-2.5 overflow-x-auto whitespace-nowrap text-[10.5px] text-muted [scrollbar-width:none] sm:gap-4 sm:text-xs">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="flex-none transition-colors hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/"
          className="flex h-8 flex-none items-center gap-1.5 whitespace-nowrap rounded-md bg-crimson px-2.5 text-[11px] font-bold text-white transition-colors hover:bg-red-600 sm:h-9 sm:px-3 sm:text-xs"
        >
          <Rocket className="h-3.5 w-3.5" strokeWidth={2.4} />
          <span className="hidden sm:inline">{t("about.navOpen")}</span>
        </Link>
        <span className="hidden flex-none items-center gap-2 lg:flex">
          <LanguageSelector />
          <CurrencySelector />
        </span>
      </header>

      <VaultHero />
      <LineupShowcase />
      <TrustScenes />
      <GlobalLiveFeed />
      <ImpactStats />
      <FaqAccordion />
      <FinaleCta />
    </main>
  );
}
