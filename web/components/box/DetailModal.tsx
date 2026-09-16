"use client";

import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useCurrency } from "@/lib/useCurrency";
import { useProductText } from "@/lib/useProductText";
import { X, Play, Percent } from "lucide-react";
import {
  formatRate,
  dropTable,
  expectedValue,
  retailReturn,
  cashReturn,
  isValueGuaranteed,
  REFUND_RATE,
  type ProductBox,
  type ProductItem,
} from "@/lib/products";
import {
  boxFloorTier,
  boxTopTier,
  breakEvenRate,
  formatMultiple,
  glow,
  tierBreakdown,
  tierOf,
  topMultiple,
  type Tier,
} from "@/lib/tiers";
import { TierBadge, TierLegend, TierStrip } from "@/components/box/TierStrip";
import { ProductArt } from "@/components/box/ProductArt";

export interface DetailModalProps {
  box: ProductBox | null;
  onClose: () => void;
  onOpen?: (box: ProductBox) => void;
}

const EASE = [0.16, 1, 0.3, 1] as const;

/** 하나의 당첨 가능 상품. 등급 색 보더 + 실판매가 + 확률. */
function PrizeCard({ item, tier }: { item: ProductItem; tier: Tier }) {
  const t = useTranslations("modal");
  const { fmt } = useCurrency();
  const { itemName } = useProductText();
  return (
    <li
      className="relative overflow-hidden rounded-sm border bg-[#181818] transition-colors duration-200 hover:bg-[#282828]"
      style={{ borderColor: glow(tier.accent, 0.38) }}
    >
      {/* 상단 등급 라인 */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, ${tier.accent} 0%, ${tier.deep} 100%)`,
          boxShadow: `0 0 10px ${glow(tier.accent, 0.6)}`,
        }}
      />

      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <ProductArt image={item.image} alt={itemName(item)} accent={tier.accent} glowStrength={0.28} fallbackSize="sm" />
        <span className="absolute left-1.5 top-1.5">
          <TierBadge tier={tier} size="xs" />
        </span>
      </div>

      <div className="p-2">
        <div className="line-clamp-2 min-h-[26px] text-[11px] font-semibold leading-tight text-white">
          {itemName(item)}
        </div>
        <div className="mt-1.5 flex items-end justify-between gap-2 border-t border-white/10 pt-1.5">
          <div>
            <div className="text-[7px] font-semibold uppercase tracking-[0.16em] text-[#757575]">
              {t("marketValue")}
            </div>
            <div
              className="font-display text-[15px] font-bold leading-none tracking-tight"
              style={{ color: tier.accent }}
            >
              {fmt(item.value)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[7px] font-semibold uppercase tracking-[0.16em] text-[#757575]">
              {t("odds")}
            </div>
            <div className="font-mono text-[12px] font-bold leading-none tabular-nums text-white">
              {formatRate(item.dropRate)}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

function Stat({ label, value, tone = "#FFFFFF" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="border-l border-white/10 pl-3 first:border-l-0 first:pl-0">
      <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#757575]">{label}</div>
      <div
        className="mt-1 font-display text-[22px] font-bold leading-none tracking-tight"
        style={{ color: tone }}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * 넷플릭스 "상세 정보" 모달.
 *
 * 구조
 *   상단  와이드 비주얼 + 하단으로 완전히 녹아드는 그라디언트 페이드 + 비네트
 *         → 제목 / 지금 오픈하기(크림슨) / 핵심 수치
 *   하단  에피소드 목록 자리에 "전체 당첨 가능 상품 그리드"
 *         → 등급 색 보더 + 실판매가 + 확률
 */
export function DetailModal({ box, onClose, onOpen }: DetailModalProps) {
  const t = useTranslations();
  const { fmt } = useCurrency();
  const { boxTitle, boxBadge } = useProductText();
  const panelRef = useRef<HTMLDivElement>(null);

  // ESC 닫기 + 배경 스크롤 잠금
  useEffect(() => {
    if (!box) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [box, onClose]);

  const meta = useMemo(() => {
    if (!box) return null;
    return {
      top: boxTopTier(box),
      floorTier: boxFloorTier(box),
      floor: box.guaranteedMin,
      mult: topMultiple(box),
      breakEven: breakEvenRate(box),
      slices: tierBreakdown(box),
      table: dropTable(box),
      ev: expectedValue(box),
      retail: retailReturn(box),
      cash: cashReturn(box),
      guaranteed: isValueGuaranteed(box),
    };
  }, [box]);

  const credits = useMemo(() => {
    if (!box) return [];
    const all = [box.image, ...box.items.map((i) => i.image)]
      .map((img) => (img.src ? img.credit : undefined))
      .filter((c): c is string => !!c);
    return Array.from(new Set(all));
  }, [box]);

  return (
    <AnimatePresence>
      {box && meta && (
        <motion.div
          className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-black/80 px-3 py-6 backdrop-blur-[2px] md:px-6 md:py-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={t("modal.details", { title: boxTitle(box) })}
            className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-md bg-[#181818] shadow-[0_24px_80px_rgba(0,0,0,0.9)] outline-none"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            {/* ── 와이드 히어로 ── */}
            <header className="relative aspect-[16/9] max-h-[52vh] w-full overflow-hidden bg-[#0A0A0A] md:aspect-[21/9]">
              <ProductArt
                image={box.image}
                alt={boxTitle(box)}
                accent={meta.top.accent}
                glowStrength={0.2}
                fallbackSize="lg"
                priority
                className="absolute inset-0"
              />

              {/* 비네트 + 하단 완전 융합 페이드 */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(120% 100% at 50% 32%, transparent 0%, rgba(0,0,0,0.42) 60%, rgba(0,0,0,0.85) 100%)",
                }}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, #181818 0%, #181818 8%, rgba(24,24,24,0.9) 24%, rgba(24,24,24,0.4) 52%, transparent 78%)",
                }}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-2/3"
                style={{
                  background:
                    "linear-gradient(to right, rgba(24,24,24,0.92) 0%, rgba(24,24,24,0.55) 40%, transparent 100%)",
                }}
              />

              <button
                type="button"
                onClick={onClose}
                aria-label={t("modal.close")}
                className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-[#181818]/90 text-white transition-colors duration-200 hover:bg-[#282828]"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>

              {/* 히어로 카피 */}
              <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-5 md:px-9 md:pb-7">
                <div className="flex flex-wrap items-center gap-2">
                  <TierBadge tier={meta.top} size="md" />
                  <span className="rounded-sm border border-[#2A2A2A] bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#AAAAAA]">
                    {boxBadge(box)}
                  </span>
                  {typeof box.trendingRank === "number" && (
                    <span className="rounded-sm bg-[#E50914] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                      {t("modal.topRank", { n: box.trendingRank })}
                    </span>
                  )}
                </div>

                <h2 className="mt-2.5 font-display text-[30px] font-bold uppercase leading-[0.95] tracking-tight text-white md:text-[46px]">
                  {box.title}
                </h2>

                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onOpen?.(box)}
                    className="flex h-11 items-center gap-2 rounded-sm bg-[#E50914] px-5 text-[14px] font-bold text-white transition-colors duration-200 hover:bg-[#f6121d]"
                  >
                    <Play className="h-4 w-4 fill-current" strokeWidth={0} />
                    {t("modal.openNowPrice", { price: fmt(box.price) })}
                  </button>
                  <a
                    href="#drop-table"
                    className="flex h-11 items-center gap-2 rounded-sm border border-white/25 bg-[#282828]/80 px-4 text-[13px] font-semibold text-white transition-colors duration-200 hover:border-white hover:bg-[#333333]"
                  >
                    <Percent className="h-4 w-4" strokeWidth={2} />
                    {t("modal.viewOdds")}
                  </a>
                </div>
              </div>
            </header>

            {/* ── 핵심 수치 ── */}
            <section className="grid grid-cols-2 gap-x-3 gap-y-4 px-5 pt-5 md:grid-cols-4 md:px-9">
              <Stat label={t("modal.openPrice")} value={fmt(box.price)} />
              <Stat label={t("modal.guaranteedMin")} value={fmt(meta.floor)} tone={meta.floorTier.accent} />
              <Stat
                label={t("modal.topPrize")}
                value={`${fmt(meta.table[0].value)}`}
                tone={meta.top.accent}
              />
              <Stat label={t("modal.topMultiple")} value={t("tiers.multiple", { n: formatMultiple(meta.mult) })} tone={meta.top.accent} />
            </section>

            {/* ── 등급 분포 ── */}
            <section className="px-5 pt-5 md:px-9">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[13px] font-bold text-white">{t("modal.tierOdds")}</h3>
                <span className="text-[11px] text-[#AAAAAA]">
                  {t("modal.breakEven", { price: fmt(box.price), rate: formatRate(meta.breakEven) })}
                </span>
              </div>
              <TierStrip slices={meta.slices} height={10} className="mt-2.5" />
              <TierLegend slices={meta.slices} className="mt-2.5" />

              <p className="mt-3 border-l-2 border-line pl-3 text-[11px] leading-relaxed text-faint">
                {t("modal.explain", {
                  ev: fmt(meta.ev),
                  retail: `${(meta.retail * 100).toFixed(1)}%`,
                  refund: `${Math.round(REFUND_RATE * 100)}%`,
                  cash: `${(meta.cash * 100).toFixed(1)}%`,
                })}{" "}
                {meta.guaranteed
                  ? t("modal.guaranteedYes", { min: fmt(box.guaranteedMin) })
                  : t("modal.guaranteedNo", { min: fmt(box.guaranteedMin) })}{" "}
                {t("modal.prototype")}
              </p>
            </section>

            {/* ── 전체 당첨 가능 상품 ── */}
            <section id="drop-table" className="scroll-mt-4 px-5 pb-8 pt-6 md:px-9">
              <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-[#2A2A2A] pb-2">
                <h3 className="text-[13px] font-bold text-white">
                  {t("modal.allPrizes")}{" "}
                  <span className="ml-1 font-mono text-[11px] tabular-nums text-[#757575]">
                    {t("modal.count", { n: meta.table.length })}
                  </span>
                </h3>
                <span className="text-[10px] uppercase tracking-[0.16em] text-[#757575]">
                  {t("modal.sortedByValue")}
                </span>
              </div>

              <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                {meta.table.map((item) => (
                  <PrizeCard key={item.id} item={item} tier={tierOf(item.value, box.price)} />
                ))}
              </ul>
            </section>

            {/* 이미지 출처 — CC BY / BY-SA 자산은 표기 의무가 있다 */}
            {credits.length > 0 && (
              <footer className="border-t border-line px-5 py-4 md:px-9">
                <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-faint">{t("modal.imageCredits")}</div>
                <ul className="mt-1.5 space-y-0.5">
                  {credits.map((c) => (
                    <li key={c} className="truncate text-[10px] leading-relaxed text-faint">
                      {c}
                    </li>
                  ))}
                </ul>
              </footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default DetailModal;
