"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Play, Crown, Sparkles, Info } from "lucide-react";
import { cn } from "@/lib/format";
import { useTranslations } from "next-intl";
import { useProductText } from "@/lib/useProductText";
import { useCurrency } from "@/lib/useCurrency";
import type { ProductBox } from "@/lib/products";
import { boxTopTier, formatMultiple, glow, topMultiple } from "@/lib/tiers";
import { BOXES, dropTable } from "@/lib/products";
import { useInventoryStore } from "@/stores/inventoryStore";
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
 * 잭팟 풀 = 지금 열려 있는 12개 박스의 최고 상품 가치 합계(USDT).
 * 상품 카탈로그에서 계산한 실제 수치다 — 올라가는 연출은 있어도 없는 돈을 지어내지 않는다.
 * live 모드에서 API 가 실제 상금 풀을 주면 이 자리에 그대로 들어간다.
 */
function jackpotPoolUsdt(): number {
  return +BOXES.reduce((sum, b) => sum + (dropTable(b)[0]?.value ?? 0), 0).toFixed(2);
}

/** 히어로 플로팅 카드에 올릴 "빅윈" 하한 배수 — 바닥 캐시백(≈0.95x)을 대박처럼 보이게 하지 않는다 */
const BIG_WIN_MULTIPLE = 10;

/** 큰 숫자를 자릿수 단위로 굴려 올리는 카운터 (SSR 안전 — 최종값으로 먼저 그리고 마운트 후 애니메이션) */
function PoolCounter({ value }: { value: number }) {
  const { fmt } = useCurrency();
  const [shown, setShown] = useState(value);
  useEffect(() => {
    let raf = 0;
    const from = value * 0.92;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1400);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(+(from + (value - from) * eased).toFixed(2));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className="text-gold-gradient whitespace-nowrap font-display text-[15px] font-black leading-none tracking-tight tabular-nums sm:text-[17px]">{fmt(shown)}</span>;
}

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
/** 파티클 좌표는 고정 배열 — Math.random() 을 쓰면 SSR/CSR 결과가 달라져 하이드레이션이 깨진다 */
const PARTICLES = [
  { x: 18, y: 28, d: 6.5, delay: 0 },
  { x: 32, y: 62, d: 7.5, delay: 0.8 },
  { x: 47, y: 18, d: 5.5, delay: 1.6 },
  { x: 58, y: 74, d: 8, delay: 0.4 },
  { x: 71, y: 36, d: 6, delay: 2.1 },
  { x: 84, y: 58, d: 7, delay: 1.2 },
];

export function BillboardHero({ boxes, onOpen, onInspect, onDemo, intervalMs = 9000, className }: BillboardHeroProps) {
  const t = useTranslations();
  const { boxTitle, itemName } = useProductText();
  const { fmt } = useCurrency();
  const pool = useMemo(() => jackpotPoolUsdt(), []);

  /**
   * 🔥 LIVE BIG WIN 플로팅 카드 소재.
   *
   * live 모드에서 API 가 준 실제 빅윈 스트림이 들어오면 그대로 흐르고, 백엔드가 없으면
   * **이 기기의 실제 대박 당첨**(10배 이상)만 쓴다. 한 건도 없으면 남의 당첨을 지어내는 대신
   * 지금 열려 있는 박스의 **최고 잭팟 라인업**(상품 데이터의 사실)을 "도전 목표"로 흘린다.
   * 바닥 캐시백(0.95배)은 대박이 아니므로 이 카드에 올리지 않는다.
   */
  const ownedItems = useInventoryStore((s) => s.items);
  const bigWins = useMemo(() => {
    const mine = [...ownedItems]
      .map((o) => {
        const bx = BOXES.find((b) => b.slug === o.boxSlug);
        const it = bx?.items.find((i) => i.id === o.itemId);
        if (!bx || !it) return null;
        return { title: itemName(it), box: boxTitle(bx), value: o.valueUsdt, mult: o.valueUsdt / bx.price, mine: true };
      })
      .filter((x): x is { title: string; box: string; value: number; mult: number; mine: boolean } => !!x && x.mult >= BIG_WIN_MULTIPLE)
      .sort((a, b) => b.mult - a.mult)
      .slice(0, 5);
    if (mine.length > 0) return mine;
    return [...BOXES]
      .map((bx) => {
        const it = dropTable(bx)[0];
        return { title: itemName(it), box: boxTitle(bx), value: it.value, mult: it.value / bx.price, mine: false };
      })
      .sort((a, b) => b.mult - a.mult)
      .slice(0, 5);
  }, [ownedItems, itemName, boxTitle]);
  const [factIndex, setFactIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFactIndex((i) => (i + 1) % bigWins.length), 4000);
    return () => clearInterval(id);
  }, [bigWins.length]);
  const fact = bigWins[Math.min(factIndex, bigWins.length - 1)];
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
        {/* 앰비언트 파티클 — 스포트라이트 속을 떠다니는 금빛 먼지 */}
        <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {PARTICLES.map((pt, i) => (
            <motion.span
              key={i}
              className="absolute h-1 w-1 rounded-full bg-gold-champagne/70"
              style={{ left: `${pt.x}%`, top: `${pt.y}%`, boxShadow: "0 0 8px rgba(230,202,101,0.8)" }}
              animate={{ y: [0, -22, 0], opacity: [0.15, 0.75, 0.15] }}
              transition={{ duration: pt.d, repeat: Infinity, ease: "easeInOut", delay: pt.delay }}
            />
          ))}
        </span>
        <span aria-hidden className="pedestal-shadow pointer-events-none absolute inset-x-[18%] bottom-[8%] h-10" />
      </div>

      {/* 🔥 LIVE BIG WIN — 4초마다 순환. 실제 대박 기록이 있으면 그것, 없으면 공개 잭팟 라인업의 도전 목표(둘 다 사실) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={factIndex}
          className="border-metallic-gold absolute right-3 top-[16%] z-10 hidden max-w-[17rem] rounded-xl bg-obsidian/85 px-3 py-2 backdrop-blur-sm md:block"
          style={{ boxShadow: `0 0 30px ${glow("#E6CA65", 0.28)}` }}
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          <div className="flex items-center gap-1.5">
            <span className={cn("h-1.5 w-1.5 rounded-full", fact.mine ? "animate-pulse bg-crimson" : "bg-gold-champagne")} />
            <span className="caption-luxury !text-gold-champagne">{fact.mine ? t("hero.bigWin") : t("hero.bigWinGoal")}</span>
          </div>
          <div className="mt-1 truncate text-[13px] font-bold text-white">{fact.title}</div>
          <div className="truncate text-[10px] text-faint">{fact.box}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <Money value={fact.value} size="xs" numberClassName="text-gold-gradient" />
            <span className="whitespace-nowrap rounded-sm bg-gold-champagne/15 px-1 py-0.5 text-[11px] font-bold tabular-nums text-gold-champagne">
              ×{formatMultiple(fact.mult)}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>

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
            {/* LIVE JACKPOT POOL — 공개 라인업의 최고 상품 가치 합계(실수치). 헤드라인을 가리지 않도록 콤팩트 골드 네온 알약 */}
            <span
              className="border-metallic-gold mt-2.5 inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full bg-obsidian/70 px-2.5 py-1 backdrop-blur-sm"
              style={{ boxShadow: `0 0 18px ${glow("#E6CA65", 0.22)}` }}
              title={t("hero.poolNote", { n: BOXES.length })}
            >
              <span className="h-1.5 w-1.5 flex-none animate-pulse rounded-full bg-emerald-400" />
              <span className="caption-luxury !text-gold-champagne">{t("hero.poolLabel")}</span>
              <PoolCounter value={pool} />
            </span>
            <span className="mt-1 block break-keep text-[10px] leading-relaxed text-faint">{t("hero.poolNote", { n: BOXES.length })}</span>

            <h1 className="mt-2.5 break-keep font-display text-2xl font-black leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
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
