"use client";

import { useState } from "react";
import { cn } from "@/lib/format";
import { assetPath } from "@/lib/assetPath";
import { glow } from "@/lib/tiers";
import type { GachaItem } from "@/src/data/gachaItems";
import { TIER_LABEL, formatOdds, formatUsdt } from "@/src/data/gachaRules";

export interface GachaItemCardProps {
  item: GachaItem;
  /** 항목 확률(%). 없으면 확률 줄을 숨긴다. */
  probability?: number;
  /** 결과 강조 상태 */
  highlighted?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/**
 * 가챠 아이템 카드. 상단 SVG 에셋(투명 배경) + 하단 메타.
 * SVG 는 등급 글로우가 내장돼 있으므로 카드는 뒤에서 은은한 백글로우만 더한다.
 * 에셋 로딩 실패 시 등급색 링 위에 이름만 남긴다 — 깨진 아이콘을 노출하지 않는다.
 */
export function GachaItemCard({ item, probability, highlighted = false, size = "md", className }: GachaItemCardProps) {
  const [failed, setFailed] = useState(false);
  const pad = size === "sm" ? "p-2" : "p-3";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-neutral-900 transition-all duration-300",
        highlighted ? "border-transparent" : "border-neutral-800 hover:-translate-y-1 hover:border-neutral-600",
        className,
      )}
      style={{
        boxShadow: highlighted
          ? `0 0 0 1px ${glow(item.glowColor, 0.7)}, 0 0 36px ${glow(item.glowColor, 0.45)}, 0 18px 40px rgba(0,0,0,0.7)`
          : "inset 0 1px 0 rgba(255,255,255,0.04), 0 6px 18px rgba(0,0,0,0.45)",
      }}
    >
      {/* 비주얼 — 정사각, 투명 SVG 뒤에 백글로우 */}
      <div className="relative w-full overflow-hidden bg-black" style={{ aspectRatio: "1 / 1" }}>
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `radial-gradient(60% 60% at 50% 55%, ${glow(item.glowColor, 0.22)} 0%, transparent 70%)`,
          }}
        />
        {!failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={assetPath(item.imageSrc)}
            alt={item.name}
            draggable={false}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="absolute inset-0 h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
            style={{ padding: "6%" }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="flex items-center justify-center rounded-full border text-center text-xs font-bold text-white"
              style={{ width: "62%", aspectRatio: "1 / 1", borderColor: item.glowColor, boxShadow: `0 0 18px ${glow(item.glowColor, 0.5)}`, padding: 12 }}
            >
              {item.name}
            </div>
          </div>
        )}
        <span
          className="absolute left-2 top-2 rounded-sm px-1.5 py-1 text-xs font-bold leading-none tracking-widest"
          style={{ color: item.glowColor, backgroundColor: glow(item.glowColor, 0.12), border: `1px solid ${glow(item.glowColor, 0.45)}` }}
        >
          {item.tier} · {TIER_LABEL[item.tier]}
        </span>
      </div>

      {/* 메타 — 불투명 */}
      <div className={cn("border-t border-neutral-800 bg-neutral-900", pad)}>
        <div className="truncate text-sm font-bold leading-tight text-white">{item.name}</div>
        <div className="mt-1 flex items-end justify-between gap-2">
          <div className="font-mono text-base font-bold leading-none tabular-nums" style={{ color: item.glowColor }}>
            {formatUsdt(item.usdtValue)}
          </div>
          {typeof probability === "number" && (
            <div className="font-mono text-xs tabular-nums text-neutral-500">{formatOdds(probability)}</div>
          )}
        </div>
        <div className="mt-1 text-xs uppercase tracking-widest text-neutral-600" style={{ fontSize: 9 }}>
          {item.category}
        </div>
      </div>
    </div>
  );
}

export default GachaItemCard;
