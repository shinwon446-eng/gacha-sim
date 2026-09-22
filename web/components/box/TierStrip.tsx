"use client";

import { cn } from "@/lib/format";
import { formatRate, type ProductBox } from "@/lib/products";
import { glow, tierBreakdown, type Tier, type TierSlice } from "@/lib/tiers";

/**
 * 티어 뱃지. 액센트 색 텍스트 + 같은 색 저알파 배경 + 1px 보더.
 * 채도 높은 배경에 검은 글씨를 쓰지 않는다 — 다크 서페이스 위에서 색이 튀어 위계가 무너진다.
 */
export function TierBadge({
  tier,
  size = "sm",
  className,
}: {
  tier: Tier;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const dim =
    size === "md"
      ? "px-2 py-1 text-[11px] tracking-[0.18em]"
      : size === "sm"
        ? "px-1.5 py-[3px] text-[9px] tracking-[0.16em]"
        : "px-1 py-[2px] text-[8px] tracking-[0.14em]";

  return (
    <span
      className={cn("inline-block rounded-sm font-semibold uppercase leading-none", dim, className)}
      style={{
        color: tier.accent,
        backgroundColor: glow(tier.accent, 0.12),
        border: `1px solid ${glow(tier.accent, 0.45)}`,
        textShadow: `0 0 12px ${glow(tier.accent, 0.55)}`,
      }}
    >
      {tier.label}
    </span>
  );
}

/**
 * 티어별 확률 분포 바. 상위 티어가 왼쪽.
 *
 * 확률에 비례해 폭을 나누되 최소 폭을 준다. 0.35% 짜리 MASTER 구간이 서브픽셀로
 * 사라지면 "최상위가 존재한다"는 정보 자체가 전달되지 않는다. 폭은 비례가 아니라
 * 존재 신호이므로, 정확한 수치는 항상 옆에 텍스트로 병기한다.
 */
export function TierStrip({
  slices,
  height = 5,
  className,
}: {
  slices: TierSlice[];
  height?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full overflow-hidden rounded-[1px]", className)} style={{ height }}>
      {slices.map((s) => (
        <span
          key={s.tier.key}
          title={`${s.tier.label} ${formatRate(s.rate)}`}
          className="block h-full"
          style={{
            flexGrow: Math.max(s.rate, 0.01),
            flexBasis: 0,
            minWidth: 6,
            background: `linear-gradient(180deg, ${s.tier.accent} 0%, ${s.tier.deep} 100%)`,
            boxShadow: `0 0 6px ${glow(s.tier.accent, 0.4)}`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * 넷플릭스 게임형 등급 바 — 확률에 비례하지 않는다. 존재하는 등급을 같은 폭으로 늘어놓고
 * LEGENDARY / EPIC / RARE / CASHBACK 라벨만 붙인다. 정밀 확률은 Provably Fair 섹션에서만 본다.
 */
export function GameTierBar({ slices, compact = false, className }: { slices: TierSlice[]; compact?: boolean; className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      <div className={cn("flex w-full gap-0.5 overflow-hidden rounded-sm", compact ? "h-1" : "h-2")}>
        {slices.map((s) => (
          <span
            key={s.tier.key}
            className="block h-full flex-1"
            style={{ background: `linear-gradient(180deg, ${s.tier.accent} 0%, ${s.tier.deep} 100%)`, boxShadow: `0 0 8px ${glow(s.tier.accent, 0.45)}` }}
          />
        ))}
      </div>
      <ul className={cn("mt-1.5 flex flex-wrap items-center", compact ? "gap-x-2 gap-y-0.5" : "gap-x-3 gap-y-1")}>
        {slices.map((s) => (
          <li key={s.tier.key} className={cn("flex items-center gap-1 leading-none", compact ? "text-[8px]" : "text-[10px]")}>
            <span aria-hidden className={cn("flex-none rounded-full", compact ? "h-1.5 w-1.5" : "h-2 w-2")} style={{ background: s.tier.accent, boxShadow: `0 0 6px ${glow(s.tier.accent, 0.6)}` }} />
            <span className="font-bold uppercase tracking-[0.12em]" style={{ color: s.tier.accent }}>
              {s.tier.gameLabel}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 바 아래에 붙는 텍스트 범례. 실제 수치는 여기서 읽힌다 — Provably Fair 정밀 확률 섹션 전용. */
export function TierLegend({ slices, className }: { slices: TierSlice[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      {slices.map((s) => (
        <li key={s.tier.key} className="flex items-center gap-1.5 text-[10px] leading-none">
          <span
            aria-hidden
            className="h-2 w-2 flex-none rounded-[1px]"
            style={{ background: s.tier.accent, boxShadow: `0 0 6px ${glow(s.tier.accent, 0.5)}` }}
          />
          <span className="font-semibold uppercase tracking-[0.1em]" style={{ color: s.tier.accent }}>
            {s.tier.label}
          </span>
          <span className="font-mono tabular-nums text-[#AAAAAA]">{formatRate(s.rate)}</span>
        </li>
      ))}
    </ul>
  );
}

export const breakdownOf = (box: ProductBox): TierSlice[] => tierBreakdown(box);
