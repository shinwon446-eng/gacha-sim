"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Package, Gem, ShieldCheck, Percent } from "lucide-react";
import { cn } from "@/lib/format";
import { BOXES, REFUND_RATE } from "@/lib/products";
import { hashServerSeed } from "@/lib/fairness";
import { isLive } from "@/lib/runtime";
import { api } from "@/lib/api";
import { useInventoryStore } from "@/stores/inventoryStore";
import { Money } from "@/components/ui/Money";

/**
 * 실시간 신뢰 지표 (CLAUDE.md §4-5).
 *   live   : API 집계 — 오늘 출고 건수 · 오늘 즉시 환전 합계 · 검증 완료율
 *   preview: 지어낸 집계 대신 이 플랫폼의 사실 — 공개 확률 항목 수 · 즉시 환전율 95% · 내 개봉 기록의 검증 완료율(실제로 재검증)
 */
export function LiveCounters({ className }: { className?: string }) {
  const t = useTranslations("counters");
  const items = useInventoryStore((s) => s.items);
  const [remote, setRemote] = useState<{ shipmentsToday: number; cashoutsTodayUsdt: number; verificationRate: number } | null>(null);
  const [verified, setVerified] = useState<{ ok: number; total: number } | null>(null);

  useEffect(() => {
    if (!isLive()) return;
    let alive = true;
    const pull = () => api.statsToday().then((d) => alive && setRemote(d)).catch(() => {});
    pull();
    const id = setInterval(pull, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // 내 기록을 실제로 재검증 — 서버 시드 해시가 개봉 전 공개 해시와 같은지
  useEffect(() => {
    let alive = true;
    (async () => {
      let ok = 0;
      for (const o of items) {
        if ((await hashServerSeed(o.fair.serverSeed)) === o.fair.serverSeedHash) ok++;
      }
      if (alive) setVerified({ ok, total: items.length });
    })();
    return () => {
      alive = false;
    };
  }, [items]);

  const publishedOdds = useMemo(() => BOXES.reduce((s, b) => s + b.items.length, 0), []);
  const rate = remote ? remote.verificationRate : verified && verified.total > 0 ? (verified.ok / verified.total) * 100 : 100;

  const tiles = remote
    ? [
        { key: "shipments", Icon: Package, node: <Counter value={remote.shipmentsToday} unit={t("shipmentsUnit")} /> },
        { key: "cashouts", Icon: Gem, node: <Money value={remote.cashoutsTodayUsdt} size="lg" numberClassName="text-gold-gradient" /> },
        { key: "verification", Icon: ShieldCheck, node: <Counter value={rate} unit="%" decimals={2} /> },
      ]
    : [
        { key: "odds", Icon: Package, node: <Counter value={publishedOdds} unit={t("oddsUnit")} /> },
        { key: "sellback", Icon: Percent, node: <Counter value={REFUND_RATE * 100} unit="%" /> },
        { key: "verification", Icon: ShieldCheck, node: <Counter value={rate} unit="%" decimals={2} sub={verified && verified.total > 0 ? t("verifiedOf", { n: verified.total }) : undefined} /> },
      ];

  return (
    <section className={cn("px-[4%]", className)} aria-label={t("label")}>
      <div className="border-metallic-gold relative overflow-hidden rounded-xl bg-obsidian">
        <span aria-hidden className="pedestal-glow pointer-events-none absolute inset-0" />
        <ul className="relative grid divide-y divide-hairline md:grid-cols-3 md:divide-x md:divide-y-0">
          {tiles.map(({ key, Icon, node }) => (
            <li key={key} className="flex items-center gap-3 px-4 py-3.5 md:px-6 md:py-4">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-gold-champagne/10 text-gold-champagne">
                <Icon className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <div className="caption-luxury">{t(key)}</div>
                <div className="mt-0.5">{node}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Counter({ value, unit, decimals = 0, sub }: { value: number; unit: string; decimals?: number; sub?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="font-display text-2xl font-bold leading-none tabular-nums tracking-tight text-white md:text-3xl">{value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: decimals })}</span>
      <span className="text-xs font-semibold leading-none text-neutral-400 md:text-sm">{unit}</span>
      {sub && <span className="text-[10px] text-faint">{sub}</span>}
    </span>
  );
}

export default LiveCounters;
