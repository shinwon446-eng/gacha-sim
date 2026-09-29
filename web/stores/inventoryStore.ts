"use client";

/**
 * 보관함 (PROMPTS 5-1/5-2). 언박싱 결과는 확정 즉시 IN_STORAGE 로 들어온다 — 팝업을 닫아도 사라지지 않는다.
 *   IN_STORAGE → SOLD (즉시 판매, 잔액 가산은 호출측)
 *   IN_STORAGE → SHIPPING_REQUESTED (배송 신청, 배송비 차감은 호출측) → SHIPPING (운송장 발급, 데모에선 관리자 동작)
 * 항목 값은 확정 당시 USDT 로 고정한다 — 나중에 시세가 바뀌어도 당첨 시점 가치를 보존한다.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TierKey } from "@/lib/tiers";
import type { ShippingAddress } from "@/lib/shipping";
import type { CarrierKey } from "@/lib/carriers";
import { attributeRefunds, normalizeRatio, sourceOf, type FundingRatio, type FundingSource } from "@/lib/funding";
import { REFUND_RATE } from "@/lib/types";
import { browserAccountsEnabled } from "@/lib/account";
import { useWalletStore } from "@/stores/walletStore";
import { useAuthStore } from "@/stores/authStore";

export const EXPIRE_MS = 30 * 24 * 60 * 60 * 1000;
export function daysUntilCashback(acquiredAt: string, now: number): number | null {
  const acquired = Date.parse(acquiredAt);
  return Number.isFinite(acquired) && Number.isFinite(now)
    ? Math.max(0, Math.ceil((acquired + EXPIRE_MS - now) / 86_400_000)) : null;
}

export type OwnedStatus = "IN_STORAGE" | "SHIPPING_REQUESTED" | "SHIPPING" | "DELIVERED" | "SOLD";

export interface OwnedItem {
  id: string;
  itemId: string;
  boxSlug: string;
  valueUsdt: number;
  tier: TierKey;
  status: OwnedStatus;
  acquiredAt: string;
  /** 공정성 메타 — 검증기 프리필용 */
  fair: { serverSeedHash: string; serverSeed: string; clientSeed: string; nonce: number; roll: number; dropTable?: { id: string; dropRate: number }[]; oddsVersion?: string };
  /** 결제 원천 족보 — 이 아이템을 뽑은 개봉에 쓰인 잔액의 출처 (CLAUDE.md §7-B). 구버전 기록은 crypto 로 본다. */
  fundingSource?: FundingSource;
  fundingRatio?: FundingRatio;
  /** SOLD 시 실제 환급액 */
  soldForUsdt?: number;
  soldAt?: string;
  autoCashbackAt?: string;
  shipping?: { address: ShippingAddress; feeUsdt: number; requestedAt: string; carrier?: CarrierKey; trackingNumber?: string; shippedAt?: string; deliveredAt?: string; requestId?: string; feeFundingRatio?: FundingRatio };
  shippingCancellations?: { requestId?: string; requestedAt: string; cancelledAt: string; feeRefundUsdt: number; toCrypto: number; toCard: number }[];
}

interface InventoryState {
  items: OwnedItem[];
  hydrated: boolean;
  sweepExpired: (now?: number) => { ids: string[]; totalUsdt: number };
  add: (items: Omit<OwnedItem, "id" | "status" | "acquiredAt">[]) => OwnedItem[];
  /** 환급 — 합계와 함께 원천별 귀속액(교차 환급 차단)을 돌려준다 */
  sell: (ids: string[], refundRate: number) => { ids: string[]; totalUsdt: number; toCrypto: number; toCard: number };
  requestShipping: (ids: string[], address: ShippingAddress, feeUsdt: number, feeFundingRatio?: FundingRatio) => void;
  cancelShipping: (id: string) => { ok: boolean; reason?: "notPreparing" | "unknownFee"; refundedUsdt: number; toCrypto: number; toCard: number };
  /** 데모/관리자: 운송장 발급 */
  markShipping: (id: string, carrier: CarrierKey, trackingNumber: string) => void;
}

let nextId = 0;
const uid = () => `own_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${++nextId}`}`;

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,
      sweepExpired: (now = Date.now()) => {
        const none = { ids: [] as string[], totalUsdt: 0 };
        if (!Number.isFinite(now) || !Number.isFinite(new Date(now).getTime())) return none;
        const expired = get().items.filter(item => item.status === "IN_STORAGE"
          && Number.isFinite(item.valueUsdt) && item.valueUsdt >= 0
          && now - Date.parse(item.acquiredAt) >= EXPIRE_MS);
        if (!expired.length) return none;
        const refunds = new Map(expired.map(item => [item.id, +(item.valueUsdt * REFUND_RATE).toFixed(2)]));
        const totalUsdt = +Array.from(refunds.values()).reduce((sum, amount) => sum + amount, 0).toFixed(2);
        if (!Number.isFinite(totalUsdt)) return none;
        const at = new Date(now).toISOString();
        // Claim the items before crediting: subscriptions and subsequent sweeps cannot pay twice.
        set(s => ({ items: s.items.map(item => refunds.has(item.id) && item.status === "IN_STORAGE"
          ? { ...item, status: "SOLD", soldForUsdt: refunds.get(item.id), soldAt: at, autoCashbackAt: at }
          : item) }));
        useWalletStore.getState().credit(totalUsdt);
        useWalletStore.getState().addTransaction({ type: "sellback", amountUsdt: totalUsdt, ref: "auto_cashback_30d" });
        return { ids: Array.from(refunds.keys()), totalUsdt };
      },
      add: (items) => {
        const now = new Date().toISOString();
        const recs: OwnedItem[] = items.map((i) => {
          const ratio = normalizeRatio(i.fundingRatio);
          return { ...i, fundingRatio: ratio, fundingSource: i.fundingSource ?? sourceOf(ratio), id: uid(), status: "IN_STORAGE", acquiredAt: now };
        });
        set((s) => ({ items: [...recs, ...s.items] }));
        return recs;
      },
      sell: (ids, refundRate) => {
        const now = new Date().toISOString();
        const set_ = new Set(ids);
        let total = 0;
        const sold: string[] = [];
        // 아이템별 족보를 모아 환급금을 원천대로 되돌린다 — 카드 출처는 절대 암호화폐 잔액으로 가지 않는다
        const refunds: { amountUsdt: number; ratio: FundingRatio }[] = [];
        set((s) => ({
          items: s.items.map((it) => {
            if (!set_.has(it.id) || it.status !== "IN_STORAGE") return it;
            const refund = +(it.valueUsdt * refundRate).toFixed(2);
            total += refund;
            sold.push(it.id);
            refunds.push({ amountUsdt: refund, ratio: normalizeRatio(it.fundingRatio) });
            return { ...it, status: "SOLD", soldForUsdt: refund, soldAt: now };
          }),
        }));
        const { toCrypto, toCard } = attributeRefunds(refunds);
        return { ids: sold, totalUsdt: +total.toFixed(2), toCrypto, toCard };
      },
      requestShipping: (ids, address, feeUsdt, feeFundingRatio) => {
        if (!Number.isFinite(feeUsdt) || feeUsdt < 0) return;
        const now = new Date().toISOString();
        const set_ = new Set(ids);
        const eligible = get().items.filter(it => set_.has(it.id) && it.status === "IN_STORAGE");
        if (!eligible.length) return;
        const requestId = uid();
        const cents = Math.round(feeUsdt * 100);
        const fees = new Map(eligible.map((it, index) => [it.id, (Math.floor(cents / eligible.length) + (index < cents % eligible.length ? 1 : 0)) / 100]));
        // Allocate cents from each original funding bucket once for the batch.
        // Reusing the same mixed ratio on every tiny fee could round all cents
        // into crypto and accidentally convert card-funded money.
        let cryptoCents = feeFundingRatio ? Math.round(attributeRefunds([{ amountUsdt: cents / 100, ratio: normalizeRatio(feeFundingRatio) }]).toCrypto * 100) : 0;
        const ratios = new Map<string, FundingRatio>();
        if (feeFundingRatio) for (const it of eligible) {
          const itemCents = Math.round(fees.get(it.id)! * 100);
          const fromCrypto = Math.min(itemCents, cryptoCents);
          cryptoCents -= fromCrypto;
          ratios.set(it.id, { crypto: itemCents ? fromCrypto / itemCents : 0, card: itemCents ? 1 - fromCrypto / itemCents : 1 });
        }
        set((s) => ({
          items: s.items.map((it) =>
            fees.has(it.id) ? { ...it, status: "SHIPPING_REQUESTED", shipping: { address, feeUsdt: fees.get(it.id)!, requestedAt: now, requestId, feeFundingRatio: ratios.get(it.id) } } : it,
          ),
        }));
      },
      cancelShipping: id => {
        const item = get().items.find(it => it.id === id);
        const none = { ok: false, refundedUsdt: 0, toCrypto: 0, toCard: 0 };
        if (!item || item.status !== "SHIPPING_REQUESTED" || !item.shipping || item.shipping.shippedAt) return { ...none, reason: "notPreparing" };
        const shipment = item.shipping;
        // Older records repeat the entire batch fee per item and omit its funding source.
        // Do not guess a refund or credit a card-funded charge to crypto.
        if (!Number.isFinite(shipment.feeUsdt) || shipment.feeUsdt < 0 || (shipment.feeUsdt > 0 && (!shipment.requestId || !shipment.feeFundingRatio))) return { ...none, reason: "unknownFee" };
        const split = attributeRefunds([{ amountUsdt: shipment.feeUsdt, ratio: normalizeRatio(shipment.feeFundingRatio) }]);
        const cancelled = { requestId: shipment.requestId, requestedAt: shipment.requestedAt, cancelledAt: new Date().toISOString(), feeRefundUsdt: shipment.feeUsdt, ...split };
        set(s => ({ items: s.items.map(it => it.id === id ? { ...it, status: "IN_STORAGE", shipping: undefined, shippingCancellations: [...(it.shippingCancellations ?? []), cancelled] } : it) }));
        return { ok: true, refundedUsdt: shipment.feeUsdt, ...split };
      },
      markShipping: (id, carrier, trackingNumber) =>
        set((s) => ({
          items: s.items.map((it) =>
            it.id === id && it.status === "SHIPPING_REQUESTED" && it.shipping
              ? { ...it, status: "SHIPPING", shipping: { ...it.shipping, carrier, trackingNumber, shippedAt: new Date().toISOString() } }
              : it,
          ),
        })),
    }),
    {
      name: "gachaflix.inventory",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
      skipHydration: true,
      onRehydrateStorage: () => () => useInventoryStore.setState({ hydrated: true }),
    },
  ),
);

/** Hydration and account restoration must finish together before moving money. */
export function sweepReadyInventory(now = Date.now()) {
  if (!useInventoryStore.getState().hydrated || !useWalletStore.getState().hydrated) return;
  if (browserAccountsEnabled()) {
    const auth = useAuthStore.getState();
    const account = auth.user?.id ?? "guest";
    if (!auth.hydrated
      || useInventoryStore.persist?.getOptions().name !== `voila.browser-inventory.${account}`
      || useWalletStore.persist?.getOptions().name !== `voila.browser-wallet.${account}`) return;
  }
  const result = useInventoryStore.getState().sweepExpired(now);
  if (!result.ids.length) return;
  const n = result.ids.length;
  const amount = result.totalUsdt.toFixed(2);
  const locale = typeof document !== "undefined" ? document.documentElement.lang : "ko";
  useAuthStore.getState().pushToast(locale.startsWith("en")
    ? `${n} items stored for over 30 days were automatically converted to ${amount} USDT cashback.`
    : locale.startsWith("zh") ? `${n}件商品已超过30天保管期限，已自动转换为${amount} USDT返现。`
    : `보관 기한(30일)이 경과한 상품 ${n}건이 ${amount} USDT로 자동 캐시백 전환되었습니다.`);
}

// This store is loaded by the shared app shell, so expiration also runs outside the inventory page.
// Defer subscriptions until the account's wallet and inventory have both been restored.
if (typeof window !== "undefined") {
  const host = window as Window & { __inventoryExpiryCleanup?: () => void };
  host.__inventoryExpiryCleanup?.();
  let pending: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    clearTimeout(pending);
    pending = setTimeout(() => { if (document.visibilityState !== "hidden") sweepReadyInventory(); }, 0);
  };
  const unsubscribers = [useInventoryStore.subscribe(schedule), useWalletStore.subscribe(schedule), useAuthStore.subscribe(schedule)];
  const timer = setInterval(schedule, 60_000);
  window.addEventListener("focus", schedule);
  document.addEventListener("visibilitychange", schedule);
  host.__inventoryExpiryCleanup = () => {
    clearTimeout(pending); clearInterval(timer); unsubscribers.forEach(unsubscribe => unsubscribe());
    window.removeEventListener("focus", schedule); document.removeEventListener("visibilitychange", schedule);
  };
  schedule();
}

/** 파생 요약 */
export function summarize(items: OwnedItem[]) {
  const stored = items.filter((i) => i.status === "IN_STORAGE");
  return {
    total: items.length,
    stored: stored.length,
    storedValueUsdt: +stored.reduce((s, i) => s + i.valueUsdt, 0).toFixed(2),
    shipping: items.filter((i) => i.status === "SHIPPING_REQUESTED" || i.status === "SHIPPING").length,
    sold: items.filter((i) => i.status === "SOLD").length,
  };
}
