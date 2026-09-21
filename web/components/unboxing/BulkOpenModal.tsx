"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, animate, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { X, Zap, Package } from "lucide-react";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { useProductText } from "@/lib/useProductText";
import { dropTable, sellValueOf, REFUND_RATE, type ProductBox, type ProductItem } from "@/lib/products";
import { glow, tierOf, type Tier } from "@/lib/tiers";
import { calculateRollResult, determineItem } from "@/lib/fairness";
import { JACKPOT_TIERS } from "@/lib/autoplay";
import { useFairStore } from "@/stores/fairStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useWalletStore } from "@/stores/walletStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { playWin, playTaDum } from "@/lib/audio";
import { ProductArt } from "@/components/box/ProductArt";
import { Money } from "@/components/ui/Money";
import { MegaWinFX } from "@/components/unboxing/MegaWinFX";

export interface BulkResult {
  ownedId: string;
  item: ProductItem;
  tier: Tier;
  settled: boolean;
}

interface Props {
  box: ProductBox | null;
  count: number;
  onClose: () => void;
  /** 미정산(실물·디지털) 당첨의 일괄 회수 — 호출측이 잔액에 반영한다 */
  onSellBack: (ids: string[], amountUsdt: number) => void;
}

/** 스펙: 대량 개봉은 릴 없이 1.5초 고속 개봉 */
export const BULK_OPEN_MS = 1500;

/** 카운트업 숫자 — 0 → value */
function CountUp({ value, className, style }: { value: number; className?: string; style?: React.CSSProperties }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const c = animate(0, value, { duration: 1.2, ease: [0.16, 1, 0.3, 1], onUpdate: (x) => setV(x) });
    return () => c.stop();
  }, [value]);
  return (
    <span className={className} style={style}>
      <Money value={+v.toFixed(2)} size="md" numberClassName="text-inherit" />
    </span>
  );
}

/**
 * 50 / 100개 대량 개봉 — 결과는 스핀마다 Provably Fair(서버 시드 · 클라이언트 시드 · nonce)로 확정한다.
 * 릴은 생략하고 1.5초 고속 개봉 연출 뒤 요약 그리드: 상단 [총 투입 vs 총 획득 가치 · 순손익] 카운트업,
 * 최고 등급 카드는 골드 스파크 + 3D 플로팅 하이라이트. 캐시백은 확정 즉시 100% 잔액에 적립된다.
 */
export function BulkOpenModal({ box, count, onClose, onSellBack }: Props) {
  const t = useTranslations("bulk");
  const tr = useTranslations();
  const { fmt } = useCurrency();
  const { boxTitle, itemName } = useProductText();
  const addOwned = useInventoryStore((s) => s.add);
  const sellOwned = useInventoryStore((s) => s.sell);
  const credit = useWalletStore((s) => s.credit);
  const addTransaction = useWalletStore((s) => s.addTransaction);
  const [phase, setPhase] = useState<"opening" | "done">("opening");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [sold, setSold] = useState(false);
  const [mega, setMega] = useState<string | null>(null);
  const ran = useRef(false);

  const items = useMemo(() => (box ? dropTable(box) : []), [box]);

  useEffect(() => {
    if (!box || ran.current) return;
    ran.current = true;
    let alive = true;
    (async () => {
      if (!useSettingsStore.getState().muted) playTaDum();
      const fair = useFairStore.getState();
      const t0 = performance.now();
      // nonce 는 순서대로 소비하고, HMAC 은 병렬로 계산한다 — 결과는 각 (seed, nonce) 에만 의존하므로 순서와 무관
      const nonces = Array.from({ length: count }, () => fair.takeNonce());
      const { serverSeed, serverSeedHash, clientSeed } = useFairStore.getState();
      const rolls = await Promise.all(nonces.map((nonce) => calculateRollResult(serverSeed, clientSeed, nonce)));
      const picked = rolls.map((r, i) => {
        const item = determineItem(r.roll, items);
        return { item, tier: tierOf(item.value, box.price), nonce: nonces[i], roll: r.roll };
      });
      // 보관함에 한 번에 넣고(persist 1회), 캐시백은 한 번에 정산한다
      const owned = addOwned(picked.map((p) => ({ itemId: p.item.id, boxSlug: box.slug, valueUsdt: p.item.value, tier: p.tier.key, fair: { serverSeedHash, serverSeed, clientSeed, nonce: p.nonce, roll: p.roll } })));
      const out: BulkResult[] = picked.map((p, i) => ({ ownedId: owned[i].id, item: p.item, tier: p.tier, settled: p.item.kind === "cash" }));
      const cashIds = out.filter((r) => r.settled).map((r) => r.ownedId);
      if (cashIds.length > 0) {
        const { totalUsdt } = sellOwned(cashIds, 1);
        credit(totalUsdt);
        addTransaction({ type: "sellback", amountUsdt: totalUsdt, ref: `${box.slug}:cashback x${cashIds.length}` });
      }
      // 1.5초 고속 개봉 연출 — 결과는 이미 확정돼 있고 카운터만 흘러간다
      const elapsed = performance.now() - t0;
      const remain = Math.max(0, BULK_OPEN_MS - elapsed);
      const start = performance.now();
      await new Promise<void>((resolve) => {
        const tick = () => {
          if (!alive) return resolve();
          const p = Math.min(1, (performance.now() - start) / Math.max(1, remain));
          setProgress(p);
          if (p >= 1) resolve();
          else requestAnimationFrame(tick);
        };
        tick();
      });
      if (!alive) return;
      const sorted = [...out].sort((a, b) => b.item.value - a.item.value);
      setResults(sorted);
      setPhase("done");
      const best = sorted[0];
      if (best && JACKPOT_TIERS.includes(best.tier.key)) {
        setMega(best.tier.accent);
        setTimeout(() => setMega(null), 3200);
        if (!useSettingsStore.getState().muted) playWin("jackpot");
      } else if (!useSettingsStore.getState().muted) playWin("value");
    })();
    return () => {
      alive = false;
    };
  }, [box, count, items, addOwned, sellOwned, credit, addTransaction]);

  // 닫히면 리셋 — 컴포넌트는 항상 마운트돼 있으므로 다음 대량 개봉이 다시 돌 수 있어야 한다
  useEffect(() => {
    if (box) return;
    ran.current = false;
    setPhase("opening");
    setProgress(0);
    setResults([]);
    setSold(false);
    setMega(null);
  }, [box]);

  useEffect(() => {
    if (!box) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && phase === "done" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [box, phase, onClose]);

  if (!box) return null;

  const spent = +(box.price * count).toFixed(2);
  const won = +results.reduce((s, r) => s + r.item.value, 0).toFixed(2);
  const net = +(won - spent).toFixed(2);
  const pending = results.filter((r) => !r.settled);
  const sellAmount = +pending.reduce((s, r) => s + sellValueOf(r.item), 0).toFixed(2);
  const cashCredited = +results.filter((r) => r.settled).reduce((s, r) => s + r.item.value, 0).toFixed(2);
  const bestValue = results[0]?.item.value ?? 0;

  return (
    <AnimatePresence>
      <motion.div key="bulk" className="fixed inset-0 z-[100] flex flex-col bg-obsidian/95 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <AnimatePresence>{mega && <MegaWinFX key="mega" accent={mega} />}</AnimatePresence>

        {/* 헤더 */}
        <div className="flex items-center gap-3 border-b border-hairline px-[4%] py-3">
          <div className="min-w-0">
            <div className="caption-luxury">{t("eyebrow", { n: count })}</div>
            <h2 className="truncate font-display text-lg font-bold uppercase tracking-tight text-white sm:text-xl">{boxTitle(box)}</h2>
          </div>
          <button type="button" disabled={phase !== "done"} onClick={onClose} aria-label={tr("unbox.close")} className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-elevation hover:text-white disabled:opacity-40">
            <X className="h-5 w-5" strokeWidth={2.2} />
          </button>
        </div>

        {phase === "opening" ? (
          <div className="flex flex-1 flex-col items-center justify-center px-[6%]">
            <motion.div className="text-gold-gradient font-display text-5xl font-bold tabular-nums sm:text-7xl" initial={{ scale: 0.9 }} animate={{ scale: [0.9, 1.04, 1] }} transition={{ duration: 0.6 }}>
              {Math.round(progress * count)}
              <span className="text-2xl text-muted sm:text-3xl"> / {count}</span>
            </motion.div>
            <div className="mt-3 text-sm font-semibold text-secondary">{t("opening")}</div>
            <div className="mt-5 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-gold-metallic via-gold-champagne to-white shadow-[0_0_14px_rgba(230,202,101,0.8)] transition-[width] duration-75" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            {/* 손익 요약 — 카운트업 */}
            <div className="border-b border-hairline px-[4%] py-4">
              <div className="mx-auto grid max-w-3xl grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-white/10 bg-obsidian px-2 py-3">
                  <div className="caption-luxury">{t("spent")}</div>
                  <CountUp value={spent} className="mt-1 block font-display text-lg font-bold text-white sm:text-2xl" />
                </div>
                <div className="rounded-lg border border-gold-champagne/40 bg-gold-champagne/[0.06] px-2 py-3">
                  <div className="caption-luxury !text-gold-champagne">{t("won")}</div>
                  <CountUp value={won} className="mt-1 block font-display text-lg font-bold text-gold-champagne sm:text-2xl" />
                </div>
                <div className={cn("rounded-lg border px-2 py-3", net >= 0 ? "border-tier-prestige/40 bg-tier-prestige/10" : "border-crimson/40 bg-crimson/10")}>
                  <div className="caption-luxury">{t("net")}</div>
                  <div className={cn("mt-1 font-display text-lg font-bold sm:text-2xl", net >= 0 ? "text-tier-prestige" : "text-crimson")}>
                    {net >= 0 ? "+" : "−"}
                    <CountUp value={Math.abs(net)} className="inline" />
                  </div>
                </div>
              </div>
              {cashCredited > 0 && <p className="mt-2 break-keep text-center text-[11px] font-semibold text-gold-champagne">⚡ {tr("unbox.cashCredited", { amount: fmt(cashCredited) })}</p>}
            </div>

            {/* 결과 그리드 */}
            <ul className="grid min-h-0 flex-1 auto-rows-min grid-cols-3 gap-2 overflow-y-auto px-[4%] py-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
              {results.map((r, i) => {
                const top = JACKPOT_TIERS.includes(r.tier.key) && r.item.value === bestValue;
                return (
                  <motion.li
                    key={r.ownedId}
                    className={cn("relative overflow-hidden rounded-lg bg-surface", top ? "bulk-top col-span-2 row-span-2" : "border-metallic-subtle")}
                    style={top ? { boxShadow: `0 0 0 1px ${r.tier.accent}, 0 0 28px ${glow(r.tier.accent, 0.55)}` } : undefined}
                    initial={{ opacity: 0, scale: 0.85, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 24) * 0.03, duration: 0.3 }}
                  >
                    <div className={cn("relative w-full", top ? "h-40 sm:h-52" : "h-20 sm:h-24")}>
                      <ProductArt image={r.item.image} alt={itemName(r.item)} accent={r.tier.accent} kind={r.item.kind} glowStrength={top ? 0.45 : 0.2} fallbackSize={top ? "md" : "sm"} />
                      {top && <span aria-hidden className="bulk-spark pointer-events-none absolute inset-0" />}
                    </div>
                    <div className="p-1.5">
                      <div className={cn("truncate font-semibold text-white", top ? "text-sm" : "text-[10px]")}>{itemName(r.item)}</div>
                      <div className={cn("font-mono font-bold tabular-nums", top ? "text-base" : "text-[10px]")} style={{ color: r.tier.accent }}>
                        {fmt(r.item.value)}
                      </div>
                    </div>
                    <span className="absolute left-1 top-1 rounded-sm px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider" style={{ color: r.tier.accent, background: "rgba(11,11,11,0.8)" }}>
                      {r.tier.gameLabel}
                    </span>
                  </motion.li>
                );
              })}
            </ul>

            {/* 액션 */}
            <div className="border-t border-hairline px-[4%] py-3">
              <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={sold || pending.length === 0}
                  onClick={() => {
                    setSold(true);
                    const ids = pending.map((r) => r.ownedId);
                    const { totalUsdt } = sellOwned(ids, REFUND_RATE);
                    onSellBack(ids, totalUsdt || sellAmount);
                  }}
                  className="flex h-12 flex-col items-center justify-center rounded-lg bg-gold-champagne text-obsidian transition-colors hover:bg-gold-metallic disabled:opacity-40"
                >
                  <span className="flex items-center gap-1.5 text-sm font-bold leading-none">
                    <Zap className="h-4 w-4" strokeWidth={2.4} />
                    {t("sellAll", { n: pending.length })}
                  </span>
                  <span className="mt-1 font-mono text-[11px] font-bold leading-none tabular-nums">{fmt(sellAmount)}</span>
                </button>
                <button type="button" onClick={onClose} className="glass flex h-12 items-center justify-center gap-2 rounded-lg text-sm font-bold text-white hover:bg-white/15">
                  <Package className="h-4 w-4" strokeWidth={2} />
                  {t("keep")}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default BulkOpenModal;
