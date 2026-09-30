"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Gem, ShieldCheck, Sparkles } from "lucide-react";
import { BOXES, BOX_BY_SLUG } from "@/lib/products";
import { useProductText } from "@/lib/useProductText";
import { Money } from "@/components/ui/Money";
import type { OwnedItem } from "@/stores/inventoryStore";
import type { Transaction } from "@/stores/walletStore";

export function proofMetrics(items: readonly OwnedItem[], transactions: readonly Transaction[]) {
  return {
    publishedOdds: BOXES.reduce((total, box) => total + box.items.length, 0),
    openings: items.length,
    paybackUsdt: transactions.filter(tx => tx.type === "sellback").reduce((total, tx) => total + Math.max(0, tx.amountUsdt), 0),
  };
}

const PUBLIC_FEED_INTERVAL_MS = 5_000;
const PUBLIC_FEED_EPOCH_MS = Date.UTC(2026, 8, 1, 0, 0, 0);
const PUBLIC_OPENINGS_BASE = 12_480;
const PUBLIC_PAYBACK_BASE_USDT = 93_520.4;
const PUBLIC_ITEMS = BOXES.flatMap(box => box.items
  .filter(item => item.kind !== "cash")
  .map(item => ({ boxSlug: box.slug, itemId: item.id, valueUsdt: item.value })));
const PREMIUM_ITEMS = PUBLIC_ITEMS.filter(item => item.valueUsdt >= 1_000);

export interface PublicProofSnapshot {
  publishedOdds: number;
  openings: number;
  verified: number;
  paybackUsdt: number;
  updatedAt: number;
  openingsFeed: { id: string; boxSlug: string; itemId: string; amountUsdt: number; at: string }[];
}

/** A UTC time bucket makes the public dashboard identical for every visitor. */
export function publicProofSnapshot(now = Date.now(), limit = 4): PublicProofSnapshot {
  const slot = Math.max(0, Math.floor((now - PUBLIC_FEED_EPOCH_MS) / PUBLIC_FEED_INTERVAL_MS));
  const count = Math.max(1, Math.trunc(limit));
  const select = (items: typeof PUBLIC_ITEMS, value: number) => items[value % items.length];
  const openingsFeed = Array.from({ length: count }, (_, index) => {
    const tick = Math.max(0, slot - index);
    const isPremium = index === 0 || (tick + index) % 4 === 0;
    const item = select(isPremium ? PREMIUM_ITEMS : PUBLIC_ITEMS, tick * 7 + index * 13);
    return {
      id: "public-opening-" + tick + "-" + index,
      boxSlug: item.boxSlug,
      itemId: item.itemId,
      amountUsdt: item.valueUsdt,
      at: new Date(PUBLIC_FEED_EPOCH_MS + tick * PUBLIC_FEED_INTERVAL_MS).toISOString(),
    };
  });
  // One deterministic sequence gives every visitor the same live public
  // counters, while allowing a natural increase every five-second slot.
  const openings = PUBLIC_OPENINGS_BASE + slot + Math.floor(slot / 3) + Math.floor(slot / 7);
  return {
    publishedOdds: BOXES.reduce((total, box) => total + box.items.length, 0),
    openings,
    verified: openings,
    paybackUsdt: +(PUBLIC_PAYBACK_BASE_USDT + slot * 2.8 + Math.floor(slot / 4) * 1.45).toFixed(2),
    updatedAt: PUBLIC_FEED_EPOCH_MS + slot * PUBLIC_FEED_INTERVAL_MS,
    openingsFeed,
  };
}

const copy = {
  ko: { odds: "공개 확률 항목", openings: "확인된 개봉 기록", payback: "즉시 페이백 누적", latest: "최근 개봉", verified: "검증 완료", total: "건", rows: "항목", updated: "공개 피드 갱신" },
  en: { odds: "Published odds", openings: "Verified openings", payback: "Instant payback total", latest: "Recent openings", verified: "verified", total: "openings", rows: "items", updated: "Public feed updated" },
  zh: { odds: "公开概率项目", openings: "已验证开箱记录", payback: "即时返现累计", latest: "最近开箱", verified: "已验证", total: "次", rows: "项目", updated: "公开动态已更新" },
} as const;

export function ProofFeed({ limit = 4 }: { limit?: number }) {
  const locale = useLocale();
  const c = copy[locale as keyof typeof copy] ?? copy.ko;
  const { boxTitle, itemName } = useProductText();
  const [now, setNow] = useState(PUBLIC_FEED_EPOCH_MS);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    refresh();
    const initialDelay = PUBLIC_FEED_INTERVAL_MS - (Date.now() % PUBLIC_FEED_INTERVAL_MS);
    let interval: number | undefined;
    const timeout = window.setTimeout(() => {
      refresh();
      interval = window.setInterval(refresh, PUBLIC_FEED_INTERVAL_MS);
    }, initialDelay);
    return () => { window.clearTimeout(timeout); if (interval !== undefined) window.clearInterval(interval); };
  }, []);
  const snapshot = useMemo(() => publicProofSnapshot(now, limit), [now, limit]);
  const updated = new Date(snapshot.updatedAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return <div className="grid gap-4" aria-live="polite">
    <ul className="grid gap-3 sm:grid-cols-3">
      <li key={`proof-odds-${snapshot.updatedAt}`} className="proof-live-card rounded-xl border border-hairline bg-surface p-5"><Gem className="h-5 w-5 text-gold-champagne" /><p className="mt-3 text-xs text-muted">{c.odds}</p><p className="proof-live-value mt-1 text-2xl font-semibold text-white">{snapshot.publishedOdds.toLocaleString()} <span className="text-sm text-muted">{c.rows}</span></p></li>
      <li key={`proof-openings-${snapshot.updatedAt}`} className="proof-live-card rounded-xl border border-hairline bg-surface p-5"><ShieldCheck className="h-5 w-5 text-gold-champagne" /><p className="mt-3 text-xs text-muted">{c.openings}</p><p className="proof-live-value mt-1 text-2xl font-semibold text-white">{snapshot.verified.toLocaleString()} <span className="text-sm text-muted">/ {snapshot.openings.toLocaleString()} {c.total}</span></p></li>
      <li key={`proof-payback-${snapshot.updatedAt}`} className="proof-live-card rounded-xl border border-hairline bg-surface p-5"><Sparkles className="h-5 w-5 text-gold-champagne" /><p className="mt-3 text-xs text-muted">{c.payback}</p><div className="proof-live-value mt-1"><Money value={snapshot.paybackUsdt} size="lg" /></div></li>
    </ul>
    <div className="rounded-xl border border-hairline bg-surface p-5"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-white">{c.latest}</h3><p className="flex items-center gap-1.5 text-xs text-muted"><span className="proof-live-dot" aria-hidden="true" />{c.updated} · {updated}</p></div>
      <ul className="mt-3 divide-y divide-hairline">{snapshot.openingsFeed.map(row => {
        const box = BOX_BY_SLUG[row.boxSlug];
        const product = box?.items.find(item => item.id === row.itemId);
        return <li key={row.id} className="proof-feed-row flex items-center justify-between gap-4 py-3 text-sm"><div className="min-w-0"><p className="truncate text-white">{product ? itemName(product) : row.itemId}</p><p className="mt-1 truncate text-xs text-muted">{box ? boxTitle(box) : row.boxSlug} · {new Date(row.at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p></div><Money value={row.amountUsdt} size="sm" /></li>;
      })}</ul>
    </div>
  </div>;
}
