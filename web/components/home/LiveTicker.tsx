"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Crown, Gem, Truck, Flame } from "lucide-react";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { useProductText } from "@/lib/useProductText";
import { BOX_BY_SLUG, formatRate } from "@/lib/products";
import { formatMultiple, tierOf } from "@/lib/tiers";
import { buildLineupDrops, buildLocalDrops, localHandle, type LiveDrop } from "@/lib/liveDrops";
import { isLive } from "@/lib/runtime";
import { api } from "@/lib/api";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useWalletStore } from "@/stores/walletStore";
import { useFairStore } from "@/stores/fairStore";

/** 상대 시간 — 초/분/시간 */
function useRelative(locale: string) {
  const rtf = useMemo(() => new Intl.RelativeTimeFormat(locale === "zh" ? "zh-CN" : locale, { numeric: "always" }), [locale]);
  return (iso: string, now: number) => {
    const s = Math.max(1, Math.round((now - new Date(iso).getTime()) / 1000));
    if (s < 60) return rtf.format(-s, "second");
    if (s < 3600) return rtf.format(-Math.round(s / 60), "minute");
    if (s < 86400) return rtf.format(-Math.round(s / 3600), "hour");
    return rtf.format(-Math.round(s / 86400), "day");
  };
}

/**
 * 최상단 라이브 드랍 & 지급 티커 (CLAUDE.md §4-1).
 * live 모드: API 스트림(30초 폴링). preview 모드: 이 기기의 실제 당첨·환전·출고 기록. 기록이 없으면 공개 잭팟 라인업(사실)을 흘린다 — 타인 활동을 지어내지 않는다.
 * 목록을 두 번 렌더해 좌로 무한 루프(.ticker-track), 호버하면 멈춘다. 시각은 마운트 후에만 렌더한다.
 */
export function LiveTicker({ className }: { className?: string }) {
  const t = useTranslations("ticker");
  const tr = useTranslations();
  const { boxTitle, itemName } = useProductText();
  const locale = useLocale();
  const { fmt } = useCurrency();
  const rel = useRelative(locale);
  const items = useInventoryStore((s) => s.items);
  const transactions = useWalletStore((s) => s.transactions);
  const clientSeed = useFairStore((s) => s.clientSeed);
  const [now, setNow] = useState<number | null>(null);
  const [remote, setRemote] = useState<LiveDrop[] | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isLive()) return;
    let alive = true;
    const pull = () => api.liveFeed().then((d) => alive && setRemote(d)).catch(() => {});
    pull();
    const id = setInterval(pull, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const drops = useMemo(() => {
    const local = remote ?? buildLocalDrops(items, transactions, localHandle(clientSeed));
    return local.length > 0 ? local : buildLineupDrops();
  }, [remote, items, transactions, clientSeed]);
  if (now === null) return null;

  const render = (d: LiveDrop, dup: boolean) => {
    const box = d.boxSlug ? BOX_BY_SLUG[d.boxSlug] : undefined;
    const item = box?.items.find((i) => i.id === d.itemId);
    const tier = box && item ? tierOf(item.value, box.price) : undefined;
    const Icon = d.kind === "win" ? Crown : d.kind === "cashout" ? Gem : d.kind === "lineup" ? Flame : Truck;
    return (
      <li key={`${d.id}${dup ? "-b" : ""}`} aria-hidden={dup || undefined} className="flex flex-none items-center gap-2 whitespace-nowrap px-4 text-[11px] leading-none">
        <Icon className={cn("h-3 w-3 flex-none", d.kind === "win" ? "text-gold-champagne" : d.kind === "cashout" ? "text-tier-prestige" : "text-secondary")} strokeWidth={2.4} />
        {d.user && <span className="font-mono text-secondary">[{d.user}]</span>}
        <span className="text-muted">
          {d.kind === "lineup" && item && box && t("lineup", { box: boxTitle(box), item: itemName(item), mult: tr("tiers.multiple", { n: formatMultiple(item.value / box.price) }), rate: formatRate(item.dropRate) })}
          {d.kind === "win" && item && box && t("win", { item: itemName(item), price: fmt(box.price) })}
          {d.kind === "cashout" && t("cashout", { amount: fmt(d.amountUsdt ?? 0) })}
          {d.kind === "ship" && item && t("ship", { item: itemName(item) })}
        </span>
        {tier && (d.kind === "win" || d.kind === "lineup") && (
          <span className="rounded-sm px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: tier.accent, background: `${tier.accent}1f` }}>
            {tier.label}
          </span>
        )}
        {d.kind !== "lineup" && <span className="text-faint">({rel(d.at, now)})</span>}
        <span aria-hidden className="ml-2 h-3 w-px bg-hairline" />
      </li>
    );
  };

  // 항목이 적으면 루프가 비어 보인다 — 최소 8칸이 되도록 반복
  const list = drops.length >= 8 ? drops : Array.from({ length: Math.ceil(8 / drops.length) }, () => drops).flat().slice(0, 8);

  return (
    <div className={cn("relative flex h-9 items-center overflow-hidden border-b border-hairline bg-obsidian", className)} aria-label={t("label")}>
      <span className="z-10 flex h-full flex-none items-center gap-1.5 border-r border-hairline bg-obsidian pl-[4%] pr-3 text-[10px] font-bold uppercase tracking-[0.18em] text-crimson">
        <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-crimson" />
        {t("live")}
      </span>
      <div className="ticker-viewport relative min-w-0 flex-1 overflow-hidden">
        <ul className="ticker-track flex w-max items-center">
          {list.map((d, i) => render({ ...d, id: `${d.id}_${i}` }, false))}
          {list.map((d, i) => render({ ...d, id: `${d.id}_${i}` }, true))}
        </ul>
      </div>
      <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-obsidian to-transparent" />
    </div>
  );
}

export default LiveTicker;
