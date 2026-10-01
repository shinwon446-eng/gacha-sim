"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, ArrowUpRight, ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { InteractiveCoreCards, LineupStrip, LiveScenarioHUD, TrustGuardrails, TrustTelemetryStrip } from "@/components/about/AboutSections";
import { IsometricStage } from "@/components/about/IsometricStage";
import { TIERS } from "@/lib/tiers";

/**
 * /about — 다크 럭셔리 랜딩.
 *
 *   ① 중앙 히어로 + 아이소메트릭 쇼룸 스테이지   ② 신뢰 지표 4열 스탯 바   ③ 라인업 3타일
 *   ④ 인터랙티브 핵심 가치 카드 3종(추첨 HUD · 정품 배송 · 95% 환급 토글)   ⑤ 3단계 이용 방식
 *   ⑥ 실전 쇼케이스 2열 영수증 HUD   ⑦ 신뢰 가드레일 2×2   ⑧ FAQ
 *
 * 화면에 뜨는 숫자(배수·정가·환급액)는 전부 카탈로그에서 계산한다 — 상수로 적어 두지 않는다.
 */

/** 01 단계 미니 UI — 등급 색 바. 실제 `lib/tiers.ts` 의 등급과 색을 그대로 쓴다 */
function TierPreview() {
  return (
    <ul className="flex h-full flex-col justify-center gap-2">
      {TIERS.slice(0, 4).map((tier) => (
        <li key={tier.key} className="flex items-center gap-2">
          <span className="h-1.5 flex-1 rounded-full" style={{ background: tier.accent, opacity: 0.85 }} />
          <span className="w-[74px] flex-none text-right text-[10px] uppercase tracking-wider text-muted">{tier.gameLabel}</span>
        </li>
      ))}
    </ul>
  );
}

/** 02 단계 미니 UI — 추첨 코드 생성 → 당첨 번호 */
function SealPreview() {
  const t = useTranslations("editorialPages");
  return (
    <div className="flex h-full flex-col justify-center gap-2 font-mono text-[10.5px]">
      <span className="flex items-center gap-2 text-muted">
        <span className="flex items-center gap-1 rounded border border-white/12 px-1.5 py-0.5 text-gold-champagne"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />LIVE</span>
        {t("miniSealed")}
      </span>
      <span className="h-px w-full bg-hairline" />
      <span className="flex items-baseline gap-1.5 text-white">
        ROLL
        <span className="text-[13px] font-semibold tabular-nums text-gold-champagne">#000412</span>
      </span>
    </div>
  );
}

/** 03 단계 미니 UI — 수령 방법 두 갈래 */
function ChoicePreview() {
  const t = useTranslations("editorialPages");
  return (
    <div className="flex h-full flex-col justify-center gap-2">
      <span className="rounded-md border border-white/12 bg-surface px-2.5 py-2 text-[11px] text-white">{t("miniShip")}</span>
      <span className="rounded-md border border-gold-champagne/40 bg-gold-champagne/[0.08] px-2.5 py-2 text-[11px] text-gold-champagne">{t("miniCashback")}</span>
    </div>
  );
}

const STEP_PREVIEWS = [TierPreview, SealPreview, ChoicePreview];

export default function AboutPage() {
  const t = useTranslations("editorialPages");

  return (
    <main className="min-h-screen bg-canvas">
      <SiteHeader />

      {/* ① 시네마틱 중앙 히어로 */}
      <section className="overflow-hidden pt-10 md:pt-20">
        <div className="mx-auto max-w-[1440px] px-6 text-center lg:px-14">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-champagne">THE WORLD OF VOILA</p>
          <h1 className="mx-auto mt-5 max-w-3xl whitespace-pre-line break-keep text-center text-[32px] font-semibold sm:text-[40px] leading-[1.14] tracking-[-0.04em] text-white md:text-[68px]">
            {t("aboutTitle")}
          </h1>
          <p className="mx-auto mt-6 max-w-[520px] break-keep text-center text-base leading-[1.75] text-secondary md:text-[17px]">{t("aboutBody")}</p>
          <div className="mt-9 flex flex-col items-center">
            <Link
              href="/#boxes"
              className="inline-flex h-[52px] w-full max-w-[320px] items-center justify-center gap-3 rounded-full sm:w-auto sm:max-w-none bg-[#f1eee7] px-8 text-sm font-semibold text-obsidian transition-colors hover:bg-white"
            >
              {t("explore")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
        {/* 아이소메트릭 스테이지 (2541ce5 원본) */}
        <IsometricStage />
      </section>

      <div className="mx-auto max-w-[1440px] px-6 lg:px-14">
        {/* ② 신뢰 지표 4열 스탯 바 */}
        <TrustTelemetryStrip />

        {/* ③ 라인업 3타일 */}
        <LineupStrip />

        {/* ④ 인터랙티브 핵심 가치 카드 */}
        <InteractiveCoreCards />

        {/* ⑤ HOW IT WORKS 3단계 + 미니 UI */}
        <section className="border-t border-hairline py-12 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-gold-champagne">HOW IT WORKS</p>
            <h2 className="mt-4 break-keep text-3xl font-semibold tracking-[-0.035em] text-white md:text-[44px] md:leading-[1.15]">{t("stepsTitle")}</h2>
            <p className="mt-4 break-keep text-base leading-7 text-muted">{t("stepsBody")}</p>
          </div>
          <ol className="-mx-6 mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2 [scrollbar-width:none] md:mx-0 md:mt-14 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
            {STEP_PREVIEWS.map((Preview, i) => (
              <li key={i} className="relative w-[80%] min-w-0 flex-none snap-center overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl sm:w-[46%] sm:p-6 md:w-auto">
                <div className="mb-6 h-28 rounded-xl border border-white/10 bg-obsidian/70 p-3.5">
                  <Preview />
                </div>
                <h3 className="text-xl font-medium text-white">{t(`step${i + 1}Title` as "step1Title")}</h3>
                <p className="mt-3 whitespace-pre-line break-keep text-sm leading-7 text-muted">{t(`step${i + 1}Body` as "step1Body")}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ⑥ 실전 쇼케이스 */}
        <LiveScenarioHUD />

        {/* ⑦ 신뢰 가드레일 */}
        <TrustGuardrails
          action={
            <Link href="/fairness" className="inline-flex min-h-11 items-center gap-3 text-sm font-medium text-gold-champagne">
              {t("verify")}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          }
        />

        {/* ⑤ FAQ */}
        <section className="border-t border-hairline py-12 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-gold-champagne">GOOD TO KNOW</p>
            <h2 className="mt-4 break-keep text-3xl font-semibold tracking-[-0.035em] text-white md:text-[44px] md:leading-[1.15]">{t("faqTitle")}</h2>
          </div>
          <div className="mx-auto mt-8 max-w-3xl border-t border-hairline">
            {[1, 2, 3].map((n) => (
              <details key={n} className="group border-b border-hairline">
                <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-5 py-5 text-base font-medium text-white [&::-webkit-details-marker]:hidden">
                  {t(`faq${n}Q` as "faq1Q")}
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="break-keep pb-6 pr-6 text-sm leading-7 text-muted">{t(`faq${n}A` as "faq1A")}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
