"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Play, Crown, Sparkles, Info } from "lucide-react";
import { cn } from "@/lib/format";
import { useTranslations } from "next-intl";
import { useProductText } from "@/lib/useProductText";
import { useCurrency } from "@/lib/useCurrency";
import type { ProductBox } from "@/lib/products";
import { boxTopTier, formatMultiple, topMultiple } from "@/lib/tiers";
import { ProductArt } from "@/components/box/ProductArt";
import { Money } from "@/components/ui/Money";

export interface BillboardHeroProps {
  /** 순환할 박스들. 첫 장이 기본 노출. */
  boxes: ProductBox[];
  onOpen?: (box: ProductBox) => void;
  onInspect?: (box: ProductBox) => void;
  /** 무료 체험 (CLAUDE.md §4-A) — 잔액 없이 가상 룰렛 */
  onDemo?: (box: ProductBox) => void;
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
 *   · CTA: [지금 오픈하기] 크림슨 + [무료 체험해보기] 골드 아웃라인 + [구성품 확인] 프로스티드 글래스.
 *   · 헤드라인은 3개 국어 후킹 카피(hero.headline/sub, CLAUDE.md §3-A). 박스명은 "지금 상영 중" 줄로 내려간다.
 *   · 비주얼은 페데스탈 위에서 완만히 부유한다(6s 루프) — 벨벳 쇼케이스 연출.
 *
 * 텍스트는 비주얼 위에 얹지 않는다. 좌측 26% 는 캔버스 색으로 완전히 덮여 어떤 사진이 와도 읽힌다.
 * 보장 문구는 데이터가 참일 때만 나간다 (isValueGuaranteed).
 */
export function BillboardHero({ boxes, onOpen, onInspect, onDemo, intervalMs = 9000, className }: BillboardHeroProps) {
  const t = useTranslations();
  const { boxTitle } = useProductText();
  const { fmt } = useCurrency();
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

  return (
    <section
      className={cn("relative w-full overflow-hidden bg-canvas", "min-h-[52vh] md:min-h-[56vh]", className)}
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
            {/* 플로팅 — 페데스탈 위 부유 */}
            <motion.div className="absolute inset-0" animate={{ y: [0, -10, 0] }} transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}>
              <ProductArt image={box.image} alt={boxTitle(box)} accent={top.accent} glowStrength={0.3} fallbackSize="lg" bordered={false} priority />
            </motion.div>
          </motion.div>
        </AnimatePresence>
        {/* 딥 골드 림라이트 — 피사체 아래에서 올라오는 스튜디오 조명 + 페데스탈 그림자 */}
        <span aria-hidden className="pedestal-glow-strong pointer-events-none absolute inset-0" />
        <span aria-hidden className="pedestal-shadow pointer-events-none absolute inset-x-[18%] bottom-[8%] h-10" />
      </div>

      {/* 좌측 텍스트 영역만 캔버스로 융합 — 우측 비주얼은 마스킹하지 않는다 (CLAUDE.md §2-2) */}
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-canvas from-[18%] via-canvas/55 via-[38%] to-transparent to-[58%]" />
      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-canvas to-transparent" />
      {/* 모바일: 비주얼이 전폭이라 텍스트 가독성용 하단 어둠 — 데스크톱에서는 없다 */}
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-canvas via-canvas/75 to-canvas/20 md:hidden" />

      {/* ── 좌측 메타 ── */}
      <div className="relative flex min-h-[52vh] max-w-2xl flex-col justify-center px-[4%] pb-10 pt-10 md:min-h-[56vh] md:pb-12 md:pt-12">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={box.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            {/* 단 하나의 럭셔리 뱃지 — [👑 ROYAL SELECTION · TOP N] */}
            <span className="border-metallic-gold inline-flex items-center gap-1.5 rounded-sm bg-obsidian/70 px-2.5 py-1">
              <Crown className="h-3 w-3 text-gold-champagne" strokeWidth={2.2} />
              <span className="caption-luxury !text-gold-champagne">{t("hero.badge")}</span>
            </span>

            {/* 모바일 전용 줄바꿈 — 문장 단위로 끊는다 (단어 중간 '아이 / 폰' 방지) */}
            <h1 className="mt-3 break-keep font-display text-2xl font-black leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
              {t("hero.headline1")} <br className="sm:hidden" />
              {t("hero.headline2")}
            </h1>

            <p className="mt-2.5 max-w-xl break-keep text-sm leading-relaxed text-secondary/90 sm:mt-3 md:text-base">
              {t("hero.sub1")} <br className="sm:hidden" />
              {t("hero.sub2")}
            </p>

            {/* 심플한 가격 칩 — 박스명 · 가격 · (최고 배수). 클릭하면 구성품 상세 */}
            <button
              type="button"
              onClick={() => onInspect?.(box)}
              className="border-metallic-subtle group mt-3.5 inline-flex max-w-full items-baseline gap-2 whitespace-nowrap rounded-full bg-obsidian/60 py-1.5 pl-3.5 pr-2.5 text-left backdrop-blur-sm transition-colors hover:border-gold-champagne/60 hover:bg-obsidian/80 sm:mt-4 sm:gap-2.5 sm:pl-4 sm:pr-3"
              aria-label={t("hero.viewContents")}
            >
              <span className="truncate text-xs font-semibold text-secondary">{boxTitle(box)}</span>
              <Money value={box.price} size="sm" />
              <span className="text-gold-gradient whitespace-nowrap font-display text-sm font-bold tabular-nums">({t("hero.topMultipleShort", { n: t("tiers.multiple", { n: formatMultiple(topMultiple(box)) }) })})</span>
              <Info className="h-3.5 w-3.5 self-center text-faint transition-colors group-hover:text-gold-champagne" strokeWidth={2.2} />
            </button>

            {/* 단 2개의 CTA */}
            <div className="mt-4 flex flex-wrap items-center gap-2.5 sm:mt-5 sm:gap-3">
              <button
                type="button"
                onClick={() => onOpen?.(box)}
                className="flex h-11 items-center gap-2 whitespace-nowrap rounded-sm bg-crimson px-5 text-sm font-bold text-white shadow-[0_0_28px_rgba(229,9,20,0.35)] transition-all duration-200 hover:scale-[1.03] hover:bg-red-600 sm:h-12 sm:px-7 sm:text-base"
              >
                <Play className="h-5 w-5 fill-current" strokeWidth={0} />
                {t("hero.openFor", { price: fmt(box.price) })}
              </button>
              <button
                type="button"
                onClick={() => onDemo?.(box)}
                className="border-gold-gradient flex h-11 items-center gap-2 whitespace-nowrap rounded-sm bg-obsidian/60 px-5 text-sm font-bold text-gold-champagne backdrop-blur-md transition-all duration-200 hover:scale-[1.03] hover:bg-gold-champagne/10 sm:h-12 sm:px-6 sm:text-base"
              >
                <Sparkles className="h-5 w-5" strokeWidth={2} />
                {t("hero.freeTry")}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* 순환 인디케이터 */}
        {boxes.length > 1 && (
          <div className="mt-5 flex items-center gap-2" role="tablist" aria-label={t("hero.billboardPicker")}>
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
