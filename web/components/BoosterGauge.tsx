"use client";

import { Zap } from "lucide-react";
import { useGachaStore, BOOSTER_THRESHOLD, isBoosterActive } from "@/store/useGachaStore";
import { tierFor, lineProbWith, BOOST_MULT } from "@/lib/engine";
import { cn } from "@/lib/format";
import { LINE_META, type Box } from "@/lib/types";

interface Props {
  /** 확률 변환 표기의 기준 박스 */
  box: Box;
  className?: string;
}

/**
 * 확률 부스터 게이지 — 재생 버튼 상단의 단일 진행도 UI.
 * 10칸 브루탈리스트 세그먼트. 충전된 칸은 백색, 마지막 대기 칸만 크림슨.
 * 확산 글로우 없음. 무장 상태는 1px 크림슨 엣지로만 표기한다.
 */
export function BoosterGauge({ box, className }: Props) {
  const pity = useGachaStore((s) => s.pityCount);
  const totalSpent = useGachaStore((s) => s.totalSpent);

  const active = isBoosterActive(pity);
  const shown = Math.min(pity, BOOSTER_THRESHOLD);
  const { name: tierName, mult } = tierFor(totalSpent);

  const base = lineProbWith(box, "jackpot", { boost: false, tierMult: mult });
  const boosted = lineProbWith(box, "jackpot", { boost: true, tierMult: mult });
  const grade = LINE_META.jackpot.grade;

  // 게이지가 10칸을 채운 상태에서만 다음 재생에 부스터가 적용된다 (engine: pity >= 10).
  // 9칸은 "1회 더 재생하면 무장" 단계이며, 아직 배율이 적용되지 않는다.
  const oneAway = shown === BOOSTER_THRESHOLD - 1;
  const armed = active || oneAway;

  return (
    <div
      className={cn(
        "border px-3 py-2.5",
        armed ? "border-crimson/60 bg-crimson/[0.05]" : "border-white/[0.08] bg-ink/60",
        active && "edge-crimson",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <Zap className={cn("h-3.5 w-3.5 flex-none", armed ? "text-crimson" : "text-neutral-500")} />
        <span
          className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.18em]",
            armed ? "text-crimson" : "text-neutral-400",
          )}
        >
          부스터 충전
        </span>
        <span className={cn("font-mono text-xs font-bold tabular-nums", armed ? "text-white" : "text-neutral-300")}>
          {shown} / {BOOSTER_THRESHOLD}
        </span>
        <span className="border border-white/[0.08] px-1.5 py-px font-mono text-[10px] tabular-nums text-neutral-400">
          {tierName} x{mult}
        </span>
        {active && (
          <span className="animate-flicker border border-crimson bg-crimson px-1.5 py-px text-[10px] font-bold uppercase tracking-[0.12em] text-white">
            부스터 가동 · {grade} 가중치 {BOOST_MULT}배 적용 중
          </span>
        )}
      </div>

      {/* 10칸 세그먼트 게이지 — 사각 세그먼트, 헤어라인 분리 */}
      <div className="mt-2 flex gap-px border border-white/[0.08] bg-ink p-px">
        {Array.from({ length: BOOSTER_THRESHOLD }, (_, i) => {
          const filled = i < shown;
          const isFinal = i === BOOSTER_THRESHOLD - 1;
          const pendingFinal = !filled && isFinal && oneAway;
          return (
            <div
              key={i}
              className={cn(
                "h-2.5 flex-1 transition-colors duration-300 ease-cine",
                filled ? (isFinal ? "bg-crimson" : "bg-white") : pendingFinal ? "bg-crimson/40" : "bg-white/[0.07]",
              )}
            />
          );
        })}
      </div>

      <div className="mt-2 text-[11px] leading-relaxed">
        {active ? (
          <p className="font-semibold text-crimson">
            부스터 무장 완료. 다음 1회 재생에 {grade} 가중치 {BOOST_MULT}배 적용{" "}
            <span className="font-mono tabular-nums text-white">
              (기본 {base.toFixed(2)}% / 부스터 {boosted.toFixed(2)}%)
            </span>
          </p>
        ) : oneAway ? (
          <p className="font-semibold text-crimson">
            1회 더 재생하면 부스터가 무장됩니다. 배율은 그 다음 재생에 적용됩니다{" "}
            <span className="font-mono tabular-nums text-white">
              (기본 {base.toFixed(2)}% / 부스터 {boosted.toFixed(2)}%)
            </span>
          </p>
        ) : (
          <p className="text-neutral-500">
            {BOOSTER_THRESHOLD}회 재생으로 무장, 이후 1회 재생에 {grade} 가중치 {BOOST_MULT}배{" "}
            <span className="font-mono tabular-nums text-neutral-300">
              (기본 {base.toFixed(2)}% / 부스터 {boosted.toFixed(2)}%)
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
