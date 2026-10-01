"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ChevronDown, Rocket } from "lucide-react";
import { cn } from "@/lib/format";
import { Link } from "@/i18n/navigation";
import {
  AUTHENTICITY_COMPENSATION_MULTIPLE,
  INSTANT_SELLBACK_RATE,
  MIN_ENTRY_USDT,
  MUTABLE_RESULTS,
  SHIPPING_SLA_HOURS,
  attemptsRange,
  publishedOddsRows,
  totalJackpotValueUsdt,
} from "@/lib/aboutStats";
import { formatCurrency } from "@/lib/formatCurrency";
import { useLocalFiat } from "@/lib/localFiat";
import { CountUp } from "@/components/about/TrustScenes";
import { Approx } from "@/components/ui/Approx";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Section 5, 임팩트 숫자 그리드.
 *
 * 네 수치 전부 **카탈로그 실측이거나 운영자가 집행하는 정책 상수**다.
 * "총 누적 지급액 1,482,920 USDT" 같은 운영 실적은 우리가 가진 적이 없으므로 쓰지 않는다(부록 C).
 *
 * 각 타일은 USDT 기준값 아래에 **현지 통화 환산액을 골드 배지로 병기**한다(`<Approx always>`), "455,714 USDT" 만으로는
 * 규모가 체감되지 않기 때문이다(2026-09-28 운영자 지시). 환산은 표시 전용이고 항상 `≈` 를 붙인다(`lib/localFiat.ts`).
 */
export function ImpactStats({ className }: { className?: string }) {
  const t = useTranslations("about");
  const { approxCompact, approx } = useLocalFiat();
  const total = useMemo(() => totalJackpotValueUsdt(), []);
  const payback = +(100 * INSTANT_SELLBACK_RATE).toFixed(2);

  const tiles = useMemo(
    () => [
      {
        key: "jackpot",
        value: total,
        decimals: 0,
        unit: t("unitUsdt"),
        label: t("statJackpot"),
        approx: total,
        sub: t("statJackpotSub", { c: approxCompact(total) }),
      },
      {
        key: "sellback",
        value: INSTANT_SELLBACK_RATE * 100,
        decimals: 1,
        unit: t("unitPct"),
        label: t("statSellback"),
        approx: null,
        sub: t("statSellbackSub", { back: `${formatCurrency(payback, "USDT")} (≈ ${approx(payback)})` }),
      },
      {
        key: "entry",
        value: MIN_ENTRY_USDT,
        decimals: 2,
        unit: t("unitUsdt"),
        label: t("statEntry"),
        approx: MIN_ENTRY_USDT,
        sub: t("statEntrySub"),
      },
      {
        key: "sla",
        value: SHIPPING_SLA_HOURS,
        decimals: 0,
        unit: t("unitHour"),
        label: t("statSla"),
        approx: null,
        sub: t("statSlaSub"),
      },
    ],
    [t, total, payback, approx, approxCompact],
  );

  return (
    <section className={cn("mx-auto w-full max-w-6xl px-6 py-20 md:py-28", className)}>
      <h2 className="break-keep font-display text-2xl font-black tracking-[-0.02em] text-white md:text-4xl">{t("statsTitle")}</h2>
      <ul className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((tile, i) => (
          <motion.li
            key={tile.key}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.55, ease: EASE, delay: i * 0.08 }}
            className="border-metallic-subtle rounded-2xl bg-surface px-4 py-5"
          >
            <div className="text-gold-gradient whitespace-nowrap font-display text-[18px] font-black leading-none tracking-tight tabular-nums sm:text-[24px] lg:text-[30px]">
              <CountUp value={tile.value} decimals={tile.decimals} />
              {tile.unit && <span className="ml-1 text-[12px] font-semibold text-muted">{tile.unit}</span>}
            </div>
            {/* 현지 통화 병기, USDT 만으로는 규모가 체감되지 않는다 */}
            {tile.approx !== null && <Approx usdt={tile.approx} always className="mt-1.5 block text-[10.5px] font-bold" />}
            <div className="mt-2 break-keep text-[11px] font-semibold leading-snug text-secondary">{tile.label}</div>
            {tile.sub && <div className="mt-1 break-keep text-[10px] leading-relaxed text-faint">{tile.sub}</div>}
          </motion.li>
        ))}
      </ul>
      <p className="mt-3 break-keep text-[10px] leading-relaxed text-faint">
        {t("statOdds")}: {publishedOddsRows()} , {t("statMutable")}: {MUTABLE_RESULTS}
        {t("unitCount")} ({t("statMutableSub")})
      </p>
    </section>
  );
}

/** Section 4, 토스 스타일 아코디언 FAQ */
export function FaqAccordion({ className }: { className?: string }) {
  const t = useTranslations("about");
  const [open, setOpen] = useState<number | null>(0);
  const rows = [1, 2, 3, 4, 5].map((n) => ({
    q: t(`faqQ${n}` as "faqQ1"),
    a: t(`faqA${n}` as "faqA1", { n: AUTHENTICITY_COMPENSATION_MULTIPLE }),
  }));

  return (
    <section className={cn("mx-auto w-full max-w-3xl px-6 pb-20 md:pb-28", className)}>
      <h2 className="break-keep font-display text-2xl font-black tracking-[-0.02em] text-white md:text-4xl">{t("faqTitle")}</h2>
      <ul className="mt-6 grid gap-2">
        {rows.map((row, i) => {
          const isOpen = open === i;
          return (
            <li key={row.q} className={cn("overflow-hidden rounded-xl border bg-surface transition-colors", isOpen ? "border-gold-champagne/50" : "border-hairline")}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <span className="min-w-0 flex-1 break-keep text-[13px] font-bold text-white md:text-sm">{row.q}</span>
                <ChevronDown className={cn("h-4 w-4 flex-none text-gold-champagne transition-transform duration-300", isOpen && "rotate-180")} strokeWidth={2.4} />
              </button>
              <motion.div
                initial={false}
                animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="overflow-hidden"
              >
                <p className="break-keep px-4 pb-4 text-[12px] leading-relaxed text-secondary">{row.a}</p>
              </motion.div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Section 5, 풀스크린 피날레 CTA. 없는 체험 머니를 약속하지 않는다(§7-C-2) */
export function FinaleCta({ className }: { className?: string }) {
  const t = useTranslations("about");
  const range = useMemo(() => attemptsRange(), []);
  return (
    <section className={cn("relative overflow-hidden bg-obsidian px-6 py-24 text-center md:py-32", className)}>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(52% 46% at 50% 50%, rgba(230,202,101,0.16) 0%, transparent 70%)" }}
      />
      <motion.div
        className="relative mx-auto max-w-2xl"
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <h2 className="break-keep font-display text-3xl font-black leading-tight tracking-[-0.03em] text-white md:text-5xl">{t("ctaTitle")}</h2>
        <p className="mt-4 break-keep text-sm text-secondary md:text-base">{t("ctaSub", { min: range.minRate })}</p>
        <Link
          href="/"
          className="mt-8 inline-flex h-14 items-center gap-2 rounded-lg bg-crimson px-8 text-base font-bold text-white shadow-[0_0_38px_rgba(229,9,20,0.4)] transition-transform duration-200 hover:scale-[1.03]"
        >
          <Rocket className="h-5 w-5" strokeWidth={2.3} />
          {t("ctaButton")}
        </Link>
        {/* 공식 슬로건, 골드 포인트 */}
        <p className="mt-6 text-[11px] font-bold tracking-widest text-gold-champagne sm:text-xs">{t("ctaSlogan")}</p>
        <p className="mt-2 text-[11px] text-faint">{t("ctaFair")}</p>
      </motion.div>
    </section>
  );
}

export default ImpactStats;
