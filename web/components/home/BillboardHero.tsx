"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Play, Info, Crown } from "lucide-react";
import { cn } from "@/lib/format";
import { useTranslations } from "next-intl";
import { useCurrency } from "@/lib/useCurrency";
import { useProductText } from "@/lib/useProductText";
import { dropTable, isValueGuaranteed, type ProductBox } from "@/lib/products";
import { boxTopTier, formatMultiple, glow, tierOf, topMultiple } from "@/lib/tiers";
import { ProductArt } from "@/components/box/ProductArt";

export interface BillboardHeroProps {
  /** 순환할 박스들. 첫 장이 기본 노출. */
  boxes: ProductBox[];
  onOpen?: (box: ProductBox) => void;
  onInspect?: (box: ProductBox) => void;
  /** 자동 순환 간격(ms). 0 이면 순환하지 않는다. */
  intervalMs?: number;
  className?: string;
}

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * 빌보드 히어로 — 럭셔리 에디션 (PROMPTS 1-2-1).
 *
 *   · 65vh. 사이버트럭 / 롤렉스 / 하이엔드 테크 비주얼을 크로스페이드로 순환한다.
 *   · 비주얼 뒤에 딥 골드 림라이트(pedestal-glow-strong) + 좌측·하단 넷플릭스 페이드.
 *   · 뱃지: [ROYAL SELECTION] [TOP N] — 골드 헤어라인. 게임식 등급 뱃지는 쓰지 않는다.
 *   · CTA: [지금 오픈하기] 크림슨 + [구성품 확인] 프로스티드 글래스.
 *
 * 텍스트는 비주얼 위에 얹지 않는다. 좌측 26% 는 캔버스 색으로 완전히 덮여 어떤 사진이 와도 읽힌다.
 * 보장 문구는 데이터가 참일 때만 나간다 (isValueGuaranteed).
 */
export function BillboardHero({ boxes, onOpen, onInspect, intervalMs = 9000, className }: BillboardHeroProps) {
  const t = useTranslations();
  const { fmt } = useCurrency();
  const { boxTitle, boxTagline, boxBadge, itemName } = useProductText();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const box = boxes[Math.min(index, boxes.length - 1)];

  const next = useCallback(() => setIndex((i) => (i + 1) % boxes.length), [boxes.length]);

  useEffect(() => {
    if (intervalMs <= 0 || boxes.length < 2 || paused) return;
    const t = setInterval(next, intervalMs);
    return () => clearInterval(t);
  }, [intervalMs, boxes.length, paused, next]);

  if (!box) return null;

  const top = boxTopTier(box);
  const guaranteed = isValueGuaranteed(box);
  const highlights = dropTable(box).slice(0, 3);

  return (
    <section
      className={cn("relative w-full overflow-hidden bg-canvas", "min-h-[65vh]", className)}
      aria-label={t("hero.billboardOf", { title: boxTitle(box) })}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── 배경 비주얼 — 우측 68%, 크로스페이드 ── */}
      <div className="absolute inset-y-0 right-0 w-full md:w-[68%]">
        <AnimatePresence mode="sync" initial={false}>
          <motion.div
            key={box.id}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: EASE }}
          >
            <ProductArt image={box.image} alt={boxTitle(box)} accent={top.accent} glowStrength={0.12} fallbackSize="lg" priority />
          </motion.div>
        </AnimatePresence>
        {/* 딥 골드 림라이트 — 피사체 아래에서 올라오는 스튜디오 조명 */}
        <span aria-hidden className="pedestal-glow-strong pointer-events-none absolute inset-0" />
      </div>

      {/* 넷플릭스 페이드 — 좌측(캔버스로 완전 융합) + 하단 */}
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-canvas from-[26%] via-canvas/80 via-[44%] to-transparent" />
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-canvas from-[6%] via-canvas/70 via-[24%] to-transparent to-[62%]" />
      {/* 상단 헤더 가독성용 옅은 어둠 */}
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-obsidian/70 to-transparent" />

      {/* ── 좌측 메타 ── */}
      <div className="relative flex min-h-[65vh] max-w-2xl flex-col justify-end px-[4%] pb-12 pt-24 md:pb-14 md:pt-28">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={box.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            {/* 뱃지 — 골드 헤어라인 */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="border-metallic-gold inline-flex items-center gap-1.5 rounded-sm bg-obsidian/70 px-2.5 py-1">
                <Crown className="h-3 w-3 text-gold-champagne" strokeWidth={2.2} />
                <span className="caption-luxury !text-gold-champagne">{t("hero.royalSelection")}</span>
              </span>
              {typeof box.trendingRank === "number" && (
                <span className="border-metallic-gold caption-luxury rounded-sm bg-obsidian/70 px-2.5 py-1 !text-gold-champagne">
                  {t("hero.top", { n: box.trendingRank })}
                </span>
              )}
              <span className="border-metallic-subtle caption-luxury rounded-sm bg-obsidian/60 px-2.5 py-1">{boxBadge(box)}</span>
            </div>

            <h1 className="mt-3 font-display text-4xl font-bold uppercase leading-none tracking-tight text-white sm:text-5xl lg:text-6xl">
              {boxTitle(box)}
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-secondary/90 md:text-base">{boxTagline(box)}</p>

            {/* 가격 · 최고 배수 */}
            <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-3">
              <div>
                <div className="caption-luxury">{t("hero.pricePerOpen")}</div>
                <div className="mt-1 font-display text-3xl font-bold leading-none tracking-tight text-white md:text-4xl">{fmt(box.price)}</div>
              </div>
              <div>
                <div className="caption-luxury">{t("hero.topPull")}</div>
                <div className="text-gold-gradient mt-1 font-display text-3xl font-bold leading-none tracking-tight md:text-4xl">
                  {t("tiers.multiple", { n: formatMultiple(topMultiple(box)) })}
                </div>
              </div>
            </div>

            {/* 보장 — 데이터가 참인 문장만 */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="border-metallic-subtle rounded-sm bg-obsidian/50 px-2.5 py-1.5 text-secondary">{t("hero.noBlank")}</span>
              <span
                className={cn(
                  "rounded-sm px-2.5 py-1.5",
                  guaranteed ? "border-metallic-gold bg-gold-champagne/15 text-gold-champagne" : "border-metallic-subtle bg-obsidian/50 text-muted",
                )}
              >
                {t("hero.guaranteedMin", { value: fmt(box.guaranteedMin) })}
                {guaranteed ? ` — ${t("hero.aboveOpenPrice")}` : ""}
              </span>
            </div>

            {/* CTA */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onOpen?.(box)}
                className="flex h-12 items-center gap-2 rounded-sm bg-crimson px-7 text-base font-bold text-white shadow-[0_0_28px_rgba(229,9,20,0.35)] transition-all duration-200 hover:scale-[1.03] hover:bg-red-600"
              >
                <Play className="h-5 w-5 fill-current" strokeWidth={0} />
                {t("hero.openNow")}
              </button>
              <button
                type="button"
                onClick={() => onInspect?.(box)}
                className="glass flex h-12 items-center gap-2 rounded-sm px-6 text-base font-semibold text-white backdrop-blur-md transition-colors duration-200 hover:border-gold-champagne/60 hover:bg-white/15"
              >
                <Info className="h-5 w-5" strokeWidth={2} />
                {t("hero.viewContents")}
              </button>
            </div>

            {/* 상위 구성 3종 */}
            <ul className="mt-5 hidden flex-wrap items-center gap-x-5 gap-y-2 sm:flex">
              {highlights.map((item) => {
                const t = tierOf(item.value, box.price);
                return (
                  <li key={item.id} className="flex items-center gap-2 text-xs leading-none">
                    <span aria-hidden className="h-3 w-0.5 flex-none rounded-full" style={{ background: t.accent, boxShadow: `0 0 8px ${glow(t.accent, 0.6)}` }} />
                    <span className="text-secondary">{itemName(item)}</span>
                    <span className="font-mono tabular-nums text-muted">{fmt(item.value)}</span>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </AnimatePresence>

        {/* 순환 인디케이터 */}
        {boxes.length > 1 && (
          <div className="mt-6 flex items-center gap-2" role="tablist" aria-label={t("hero.billboardPicker")}>
            {boxes.map((b, i) => (
              <button
                key={b.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={boxTitle(b)}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-0.5 rounded-full transition-all duration-300",
                  i === index ? "w-8 bg-gold-champagne shadow-[0_0_8px_rgba(230,202,101,0.6)]" : "w-4 bg-white/25 hover:bg-white/50",
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default BillboardHero;
