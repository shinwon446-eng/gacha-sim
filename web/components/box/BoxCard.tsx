"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Play, Info } from "lucide-react";
import { cn } from "@/lib/format";
import { useTranslations } from "next-intl";
import { useCurrency } from "@/lib/useCurrency";
import { useProductText } from "@/lib/useProductText";
import { dropTable, isValueGuaranteed, type ProductBox, type ProductItem } from "@/lib/products";
import { boxFloorTier, boxTopTier, formatMultiple, glow, tierBreakdown, tierOf, topMultiple } from "@/lib/tiers";
import { TierStrip } from "@/components/box/TierStrip";
import { ProductArt } from "@/components/box/ProductArt";
import { Money } from "@/components/ui/Money";

/** 행 가장자리 — 확대 시 transform-origin 보정용. */
export type CardEdge = "first" | "last" | "middle";

export interface BoxCardProps {
  box: ProductBox;
  edge?: CardEdge;
  /** TRENDING 행에서만 전달. 카드 뒤 오버사이즈 순위 숫자를 렌더한다. */
  rank?: number;
  /** 호버 상태 통지 — 행이 z-index 를 올리는 데 쓴다. */
  onExpandChange?: (expanded: boolean) => void;
  onOpen?: (box: ProductBox) => void;
  onInspect?: (box: ProductBox) => void;
  className?: string;
}

/** 스펙(CLAUDE.md §3): 1.15x 확대, ±5° 틸트 */
const HOVER_SCALE = 1.15;
const TILT_DEG = 5;
const SPRING = { stiffness: 220, damping: 22, mass: 0.6 };

/** 카드 하단 대표 명품 썸네일 — 등급색 헤어라인 + 정밀 가격 */
function GrailThumb({ item, box }: { item: ProductItem; box: ProductBox }) {
  const { fmt } = useCurrency();
  const { itemName } = useProductText();
  const t = tierOf(item.value, box.price);
  return (
    <li className="min-w-0 flex-1" title={`${itemName(item)} · ${fmt(item.value)}`}>
      <div className="relative aspect-square w-full overflow-hidden rounded-sm" style={{ boxShadow: `inset 0 0 0 1px ${glow(t.accent, 0.45)}` }}>
        <ProductArt image={item.image} alt={itemName(item)} accent={t.accent} glowStrength={0.28} fallbackSize="sm" />
      </div>
      <div className="mt-1 truncate text-center text-[10px] leading-none text-muted">{itemName(item)}</div>
      <div className="mt-0.5 truncate text-center font-mono text-[10px] font-bold leading-none tabular-nums" style={{ color: t.accent }}>
        {fmt(item.value)}
      </div>
    </li>
  );
}

/**
 * 럭셔리 박스 카드 (PROMPTS 1-2-2).
 *
 *   기본(콤팩트): 16:9 비주얼 → 박스명 · 1회 가격 · 최고 배수 · [100% 꽝 없음] 미니 뱃지. 서브 항목은 숨긴다.
 *   호버(확장): 대표 명품 3종 썸네일 + 정밀 가격이 아래로 펼쳐진다 (AnimatePresence height).
 *
 * 호버(Framer Motion)
 *   · 1.15x 확대 + 마우스 좌표 추적 ±5° 3D 틸트 (스프링) + z 부상
 *   · 홀로그램 메탈릭 샤인이 사선으로 한 번 스쳐 지나간다
 *   · 비주얼 하단에서 3px 등급 확률 바가 올라오고, 퀵 액션(오픈 / 구성품)이 나타난다
 *   · 프레임이 최고 등급 색 헤어라인으로 점화된다 (ROYAL 이면 샴페인 골드)
 *
 * 등급색은 데이터에서 오므로 인라인 style 로만 전달한다 — 그 외 레이아웃은 전부 유틸리티 클래스.
 */
export function BoxCard({ box, edge = "middle", rank, onExpandChange, onOpen, onInspect, className }: BoxCardProps) {
  const tr = useTranslations();
  const { fmt } = useCurrency();
  const { boxTitle } = useProductText();
  const [hovered, setHovered] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  // 마우스 위치 → 틸트. 카드 중심이 (0,0), 가장자리가 ±0.5.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [TILT_DEG, -TILT_DEG]), SPRING);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-TILT_DEG, TILT_DEG]), SPRING);

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      const el = frameRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      mx.set((e.clientX - r.left) / r.width - 0.5);
      my.set((e.clientY - r.top) / r.height - 0.5);
    },
    [mx, my],
  );

  const leave = useCallback(() => {
    setHovered(false);
    mx.set(0);
    my.set(0);
  }, [mx, my]);

  const meta = useMemo(
    () => ({
      guaranteed: isValueGuaranteed(box),
      floorTier: boxFloorTier(box),
      topTier: boxTopTier(box),
      mult: topMultiple(box),
      slices: tierBreakdown(box),
      grails: dropTable(box).slice(0, 3),
    }),
    [box],
  );

  useEffect(() => {
    onExpandChange?.(hovered);
  }, [hovered, onExpandChange]);

  useEffect(() => setImgFailed(false), [box.imageUrl]);

  const origin = edge === "first" ? "left center" : edge === "last" ? "right center" : "center center";
  const showImg = !!box.imageUrl && !imgFailed;
  const accent = meta.topTier.accent;
  const royal = meta.topTier.key === "royal";

  return (
    <div className={cn("relative", className)} onMouseEnter={() => setHovered(true)} onMouseLeave={leave} onMouseMove={onMove}>
      {/* 넷플릭스 오버사이즈 순위 숫자 — 메탈릭 스트로크, 카드 뒤 */}
      {typeof rank === "number" && (
        <span aria-hidden className="rank-numeral absolute -left-1 bottom-0 z-0 font-display">
          {rank}
        </span>
      )}

      <motion.div
        ref={frameRef}
        className={cn(
          "relative cursor-pointer overflow-hidden rounded-xl bg-surface",
          royal ? "border-metallic-gold" : "border-metallic-subtle",
          typeof rank === "number" && "ml-[3.75rem]",
        )}
        style={{
          transformOrigin: origin,
          transformPerspective: 900,
          rotateX,
          rotateY,
          zIndex: hovered ? 40 : 10,
          // 호버 시 최고 등급 색으로 헤어라인 점화. 등급색은 데이터 값이라 인라인.
          boxShadow: hovered
            ? `0 22px 48px rgba(0,0,0,0.7), 0 0 0 1px ${glow(accent, 0.55)}, 0 0 32px ${glow(accent, 0.22)}`
            : undefined,
        }}
        animate={{ scale: hovered ? HOVER_SCALE : 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24, mass: 0.7 }}
        onClick={() => onInspect?.(box)}
        role="button"
        tabIndex={0}
        aria-label={tr("card.details", { title: boxTitle(box) })}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onInspect?.(box);
          }
        }}
      >
        {/* 홀로그램 메탈릭 샤인 — 호버마다 한 번 사선 스윕 */}
        <AnimatePresence>
          {hovered && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 z-30 bg-gradient-to-br from-transparent via-white/10 to-transparent"
              style={{ backgroundSize: "40% 100%", backgroundRepeat: "no-repeat" }}
              initial={{ backgroundPosition: "-60% 0", opacity: 0 }}
              animate={{ backgroundPosition: "160% 0", opacity: [0, 1, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
        </AnimatePresence>

        {/* ── 비주얼 ── */}
        <div className="relative aspect-video w-full overflow-hidden bg-obsidian">
          {showImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={box.imageUrl!}
              alt={boxTitle(box)}
              draggable={false}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className={cn("h-full w-full object-cover transition-all duration-500", hovered ? "scale-105 opacity-100" : "opacity-80")}
            />
          ) : (
            <ProductArt image={{ src: null }} alt={boxTitle(box)} accent={accent} fallbackSize="md" />
          )}
          {/* 페데스탈 림라이트 + 하단 페이드 */}
          <span aria-hidden className="pedestal-glow pointer-events-none absolute inset-0" />
          <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />

          {/* 100% 꽝 없음 · 최소 보장 뱃지 — 고대비 (CLAUDE.md §4-C) */}
          <span
            className={cn(
              "absolute left-2 right-2 top-2 z-10 truncate rounded-sm px-2 py-1 text-[10px] font-bold leading-none tracking-tight",
              meta.guaranteed ? "border-metallic-gold bg-obsidian/90 text-gold-champagne" : "border-metallic-subtle bg-obsidian/90 text-white",
            )}
          >
            {tr("card.noBlankBadge", { value: fmt(box.guaranteedMin) })}
            {meta.guaranteed ? ` · ${tr("hero.aboveOpenPrice")}` : ""}
          </span>

          {/* 호버: 퀵 액션 + 3px 등급 확률 바 */}
          <AnimatePresence>
            {hovered && (
              <motion.div
                className="absolute inset-x-0 bottom-0 z-20 px-2 pb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpen?.(box)}
                    className="flex h-8 flex-1 items-center justify-center gap-1 rounded-sm bg-crimson text-xs font-bold text-white transition-colors hover:bg-red-600"
                  >
                    <Play className="h-3 w-3 fill-current" strokeWidth={0} />
                    {tr("card.openNow")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onInspect?.(box)}
                    className="glass flex h-8 flex-1 items-center justify-center gap-1 rounded-sm text-xs font-semibold text-white backdrop-blur-md hover:bg-white/15"
                  >
                    <Info className="h-3 w-3" strokeWidth={2} />
                    {tr("card.contents")}
                  </button>
                </div>
                <TierStrip slices={meta.slices} height={3} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── 메타 ── */}
        <div className="border-t border-hairline px-3 pb-2 pt-3">
          <div className="truncate text-sm font-bold leading-tight text-white">{boxTitle(box)}</div>
          <div className="mt-1.5 flex items-end justify-between gap-2">
            <div>
              <div className="caption-luxury">{tr("card.perOpen")}</div>
              <Money value={box.price} size="md" />
            </div>
            <div className="text-right">
              <div className="caption-luxury">{tr("card.top")}</div>
              <div className={cn("font-display text-xl font-bold leading-none tracking-tight", royal && "text-gold-gradient")} style={royal ? undefined : { color: accent }}>
                {tr("tiers.multiple", { n: formatMultiple(meta.mult) })}
              </div>
            </div>
          </div>
        </div>

        {/* ── 대표 명품 3종 — 호버 시에만 펼쳐진다 (CLAUDE.md §3) ── */}
        <AnimatePresence initial={false}>
          {hovered && (
            <motion.ul
              key="grails"
              className="flex gap-2 overflow-hidden border-t border-hairline px-3"
              initial={{ height: 0, opacity: 0, paddingTop: 0, paddingBottom: 0 }}
              animate={{ height: "auto", opacity: 1, paddingTop: 10, paddingBottom: 12 }}
              exit={{ height: 0, opacity: 0, paddingTop: 0, paddingBottom: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              {meta.grails.map((it) => (
                <GrailThumb key={it.id} item={it} box={box} />
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default BoxCard;
