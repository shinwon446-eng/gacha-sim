"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Crown, Gem, Truck } from "lucide-react";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { useProductText } from "@/lib/useProductText";
import { BOX_BY_SLUG } from "@/lib/products";
import { tierOf } from "@/lib/tiers";
import { buildLiveDrops, liveDropsClock, type LiveDrop } from "@/lib/liveDrops";

/**
 * 최상단 라이브 드랍 & 지급 티커 (CLAUDE.md §2-1).
 * 헤더 바로 아래 한 줄. 이벤트 카드가 좌로 무한 루프(.ticker-track — globals.css)하고, 호버하면 멈춘다.
 * 시각은 마운트 후에만 렌더한다(정적 프리렌더와 불일치 방지). 30초마다 seed 가 바뀌어 다른 조합이 흐른다.
 */
export function LiveTicker({ className }: { className?: string }) {
  const t = useTranslations("ticker");
  const { fmt } = useCurrency();
  const { itemName } = useProductText();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const clock = now === null ? null : liveDropsClock(now);
  const drops = useMemo(() => buildLiveDrops(clock?.seed ?? 0), [clock?.seed]);

  const render = (d: LiveDrop, dup: boolean) => {
    const box = d.boxSlug ? BOX_BY_SLUG[d.boxSlug] : undefined;
    const item = box?.items.find((i) => i.id === d.itemId);
    const tier = box && item ? tierOf(item.value, box.price) : undefined;
    const Icon = d.kind === "win" ? Crown : d.kind === "cashout" ? Gem : Truck;
    const ago = clock ? d.secondsAgo + clock.elapsedSec : null;
    return (
      <li key={`${d.id}${dup ? "-b" : ""}`} aria-hidden={dup || undefined} className="flex flex-none items-center gap-2 whitespace-nowrap px-4 text-[11px] leading-none">
        <Icon className={cn("h-3 w-3 flex-none", d.kind === "win" ? "text-gold-champagne" : d.kind === "cashout" ? "text-tier-prestige" : "text-secondary")} strokeWidth={2.4} />
        <span className="font-mono text-secondary">[{d.user}]</span>
        <span className="text-muted">
          {d.kind === "win" && item && t("win", { item: itemName(item) })}
          {d.kind === "cashout" && t("cashout", { amount: fmt(d.amountUsdt ?? 0) })}
          {d.kind === "ship" && item && t("ship", { item: itemName(item) })}
        </span>
        {tier && d.kind === "win" && (
          <span className="rounded-sm px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: tier.accent, background: `${tier.accent}1f` }}>
            {tier.label}
          </span>
        )}
        <span className="text-faint">{ago === null ? "" : t("ago", { s: ago })}</span>
        <span aria-hidden className="ml-2 h-3 w-px bg-hairline" />
      </li>
    );
  };

  return (
    <div className={cn("relative flex h-9 items-center overflow-hidden border-b border-hairline bg-obsidian", className)} aria-label={t("label")}>
      <span className="z-10 flex h-full flex-none items-center gap-1.5 border-r border-hairline bg-obsidian pl-[4%] pr-3 text-[10px] font-bold uppercase tracking-[0.18em] text-crimson">
        <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-crimson" />
        {t("live")}
      </span>
      <div className="ticker-viewport relative min-w-0 flex-1 overflow-hidden">
        <ul className="ticker-track flex w-max items-center">
          {drops.map((d) => render(d, false))}
          {drops.map((d) => render(d, true))}
        </ul>
      </div>
      <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-obsidian to-transparent" />
    </div>
  );
}

export default LiveTicker;
