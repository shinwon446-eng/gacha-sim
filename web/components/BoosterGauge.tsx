"use client";

import { Zap, AlertTriangle } from "lucide-react";
import { useGachaStore, BOOSTER_THRESHOLD, isBoosterActive } from "@/store/useGachaStore";
import { tierFor, lineProbWith, BOOST_MULT } from "@/lib/engine";
import { cn } from "@/lib/format";
import { LINE_META, type Box } from "@/lib/types";

interface Props {
  /** 확률 변환 표기의 기준 박스 */
  box: Box;
  className?: string;
}

/** 확률 부스터 게이지 — 개봉 버튼 상단의 단일 진행도 UI */
export function BoosterGauge({ box, className }: Props) {
  const pity = useGachaStore((s) => s.pityCount);
  const totalSpent = useGachaStore((s) => s.totalSpent);

  const active = isBoosterActive(pity);
  const shown = Math.min(pity, BOOSTER_THRESHOLD);
  const { name: tierName, mult } = tierFor(totalSpent);

  const base = lineProbWith(box, "jackpot", { boost: false, tierMult: mult });
  const boosted = lineProbWith(box, "jackpot", { boost: true, tierMult: mult });
  const jackpot = LINE_META.jackpot.label;

  // 9칸까지 찼을 때 = 다음 개봉이 부스터 발동분
  const nextIsBoost = shown === BOOSTER_THRESHOLD - 1;

  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2",
        active || nextIsBoost
          ? "animate-pulseGlow border-gold bg-gradient-to-r from-gold/20 via-yellow-500/10 to-gold/20"
          : "border-white/15 bg-black/40",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Zap className={cn("h-4 w-4 flex-none", active || nextIsBoost ? "text-gold" : "text-gray-400")} />
        <span className={cn("text-xs font-bold", active || nextIsBoost ? "text-gold" : "text-gray-200")}>
          부스터 충전율: {shown} / {BOOSTER_THRESHOLD}
        </span>
        <span className="rounded border border-white/20 px-1.5 py-px text-[10px] font-semibold text-gray-300">
          {tierName} 등급 x{mult}
        </span>
        {active && (
          <span className="rounded bg-gold px-1.5 py-0.5 text-[10px] font-black uppercase text-black">
            부스터 발동 상태 · [{jackpot}] 가중치 {BOOST_MULT}배 적용 중
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
                ? active || nextIsBoost
                  ? "bg-gradient-to-r from-yellow-300 to-gold shadow-[0_0_6px_rgba(255,215,0,0.8)]"
                  : "bg-gradient-to-r from-accent to-orange-400"
                : "bg-white/10",
            )}
          />
        ))}
      </div>

      <div className="mt-1.5 text-[11px] leading-relaxed">
        {nextIsBoost ? (
          <p className="flex items-start gap-1 font-bold text-gold">
            <AlertTriangle className="mt-px h-3 w-3 flex-none" />
            <span>
              경고: 다음 1회 개봉 시 [{jackpot}] 가중치 {BOOST_MULT}배 적용 —{" "}
              <span className="font-mono">
                {base.toFixed(2)}% → {boosted.toFixed(2)}%
              </span>{" "}
              (절대 놓치지 마세요)
            </span>
          </p>
        ) : active ? (
          <p className="font-mono text-gold">
            [{jackpot}] {base.toFixed(2)}% → {boosted.toFixed(2)}% 적용 중
          </p>
        ) : (
          <p className="text-gray-400">
            {BOOSTER_THRESHOLD}번째 개봉에 [{jackpot}] 가중치 {BOOST_MULT}배{" "}
            <span className="font-mono text-gray-300">
              ({base.toFixed(2)}% → {boosted.toFixed(2)}%)
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
