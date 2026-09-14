"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Play, Info, ChevronDown, Gift } from "lucide-react";
import type { Box } from "@/lib/types";
import { TIER_META } from "@/lib/types";
import { topItem, tierProbabilities, formatProb } from "@/lib/rng";
import { compactUsd } from "@/lib/format";
import { useGachaStore } from "@/store/useGachaStore";

export type EdgePosition = "first" | "last" | "middle";

interface Props {
  box: Box;
  edge: EdgePosition;
  onExpandChange: (expanded: boolean) => void;
}

const HOVER_DELAY_MS = 300;

/**
 * 넷플릭스 호버 카드.
 * - 300ms 지연 후 1.3배 확대
 * - 첫 카드 origin-left / 마지막 카드 origin-right / 나머지 center → 화면 밖 클리핑 방지
 * - z-50 으로 인접 카드 위로 부상
 */
export function BoxCard({ box, edge, onExpandChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openBox = useGachaStore((s) => s.openBox);
  const demoRoll = useGachaStore((s) => s.demoRoll);
  const setDetail = useGachaStore((s) => s.setDetail);

  const top = topItem(box);
  const probs = tierProbabilities(box);
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
      {/* 기본 카드 */}
      <button
        onClick={() => setDetail(box.id)}
        className="relative block aspect-video w-full overflow-hidden rounded bg-surface"
        style={{ background: box.art }}
      >
        <div className="holo absolute inset-0 overflow-hidden" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
        <div className="absolute left-2 top-2 text-3xl drop-shadow-lg">{box.emoji}</div>
        {box.badge && (
          <span className="absolute right-2 top-2 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold">{box.badge}</span>
        )}
        <div className="absolute inset-x-2 bottom-2 text-left">
          <div className="truncate text-[13px] font-bold leading-tight drop-shadow">{box.title}</div>
          <div className="text-[11px] text-gray-300">{box.price} USDT / 오픈</div>
        </div>
      </button>

      {/* 확장 카드 */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="absolute left-[3px] right-[3px] top-0 z-50 overflow-hidden rounded-md bg-elevation shadow-[0_24px_60px_rgba(0,0,0,0.9)]"
            style={{ transformOrigin: origin }}
            initial={{ scale: 1, opacity: 0 }}
            animate={{ scale: 1.3, opacity: 1 }}
            exit={{ scale: 1, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {/* 자동 재생 미니 티저 (홀로그램 스윕 + 부유 아이템) */}
            <div className="relative aspect-video w-full overflow-hidden" style={{ background: box.art }}>
              <div className="holo absolute inset-0 overflow-hidden" />
              <div className="shimmer-bg absolute inset-0 opacity-50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="animate-floaty text-6xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">{top.emoji}</span>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-elevation to-transparent" />
              <div className="absolute left-2 top-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> LIVE TEASER
              </div>
              <span
                className="absolute right-2 top-2 rounded px-1.5 py-0.5 text-[9px] font-black uppercase"
                style={{ background: TIER_META[top.tier].color, color: "#000" }}
              >
                최고 당첨 {compactUsd(top.value)}
              </span>
            </div>

            <div className="space-y-2 p-2.5">
              {/* 즉시 뽑기 액션 바 */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openBox(box.id, 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-black transition hover:bg-white/80"
                  title={`1회 오픈 (${box.price} USDT)`}
                >
                  <Play className="h-3.5 w-3.5 fill-black" />
                </button>
                <button
                  onClick={() => demoRoll(box.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-400 text-white transition hover:border-white"
                  title="무료 체험 뽑기"
                >
                  <Gift className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDetail(box.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-400 text-white transition hover:border-white"
                  title="상세 정보"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => setDetail(box.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-400 text-white transition hover:border-white"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="text-[11px] font-bold leading-tight">{box.title}</div>
              <div className="flex flex-wrap items-center gap-x-2 text-[9px] text-gray-300">
                <span className="font-semibold text-emerald-400">{box.price} USDT</span>
                <span className="rounded border border-gray-500 px-1">SSR {formatProb(probs.SSR)}</span>
                <span className="rounded border border-gray-500 px-1">SR {formatProb(probs.SR)}</span>
              </div>
              <div className="truncate text-[9px] text-gray-400">
                <span style={{ color: TIER_META[top.tier].color }}>●</span> {top.name}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
