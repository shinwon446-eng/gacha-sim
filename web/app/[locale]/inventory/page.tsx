"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Wallet, Truck, ShieldCheck, Package, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/format";
import { Link } from "@/i18n/navigation";
import { useCurrency } from "@/lib/useCurrency";
import { useProductText } from "@/lib/useProductText";
import { BOX_BY_SLUG, REFUND_RATE, type ProductItem } from "@/lib/products";
import { TIERS, TIER_BY_KEY, glow, type TierKey } from "@/lib/tiers";
import type { ShippingAddress } from "@/lib/shipping";
import { useInventoryStore, summarize, type OwnedItem, type OwnedStatus } from "@/stores/inventoryStore";
import { useWalletStore } from "@/stores/walletStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { playChime } from "@/lib/audio";
import { ProductArt } from "@/components/box/ProductArt";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { CurrencySelector } from "@/components/layout/CurrencySelector";
import { SellConfirmModal } from "@/components/inventory/SellConfirmModal";
import { ShippingModal } from "@/components/inventory/ShippingModal";
import { FairnessModal } from "@/components/fairness/FairnessModal";

const STATUSES: OwnedStatus[] = ["IN_STORAGE", "SHIPPING_REQUESTED", "SHIPPING", "SOLD"];

function itemOf(o: OwnedItem): ProductItem | undefined {
  return BOX_BY_SLUG[o.boxSlug]?.items.find((i) => i.id === o.itemId);
}

/**
 * 보관함 — 넷플릭스 'My List' 그리드 (PROMPTS 5-1/5-2).
 * 상단 요약 → 상태·등급 필터 → 카드 그리드(썸네일·이름·가치·상태 뱃지·액션). 다중 선택 일괄 판매.
 */
export default function InventoryPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { fmt } = useCurrency();
  const { boxTitle, itemName } = useProductText();
  const items = useInventoryStore((s) => s.items);
  const sell = useInventoryStore((s) => s.sell);
  const requestShipping = useInventoryStore((s) => s.requestShipping);
  const balance = useWalletStore((s) => s.balance);
  const credit = useWalletStore((s) => s.credit);
  const debit = useWalletStore((s) => s.debit);
  const addTransaction = useWalletStore((s) => s.addTransaction);

  const [status, setStatus] = useState<OwnedStatus | "all">("all");
  const [tier, setTier] = useState<TierKey | "all">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sellTarget, setSellTarget] = useState<string[] | null>(null);
  const [shipTarget, setShipTarget] = useState<string[] | null>(null);
  const [verify, setVerify] = useState<OwnedItem | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string; tone: string } | null>(null);

  const summary = useMemo(() => summarize(items), [items]);
  const visible = useMemo(() => items.filter((o) => (status === "all" || o.status === status) && (tier === "all" || o.tier === tier)), [items, status, tier]);
  const selectable = visible.filter((o) => o.status === "IN_STORAGE");
  const selectedItems = items.filter((o) => selected.has(o.id) && o.status === "IN_STORAGE");
  const selectedValue = +selectedItems.reduce((s, o) => s + o.valueUsdt * REFUND_RATE, 0).toFixed(2);

  const say = useCallback((text: string, tone: string) => {
    const id = Date.now();
    setToast({ id, text, tone });
    setTimeout(() => setToast((x) => (x?.id === id ? null : x)), 4500);
  }, []);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const confirmSell = () => {
    if (!sellTarget) return;
    const { ids, totalUsdt } = sell(sellTarget, REFUND_RATE);
    if (ids.length) {
      credit(totalUsdt);
      addTransaction({ type: "sellback", amountUsdt: totalUsdt, ref: ids.join(",") });
      if (!useSettingsStore.getState().muted) playChime();
      say(t("inventory.soldToast", { amount: fmt(totalUsdt) }), "#E6CA65");
    }
    setSellTarget(null);
    setSelected(new Set());
  };

  const submitShip = (address: ShippingAddress, fee: number) => {
    if (!shipTarget) return;
    if (!debit(fee)) return;
    requestShipping(shipTarget, address, fee);
    if (fee > 0) addTransaction({ type: "open", amountUsdt: -fee, ref: `shipping:${address.country}` });
    say(t("inventory.shipRequestedToast"), "#93C5FD");
    setShipTarget(null);
    setSelected(new Set());
  };

  const sellAmountFor = (ids: string[]) => +items.filter((o) => ids.includes(o.id)).reduce((s, o) => s + o.valueUsdt * REFUND_RATE, 0).toFixed(2);

  return (
    <main className="min-h-screen bg-canvas pb-28">
      <header className="sticky top-0 z-40 flex items-center gap-5 border-b border-hairline bg-obsidian/90 px-[4%] py-4 backdrop-blur-md">
        <Link href="/" className="font-display text-xl font-bold uppercase leading-none tracking-tight text-crimson">
          Gachaflix
        </Link>
        <nav className="flex items-center gap-4 text-xs text-muted">
          <Link href="/" className="hover:text-white">
            {t("nav.boxes")}
          </Link>
          <span className="font-semibold text-white">{t("nav.inventory")}</span>
          <Link href="/fairness" className="hover:text-white">
            {t("nav.fairness")}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="glass-dark hidden h-9 items-center gap-2 rounded-md px-3 sm:flex">
            <Wallet className="h-3.5 w-3.5 text-muted" strokeWidth={2} />
            <span className="font-display text-sm font-bold tabular-nums text-white">{fmt(balance)}</span>
          </div>
          <LanguageSelector />
          <CurrencySelector />
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-[4%] pt-10">
        {/* 요약 배너 */}
        <div className="border-metallic-gold relative overflow-hidden rounded-xl bg-surface p-5 md:p-7">
          <span aria-hidden className="pedestal-glow pointer-events-none absolute inset-0" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="caption-luxury">{t("inventory.eyebrow")}</div>
              <h1 className="mt-1 font-display text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">{t("inventory.title")}</h1>
              <p className="mt-2 text-sm text-secondary">{t("inventory.summary", { n: summary.total, value: fmt(summary.storedValueUsdt) })}</p>
            </div>
            <div className="text-gold-gradient font-display text-4xl font-bold tabular-nums md:text-5xl">{fmt(summary.storedValueUsdt)}</div>
          </div>
          <ul className="relative mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
            <li>{t("inventory.storedCount", { n: summary.stored })}</li>
            <li>{t("inventory.shippingCount", { n: summary.shipping })}</li>
            <li>{t("inventory.soldCount", { n: summary.sold })}</li>
          </ul>
        </div>

        {/* 필터 */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-hairline pb-3">
          <span className="caption-luxury mr-1">{t("inventory.filterStatus")}</span>
          {(["all", ...STATUSES] as const).map((s) => (
            <button key={s} type="button" onClick={() => setStatus(s)} className={cn("rounded-sm px-2.5 py-1 text-xs font-semibold transition-colors", status === s ? "bg-white text-obsidian" : "border-metallic-subtle text-muted hover:text-white")}>
              {s === "all" ? t("inventory.all") : t(`inventory.status.${s}`)}
            </button>
          ))}
          <span className="caption-luxury ml-4 mr-1">{t("inventory.filterTier")}</span>
          {(["all", ...TIERS.map((x) => x.key)] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTier(k)}
              className={cn("rounded-sm px-2.5 py-1 text-xs font-semibold transition-colors", tier === k ? "bg-white text-obsidian" : "border-metallic-subtle text-muted hover:text-white")}
              style={tier !== k && k !== "all" ? { color: TIER_BY_KEY[k].accent } : undefined}
            >
              {k === "all" ? t("inventory.all") : TIER_BY_KEY[k].label}
            </button>
          ))}
          {selectable.length > 0 && (
            <div className="ml-auto flex items-center gap-2 text-xs">
              <button type="button" onClick={() => setSelected(new Set(selectable.map((o) => o.id)))} className="text-muted hover:text-white">
                {t("inventory.selectAll")}
              </button>
              {selected.size > 0 && (
                <button type="button" onClick={() => setSelected(new Set())} className="text-muted hover:text-white">
                  {t("inventory.clearSelection")}
                </button>
              )}
            </div>
          )}
        </div>

        {/* 그리드 */}
        {visible.length === 0 ? (
          <div className="border-metallic-subtle mt-8 flex flex-col items-center rounded-xl bg-surface px-6 py-16 text-center">
            <Package className="h-8 w-8 text-faint" strokeWidth={1.5} />
            <p className="mt-3 text-sm text-muted">{t("inventory.empty")}</p>
            <Link href="/" className="mt-5 rounded-md bg-crimson px-5 py-2.5 text-sm font-bold text-white hover:bg-red-600">
              {t("inventory.goBoxes")}
            </Link>
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((o) => {
              const item = itemOf(o);
              const box = BOX_BY_SLUG[o.boxSlug];
              const tierMeta = TIER_BY_KEY[o.tier];
              const stored = o.status === "IN_STORAGE";
              const isSel = selected.has(o.id);
              return (
                <li key={o.id} className={cn("relative overflow-hidden rounded-xl bg-surface transition-shadow", o.tier === "royal" ? "border-metallic-gold" : "border-metallic-subtle", isSel && "ring-1 ring-gold-champagne")} style={isSel ? { boxShadow: `0 0 24px ${glow(tierMeta.accent, 0.25)}` } : undefined}>
                  <div className="relative h-40 w-full overflow-hidden bg-obsidian">
                    {item ? <ProductArt image={item.image} alt={itemName(item)} accent={tierMeta.accent} glowStrength={0.22} fallbackSize="md" /> : <ProductArt image={{ src: null }} alt="" accent={tierMeta.accent} />}
                    <span className="absolute left-2 top-2 z-10 rounded-sm px-1.5 py-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: tierMeta.accent, backgroundColor: glow(tierMeta.accent, 0.12), border: `1px solid ${glow(tierMeta.accent, 0.45)}` }}>
                      {tierMeta.label}
                    </span>
                    <span className={cn("absolute right-2 top-2 z-10 rounded-sm px-1.5 py-1 text-[10px] font-semibold", stored ? "bg-obsidian/80 text-secondary" : o.status === "SOLD" ? "bg-obsidian/80 text-faint" : "bg-gold-champagne/15 text-gold-champagne")}>
                      {t(`inventory.status.${o.status}`)}
                    </span>
                    {stored && (
                      <button type="button" onClick={() => toggle(o.id)} aria-label={t("inventory.select")} className="absolute bottom-2 left-2 z-10 rounded-sm bg-obsidian/80 p-1 text-secondary hover:text-white">
                        {isSel ? <CheckSquare className="h-4 w-4 text-gold-champagne" strokeWidth={2.2} /> : <Square className="h-4 w-4" strokeWidth={2} />}
                      </button>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="truncate text-sm font-bold text-white">{item ? itemName(item) : o.itemId}</div>
                    <div className="truncate text-[10px] text-faint">{box ? boxTitle(box) : o.boxSlug}</div>
                    <div className="mt-1.5 flex items-baseline justify-between">
                      <span className="font-display text-lg font-bold tabular-nums" style={{ color: tierMeta.accent }}>
                        {fmt(o.valueUsdt)}
                      </span>
                      <span className="text-[10px] text-faint">{new Date(o.acquiredAt).toLocaleDateString(locale)}</span>
                    </div>
                    {o.status === "SOLD" && o.soldForUsdt !== undefined && <div className="mt-1 text-[11px] text-muted">{t("inventory.soldFor", { amount: fmt(o.soldForUsdt) })}</div>}
                    {(o.status === "SHIPPING_REQUESTED" || o.status === "SHIPPING") && (
                      <div className="mt-1 text-[11px] text-muted">
                        {t("inventory.tracking")}: <span className="font-mono text-secondary">{o.shipping?.trackingNumber ?? t("inventory.trackingPending")}</span>
                      </div>
                    )}
                    <div className="mt-3 grid grid-cols-[1fr_auto] gap-1.5">
                      <button type="button" disabled={!stored} onClick={() => setSellTarget([o.id])} className="flex h-8 items-center justify-center gap-1 rounded-sm bg-gold-champagne text-[11px] font-bold text-obsidian hover:bg-gold-metallic disabled:opacity-30">
                        <Wallet className="h-3 w-3" strokeWidth={2.4} />
                        {t("inventory.sell")}
                      </button>
                      <button type="button" onClick={() => setVerify(o)} aria-label={t("inventory.verify")} className="glass-dark row-span-2 flex h-full w-8 items-center justify-center rounded-sm text-gold-champagne hover:border-gold-champagne">
                        <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
                      </button>
                      <button type="button" disabled={!stored} onClick={() => setShipTarget([o.id])} className="glass flex h-8 items-center justify-center gap-1 rounded-sm text-[11px] font-semibold text-white hover:bg-white/15 disabled:opacity-30">
                        <Truck className="h-3 w-3" strokeWidth={2.2} />
                        {t("inventory.ship")}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 일괄 판매 바 */}
      <AnimatePresence>
        {selectedItems.length > 0 && (
          <motion.div className="fixed inset-x-0 bottom-0 z-40 px-[4%] pb-4" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ duration: 0.25 }}>
            <div className="border-metallic-gold mx-auto flex max-w-3xl items-center gap-3 rounded-xl bg-obsidian/95 p-3 backdrop-blur-md">
              <span className="text-sm text-secondary">{t("inventory.selected", { n: selectedItems.length })}</span>
              <button type="button" onClick={() => setShipTarget(selectedItems.map((o) => o.id))} className="glass ml-auto h-10 rounded-md px-4 text-sm font-semibold text-white hover:bg-white/15">
                {t("inventory.ship")}
              </button>
              <button type="button" onClick={() => setSellTarget(selectedItems.map((o) => o.id))} className="h-10 rounded-md bg-gold-champagne px-4 text-sm font-bold text-obsidian hover:bg-gold-metallic">
                {t("inventory.sellSelected", { amount: fmt(selectedValue) })}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SellConfirmModal open={!!sellTarget} count={sellTarget?.length ?? 0} amountUsdt={sellTarget ? sellAmountFor(sellTarget) : 0} refundRate={REFUND_RATE} onClose={() => setSellTarget(null)} onConfirm={confirmSell} />
      <ShippingModal open={!!shipTarget} itemCount={shipTarget?.length ?? 0} balanceUsdt={balance} onClose={() => setShipTarget(null)} onSubmit={submitShip} />
      <FairnessModal open={!!verify} onClose={() => setVerify(null)} box={verify ? BOX_BY_SLUG[verify.boxSlug] : undefined} initial={verify ? { serverSeed: verify.fair.serverSeed, serverSeedHash: verify.fair.serverSeedHash, clientSeed: verify.fair.clientSeed, nonce: verify.fair.nonce } : undefined} />

      <AnimatePresence>
        {toast && (
          <motion.div key={toast.id} className="border-metallic-subtle fixed bottom-24 right-4 z-50 rounded-lg bg-obsidian p-3 text-xs font-bold" style={{ color: toast.tone, boxShadow: `0 0 20px ${glow(toast.tone, 0.2)}` }} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}>
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
