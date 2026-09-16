"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, Info } from "lucide-react";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { dropTable, isValueGuaranteed, type ProductBox, type ProductItem } from "@/lib/products";
import { boxFloorTier, boxTopTier, formatMultiple, glow, tierBreakdown, tierOf, topMultiple } from "@/lib/tiers";
import { TierStrip } from "@/components/box/TierStrip";
import { ProductArt } from "@/components/box/ProductArt";

/** 행 가장자리 — 호버 패널 transform-origin 보정용. */
export type CardEdge = "first" | "last" | "middle";

export interface BoxCardProps {
  box: ProductBox;
  edge?: CardEdge;
  /** TRENDING 행에서만 전달. 카드 뒤 대형 숫자를 렌더한다. */
  rank?: number;
  /** 호버 상태 통지 — 행이 z-index 를 올리는 데 쓴다. */
  onExpandChange?: (expanded: boolean) => void;
  onOpen?: (box: ProductBox) => void;
  onInspect?: (box: ProductBox) => void;
  className?: string;
}

/** 슬라이드인 패널 안의 드랍 썸네일. 등급 색 1px 보더. */
function DropThumb({ item, box }: { item: ProductItem; box: ProductBox }) {
  const { fmt } = useCurrency();
  const t = tierOf(item.value, box.price);
  return (
    <li
      className="relative flex-1 overflow-hidden rounded-sm border bg-neutral-900"
      style={{ borderColor: glow(t.accent, 0.5) }}
      title={`${item.name} · ${fmt(item.value)}`}
    >
      <div className="relative w-full" style={{ aspectRatio: "4 / 3" }}>
        <ProductArt image={item.image} alt={item.name} accent={t.accent} glowStrength={0.3} fallbackSize="sm" />
        <span
          aria-hidden
          className="absolute inset-x-0 top-0"
          style={{ height: 2, background: t.accent, boxShadow: `0 0 6px ${glow(t.accent, 0.6)}` }}
        />
      </div>
      <div className="px-1 py-1">
        <div className="truncate leading-none text-neutral-400" style={{ fontSize: 8 }}>
          {item.name}
        </div>
        <div className="mt-0.5 font-mono font-bold leading-none tabular-nums" style={{ fontSize: 9, color: t.accent }}>
          {fmt(item.value)}
        </div>
      </div>
    </li>
  );
}

/**
 * 실물 커머스 카드.
 *
 * 구조
 *   최상위 div  — group / rounded-xl / neutral-900 / 호버 시 -translate-y-1
 *   이미지 래퍼 — h-48, <img> + 하단 to-top 그라데이션
 *   메타        — 박스명 · 1회 가격 · 최고 배수 (이미지 아래, 불투명)
 *   호버 패널   — 메타 위로 슬라이드인: 등급 분포 바 + 핵심 드랍 3종 + 액션
 *
 * Tailwind 임의 값(대괄호)을 쓰지 않는다. 표준 유틸 + 인라인 스타일만.
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
  const { fmt } = useCurrency();
  const [hovered, setHovered] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const meta = useMemo(
    () => ({
      guaranteed: isValueGuaranteed(box),
      floorTier: boxFloorTier(box),
      topTier: boxTopTier(box),
      mult: topMultiple(box),
      slices: tierBreakdown(box),
      drops: dropTable(box).slice(0, 3),
    }),
    [box],
  );

  useEffect(() => {
    onExpandChange?.(hovered);
  }, [hovered, onExpandChange]);

  // src 가 바뀌면 실패 상태를 푼다
  useEffect(() => setImgFailed(false), [box.imageUrl]);

  const origin = edge === "first" ? "left center" : edge === "last" ? "right center" : "center center";
  const showImg = !!box.imageUrl && !imgFailed;

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* TRENDING 대형 숫자 — 카드 뒤에 깔린다 */}
      {typeof rank === "number" && (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 z-0 select-none font-display text-transparent"
          style={{ left: -4, fontSize: "8.5rem", lineHeight: 0.72, WebkitTextStroke: "2px #2A2A2A" }}
        >
          {rank}
        </span>
      )}

      {/* ── 카드 최상위 ── */}
      <div
        className="group relative cursor-pointer overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 transition-all duration-300 hover:-translate-y-1 hover:border-neutral-600"
        style={{
          marginLeft: typeof rank === "number" ? "3.75rem" : undefined,
          transformOrigin: origin,
          zIndex: hovered ? 40 : 10,
          boxShadow: hovered
            ? `0 18px 40px rgba(0,0,0,0.75), 0 0 0 1px ${glow(meta.topTier.accent, 0.35)}, 0 0 28px ${glow(meta.topTier.accent, 0.22)}`
            : "inset 0 1px 0 rgba(255,255,255,0.05), 0 6px 18px rgba(0,0,0,0.45)",
        }}
        onClick={() => onInspect?.(box)}
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
        {/* ── 이미지 래퍼 ── */}
        <div className="relative h-48 w-full overflow-hidden bg-black">
          {showImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={box.imageUrl!}
              alt={box.title}
              draggable={false}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105 group-hover:opacity-100"
            />
          ) : (
            // 미확보 / 로딩 실패 — 박스 실루엣 폴백
            <ProductArt image={{ src: null }} alt={box.title} accent={meta.topTier.accent} fallbackSize="md" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent" />

          {/* 최소 보장 뱃지 — 유일한 오버레이 */}
          <span
            className={cn(
              "absolute left-2 top-2 z-10 rounded-sm px-1.5 py-1 text-xs font-bold leading-none",
              meta.guaranteed ? "text-neutral-900" : "border border-neutral-700 bg-black bg-opacity-70 text-white",
            )}
            style={
              meta.guaranteed
                ? { backgroundColor: meta.floorTier.accent, boxShadow: `0 0 12px ${glow(meta.floorTier.accent, 0.5)}` }
                : undefined
            }
          >
            최소 {fmt(box.guaranteedMin)}
            {meta.guaranteed ? " 보장" : ""}
          </span>
        </div>

        {/* ── 하단 텍스트: 박스명 · 가격 · 배율 ── */}
        <div className="border-t border-neutral-800 bg-neutral-900 px-3 py-3">
          <div className="truncate text-sm font-bold leading-tight text-white">{box.title}</div>
          <div className="mt-1.5 flex items-end justify-between gap-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-neutral-500" style={{ fontSize: 9 }}>
                1회
              </div>
              <div className="font-display text-xl font-bold leading-none tracking-tight text-white">
                {fmt(box.price)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold uppercase tracking-widest text-neutral-500" style={{ fontSize: 9 }}>
                최고
              </div>
              <div
                className="font-display text-xl font-bold leading-none tracking-tight"
                style={{ color: meta.topTier.accent, textShadow: `0 0 12px ${glow(meta.topTier.accent, 0.45)}` }}
              >
                {formatMultiple(meta.mult)}
              </div>
            </div>
          </div>
        </div>

        {/* ── 호버 슬라이드인 패널 — 메타 위에 앉고, 메타는 계속 보인다 ── */}
        <div
          aria-hidden={!hovered}
          className="absolute inset-x-0 z-20 border-y border-neutral-700 bg-neutral-800 bg-opacity-95 p-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
          style={{ bottom: 78, transform: hovered ? "translateY(0)" : "translateY(24px)", visibility: hovered ? "visible" : "hidden" }}
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
              tabIndex={hovered ? 0 : -1}
              onClick={() => onOpen?.(box)}
              className="flex h-8 flex-1 items-center justify-center gap-1 rounded-sm bg-crimson text-xs font-bold text-white transition-colors duration-200 hover:bg-red-600"
            >
              <Play className="h-3 w-3 fill-current" strokeWidth={0} />
              바로 열기
            </button>
            <button
              type="button"
              tabIndex={hovered ? 0 : -1}
              onClick={() => onInspect?.(box)}
              className="flex h-8 flex-1 items-center justify-center gap-1 rounded-sm border border-neutral-600 bg-white bg-opacity-10 text-xs font-semibold text-white transition-colors duration-200 hover:bg-opacity-20"
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
