"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Info } from "lucide-react";
import { cn, formatPrice } from "@/lib/format";
import { dropTable, isValueGuaranteed, type ProductBox, type ProductItem } from "@/lib/products";
import { boxFloorTier, boxTopTier, glow, tierBreakdown, tierOf } from "@/lib/tiers";
import { TierStrip } from "@/components/box/TierStrip";
import { ProductArt } from "@/components/box/ProductArt";

/** 행 가장자리 — 확장 시 화면 밖 클리핑을 막기 위해 transform-origin 을 보정한다. */
export type CardEdge = "first" | "last" | "middle";

export interface BoxCardProps {
  box: ProductBox;
  edge?: CardEdge;
  /** TRENDING 행에서만 전달. 카드 뒤 대형 숫자를 렌더한다. */
  rank?: number;
  /** 확장 상태 변화 통지 — 행이 z-index 를 올리는 데 쓴다. */
  onExpandChange?: (expanded: boolean) => void;
  onOpen?: (box: ProductBox) => void;
  onInspect?: (box: ProductBox) => void;
  className?: string;
}

const HOVER_DELAY_MS = 120;

/** 터치 기기 판별 — 호버가 없으면 첫 탭이 확장, 두 번째 탭이 상세다. */
function useTouchOnly(): boolean {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: none)");
    const sync = () => setTouch(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return touch;
}

/**
 * 실물 비주얼 영역. 상단 70%.
 * 이미지·백글로우·폴백은 ProductArt 가 책임진다. 여기서는 텍스트를 절대 얹지 않는다.
 */
function ProductVisual({ box, accent }: { box: ProductBox; accent: string }) {
  return <ProductArt image={box.image} alt={box.title} accent={accent} glowStrength={0.26} fallbackSize="md" />;
}

/** 슬라이드인 패널 안의 드랍 썸네일. 등급 색 1px 보더 + 코드 플레이트. */
function DropThumb({ item, box }: { item: ProductItem; box: ProductBox }) {
  const t = tierOf(item.value, box.price);
  return (
    <li
      className="relative flex-1 overflow-hidden rounded-[2px] border bg-surface"
      style={{ borderColor: glow(t.accent, 0.5) }}
      title={`${item.name} · ${formatPrice(item.value)}`}
    >
      <div className="relative aspect-[4/3] w-full">
        <ProductArt image={item.image} alt={item.name} accent={t.accent} glowStrength={0.3} fallbackSize="sm" />
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{ background: t.accent, boxShadow: `0 0 6px ${glow(t.accent, 0.6)}` }}
        />
      </div>
      <div className="px-1 py-1">
        <div className="truncate text-[8px] leading-none text-muted">{item.name}</div>
        <div className="mt-0.5 font-mono text-[9px] font-bold leading-none tabular-nums" style={{ color: t.accent }}>
          {formatPrice(item.value)}
        </div>
      </div>
    </li>
  );
}

/**
 * 실물 커머스 카드 (4:5).
 *
 * 기본 상태 — 딱 네 가지만 보인다: 실물 비주얼 · 박스명 · 1회 가격 · 최소 보장 뱃지.
 *   상단 70% 비주얼과 하단 30% 메타는 물리적으로 분리된 두 면이다. 겹치지 않는다.
 *
 * 호버(데스크톱) / 탭(모바일) — scale 1.08 로 살짝 떠오르고,
 *   하단에서 [핵심 드랍 3종 썸네일 + 상세보기 / 바로열기] 패널이 슬라이드 인 된다.
 *   패널은 카드 내부에 갇혀 있으므로 인접 카드 위로 튀어나오지 않는다.
 *
 * 뱃지는 "최고 등급"이 아니라 "최소 보장"이다.
 *   최고 등급으로 뱃지를 달면 15개 중 12개가 DREAM 이라 변별력이 없다.
 *   최소 보장은 박스마다 다르고, 사용자가 실제로 가져가는 하한이다.
 */
export function BoxCard({
  box,
  edge = "middle",
  rank,
  onExpandChange,
  onOpen,
  onInspect,
  className,
}: BoxCardProps) {
  const [expanded, setExpanded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchOnly = useTouchOnly();

  const meta = useMemo(
    () => ({
      guaranteed: isValueGuaranteed(box),
      floorTier: boxFloorTier(box),
      topTier: boxTopTier(box),
      slices: tierBreakdown(box),
      drops: dropTable(box).slice(0, 3),
    }),
    [box],
  );

  const enter = useCallback(() => {
    if (touchOnly) return;
    timer.current = setTimeout(() => setExpanded(true), HOVER_DELAY_MS);
  }, [touchOnly]);

  const leave = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setExpanded(false);
  }, []);

  useEffect(() => {
    onExpandChange?.(expanded);
  }, [expanded, onExpandChange]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  // 터치: 첫 탭 확장, 확장 상태에서 다시 탭하면 상세. 데스크톱: 클릭 즉시 상세.
  const onCardClick = () => {
    if (touchOnly && !expanded) {
      setExpanded(true);
      return;
    }
    onInspect?.(box);
  };

  const origin = edge === "first" ? "left center" : edge === "last" ? "right center" : "center center";

  return (
    <div className={cn("relative", className)} onMouseEnter={enter} onMouseLeave={leave}>
      {/* TRENDING 대형 숫자 — 카드 뒤에 깔린다 */}
      {typeof rank === "number" && (
        <span
          aria-hidden
          className="pointer-events-none absolute -left-1 bottom-0 z-0 select-none font-display leading-[0.72] text-transparent"
          style={{ fontSize: "8.5rem", WebkitTextStroke: "2px #2A2A2A" }}
        >
          {rank}
        </span>
      )}

      <div
        className={cn(
          "relative overflow-hidden rounded-[3px] border bg-surface",
          "transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          typeof rank === "number" && "ml-[3.75rem]",
          expanded ? "z-40 scale-[1.08] border-white/30" : "z-10 scale-100 border-line",
        )}
        style={{
          transformOrigin: origin,
          // 기본: 1px 하이라이트 엠보싱. 확장: 등급색 네온 글로우 + 딥 섀도로 카드가 떠오른다.
          boxShadow: expanded
            ? `0 18px 40px rgba(0,0,0,0.75), 0 0 0 1px ${glow(meta.topTier.accent, 0.35)}, 0 0 28px ${glow(meta.topTier.accent, 0.22)}`
            : "inset 0 1px 0 rgba(255,255,255,0.05), 0 6px 18px rgba(0,0,0,0.45)",
        }}
        onClick={onCardClick}
        role="button"
        tabIndex={0}
        aria-label={`${box.title} 상세 정보`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onInspect?.(box);
          }
        }}
      >
        {/* 4:5 프레임. 위 70% 비주얼, 아래 30% 메타 */}
        <div className="flex aspect-[4/5] w-full flex-col">
          <div className="relative h-[70%] flex-none">
            <ProductVisual box={box} accent={meta.topTier.accent} />

            {/* 최소 보장 뱃지 — 유일한 오버레이. 정보가 아니라 약속이라 비주얼 위에 둔다. */}
            <span
              className={cn(
                "absolute left-2 top-2 z-10 rounded-[2px] px-1.5 py-[3px] text-[9px] font-bold leading-none tracking-[0.02em]",
                meta.guaranteed ? "text-canvas" : "border border-white/15 bg-black/70 text-white",
              )}
              style={
                meta.guaranteed
                  ? { backgroundColor: meta.floorTier.accent, boxShadow: `0 0 12px ${glow(meta.floorTier.accent, 0.5)}` }
                  : undefined
              }
            >
              최소 {formatPrice(box.guaranteedMin)}
              {meta.guaranteed ? " 보장" : ""}
            </span>
          </div>

          {/* 메타 — 불투명, 두 줄 */}
          <div className="flex h-[30%] flex-none flex-col justify-center border-t border-line bg-surface px-2.5">
            <div className="truncate text-[12px] font-bold leading-tight text-white">{box.title}</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-faint">1회</span>
              <span className="font-display text-[20px] font-bold leading-none tracking-tight text-white">
                {formatPrice(box.price)}
              </span>
            </div>
          </div>
        </div>

        {/* ── 슬라이드인 패널 ──
            메타(30%) 바로 위에 앉는다. 호버 중에도 박스명과 가격은 계속 보여야 한다.
            비주얼의 아랫부분만 가리고 위쪽 일부는 남겨 어떤 카드인지 잃지 않게 한다. */}
        <div
          aria-hidden={!expanded}
          className={cn(
            "absolute inset-x-0 bottom-[30%] z-20 border-y border-white/10 bg-elevation/95 p-2 backdrop-blur-[2px]",
            "transition-[transform,opacity,visibility] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            expanded ? "visible translate-y-0 opacity-100" : "invisible translate-y-6 opacity-0",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <TierStrip slices={meta.slices} height={3} className="mb-2" />

          <ul className="flex gap-1.5">
            {meta.drops.map((it) => (
              <DropThumb key={it.id} item={it} box={box} />
            ))}
          </ul>

          <div className="mt-2 flex items-center gap-1.5">
            <button
              type="button"
              tabIndex={expanded ? 0 : -1}
              onClick={() => onOpen?.(box)}
              className="flex h-8 flex-1 items-center justify-center gap-1 rounded-[2px] bg-crimson text-[11px] font-bold text-white transition-colors duration-200 hover:bg-[#f6121d]"
            >
              <Play className="h-3 w-3 fill-current" strokeWidth={0} />
              바로 열기
            </button>
            <button
              type="button"
              tabIndex={expanded ? 0 : -1}
              onClick={() => onInspect?.(box)}
              className="flex h-8 flex-1 items-center justify-center gap-1 rounded-[2px] border border-white/25 bg-white/10 text-[11px] font-semibold text-white transition-colors duration-200 hover:bg-white/20"
            >
              <Info className="h-3 w-3" strokeWidth={2} />
              상세 보기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BoxCard;
