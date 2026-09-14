import { create } from "zustand";
import { getBox } from "@/lib/data";
import { pickWeighted } from "@/lib/rng";
import { uid } from "@/lib/format";
import { DEMO_FEED, INITIAL_BALANCE, SHOW_DEMO_FEED } from "@/lib/config";
import { MULTI_DISCOUNT, REFUND_RATE, type Box, type OpenEvent, type OwnedItem } from "@/lib/types";

export type OpenCount = 1 | 10;

export interface TheaterSession {
  box: Box;
  count: OpenCount;
  results: OwnedItem[];
  /** 무료 체험 뽑기 — 잔액 차감/인벤토리 저장 없음 */
  demo: boolean;
}

export interface Toast {
  id: string;
  title: string;
  body: string;
  tone?: "gold" | "red" | "neutral";
}

export type DepositMethod = "usdt" | "card";

interface GachaState {
  balance: number;
  inventory: OwnedItem[];
  openLog: OpenEvent[];
  totalDeposited: number;

  // UI
  detailBoxId: string | null;
  depositOpen: boolean;
  inventoryOpen: boolean;
  theater: TheaterSession | null;
  toasts: Toast[];

  // Actions
  priceFor: (box: Box, count: OpenCount) => number;
  openBox: (boxId: string, count: OpenCount) => OwnedItem[] | null;
  demoRoll: (boxId: string) => OwnedItem[];
  refundItem: (uid: string) => number;
  shipItem: (uid: string) => string;
  deposit: (amount: number, method: DepositMethod) => void;

  setDetail: (id: string | null) => void;
  setDepositOpen: (open: boolean) => void;
  setInventoryOpen: (open: boolean) => void;
  closeTheater: () => void;
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
}

const priceFor = (box: Box, count: OpenCount): number =>
  count === 10 ? Math.round(box.price * 10 * MULTI_DISCOUNT) : box.price;

const roll = (box: Box, count: OpenCount): OwnedItem[] =>
  Array.from({ length: count }, () => ({
    uid: uid(),
    boxId: box.id,
    item: pickWeighted(box.items),
    obtainedAt: Date.now(),
    status: "owned" as const,
  }));

const patchResult = (theater: TheaterSession | null, itemUid: string, patch: Partial<OwnedItem>) =>
  theater
    ? { ...theater, results: theater.results.map((r) => (r.uid === itemUid ? { ...r, ...patch } : r)) }
    : null;

export const useGachaStore = create<GachaState>()((set, get) => ({
  balance: INITIAL_BALANCE,
  inventory: [],
  openLog: SHOW_DEMO_FEED ? DEMO_FEED : [],
  totalDeposited: 0,

  detailBoxId: null,
  depositOpen: false,
  inventoryOpen: false,
  theater: null,
  toasts: [],

  priceFor,

  openBox: (boxId, count) => {
    const box = getBox(boxId);
    const cost = priceFor(box, count);
    if (get().balance < cost) {
      get().pushToast({
        title: "잔액이 부족합니다",
        body: `${cost} USDT 필요 · 충전 후 다시 시도하세요`,
        tone: "red",
      });
      set({ depositOpen: true });
      return null;
    }
    const results = roll(box, count);
    const events: OpenEvent[] = results.map((r) => ({
      id: r.uid,
      user: "나",
      boxId: box.id,
      item: r.item,
      at: r.obtainedAt,
    }));
    set((s) => ({
      balance: +(s.balance - cost).toFixed(2),
      inventory: [...results, ...s.inventory],
      openLog: [...events, ...s.openLog].slice(0, 200),
      theater: { box, count, results, demo: false },
      detailBoxId: null,
    }));
    return results;
  },

  demoRoll: (boxId) => {
    const box = getBox(boxId);
    const results = roll(box, 1);
    set({ theater: { box, count: 1, results, demo: true }, detailBoxId: null });
    return results;
  },

  refundItem: (itemUid) => {
    const owned = get().inventory.find((i) => i.uid === itemUid && i.status === "owned");
    if (!owned) return 0;
    const amount = +(owned.item.value * REFUND_RATE).toFixed(2);
    set((s) => ({
      balance: +(s.balance + amount).toFixed(2),
      inventory: s.inventory.filter((i) => i.uid !== itemUid),
      theater: patchResult(s.theater, itemUid, { status: "refunded" }),
    }));
    get().pushToast({
      title: `+${amount.toLocaleString("en-US")} USDT 환급 완료`,
      body: `${owned.item.name} · 잔액에 즉시 반영됨`,
      tone: "gold",
    });
    return amount;
  },

  shipItem: (itemUid) => {
    const owned = get().inventory.find((i) => i.uid === itemUid && i.status === "owned");
    if (!owned) return "";
    const tracking = "GT" + Math.floor(1e9 + Math.random() * 9e9).toString();
    set((s) => ({
      inventory: s.inventory.map((i) => (i.uid === itemUid ? { ...i, status: "shipped", tracking } : i)),
      theater: patchResult(s.theater, itemUid, { status: "shipped", tracking }),
    }));
    get().pushToast({
      title: "실물 배송 신청 완료",
      body: `${owned.item.name} · 트래킹 ${tracking}`,
      tone: "neutral",
    });
    return tracking;
  },

  deposit: (amount, method) => {
    set((s) => ({
      balance: +(s.balance + amount).toFixed(2),
      totalDeposited: s.totalDeposited + amount,
    }));
    get().pushToast({
      title: `+${amount.toLocaleString("en-US")} USDT 충전 완료`,
      body: method === "usdt" ? "온체인 잔액 동기화 완료" : "카드 결제 승인 · 수수료 0%",
      tone: "gold",
    });
  },

  setDetail: (id) => set({ detailBoxId: id }),
  setDepositOpen: (open) => set({ depositOpen: open }),
  setInventoryOpen: (open) => set({ inventoryOpen: open }),
  closeTheater: () => set({ theater: null }),

  pushToast: (t) => {
    const id = uid();
    set((s) => ({ toasts: [...s.toasts, { ...t, id }].slice(-4) }));
    setTimeout(() => get().dismissToast(id), 5000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
