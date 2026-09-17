"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Wallet, Truck, ShieldCheck, CheckSquare, Square, ArrowUpRight, ChevronDown, Coins } from "lucide-react";
import { cn } from "@/lib/format";
import { Link } from "@/i18n/navigation";
import { useCurrency } from "@/lib/useCurrency";
import { useProductText } from "@/lib/useProductText";
import { BOX_BY_SLUG, REFUND_RATE, type ProductBox, type ProductItem } from "@/lib/products";
import { TIERS, TIER_BY_KEY, glow, type TierKey } from "@/lib/tiers";
import type { ShippingAddress } from "@/lib/shipping";
import { useInventoryStore, summarize, type OwnedItem, type OwnedStatus } from "@/stores/inventoryStore";
import { useWalletStore } from "@/stores/walletStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { playChime } from "@/lib/audio";
import { ProductArt } from "@/components/box/ProductArt";
import { DetailModal } from "@/components/box/DetailModal";
import { UnboxingRoulette, type UnboxResult } from "@/components/unboxing/UnboxingRoulette";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { CurrencySelector } from "@/components/layout/CurrencySelector";
import { Money } from "@/components/ui/Money";
import { SellConfirmModal } from "@/components/inventory/SellConfirmModal";
import { ShippingModal } from "@/components/inventory/ShippingModal";
import { TrackingModal } from "@/components/inventory/TrackingModal";
import { HotBoxes } from "@/components/inventory/HotBoxes";
import { WithdrawalModal } from "@/components/wallet/WithdrawalModal";
import { FairnessModal } from "@/components/fairness/FairnessModal";

const STATUSES: OwnedStatus[] = ["IN_STORAGE", "SHIPPING_REQUESTED", "SHIPPING", "SOLD"];
type SortKey = "newest" | "valueDesc" | "valueAsc";
const SORTS: SortKey[] = ["newest", "valueDesc", "valueAsc"];

function itemOf(o: OwnedItem): ProductItem | undefined {
  return BOX_BY_SLUG[o.boxSlug]?.items.find((i) => i.id === o.itemId);
}

const isShippingStatus = (s: OwnedStatus) => s === "SHIPPING_REQUESTED" || s === "SHIPPING";

const chipCls = "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors";

/**
 * 보관함 — 넷플릭스 'My List' 그리드 (PROMPTS 5-1/5-2).
 * 압축 배너(요약 칩 · 총 자산 · 출금 · 일괄 판매) → 전체 선택 + 상태·등급 필터 + 정렬 → 카드 그리드 → 플로팅 일괄 판매 바.
 * 금액은 전부 <Money> — 숫자 크게·단위 작게, 단일 통화. 빈 화면은 TOP 3 박스 캐러셀로 채운다.
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
  const [sort, setSort] = useState<SortKey>("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sellTarget, setSellTarget] = useState<string[] | null>(null);
  const [shipTarget, setShipTarget] = useState<string[] | null>(null);
  const [verify, setVerify] = useState<OwnedItem | null>(null);
  const [track, setTrack] = useState<OwnedItem | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [detail, setDetail] = useState<ProductBox | null>(null);
  const [unbox, setUnbox] = useState<{ box: ProductBox; count: number } | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string; tone: string } | null>(null);

  const summary = useMemo(() => summarize(items), [items]);
  const visible = useMemo(() => {
    const list = items.filter((o) => (status === "all" || o.status === status) && (tier === "all" || o.tier === tier));
    if (sort === "valueDesc") return [...list].sort((a, b) => b.valueUsdt - a.valueUsdt);
    if (sort === "valueAsc") return [...list].sort((a, b) => a.valueUsdt - b.valueUsdt);
    return [...list].sort((a, b) => b.acquiredAt.localeCompare(a.acquiredAt));
  }, [items, status, tier, sort]);
  const selectable = useMemo(() => visible.filter((o) => o.status === "IN_STORAGE"), [visible]);
  const allSelected = selectable.length > 0 && selectable.every((o) => selected.has(o.id));
  const selectedItems = items.filter((o) => selected.has(o.id) && o.status === "IN_STORAGE");
  const selectedValue = +selectedItems.reduce((s, o) => s + o.valueUsdt, 0).toFixed(2);
  const storedIds = useMemo(() => items.filter((o) => o.status === "IN_STORAGE").map((o) => o.id), [items]);
  const rateLabel = `${Math.round(REFUND_RATE * 100)}%`;

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
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectable.map((o) => o.id)));

  const sellAmountFor = (ids: string[]) => +items.filter((o) => ids.includes(o.id) && o.status === "IN_STORAGE").reduce((s, o) => s + o.valueUsdt * REFUND_RATE, 0).toFixed(2);

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

  // 빈 화면 TOP 3 → 상세/오픈. 홈과 같은 규칙: 가격 × 횟수 차감 후 룰렛.
  const openBox = useCallback(
    (box: ProductBox, count = 1) => {
      const cost = box.price * count;
      if (!debit(cost)) {
        say(t("unbox.insufficient", { price: fmt(cost) }), "#E50914");
        return;
      }
      addTransaction({ type: "open", amountUsdt: -cost, ref: `${box.slug}x${count}` });
      setDetail(null);
      setUnbox({ box, count });
    },
    [debit, addTransaction, say, t, fmt],
  );
  const onSellBack = useCallback(
    (results: UnboxResult[], amount: number) => {
      credit(amount);
      addTransaction({ type: "sellback", amountUsdt: amount, ref: results.map((r) => r.item.id).join(",") });
      say(t("unbox.sold", { amount: fmt(amount) }), "#E6CA65");
    },
    [credit, addTransaction, say, t, fmt],
  );

  return (
    <main className="min-h-screen bg-canvas pb-28">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-hairline bg-obsidian/90 px-[4%] py-3 backdrop-blur-md sm:gap-5">
        <Link href="/" className="font-display text-xl font-bold uppercase leading-none tracking-tight text-crimson">
          Gachaflix
        </Link>
        <nav className="flex flex-none items-center gap-3 whitespace-nowrap text-[11px] text-muted sm:gap-4 sm:text-xs">
          <Link href="/" className="hidden hover:text-white sm:inline">
            {t("nav.boxes")}
          </Link>
          <span className="font-semibold text-white">{t("nav.inventory")}</span>
          <Link href="/fairness" className="hover:text-white">
            {t("nav.fairness")}
          </Link>
        </nav>
        <div className="ml-auto flex flex-none items-center gap-2">
          <div className="glass-dark hidden h-9 items-center gap-2 rounded-md px-3 sm:flex">
            <Wallet className="h-3.5 w-3.5 text-muted" strokeWidth={2} />
            <Money value={balance} size="sm" />
          </div>
          <button type="button" onClick={() => setWithdrawOpen(true)} className="border-gold-gradient hidden h-9 flex-none items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-bold text-gold-champagne transition-colors hover:bg-gold-champagne/10 sm:flex">
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.4} />
            {t("header.withdraw")}
          </button>
          <LanguageSelector />
          <CurrencySelector />
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-[4%] pt-6 md:pt-8">
        {/* ── 요약 배너 (압축) ── */}
        <div className="border-metallic-gold relative overflow-hidden rounded-xl bg-surface px-4 py-4 md:px-6 md:py-5">
          <span aria-hidden className="pedestal-glow pointer-events-none absolute inset-0" />
          <div className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
            {/* 좌: 캡션 · 타이틀 · 현황 칩 */}
            <div className="min-w-0">
              <div className="caption-luxury">{t("inventory.eyebrow")}</div>
              <h1 className="mt-0.5 font-display text-xl font-bold uppercase tracking-tight text-white md:text-2xl">{t("inventory.title")}</h1>
              <ul className="mt-2.5 flex flex-wrap gap-1.5">
                {[
                  [t("inventory.storedCount", { n: summary.stored }), "text-white"],
                  [t("inventory.shippingCount", { n: summary.shipping }), "text-tier-prestige"],
                  [t("inventory.soldCount", { n: summary.sold }), "text-muted"],
                ].map(([label, tone]) => (
                  <li key={label} className={cn("border-metallic-subtle rounded-full bg-obsidian px-2.5 py-1 text-[11px] font-semibold tabular-nums", tone)}>
                    {label}
                  </li>
                ))}
              </ul>
            </div>
            {/* 우: 총 자산 · 출금 · 전체 판매 */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <div className="min-w-0 text-right">
                <div className="caption-luxury">{t("inventory.totalValue")}</div>
                <Money value={summary.storedValueUsdt} size="lg" numberClassName="text-gold-gradient" className="mt-1" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setWithdrawOpen(true)} className="border-gold-gradient flex h-10 items-center gap-1.5 whitespace-nowrap rounded-md px-4 text-xs font-bold text-gold-champagne transition-colors hover:bg-gold-champagne/10">
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.4} />
                  {t("header.withdraw")}
                </button>
                <button
                  type="button"
                  disabled={storedIds.length === 0}
                  onClick={() => setSellTarget(storedIds)}
                  className="flex h-10 items-center gap-1.5 whitespace-nowrap rounded-md bg-gold-champagne px-4 text-xs font-bold text-obsidian transition-colors hover:bg-gold-metallic disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Coins className="h-3.5 w-3.5" strokeWidth={2.4} />
                  {t("inventory.sellAll")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── 필터 바: 전체 선택 · 상태 · 등급 · 정렬 ── */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-b border-hairline pb-3">
          <button
            type="button"
            onClick={toggleAll}
            disabled={selectable.length === 0}
            aria-pressed={allSelected}
            className={cn("mr-1 flex items-center gap-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40", allSelected ? "text-gold-champagne" : "text-muted hover:text-white")}
          >
            {allSelected ? <CheckSquare className="h-4 w-4" strokeWidth={2.2} /> : <Square className="h-4 w-4" strokeWidth={2} />}
            {t("inventory.selectAll")}
          </button>
          <span className="mx-1 hidden h-4 w-px bg-hairline sm:block" />
          <span className="caption-luxury mr-1">{t("inventory.filterStatus")}</span>
          {(["all", ...STATUSES] as const).map((s) => (
            <button key={s} type="button" onClick={() => setStatus(s)} className={cn(chipCls, status === s ? "bg-white text-obsidian" : "border-metallic-subtle text-muted hover:text-white")}>
              {s === "all" ? t("inventory.all") : t(`inventory.status.${s}`)}
            </button>
          ))}
          <span className="caption-luxury ml-3 mr-1">{t("inventory.filterTier")}</span>
          {(["all", ...TIERS.map((x) => x.key)] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTier(k)}
              className={cn(chipCls, tier === k ? "bg-white text-obsidian" : "border-metallic-subtle text-muted hover:text-white")}
              style={tier !== k && k !== "all" ? { color: TIER_BY_KEY[k].accent } : undefined}
            >
              {k === "all" ? t("inventory.all") : TIER_BY_KEY[k].label}
            </button>
          ))}
          <label className="glass-dark relative ml-auto flex h-8 items-center rounded-md pl-3 pr-8 text-xs font-semibold text-secondary">
            <span className="sr-only">{t("inventory.sort")}</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="appearance-none bg-transparent pr-1 text-xs font-semibold text-secondary outline-none">
              {SORTS.map((k) => (
                <option key={k} value={k} className="bg-obsidian text-white">
                  {t(`inventory.sorts.${k}`)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-muted" strokeWidth={2.2} />
          </label>
        </div>

        {/* ── 그리드 / 빈 화면 ── */}
        {visible.length === 0 ? (
          items.length === 0 ? (
            <HotBoxes className="mt-6" onOpen={(b) => openBox(b, 1)} onInspect={setDetail} />
          ) : (
            <div className="border-metallic-subtle mt-6 rounded-xl bg-surface px-6 py-12 text-center text-sm text-muted">{t("inventory.emptyFiltered")}</div>
          )
        ) : (
          <ul className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((o) => {
              const item = itemOf(o);
              const box = BOX_BY_SLUG[o.boxSlug];
              const tierMeta = TIER_BY_KEY[o.tier];
              const stored = o.status === "IN_STORAGE";
              const shipping = isShippingStatus(o.status);
              const isSel = selected.has(o.id);
              return (
                <li
                  key={o.id}
                  className={cn("relative overflow-hidden rounded-xl bg-surface transition-shadow", o.tier === "royal" ? "border-metallic-gold" : "border-metallic-subtle", isSel && "ring-1 ring-gold-champagne")}
                  style={isSel ? { boxShadow: `0 0 24px ${glow(tierMeta.accent, 0.25)}` } : undefined}
                >
                  {/* 썸네일 — 배송 상태면 클릭 시 추적 모달 */}
                  <div
                    role={shipping ? "button" : undefined}
                    tabIndex={shipping ? 0 : undefined}
                    onClick={shipping ? () => setTrack(o) : undefined}
                    onKeyDown={shipping ? (e) => (e.key === "Enter" || e.key === " ") && setTrack(o) : undefined}
                    className={cn("relative h-36 w-full overflow-hidden bg-obsidian md:h-40", shipping && "cursor-pointer")}
                  >
                    {item ? <ProductArt image={item.image} alt={itemName(item)} accent={tierMeta.accent} glowStrength={0.22} fallbackSize="md" /> : <ProductArt image={{ src: null }} alt="" accent={tierMeta.accent} />}
                    <div className="absolute left-2 top-2 z-10 flex items-center gap-1.5">
                      {stored && (
                        <button type="button" onClick={() => toggle(o.id)} aria-label={t("inventory.select")} aria-pressed={isSel} className="flex h-6 w-6 items-center justify-center rounded-sm bg-obsidian/85 text-secondary hover:text-white">
                          {isSel ? <CheckSquare className="h-4 w-4 text-gold-champagne" strokeWidth={2.2} /> : <Square className="h-4 w-4" strokeWidth={2} />}
                        </button>
                      )}
                      <span className="rounded-sm px-1.5 py-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: tierMeta.accent, backgroundColor: glow(tierMeta.accent, 0.12), border: `1px solid ${glow(tierMeta.accent, 0.45)}` }}>
                        {tierMeta.label}
                      </span>
                    </div>
                    <span className={cn("absolute right-2 top-2 z-10 rounded-sm px-1.5 py-1 text-[10px] font-semibold", stored ? "bg-obsidian/80 text-secondary" : o.status === "SOLD" ? "bg-obsidian/80 text-faint" : "bg-gold-champagne/15 text-gold-champagne")}>
                      {t(`inventory.status.${o.status}`)}
                    </span>
                    {shipping && (
                      <span className="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-sm bg-obsidian/85 px-1.5 py-1 text-[10px] font-semibold text-tier-prestige">
                        <Truck className="h-3 w-3" strokeWidth={2.2} />
                        {t("inventory.track")}
                      </span>
                    )}
                  </div>

                  <div className="p-3">
                    <div className="truncate text-sm font-bold text-white">{item ? itemName(item) : o.itemId}</div>
                    <div className="truncate text-[10px] text-faint">{box ? boxTitle(box) : o.boxSlug}</div>
                    <div className="mt-1.5 flex items-baseline justify-between gap-2">
                      <Money value={o.valueUsdt} size="md" className="min-w-0 max-w-full overflow-hidden" numberClassName="truncate" style={{ color: tierMeta.accent }} />
                      <span className="flex-none text-[10px] text-faint">{new Date(o.acquiredAt).toLocaleDateString(locale)}</span>
                    </div>
                    {o.status === "SOLD" && o.soldForUsdt !== undefined && (
                      <div className="mt-1 flex items-baseline gap-1 text-[11px] text-muted">
                        {t("inventory.soldForLabel")} <Money value={o.soldForUsdt} size="xs" numberClassName="text-secondary" />
                      </div>
                    )}
                    {shipping && (
                      <div className="mt-1 truncate text-[11px] text-muted">
                        {t("inventory.tracking")}: <span className="font-mono text-secondary">{o.shipping?.trackingNumber ?? t("inventory.trackingPending")}</span>
                      </div>
                    )}
                    <div className="mt-3 grid grid-cols-[1fr_auto] gap-1.5">
                      <button type="button" disabled={!stored} onClick={() => setSellTarget([o.id])} className="flex h-8 items-center justify-center gap-1 rounded-sm bg-gold-champagne text-[11px] font-bold text-obsidian hover:bg-gold-metallic disabled:opacity-30">
                        <Wallet className="h-3 w-3" strokeWidth={2.4} />
                        {t("inventory.sell")}
                      </button>
                      <button type="button" onClick={() => setVerify(o)} aria-label={t("inventory.verify")} title={t("inventory.verify")} className="glass-dark row-span-2 flex h-full w-8 items-center justify-center rounded-sm text-gold-champagne hover:border-gold-champagne">
                        <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
                      </button>
                      {shipping ? (
                        <button type="button" onClick={() => setTrack(o)} className="glass flex h-8 items-center justify-center gap-1 rounded-sm text-[11px] font-semibold text-white hover:bg-white/15">
                          <Truck className="h-3 w-3" strokeWidth={2.2} />
                          {t("inventory.track")}
                        </button>
                      ) : (
                        <button type="button" disabled={!stored} onClick={() => setShipTarget([o.id])} className="glass flex h-8 items-center justify-center gap-1 rounded-sm text-[11px] font-semibold text-white hover:bg-white/15 disabled:opacity-30">
                          <Truck className="h-3 w-3" strokeWidth={2.2} />
                          {t("inventory.ship")}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── 플로팅 일괄 액션 바 ── */}
      <AnimatePresence>
        {selectedItems.length > 0 && (
          <motion.div className="fixed inset-x-0 bottom-0 z-40 px-[4%] pb-4" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ duration: 0.25 }}>
            <div className="border-metallic-gold mx-auto flex max-w-3xl flex-wrap items-center gap-3 rounded-xl bg-obsidian/95 p-3 backdrop-blur-md">
              <div className="flex min-w-0 items-baseline gap-2 text-sm text-secondary">
                <span>{t("inventory.selected", { n: selectedItems.length })}</span>
                <span className="flex items-baseline gap-1 text-xs text-muted">
                  ({t("inventory.selectedValue")} <Money value={selectedValue} size="sm" numberClassName="text-white" />)
                </span>
              </div>
              <button type="button" onClick={() => setSelected(new Set())} className="text-xs text-muted hover:text-white">
                {t("inventory.clearSelection")}
              </button>
              <div className="ml-auto flex gap-2">
                <button type="button" onClick={() => setShipTarget(selectedItems.map((o) => o.id))} className="glass h-10 rounded-md px-4 text-sm font-semibold text-white hover:bg-white/15">
                  {t("inventory.ship")}
                </button>
                <button type="button" onClick={() => setSellTarget(selectedItems.map((o) => o.id))} className="h-10 rounded-md bg-gold-champagne px-4 text-sm font-bold text-obsidian hover:bg-gold-metallic">
                  {t("inventory.sellSelected", { rate: rateLabel })}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SellConfirmModal open={!!sellTarget} count={sellTarget?.length ?? 0} amountUsdt={sellTarget ? sellAmountFor(sellTarget) : 0} refundRate={REFUND_RATE} onClose={() => setSellTarget(null)} onConfirm={confirmSell} />
      <ShippingModal open={!!shipTarget} itemCount={shipTarget?.length ?? 0} balanceUsdt={balance} onClose={() => setShipTarget(null)} onSubmit={submitShip} />
      <TrackingModal item={track} onClose={() => setTrack(null)} />
      <WithdrawalModal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} onRequested={(amount) => say(t("withdraw.requestedToast", { amount: fmt(amount) }), "#E6CA65")} />
      <FairnessModal open={!!verify} onClose={() => setVerify(null)} box={verify ? BOX_BY_SLUG[verify.boxSlug] : undefined} initial={verify ? { serverSeed: verify.fair.serverSeed, serverSeedHash: verify.fair.serverSeedHash, clientSeed: verify.fair.clientSeed, nonce: verify.fair.nonce } : undefined} />
      <DetailModal box={detail} onClose={() => setDetail(null)} onOpen={openBox} />
      <UnboxingRoulette box={unbox?.box ?? null} count={unbox?.count ?? 1} onClose={() => setUnbox(null)} onSellBack={onSellBack} onShip={() => say(t("inventory.shipRequestedToast"), "#93C5FD")} />

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
