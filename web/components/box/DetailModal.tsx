"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useModal } from "@/lib/useModal";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { useProductText } from "@/lib/useProductText";
import { X, ArrowUpRight, Percent, RefreshCw } from "lucide-react";
import {
  formatRate,
  dropTable,
  expectedValue,
  retailReturn,
  cashReturn,
  floorRatio,
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
import { AutoplaySettingsModal } from "@/components/unboxing/AutoplaySettingsModal";
import { AUTOPLAY_SPINS, DEFAULT_AUTOPLAY, OPEN_PRESETS, type AutoplayConfig } from "@/lib/autoplay";
import { Link } from "@/i18n/navigation";
import { useWalletStore } from "@/stores/walletStore";
import { ProductArt } from "@/components/box/ProductArt";

export interface DetailModalProps {
  box: ProductBox | null;
  pending?: boolean;
  onDeposit?: (box: ProductBox, count: number) => void;
  onClose: () => void;
  onOpen?: (box: ProductBox, count?: number) => void;
  /** 오토플레이 시작, 설정 모달에서 확정된 구성으로 */
  onAutoplay?: (box: ProductBox, config: AutoplayConfig) => void;
}

const EASE = [0.16, 1, 0.3, 1] as const;

/** 상품 소개 카드에는 시중 정가를 보여 주고, 확률은 아래 상세 확률표에서 제공한다. */
function PrizeCard({ item, tier }: { item: ProductItem; tier: Tier }) {
  const t = useTranslations("modal");
  const { fmt } = useCurrency();
  const { itemName } = useProductText();
  return (
    <li
      className="relative overflow-hidden rounded-xl border bg-obsidian transition-colors duration-200 hover:bg-elevation"
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
        <ProductArt image={item.image} alt={itemName(item)} accent={tier.accent} glowStrength={0.28} fallbackSize="sm" kind={item.kind} />
        <span className="absolute left-1.5 top-1.5">
          <TierBadge tier={tier} size="xs" />
        </span>
      </div>

      <div className="p-3 sm:p-4">
        <div className="line-clamp-2 min-h-[40px] text-sm font-semibold leading-snug text-white">
          {itemName(item)}
        </div>
        <div className="mt-1.5 border-t border-white/10 pt-1.5">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#757575]">
              {t("marketValue")}
            </div>
            <div
              className="break-words font-display text-[13px] font-bold leading-snug tracking-tight sm:text-[15px]"
              style={{ color: tier.accent }}
            >
              {fmt(item.value)}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

function Stat({ label, value, tone = "#FFFFFF" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#757575]">{label}</div>
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
 *         → 등급 색 보더 + 실판매가. 확률은 별도 상세 표에서 확인.
 */
export function DetailModal({ box, onClose, onOpen, onAutoplay, onDeposit, pending = false }: DetailModalProps) {
  const t = useTranslations();
  const { fmt } = useCurrency();
  const { boxTitle, boxBadge, itemName } = useProductText();
  // 수량 프리셋 [1x][5x][10x][50x][100x] , 오토플레이 [−][🔄 N회][+]
  const [qty, setQty] = useState<number>(1);
  const [confirming, setConfirming] = useState(false);
  const balance = useWalletStore((s) => s.balance);
  const autoIdx = 0;
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoCfg, setAutoCfg] = useState<AutoplayConfig>(DEFAULT_AUTOPLAY);
  const oddsRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (!box) return;
    setQty(1);
    setConfirming(false);
    setAutoOpen(false);
    if (oddsRef.current) oddsRef.current.open = false;
  }, [box]);
  const autoSpins = AUTOPLAY_SPINS[autoIdx];
  const panelRef = useRef<HTMLDivElement>(null);

  const close = () => { if (!pending) onClose(); };
  useModal(!!box, close, panelRef);

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
      guaranteed: box.guaranteedMin >= box.price, // "오픈가 이상" 문구는 바닥이 가격 이상일 때만 (잭팟 박스)
      floorPct: Math.round(floorRatio(box) * 100),
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
        <motion.div className="fixed inset-0 z-[100] overflow-x-hidden overflow-y-auto overscroll-contain bg-black/75 px-2 py-2 backdrop-blur-md sm:px-3 sm:py-4 md:p-8"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <motion.div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true"
            aria-label={t("modal.details", { title: boxTitle(box) })}
            className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-hairline bg-surface shadow-2xl outline-none"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.25, ease: EASE }}>
            <button type="button" onClick={close} disabled={pending} aria-label={t("modal.close")}
              className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-obsidian/90 text-white hover:bg-elevation">
              <X className="h-5 w-5" strokeWidth={1.8} />
            </button>
            <header className="grid md:grid-cols-[0.95fr_1.05fr]">
              <div className="relative h-[190px] overflow-hidden border-b border-hairline bg-obsidian min-[400px]:h-[220px] sm:h-[260px] md:h-auto md:min-h-[480px] md:border-b-0 md:border-r">
                <ProductArt image={box.image} alt={boxTitle(box)} accent={meta.top.accent} glowStrength={0.12} fallbackSize="lg" bordered={false} priority className="absolute inset-0" />
                <div className="absolute left-5 top-5"><TierBadge tier={meta.top} size="md" /></div>
                <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-obsidian via-obsidian/90 to-transparent px-5 pb-4 pt-10 text-xs leading-relaxed text-secondary">{t("modal.imageNote")}</p>
              </div>
              <div className="flex min-w-0 flex-col justify-center px-4 py-5 sm:px-8 sm:py-7 md:py-10">
                <p className="eyebrow pr-8">{boxBadge(box)}</p>
                <h2 className="mt-2 break-keep font-display text-[26px] font-semibold leading-tight tracking-[-0.04em] text-white sm:mt-3 sm:text-3xl md:text-4xl">{boxTitle(box)}</h2>
                <div className="mt-5 flex items-baseline gap-3">
                  <span className="font-display text-3xl font-semibold tracking-tight text-white">{fmt(box.price)}</span>
                  <span className="text-xs text-muted">{t("modal.perOpen")}</span>
                </div>
                <div className="mt-4 border-t border-hairline pt-4 sm:mt-6 sm:pt-5">
                  <div className="mb-3 text-xs font-medium text-secondary">{t("unbox.qty")}</div>
                  <div role="group" className="grid grid-cols-5 gap-1 sm:gap-1.5" aria-label={t("unbox.qty")}>
                    {OPEN_PRESETS.map((n) => (
                      <button key={n} type="button" aria-pressed={qty === n} disabled={pending} onClick={() => { setQty(n); setConfirming(false); }}
                        className={cn("flex min-h-12 min-w-0 items-center justify-center rounded-lg border px-0.5 text-center text-[11px] font-semibold leading-tight break-keep transition-colors sm:min-h-11 sm:px-1 sm:text-xs", qty === n ? "border-[#f1eee7] bg-[#f1eee7] text-obsidian" : "border-hairline bg-obsidian text-secondary hover:border-white/40")}>
                        {t("modal.quantity", { n })}
                      </button>
                    ))}
                  </div>
                  {balance < box.price * qty ? (
                    <div className="mt-4 rounded-lg border border-gold-champagne/30 bg-gold-champagne/5 p-4">
                      <p className="text-sm font-semibold text-white">{t("unbox.insufficient", { price: fmt(box.price * qty) })}</p>
                      <p className="mt-1 text-sm leading-relaxed text-secondary">{t("modal.balanceShortfall", { balance: fmt(balance), missing: fmt(box.price * qty - balance) })}</p>
                      <button type="button" onClick={() => onDeposit?.(box, qty)} className="btn-primary mt-3 min-h-12 w-full">{t("unbox.topUpAction")}</button>
                    </div>
                  ) : confirming ? (
                    <div className="mt-4 rounded-lg border border-gold-champagne/30 bg-gold-champagne/5 p-4" role="group" aria-label={t("modal.confirmPurchase")}>
                      <p className="text-sm font-semibold text-white">{t("modal.openCount", { n: qty, amount: fmt(box.price * qty) })}</p>
                      <p className="mt-2 text-sm leading-relaxed text-secondary">{t("modal.batchCommitment")}</p>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button type="button" disabled={pending} onClick={() => setConfirming(false)} className="btn-secondary min-h-12">{t("modal.cancelPurchase")}</button>
                        <button type="button" disabled={pending} onClick={() => onOpen?.(box, qty)} className="btn-primary min-h-12 disabled:opacity-50">{t(pending ? "modal.preparingPurchase" : "modal.confirmPurchase")}</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirming(true)} className="btn-primary mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm">
                      {t("modal.openCount", { n: qty, amount: fmt(box.price * qty) })}<ArrowUpRight className="h-4 w-4 flex-none" />
                    </button>
                  )}
                  <p className="mt-3 break-keep text-xs leading-relaxed text-muted">{t("modal.quantityNote")}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1">
                  <button type="button" onClick={() => { const details = oddsRef.current; if (!details) return; details.open = true; requestAnimationFrame(() => { details.focus({ preventScroll: true }); details.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); }); }} className="inline-flex min-h-11 items-center gap-2 text-xs font-medium text-gold-champagne hover:text-white">
                    <Percent className="h-4 w-4" />{t("modal.viewOdds")}
                  </button>
                  {onAutoplay && <button type="button" disabled={pending} onClick={() => setAutoOpen(true)} className="inline-flex min-h-11 items-center gap-2 text-xs text-muted hover:text-white">
                    <RefreshCw className="h-4 w-4" />{t("autoplay.title")}
                  </button>}
                </div>
              </div>
            </header>
            <section className="grid grid-cols-2 gap-5 border-y border-hairline bg-obsidian/40 px-5 py-6 sm:grid-cols-4 sm:px-8">
              <Stat label={t("modal.guaranteedMin")} value={fmt(meta.floor)} />
              <Stat label={t("modal.topPrize")} value={fmt(meta.table[0].value)} />
              <Stat label={t("modal.rtpLabel")} value={`${(meta.retail * 100).toFixed(1)}%`} />
              <Stat label={t("modal.topMultiple")} value={t("tiers.multiple", { n: formatMultiple(meta.mult) })} />
            </section>
            <section aria-label={t("modal.allPrizes")} id="drop-table" className="px-4 py-6 sm:px-8 sm:py-7">
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-semibold text-white">{t("modal.allPrizes")} <span className="ml-1 text-sm font-normal text-muted">{t("modal.count", { n: meta.table.length })}</span></h3>
                <span className="text-xs text-muted">{t("modal.sortedByValue")}</span>
              </div>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                {meta.table.map((item) => <PrizeCard key={item.id} item={item} tier={tierOf(item.value, box.price)} />)}
              </ul>
            </section>
            <section id="provably-fair" className="px-4 pb-6 sm:px-8 sm:pb-8">
              <details ref={oddsRef} tabIndex={-1} className="scroll-mt-4 rounded-xl border border-hairline bg-obsidian outline-none">
                <summary className="min-h-12 cursor-pointer px-5 py-4 text-sm font-semibold text-white">{t("modal.preciseOdds")}</summary>
                <div className="border-t border-hairline p-5">
                  <TierStrip slices={meta.slices} height={6} />
                  <TierLegend slices={meta.slices} className="mt-3" />
                  <ul className="mt-4 divide-y divide-hairline">
                    {meta.table.map((item) => <li key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                      <span className="min-w-0 text-secondary">{itemName(item)}</span>
                      <span className="flex-none font-mono text-white"><span className="sr-only">{t("modal.odds")} </span>{formatRate(item.dropRate)}</span>
                    </li>)}
                  </ul>
                  <p className="mt-5 break-keep border-t border-hairline pt-4 text-xs leading-relaxed text-muted">
                    {t("modal.explain", { ev: fmt(meta.ev), retail: `${(meta.retail * 100).toFixed(1)}%`, refund: `${Math.round(REFUND_RATE * 100)}%`, cash: `${(meta.cash * 100).toFixed(1)}%` })}{" "}
                    {meta.guaranteed ? t("modal.guaranteedYes", { min: fmt(box.guaranteedMin) }) : t("modal.guaranteedNo", { min: fmt(box.guaranteedMin) })}
                  </p>
                  <Link href="/fairness" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm text-gold-champagne hover:text-white">{t("modal.openVerifier")}<ArrowUpRight className="h-4 w-4" /></Link>
                </div>
              </details>
              <p className="mt-5 break-keep text-xs leading-relaxed text-muted">{t("modal.settleBody")}</p>
            </section>
            {credits.length > 0 && <footer className="border-t border-hairline px-5 py-5 sm:px-8">
              <details><summary className="cursor-pointer text-xs text-muted">{t("modal.imageCredits")}</summary>
                <ul className="mt-3 space-y-2">{credits.map((credit) => <li key={credit} className="break-words text-xs leading-relaxed text-muted">{credit}</li>)}</ul>
              </details>
            </footer>}
          </motion.div>
          <AutoplaySettingsModal box={autoOpen ? box : null} initial={{ ...autoCfg, spins: autoSpins }} onClose={() => setAutoOpen(false)} onStart={(config) => { setAutoCfg(config); setAutoOpen(false); onAutoplay?.(box, config); }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default DetailModal;
