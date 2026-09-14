"use client";

import { Zap, Info } from "lucide-react";
import { useGachaStore, BOOSTER_THRESHOLD, isBoosterActive } from "@/store/useGachaStore";
import { tierFor, tierProbWith, BOOST_MULT } from "@/lib/engine";
import { formatProb } from "@/lib/rng";
import { cn } from "@/lib/format";
import type { Box } from "@/lib/types";

interface Props {
  /** 확률 변환 텍스트("1.5% → 7.5%")를 보여줄 기준 박스 */
  box?: Box;
  compact?: boolean;
  className?: string;
}

/** 개봉 버튼 상단의 부스터(확률업) 게이지 — Phase 3 */
export function BoosterGauge({ box, compact, className }: Props) {
  const pity = useGachaStore((s) => s.pityCount);
  const totalSpent = useGachaStore((s) => s.totalSpent);

  const active = isBoosterActive(pity);
  const shown = Math.min(pity, BOOSTER_THRESHOLD);
  const { name: tierName, mult } = tierFor(totalSpent);

  const baseSSR = box ? tierProbWith(box, "SSR", { boost: false, tierMult: mult }) : null;
  const boostSSR = box ? tierProbWith(box, "SSR", { boost: true, tierMult: mult }) : null;

  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2",
        active
          ? "animate-pulseGlow border-gold bg-gradient-to-r from-gold/20 via-yellow-500/10 to-gold/20"
          : "border-white/15 bg-black/40",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Zap className={cn("h-4 w-4 flex-none", active ? "text-gold" : "text-gray-400")} />
        <span className={cn("text-xs font-bold", active ? "text-gold" : "text-gray-200")}>
          부스터 충전율: {shown} / {BOOSTER_THRESHOLD}
        </span>
        <span className="rounded border border-white/20 px-1.5 py-px text-[10px] font-semibold text-gray-300">
          {tierName} 등급 x{mult}
        </span>
        <div className="flex-1" />
        {active && (
          <span className="rounded bg-gold px-1.5 py-0.5 text-[10px] font-black uppercase text-black">
            BOOST ON: 상위 등급 출현 확률 {BOOST_MULT * 100}% 상승 중!
          </span>
        )}
      </div>

      {/* 10칸 세그먼트 프로그레스 바 */}
      <div className="mt-1.5 flex gap-[3px]">
        {Array.from({ length: BOOSTER_THRESHOLD }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-sm transition-colors",
              i < shown
                ? active
                  ? "bg-gradient-to-r from-yellow-300 to-gold shadow-[0_0_6px_rgba(255,215,0,0.8)]"
                  : "bg-gradient-to-r from-accent to-orange-400"
                : "bg-white/10",
            )}
          />
        ))}
      </div>

      {!compact && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-gray-400">
          {shown === BOOSTER_THRESHOLD - 1 && !active && (
            <span className="font-bold text-gold">다음 뽑기 완료 시 100% 확률 부스터 발동!</span>
          )}
          {box && baseSSR !== null && boostSSR !== null && (
            <span className="inline-flex items-center gap-1">
              <Info className="h-3 w-3" />
              SSR{" "}
              {active ? (
                <>
                  <s className="text-gray-500">{formatProb(baseSSR)}</s>{" "}
                  <b className="text-gold">→ {formatProb(boostSSR)} 적용 중</b>
                </>
              ) : (
                <>
                  기본 {formatProb(baseSSR)} → 부스트 시 <b className="text-gray-200">{formatProb(boostSSR)}</b>
                </>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
