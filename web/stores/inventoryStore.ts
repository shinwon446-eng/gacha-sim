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

export type OwnedStatus = "IN_STORAGE" | "SHIPPING_REQUESTED" | "SHIPPING" | "SOLD";

export interface OwnedItem {
  id: string;
  itemId: string;
  boxSlug: string;
  valueUsdt: number;
  tier: TierKey;
  status: OwnedStatus;
  acquiredAt: string;
  /** 공정성 메타 — 검증기 프리필용 */
  fair: { serverSeedHash: string; serverSeed: string; clientSeed: string; nonce: number; roll: number };
  /** SOLD 시 실제 환급액 */
  soldForUsdt?: number;
  soldAt?: string;
  shipping?: { address: ShippingAddress; feeUsdt: number; requestedAt: string; trackingNumber?: string };
}

interface InventoryState {
  items: OwnedItem[];
  hydrated: boolean;
  add: (items: Omit<OwnedItem, "id" | "status" | "acquiredAt">[]) => OwnedItem[];
  sell: (ids: string[], refundRate: number) => { ids: string[]; totalUsdt: number };
  requestShipping: (ids: string[], address: ShippingAddress, feeUsdt: number) => void;
  /** 데모/관리자: 운송장 발급 */
  markShipping: (id: string, trackingNumber: string) => void;
}

const uid = () => `own_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,
      add: (items) => {
        const now = new Date().toISOString();
        const recs: OwnedItem[] = items.map((i) => ({ ...i, id: uid(), status: "IN_STORAGE", acquiredAt: now }));
        set((s) => ({ items: [...recs, ...s.items] }));
        return recs;
      },
      sell: (ids, refundRate) => {
        const now = new Date().toISOString();
        const set_ = new Set(ids);
        let total = 0;
        const sold: string[] = [];
        set((s) => ({
          items: s.items.map((it) => {
            if (!set_.has(it.id) || it.status !== "IN_STORAGE") return it;
            const refund = +(it.valueUsdt * refundRate).toFixed(2);
            total += refund;
            sold.push(it.id);
            return { ...it, status: "SOLD", soldForUsdt: refund, soldAt: now };
          }),
        }));
        return { ids: sold, totalUsdt: +total.toFixed(2) };
      },
      requestShipping: (ids, address, feeUsdt) => {
        const now = new Date().toISOString();
        const set_ = new Set(ids);
        set((s) => ({
          items: s.items.map((it) =>
            set_.has(it.id) && it.status === "IN_STORAGE" ? { ...it, status: "SHIPPING_REQUESTED", shipping: { address, feeUsdt, requestedAt: now } } : it,
          ),
        }));
      },
      markShipping: (id, trackingNumber) =>
        set((s) => ({
          items: s.items.map((it) =>
            it.id === id && it.status === "SHIPPING_REQUESTED" && it.shipping ? { ...it, status: "SHIPPING", shipping: { ...it.shipping, trackingNumber } } : it,
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
