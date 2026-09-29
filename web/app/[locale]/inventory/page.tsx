"use client";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDownLeft, ArrowUpRight, Check, ChevronDown, Coins, Package, Search, ShieldCheck, Truck, Wallet, X } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ProductArt } from "@/components/box/ProductArt";
import { Money } from "@/components/ui/Money";
import { SellConfirmModal } from "@/components/inventory/SellConfirmModal";
import { DeliveryModal } from "@/components/inventory/DeliveryModal";
import { TrackingModal } from "@/components/inventory/TrackingModal";
import { CancelShipmentModal } from "@/components/inventory/CancelShipmentModal";
import { WithdrawalModal } from "@/components/wallet/WithdrawalModal";
import { VisualVerifyModal } from "@/components/fairness/VisualVerifyModal";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { useProductText } from "@/lib/useProductText";
import { BOX_BY_SLUG, REFUND_RATE } from "@/lib/products";
import { productOf, processedAt, recordKind, resaleEstimate, vaultTab, type VaultTab } from "@/lib/vault";
import type { ShippingAddress } from "@/lib/shipping";
import { useInventoryStore, daysUntilCashback, sweepReadyInventory, type OwnedItem } from "@/stores/inventoryStore";
import { useWalletStore } from "@/stores/walletStore";
import { isLive } from "@/lib/runtime";
import { api } from "@/lib/api";

const PAGE = 24;
export default function InventoryPage() {
  const t = useTranslations("inventory");
  const r = useTranslations("refinement");
  const tw = useTranslations("withdraw");
  const tc = useTranslations("cancellation");
  const locale = useLocale();
  const { fmt } = useCurrency();
  const { itemName, boxTitle } = useProductText();
  const items = useInventoryStore(s => s.items);
  const hydrated = useInventoryStore(s => s.hydrated);
  const balance = useWalletStore(s => s.balance);
  const [tab, setTab] = useState<VaultTab>("held");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [period, setPeriod] = useState("all");
  const [sort, setSort] = useState("newest");
  const [shown, setShown] = useState(PAGE);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sellTarget, setSellTarget] = useState<string[] | null>(null);
  const [shipTarget, setShipTarget] = useState<string[] | null>(null);
  const [track, setTrack] = useState<OwnedItem | null>(null);
  const [cancelTarget, setCancelTarget] = useState<OwnedItem | null>(null);
  const [verify, setVerify] = useState<OwnedItem | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [now, setNow] = useState<number | null>(null);
  const retentionNotice = locale === "ko"
    ? "보관함에 보관된 상품은 획득일로부터 30일(1개월) 동안 배송 신청 또는 페이백을 진행하지 않을 경우, 상품 가치의 95%가 지갑 캐시백(USDT)으로 자동 전환됩니다."
    : locale === "zh" ? "获得商品后30天（1个月）内未申请配送或返现，商品价值的95%将自动转换为钱包返现（USDT）。"
    : "Items kept for 30 days (1 month) after acquisition without a shipping or sellback request are automatically converted to wallet cashback (USDT) at 95% of their value.";
  useEffect(() => {
    const tick = () => { const time = Date.now(); setNow(time); sweepReadyInventory(time); };
    tick();
    const timer = setInterval(tick, 60_000);
    window.addEventListener("focus", tick);
    return () => { clearInterval(timer); window.removeEventListener("focus", tick); };
  }, []);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("tab");
    if (value === "shipping" || value === "done") setTab(value);
  }, []);
  useEffect(() => { setShown(PAGE); setSelected(new Set()); }, [tab, query, kind, period, sort]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(""), 5000); return () => clearTimeout(id); }, [toast]);
  useEffect(() => {
    if (!isLive()) return;
    const tick = () => useInventoryStore.getState().items.filter(o => o.status === "SHIPPING_REQUESTED").forEach(o => {
      api.shipping(o.id).then(s => useInventoryStore.getState().markShipping(o.id, s.carrier, s.trackingNumber)).catch(() => {});
    });
    tick(); const timer = setInterval(tick, 60000); return () => clearInterval(timer);
  }, []);

  const counts = useMemo(() => items.reduce((acc, item) => { acc[vaultTab(item)]++; return acc; }, { held: 0, shipping: 0, done: 0 }), [items]);
  const visible = useMemo(() => {
    const cutoff = period === "all" ? 0 : Date.now() - Number(period) * 86400000;
    return items.filter(item => {
      const product = productOf(item);
      const box = BOX_BY_SLUG[item.boxSlug];
      const haystack = [product ? itemName(product) : item.itemId, box ? boxTitle(box) : item.boxSlug, item.id].join(" ").toLocaleLowerCase(locale);
      return vaultTab(item) === tab && (kind === "all" || recordKind(item) === kind) && haystack.includes(query.trim().toLocaleLowerCase(locale)) && (!cutoff || Date.parse(processedAt(item) ?? "") >= cutoff);
    }).sort((a, b) => {
      if (sort === "valueDesc") return (tab === "done" ? b.soldForUsdt ?? 0 : b.valueUsdt) - (tab === "done" ? a.soldForUsdt ?? 0 : a.valueUsdt);
      const delta = (Date.parse(processedAt(b) ?? "") || 0) - (Date.parse(processedAt(a) ?? "") || 0);
      return sort === "oldest" ? -delta : delta;
    });
  }, [items, tab, query, kind, period, sort, itemName, boxTitle, locale]);
  const selectedItems = visible.filter(o => selected.has(o.id) && o.status === "IN_STORAGE");
  const allSelected = visible.length > 0 && visible.every(o => selected.has(o.id));
  const targetItems = items.filter(o => sellTarget?.includes(o.id));
  const switchTab = (next: VaultTab) => { setTab(next); setKind("all"); setSelected(new Set()); };
  const reset = () => { setQuery(""); setKind("all"); setPeriod("all"); setSort("newest"); };
  const date = (value?: string) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(new Date(value)) : r("unknownDate");
  const sell = () => {
    if (!sellTarget) return;
    const result = useInventoryStore.getState().sell(sellTarget, REFUND_RATE);
    if (result.ids.length) {
      const wallet = useWalletStore.getState();
      wallet.creditSplit(result.toCrypto, result.toCard);
      wallet.addTransaction({ type: "sellback", amountUsdt: result.totalUsdt, ref: result.ids.join(",") });
      setToast(t("soldToast", { amount: fmt(result.totalUsdt) }));
    }
    setSellTarget(null); setSelected(new Set());
  };
  const ship = (_address: ShippingAddress, _fee: number) => {
    // There is no authenticated shipment creation endpoint yet. Do not collect an address or claim submission.
    setToast(r("shippingUnavailable"));
    setShipTarget(null);
  };
  return <main className="min-h-screen bg-canvas">
    <SiteHeader />
    <section className="page-shell workspace-shell">
      <header className="workspace-heading">
        <div><p className="workspace-eyebrow">MY VAULT</p><h1>{t("title")}</h1><p className="workspace-description">{r("vaultIntro")}</p></div>
        <Link href="/legal/refunds" className="workspace-text-link">{r("transactionGuide")}<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></Link>
      </header>
      <p className="mb-6 rounded-xl border border-gold-champagne/30 bg-gold-champagne/5 p-4 text-sm leading-7 text-secondary">{retentionNotice}</p>
      {tab === "held" && <div className="vault-summary">
        <div><span className="summary-label"><Wallet className="h-4 w-4" aria-hidden="true" />{r("walletBalance")}</span><Money value={balance} size="lg" className="mt-3" /><button onClick={() => setWithdrawOpen(true)} className="workspace-text-link mt-2">{r("manageBalance")}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></button></div>
        <div><span className="summary-label"><Package className="h-4 w-4" aria-hidden="true" />{r("resaleEstimate")}</span><Money value={resaleEstimate(items)} size="lg" className="mt-3" numberClassName="text-gold-champagne" /><p className="mt-3 text-xs leading-5 text-muted">{r("estimateNote")}</p></div>
      </div>}
      {tab === "held" && <p className="mt-4 rounded-lg border border-gold-champagne/30 bg-gold-champagne/5 px-4 py-3 text-sm leading-6 text-secondary">{r("autoCashbackNotice")}</p>}
      <nav className="workspace-tabs" aria-label={t("title")}>
        {(["held", "shipping", "done"] as const).map(key => <button key={key} aria-current={tab === key ? "page" : undefined} onClick={() => switchTab(key)}>{r(`tabs.${key}`)}<span>{counts[key]}</span></button>)}
      </nav>
      <div className="workspace-toolbar">
        <label className="workspace-search"><Search aria-hidden="true" className="h-4 w-4 shrink-0" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={r("searchItems")} aria-label={r("searchItems")} />{query && <button onClick={() => setQuery("")} aria-label={r("clearSearch")}><X className="h-4 w-4" /></button>}</label>
        {tab !== "held" && <select aria-label={r("typeFilter")} value={kind} onChange={e => setKind(e.target.value)} className="workspace-select">
          {(tab === "done" ? ["all", "sellback", "cash"] : ["all", "requested", "transit", "delivered"]).map(key => <option key={key} value={key}>{r(`kinds.${key}`)}</option>)}
        </select>}
        <select aria-label={r("period")} value={period} onChange={e => setPeriod(e.target.value)} className="workspace-select">{["all", "7", "30", "90"].map(key => <option key={key} value={key}>{r(`periods.${key}`)}</option>)}</select>
        <select aria-label={t("sort")} value={sort} onChange={e => setSort(e.target.value)} className="workspace-select">{["newest", "oldest", "valueDesc"].map(key => <option key={key} value={key}>{r(`sorts.${key}`)}</option>)}</select>
      </div>
      <div className="mb-5 flex min-h-11 flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <p aria-live="polite">{r("results", { n: visible.length })}<span className="mx-2">&middot;</span>{r(tab === "held" ? "acquisitionOrder" : "processingOrder")}</p>
        {tab === "held" && visible.length > 0 && <button className="workspace-text-link" onClick={() => setSelected(allSelected ? new Set() : new Set(visible.map(o => o.id)))} aria-pressed={allSelected}><span className={cn("selection-check", allSelected && "is-selected")}>{allSelected && <Check className="h-3 w-3" />}</span>{t("selectAll")}</button>}
      </div>
      {!hydrated ? <div className="workspace-empty" role="status">{r("loading")}</div> : visible.length === 0 ? <div className="workspace-empty">
        {tab === "shipping" ? <Truck aria-hidden="true" /> : tab === "done" ? <ArrowDownLeft aria-hidden="true" /> : <Package aria-hidden="true" />}
        <h2>{r(query || kind !== "all" || period !== "all" ? "noResults" : `empty.${tab}.title`)}</h2>
        <p>{r(query || kind !== "all" || period !== "all" ? "changeFilters" : `empty.${tab}.body`)}</p>
        {query || kind !== "all" || period !== "all" ? <button className="workspace-button" onClick={reset}>{r("resetFilters")}</button> : <Link href={tab === "held" ? "/" : "/legal/" + (tab === "shipping" ? "policy" : "refunds")} className="workspace-button">{r(tab === "held" ? "explore" : "viewPolicy")}<ArrowUpRight className="h-4 w-4" /></Link>}
      </div> : tab === "held" ? <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.slice(0, shown).map(item => {
          const product = productOf(item); const chosen = selected.has(item.id);
          const days = now === null ? null : daysUntilCashback(item.acquiredAt, now);
          return <li key={item.id} className={cn("vault-product", chosen && "is-selected")}>
            <div className="relative aspect-[16/10] bg-[#151718]">
              {product && <ProductArt image={product.image} alt={itemName(product)} fallbackSize="md" />}
              <button aria-label={r("selectItem", { name: product ? itemName(product) : item.itemId })} aria-pressed={chosen} className="absolute left-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-obsidian/90" onClick={() => setSelected(prev => { const next = new Set(prev); next.has(item.id) ? next.delete(item.id) : next.add(item.id); return next; })}><span className={cn("selection-check", chosen && "is-selected")}>{chosen && <Check className="h-3 w-3" />}</span></button>
            </div>
            <div className="p-5">{days !== null && <p className="mb-3 inline-flex rounded-full bg-gold-champagne/10 px-3 py-1 text-xs font-semibold text-gold-champagne">{locale === "ko" ? `⏳ 자동 캐시백까지 D-${days}일` : locale === "zh" ? `⏳ 自动返现倒计时 D-${days}天` : `⏳ Automatic cashback in ${days} days`}</p>}<p className="text-xs text-muted">{date(item.acquiredAt)}</p><h2 className="mt-2 text-base font-medium text-white">{product ? itemName(product) : item.itemId}</h2>
              <p className="mt-1 text-xs leading-5 text-muted">{BOX_BY_SLUG[item.boxSlug] ? boxTitle(BOX_BY_SLUG[item.boxSlug]) : item.boxSlug}</p>
              <div className="my-5 flex flex-wrap items-baseline justify-between gap-2"><span className="text-xs text-muted">{r("resaleValue")}</span><Money value={resaleEstimate([item])} size="md" /></div>
              <div className="grid grid-cols-[1fr_1fr_44px] gap-2"><button className="workspace-button" onClick={() => setShipTarget([item.id])}>{r("requestDelivery")}</button><button className="workspace-button primary" onClick={() => setSellTarget([item.id])}>{r("sellback")}</button><button className="workspace-button !px-0" onClick={() => setVerify(item)} aria-label={t("verify")}><ShieldCheck className="h-4 w-4" /></button></div>
            </div>
          </li>;
        })}
      </ul> : <div className="record-list">
        <div className="record-table-heading" aria-hidden="true"><span>{r("item")}</span><span>{r("typeFilter")}</span><span>{r(tab === "done" ? "settledAmount" : "shipmentState")}</span><span>{r("processedDate")}</span></div>
        <ul>{visible.slice(0, shown).map(item => {
          const product = productOf(item); const type = recordKind(item); const at = processedAt(item);
          return <li key={item.id} className="record-item">
            <div className="record-main">
              <div className="record-product"><div className="record-thumbnail">{type === "cash" ? <Coins className="h-6 w-6 text-gold-champagne" aria-hidden="true" /> : product && <ProductArt image={product.image} alt="" fallbackSize="sm" />}</div><div className="min-w-0"><h2>{product ? itemName(product) : item.itemId}</h2><p>{BOX_BY_SLUG[item.boxSlug] ? boxTitle(BOX_BY_SLUG[item.boxSlug]) : item.boxSlug}</p></div></div>
              <span className="record-type">{item.autoCashbackAt ? (locale === "ko" ? "30일 자동 캐시백" : locale === "zh" ? "30天自动返现" : "30-day automatic cashback") : r(`kinds.${type}`)}</span>
              <div className="record-value">{tab === "done" ? typeof item.soldForUsdt === "number" ? <Money value={item.soldForUsdt} size="md" sign="+" numberClassName="text-gold-champagne" /> : <span>{r("amountUnknown")}</span> : <span className={cn("status-pill", type === "delivered" && "is-complete")}>{type === "delivered" ? <Check /> : <Truck />}{t(`status.${item.status}`)}</span>}</div>
              <time className="record-date" dateTime={at}>{date(at)}</time>
            </div>
            <details className="record-details"><summary>{r("recordDetails")}<ChevronDown className="h-4 w-4" aria-hidden="true" /></summary>
              <div className="record-detail-body"><dl>
                <div><dt>{r("recordId")}</dt><dd className="break-all font-mono">{item.id}</dd></div>
                <div><dt>{r("acquiredDate")}</dt><dd>{date(item.acquiredAt)}</dd></div>
                <div><dt>{r("processedDate")}</dt><dd>{at ? new Date(at).toLocaleString(locale) : r("unknownDate")}</dd></div>
                {tab === "done" && <><div><dt>{r("originalValue")}</dt><dd><Money value={item.valueUsdt} size="sm" /></dd></div><div><dt>{r("settledAmount")}</dt><dd>{typeof item.soldForUsdt === "number" ? <Money value={item.soldForUsdt} size="sm" /> : r("amountUnknown")}</dd></div>{item.autoCashback && <div><dt>{r("settlementMethod")}</dt><dd>{r("autoCashbackRecord")}</dd></div>}<div><dt>{r("funding")}</dt><dd>{r(`fundingTypes.${item.fundingSource ?? "unknown"}`)}</dd></div></>}
              </dl><div className="flex flex-wrap gap-3">{tab === "shipping" && <button className="workspace-button" onClick={() => setTrack(item)}><Truck className="h-4 w-4" />{t("track")}</button>}{item.status === "SHIPPING_REQUESTED" && <button className="workspace-button" onClick={() => setCancelTarget(item)}>{tc("confirm")}</button>}{item.status === "DELIVERED" && <Link href="/community?tab=eligible" className="workspace-button">{r("writeReview")}</Link>}<button className="workspace-button" onClick={() => setVerify(item)}><ShieldCheck className="h-4 w-4" />{t("verify")}</button></div>{item.status === "SHIPPING" && <p className="mt-4 text-xs leading-6 text-muted">{tc("inTransit")} <Link href="/legal/refunds" className="text-gold-champagne underline">{tc("refundPolicy")}</Link></p>}</div>
            </details>
          </li>;
        })}</ul>
      </div>}
      {shown < visible.length && <div className="mt-6 flex justify-center"><button className="workspace-button" onClick={() => setShown(n => n + PAGE)}>{r("loadMore", { n: visible.length - shown })}</button></div>}
      <div className="workspace-footnote"><ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" /><p>{r("localRecords")} <Link href="/legal/payments">{r("transactionGuide")}</Link></p></div>
    </section>
    {tab === "held" && selectedItems.length > 0 && <div className="vault-selection-bar"><div><p>{t("selected", { n: selectedItems.length })}</p><Money value={resaleEstimate(selectedItems)} size="sm" numberClassName="text-gold-champagne" /></div><button className="workspace-button" onClick={() => setSelected(new Set())} aria-label={t("clearSelection")}><X className="h-4 w-4" /></button><button className="workspace-button" onClick={() => setShipTarget(selectedItems.map(o => o.id))}>{r("requestDelivery")}</button><button className="workspace-button primary" onClick={() => setSellTarget(selectedItems.map(o => o.id))}>{r("sellback")}</button></div>}
    <SellConfirmModal open={!!sellTarget} count={targetItems.length} amountUsdt={resaleEstimate(targetItems)} refundRate={REFUND_RATE} onClose={() => setSellTarget(null)} onConfirm={sell} />
    <DeliveryModal open={!!shipTarget} itemCount={shipTarget?.length ?? 0} balanceUsdt={balance} onClose={() => setShipTarget(null)} onSubmit={ship} />
    <TrackingModal item={track} onClose={() => setTrack(null)} />
    <CancelShipmentModal item={cancelTarget} onClose={() => setCancelTarget(null)} onCancelled={() => { setCancelTarget(null); switchTab("held"); setToast(tc("done")); }} />
    <VisualVerifyModal item={verify} onClose={() => setVerify(null)} />
    <WithdrawalModal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} onRequested={amount => setToast(tw("requestedToast", { amount: fmt(amount) }))} onBlocked={() => setToast(r("withdrawHelp"))} />
    {toast && <div role="status" className="workspace-toast">{toast}</div>}
  </main>;
}
