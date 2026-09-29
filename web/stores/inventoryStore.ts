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
  shipping?: { address: ShippingAddress; feeUsdt: number; requestedAt: string; carrier?: CarrierKey; trackingNumber?: string; shippedAt?: string; deliveredAt?: string; requestId?: string; feeFundingRatio?: FundingRatio };
  shippingCancellations?: { requestId?: string; requestedAt: string; cancelledAt: string; feeRefundUsdt: number; toCrypto: number; toCard: number }[];
}

interface InventoryState {
  items: OwnedItem[];
  hydrated: boolean;
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
