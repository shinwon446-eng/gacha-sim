"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Play, Info, ChevronDown } from "lucide-react";
import type { Box } from "@/lib/types";
import { LINE_META, itemLine } from "@/lib/types";
import { topItem } from "@/lib/rng";
import { compactUsd } from "@/lib/format";
import { useGachaStore } from "@/store/useGachaStore";
import { AssetPlate } from "@/components/AssetPlate";

export type EdgePosition = "first" | "last" | "middle";

interface Props {
  box: Box;
  edge: EdgePosition;
  onExpandChange: (expanded: boolean) => void;
}

const HOVER_DELAY_MS = 300;

/**
 * 행 단위 타일 + 호버 확장 패널.
 * - 기본 타일 호버: 1.02 배 + 크리스프 1px 화이트 엣지
 * - 300ms 지연 후 1.02 에서 1.3 배로 확장
 * - 첫 카드 origin-left / 마지막 카드 origin-right / 나머지 center — 화면 밖 클리핑 방지
 * - z-50 으로 인접 카드 위로 부상
 */
export function BoxCard({ box, edge, onExpandChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openBox = useGachaStore((s) => s.openBox);
  const setDetail = useGachaStore((s) => s.setDetail);

  const top = topItem(box);
  const topLine = itemLine(top);
  const topMeta = LINE_META[topLine];
  const origin = edge === "first" ? "left center" : edge === "last" ? "right center" : "center center";

  const enter = () => {
    timer.current = setTimeout(() => setExpanded(true), HOVER_DELAY_MS);
  };
  const leave = () => {
    if (timer.current) clearTimeout(timer.current);
    setExpanded(false);
  };

  useEffect(() => {
    onExpandChange(expanded);
  }, [expanded, onExpandChange]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <div
      className="relative flex-none w-1/2 px-[3px] sm:w-1/3 md:w-1/4 lg:w-1/6"
      onMouseEnter={enter}
      onMouseLeave={leave}
    >
      {/* 기본 타일 */}
      <button
        onClick={() => setDetail(box.id)}
        title={`${box.title} — 에피소드 정보`}
        className="relative block aspect-video w-full overflow-hidden border border-hairline bg-ink outline-offset-0 transition-transform duration-300 ease-cine hover:scale-[1.02] hover:outline hover:outline-1 hover:outline-white"
      >
        <AssetPlate
          code={box.code}
          tone={box.art}
          size="md"
          className="absolute inset-0 !h-full !w-full !border-0"
        />
        {/* 하단 블랙 스크림 */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-transparent"
        />
        {box.badge && (
          <span className="absolute right-0 top-0 border-b border-l border-hairline bg-ink/90 px-1.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-200">
            {box.badge}
          </span>
        )}
        <span className="absolute inset-x-2 bottom-1.5 block text-left">
          <span className="display block truncate text-[15px] font-bold text-white">{box.title}</span>
          <span className="label-caps mt-1 block truncate">
            {box.price} USDT · 1회 재생
          </span>
        </span>
      </button>

      {/* 확장 패널 */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="absolute left-[3px] right-[3px] top-0 z-50 overflow-hidden border border-hairline bg-elevation shadow-[0_18px_44px_rgba(0,0,0,0.9)] outline outline-1 outline-white outline-offset-0"
            style={{ transformOrigin: origin }}
            initial={{ scale: 1.02, opacity: 0 }}
            animate={{ scale: 1.3, opacity: 1 }}
            exit={{ scale: 1.02, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* 최고가 애셋 프리뷰 */}
            <div className="film-grain relative aspect-video w-full overflow-hidden bg-ink">
              <AssetPlate
                code={top.code}
                tone={top.art}
                size="lg"
                active={topLine === "jackpot"}
                className="absolute inset-0 !h-full !w-full"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-elevation via-transparent to-ink/60"
              />
              <span
                className="absolute left-2 top-2 z-10 border border-hairline bg-ink/85 px-1.5 py-[3px] text-[9px] font-bold uppercase tracking-[0.18em]"
                style={{ color: topMeta.color }}
              >
                {topMeta.grade}
              </span>
              <span className="absolute right-2 top-2 z-10 flex items-baseline gap-1 border border-hairline bg-ink/85 px-1.5 py-[3px]">
                <span className="text-[8px] font-semibold uppercase tracking-[0.18em] text-neutral-500">최고가</span>
                <span className="font-display text-[12px] font-bold uppercase leading-none tracking-tighter text-white">
                  {compactUsd(top.value)}
                </span>
              </span>
            </div>

            <div className="space-y-2 p-2.5">
              {/* 재생 컨트롤 */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openBox(box.id, 1)}
                  className="flex h-7 w-7 items-center justify-center bg-white text-black transition-colors duration-300 ease-cine hover:bg-neutral-300"
                  title={`1회 재생 (${box.price} USDT)`}
                  aria-label="1회 재생"
                >
                  <Play className="h-3.5 w-3.5 fill-black" strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => setDetail(box.id)}
                  className="flex h-7 w-7 items-center justify-center border border-hairline text-neutral-300 outline-offset-0 transition-colors duration-300 ease-cine hover:text-white hover:outline hover:outline-1 hover:outline-white"
                  title="에피소드 정보"
                  aria-label="에피소드 정보"
                >
                  <Info className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => setDetail(box.id)}
                  className="flex h-7 w-7 items-center justify-center border border-hairline text-neutral-300 outline-offset-0 transition-colors duration-300 ease-cine hover:text-white hover:outline hover:outline-1 hover:outline-white"
                  title="전체 확률표"
                  aria-label="전체 확률표"
                >
                  <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </div>

              <div className="display truncate text-[13px] font-bold text-white">{box.title}</div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-display text-[13px] font-bold uppercase leading-none tracking-tighter text-white">
                  {box.price} USDT
                </span>
                <span aria-hidden className="h-2.5 w-px bg-white/15" />
                <span className="label-caps">확률 공시 · 에피소드 정보</span>
              </div>

              <div className="flex items-center gap-1.5 overflow-hidden">
                <span aria-hidden className="h-2 w-2 flex-none" style={{ background: topMeta.color }} />
                <span className="truncate text-[10px] text-neutral-400">{top.name}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
