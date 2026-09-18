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

/** 바 아래에 붙는 텍스트 범례. 실제 수치는 여기서 읽힌다. */
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
