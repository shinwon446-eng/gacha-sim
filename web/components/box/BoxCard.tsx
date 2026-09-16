"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Play, Info, ChevronDown } from "lucide-react";
import { cn, formatPrice } from "@/lib/format";
import { formatRate, dropTable, type ProductBox } from "@/lib/products";
import {
  boxTopTier,
  boxFloorTier,
  breakEvenRate,
  formatMultiple,
  glow,
  tierBreakdown,
  tierOf,
  topMultiple,
} from "@/lib/tiers";
import { TierBadge, TierStrip } from "@/components/box/TierStrip";

/** 행 가장자리 — 확장 시 화면 밖 클리핑을 막기 위해 transform-origin 을 보정한다. */
export type CardEdge = "first" | "last" | "middle";

export interface BoxCardProps {
  box: ProductBox;
  edge?: CardEdge;
  /** Top 10 행에서만 전달. 카드 뒤 대형 숫자를 렌더한다. */
  rank?: number;
  /** 확장 상태 변화 통지 — 행이 z-index 를 올리는 데 쓴다. */
  onExpandChange?: (expanded: boolean) => void;
  onOpen?: (box: ProductBox) => void;
  onInspect?: (box: ProductBox) => void;
  className?: string;
}

const HOVER_DELAY_MS = 300;
const EASE = [0.25, 0.46, 0.45, 0.94] as const;
const DURATION = 0.25;

/**
 * 넷플릭스 포스터 페이드. 단색 위에 그라디언트만 올리는 게 아니라
 * 비네트(radial)를 함께 깔아야 가장자리가 죽고 중앙 피사체가 산다.
 */
function PosterScrim({ to }: { to: string }) {
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 35%, transparent 0%, rgba(0,0,0,0.35) 62%, rgba(0,0,0,0.78) 100%)",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(to top, ${to} 0%, ${to} 6%, rgba(20,20,20,0.72) 26%, transparent 58%)`,
        }}
      />
    </>
  );
}

/** 이미지 에셋이 있으면 그대로, 없으면 코드 플레이트로 폴백한다. */
function BoxArt({
  imageUrl,
  code,
  tone,
  alt,
  codeClassName,
}: {
  imageUrl: string | null;
  code: string;
  tone: string;
  alt: string;
  codeClassName?: string;
}) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={imageUrl}
        alt={alt}
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }
  return (
    <>
      <span aria-hidden className="absolute inset-0" style={{ background: tone }} />
      <span aria-hidden className="absolute inset-0 bg-[rgba(8,8,8,0.5)]" />
      <span aria-hidden className="absolute left-0 top-0 h-2.5 w-2.5 border-l border-t border-white/20" />
      <span aria-hidden className="absolute bottom-0 right-0 h-2.5 w-2.5 border-b border-r border-white/20" />
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center font-display font-bold uppercase leading-none tracking-tighter text-white/95",
          codeClassName ?? "text-[34px]",
        )}
      >
        {code}
      </span>
    </>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div>
      <div className="text-[8px] font-semibold uppercase tracking-[0.14em] text-[#757575]">{label}</div>
      <div
        className="mt-0.5 font-mono text-[11px] font-bold leading-none tabular-nums"
        style={{ color: tone }}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * 넷플릭스 포스터 타일(2:3) + 호버 확장.
 *
 * 정보 위계 — 카드 한 장에서 순서대로 읽힌다.
 *   1  최고 티어 뱃지 (이 박스에서 나올 수 있는 최상위 등급)
 *   2  박스명
 *   3  지불액(디스플레이 서체, 최대 크기) — 오른쪽에 최고 당첨 배수
 *   4  티어 확률 분포 바
 *   5  최저 확정 / 본전 이상 확률
 *
 * 하단 정보 블록은 불투명 서페이스다. 아트 위에 반투명으로 얹으면 톤에 따라 가격이 묻힌다.
 * 여기서 가장 중요한 건 가독성이라 이미지 면적을 양보한다.
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

  const originX = edge === "first" ? "0%" : edge === "last" ? "100%" : "50%";

  const enter = useCallback(() => {
    timer.current = setTimeout(() => setExpanded(true), HOVER_DELAY_MS);
  }, []);

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

  const meta = useMemo(() => {
    const top = boxTopTier(box);
    return {
      top,
      floorTier: boxFloorTier(box),
      floor: box.guaranteedMin,
      mult: topMultiple(box),
      breakEven: breakEvenRate(box),
      slices: tierBreakdown(box),
      grails: dropTable(box).slice(0, 3),
    };
  }, [box]);

  return (
    <div className={cn("relative", className)} onMouseEnter={enter} onMouseLeave={leave}>
      {/* Top 10 대형 숫자 — 카드 뒤에 깔린다 */}
      {typeof rank === "number" && (
        <span
          aria-hidden
          className="pointer-events-none absolute -left-1 bottom-0 z-0 select-none font-display leading-[0.72] text-transparent"
          style={{ fontSize: "9.5rem", WebkitTextStroke: "2px #2A2A2A" }}
        >
          {rank}
        </span>
      )}

      <div className={cn("relative", typeof rank === "number" && "ml-[4rem]")}>
        {/* ── 기본 타일 ── */}
        <button
          type="button"
          onClick={() => onInspect?.(box)}
          aria-label={`${box.title} 상세 정보`}
          className="group relative block aspect-[2/3] w-full overflow-hidden rounded-sm border bg-[#181818] text-left transition-colors duration-200"
          style={{ borderColor: expanded ? glow(meta.top.accent, 0.55) : "#2A2A2A" }}
        >
          <BoxArt imageUrl={box.image.src} code={box.code} tone={box.tone} alt={box.title} />
          <PosterScrim to="#181818" />

          {/* 최상위 티어 뱃지 */}
          <span className="absolute left-2 top-2 z-10">
            <TierBadge tier={meta.top} />
          </span>
          <span className="absolute right-2 top-2 z-10 rounded-sm border border-[#2A2A2A] bg-black/70 px-1.5 py-[3px] text-[8px] font-semibold uppercase tracking-[0.14em] text-[#AAAAAA]">
            {box.badge}
          </span>

          {/* 정보 블록 — 불투명 서페이스 */}
          <span className="absolute inset-x-0 bottom-0 z-10 block border-t border-[#2A2A2A] bg-[#181818] px-2.5 pb-2.5 pt-2">
            <span className="block truncate text-[12px] font-bold leading-tight text-white">
              {box.title}
            </span>

            {/* 지불액 · 최고 배수 */}
            <span className="mt-1.5 flex items-end justify-between gap-2">
              <span className="block">
                <span className="block text-[8px] font-semibold uppercase tracking-[0.16em] text-[#757575]">
                  Open
                </span>
                <span className="block font-display text-[21px] font-bold leading-none tracking-tight text-white">
                  {formatPrice(box.price)}
                </span>
              </span>
              <span className="block text-right">
                <span className="block text-[8px] font-semibold uppercase tracking-[0.16em] text-[#757575]">
                  Top pull
                </span>
                <span
                  className="block font-display text-[21px] font-bold leading-none tracking-tight"
                  style={{
                    color: meta.top.accent,
                    textShadow: `0 0 14px ${glow(meta.top.accent, 0.5)}`,
                  }}
                >
                  {formatMultiple(meta.mult)}
                </span>
              </span>
            </span>

            {/* 티어 확률 분포 */}
            <TierStrip slices={meta.slices} className="mt-2" />

            <span className="mt-1.5 flex items-center justify-between gap-2 text-[9px] leading-none">
              <span className="truncate text-[#AAAAAA]">
                최저 <span className="font-mono tabular-nums text-white">{formatPrice(meta.floor)}</span> 확정
              </span>
              <span className="flex-none text-[#AAAAAA]">
                본전 이상{" "}
                <span className="font-mono tabular-nums text-white">{formatRate(meta.breakEven)}</span>
              </span>
            </span>
          </span>
        </button>

        {/* ── 호버 확장 레이어 ── */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              className="absolute inset-x-0 top-0 z-50 overflow-hidden rounded-sm border bg-[#181818] shadow-[0_16px_40px_rgba(0,0,0,0.85)]"
              style={{ transformOrigin: `${originX} 0%`, borderColor: glow(meta.top.accent, 0.5) }}
              initial={{ scale: 1, opacity: 0 }}
              animate={{ scale: 1.32, opacity: 1 }}
              exit={{ scale: 1, opacity: 0 }}
              transition={{ duration: DURATION, ease: EASE }}
            >
              {/* 와이드 비주얼 */}
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0A0A0A]">
                <BoxArt
                  imageUrl={box.image.src}
                  code={box.code}
                  tone={box.tone}
                  alt={box.title}
                  codeClassName="text-[26px]"
                />
                <PosterScrim to="#181818" />
                <span className="absolute left-2 top-2 z-10">
                  <TierBadge tier={meta.top} size="xs" />
                </span>
                <span className="absolute inset-x-2 bottom-1.5 z-10 truncate text-[11px] font-bold leading-tight text-white">
                  {box.title}
                </span>
              </div>

              {/* 메타데이터 박스 */}
              <div className="space-y-2 bg-[#282828] p-2.5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpen?.(box)}
                    className="flex h-[26px] shrink-0 items-center gap-1 whitespace-nowrap rounded-sm bg-[#E50914] px-2 text-[10px] font-bold leading-none text-white transition-colors duration-200 hover:bg-[#f6121d]"
                  >
                    <Play className="h-3 w-3 shrink-0 fill-current" strokeWidth={0} />
                    지금 오픈
                  </button>
                  <button
                    type="button"
                    onClick={() => onInspect?.(box)}
                    aria-label="확률 상세"
                    title="확률 상세"
                    className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full border border-[#555555] text-[#AAAAAA] transition-colors duration-200 hover:border-white hover:text-white"
                  >
                    <Info className="h-3.5 w-3.5" strokeWidth={1.6} />
                  </button>
                  <div className="flex-1" />
                  <span className="shrink-0 font-display text-[15px] font-bold leading-none tracking-tight text-white">
                    {formatPrice(box.price)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onInspect?.(box)}
                    aria-label="전체 드롭테이블"
                    title="전체 드롭테이블"
                    className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full border border-[#555555] text-[#AAAAAA] transition-colors duration-200 hover:border-white hover:text-white"
                  >
                    <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.6} />
                  </button>
                </div>

                {/* 핵심 수치 3종 */}
                <div className="grid grid-cols-3 gap-1.5 border-y border-white/10 py-1.5 text-center">
                  <Figure label="최저 확정" value={formatPrice(meta.floor)} tone={meta.floorTier.accent} />
                  <Figure
                    label="최고 당첨"
                    value={formatPrice(meta.grails[0]?.value ?? 0)}
                    tone={meta.top.accent}
                  />
                  <Figure label="본전 이상" value={formatRate(meta.breakEven)} tone="#FFFFFF" />
                </div>

                <TierStrip slices={meta.slices} height={4} />

                {/* 최고 시세 3종 */}
                <ul className="space-y-1">
                  {meta.grails.map((it) => {
                    const t = tierOf(it.value, box.price);
                    return (
                      <li key={it.id} className="flex items-center gap-1.5 text-[9px] leading-none">
                        <span
                          aria-hidden
                          className="h-2.5 w-[2px] flex-none rounded-full"
                          style={{ background: t.accent, boxShadow: `0 0 6px ${glow(t.accent, 0.6)}` }}
                        />
                        <span className="min-w-0 flex-1 truncate text-[#DDDDDD]">{it.name}</span>
                        <span className="flex-none font-mono tabular-nums text-white">{formatPrice(it.value)}</span>
                        <span className="flex-none font-mono tabular-nums text-[#757575]">
                          {formatRate(it.dropRate)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default BoxCard;
