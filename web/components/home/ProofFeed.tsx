"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Gem, ShieldCheck, Sparkles } from "lucide-react";
import { BOXES, BOX_BY_SLUG } from "@/lib/products";
import { hashServerSeed } from "@/lib/fairness";
import { isLive } from "@/lib/runtime";
import { api } from "@/lib/api";
import type { LiveDrop } from "@/lib/liveDrops";
import { useProductText } from "@/lib/useProductText";
import { useInventoryStore, type OwnedItem } from "@/stores/inventoryStore";
import { useWalletStore, type Transaction } from "@/stores/walletStore";
import { Money } from "@/components/ui/Money";

export function proofMetrics(items: readonly OwnedItem[], transactions: readonly Transaction[]) {
  return {
    publishedOdds: BOXES.reduce((total, box) => total + box.items.length, 0),
    openings: items.length,
    paybackUsdt: transactions.filter(tx => tx.type === "sellback").reduce((total, tx) => total + Math.max(0, tx.amountUsdt), 0),
  };
}

const copy = {
  ko: { odds: "공개된 당첨 확률", openings: "확인된 개봉 기록", payback: "즉시 페이백 내역", latest: "최근 개봉", empty: "아직 개봉 기록이 없습니다.", verified: "검증 완료", total: "건", rows: "개 항목" },
  en: { odds: "Published odds", openings: "Verified openings", payback: "Instant payback", latest: "Recent openings", empty: "No opening records yet.", verified: "verified", total: "openings", rows: "items" },
  zh: { odds: "公开中奖概率", openings: "已验证开箱", payback: "即时回购", latest: "最近开箱", empty: "暂无开箱记录。", verified: "已验证", total: "次", rows: "项" },
} as const;

/** Home trust section: catalogue facts and recorded events only. */
export function ProofFeed({ limit = 4 }: { limit?: number }) {
  const locale = useLocale();
  const c = copy[locale as keyof typeof copy] ?? copy.ko;
  const { boxTitle, itemName } = useProductText();
  const items = useInventoryStore(s => s.items);
  const transactions = useWalletStore(s => s.transactions);
  const [remote, setRemote] = useState<LiveDrop[] | null>(null);
  const [verified, setVerified] = useState(0);
  const metrics = useMemo(() => proofMetrics(items, transactions), [items, transactions]);

  useEffect(() => {
    let active = true;
    Promise.all(items.map(async item => {
      try { return (await hashServerSeed(item.fair.serverSeed)) === item.fair.serverSeedHash; }
      catch { return false; }
    }))
      .then(results => { if (active) setVerified(results.filter(Boolean).length); });
    return () => { active = false; };
  }, [items]);
  useEffect(() => {
    if (!isLive()) return;
    let active = true;
    const pull = () => api.liveFeed().then(data => { if (active) setRemote(data); }).catch(() => {});
    pull();
    const interval = setInterval(pull, 30_000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  const local = items.map(item => ({ id: item.id, boxSlug: item.boxSlug, itemId: item.itemId, at: item.acquiredAt, amountUsdt: item.valueUsdt }));
  const openings = (remote ? remote.filter(row => row.kind === "win" && row.boxSlug && row.itemId).map(row => ({
    id: row.id, boxSlug: row.boxSlug!, itemId: row.itemId!, at: row.at, amountUsdt: row.amountUsdt,
  })) : local).sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);

  return <div className="grid gap-4">
    <ul className="grid gap-3 sm:grid-cols-3">
      <li className="rounded-xl border border-hairline bg-surface p-5"><Gem className="h-5 w-5 text-gold-champagne" /><p className="mt-3 text-xs text-muted">{c.odds}</p><p className="mt-1 text-2xl font-semibold text-white">{metrics.publishedOdds.toLocaleString()} <span className="text-sm text-muted">{c.rows}</span></p></li>
      <li className="rounded-xl border border-hairline bg-surface p-5"><ShieldCheck className="h-5 w-5 text-gold-champagne" /><p className="mt-3 text-xs text-muted">{c.openings}</p><p className="mt-1 text-2xl font-semibold text-white">{verified.toLocaleString()} <span className="text-sm text-muted">/ {metrics.openings} {c.total}</span></p></li>
      <li className="rounded-xl border border-hairline bg-surface p-5"><Sparkles className="h-5 w-5 text-gold-champagne" /><p className="mt-3 text-xs text-muted">{c.payback}</p><div className="mt-1"><Money value={metrics.paybackUsdt} size="lg" /></div></li>
    </ul>
    <div className="rounded-xl border border-hairline bg-surface p-5"><h3 className="text-sm font-semibold text-white">{c.latest}</h3>
      {openings.length ? <ul className="mt-3 divide-y divide-hairline">{openings.map(row => {
        const box = BOX_BY_SLUG[row.boxSlug];
        const product = box?.items.find(item => item.id === row.itemId);
        return <li key={row.id} className="flex items-center justify-between gap-4 py-3 text-sm"><div className="min-w-0"><p className="truncate text-white">{product ? itemName(product) : row.itemId}</p><p className="mt-1 truncate text-xs text-muted">{box ? boxTitle(box) : row.boxSlug} · {new Date(row.at).toLocaleDateString(locale)}</p></div><Money value={row.amountUsdt ?? product?.value ?? 0} size="sm" /></li>;
      })}</ul> : <p className="mt-4 text-sm text-muted">{c.empty}</p>}
    </div>
  </div>;
}
