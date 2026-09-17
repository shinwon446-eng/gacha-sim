"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Package, Gem, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/format";
import { Money } from "@/components/ui/Money";

/**
 * 실시간 신뢰 지표 카운터 (CLAUDE.md §3-B-2).
 * 정적 데모에는 집계 백엔드가 없다 — 규범의 기준값에서 시작해 완만히 롤링하는 모의 지표이며, 화면에 "데모 지표"를 명시한다.
 */
const BASE = { shipments: 142, cashoutsUsdt: 328_450, verification: 100 };
/** 롤링 주기(ms) — 눈에 띄되 산만하지 않게 */
const TICK_MS = 4200;

function useRolling() {
  const [v, setV] = useState(BASE);
  useEffect(() => {
    const id = setInterval(() => {
      setV((s) => ({
        shipments: s.shipments + (Math.random() < 0.35 ? 1 : 0),
        cashoutsUsdt: s.cashoutsUsdt + Math.round(20 + Math.random() * 240),
        verification: 100,
      }));
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);
  return v;
}

export function LiveCounters({ className }: { className?: string }) {
  const t = useTranslations("counters");
  const v = useRolling();
  const tiles = [
    { key: "shipments", Icon: Package, node: <Counter value={v.shipments} unit={t("shipmentsUnit")} /> },
    { key: "cashouts", Icon: Gem, node: <Money value={v.cashoutsUsdt} size="lg" numberClassName="text-gold-gradient" /> },
    { key: "verification", Icon: ShieldCheck, node: <Counter value={v.verification} unit="%" decimals={2} /> },
  ] as const;

  return (
    <section className={cn("px-[4%]", className)} aria-label={t("shipments")}>
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
        <div className="relative border-t border-hairline px-4 py-1.5 text-[10px] text-faint md:px-6">{t("demoNote")}</div>
      </div>
    </section>
  );
}

function Counter({ value, unit, decimals = 0 }: { value: number; unit: string; decimals?: number }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="font-display text-2xl font-bold leading-none tabular-nums tracking-tight text-white md:text-3xl">{value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>
      <span className="text-xs font-semibold leading-none text-neutral-400 md:text-sm">{unit}</span>
    </span>
  );
}

export default LiveCounters;
