import { create } from "zustand";
import { getBox } from "@/lib/data";
import { isBoosterActive, BOOSTER_THRESHOLD, DEMO_DURATION_MS } from "@/lib/engine";
import { apiOpenBox, apiGuestDemo } from "@/lib/gateway";
import { getFingerprint } from "@/lib/fingerprint";
import { topItem } from "@/lib/rng";
import { uid } from "@/lib/format";
import { DEMO_BOX_ID, DEMO_FEED, INITIAL_BALANCE, SHOW_DEMO_FEED } from "@/lib/config";
import { MULTI_DISCOUNT, REFUND_RATE, type Box, type Item, type OpenEvent, type OwnedItem } from "@/lib/types";

export type OpenCount = 1 | 10;

export interface TheaterSession {
  box: Box;
  count: OpenCount;
  results: OwnedItem[];
  /** 이번 세션에서 부스터가 발동했는지 (골드 연출) */
  boosterTriggered?: boolean;
}

export interface Toast {
  id: string;
  title: string;
  body: string;
  tone?: "gold" | "red" | "neutral";
}

export type DepositMethod = "usdt" | "card";

/**
 * 비회원 모의 체험 상태 머신: idle → shown → expired
 *
 * ⚠️ 이 체험은 어떤 경우에도 상품을 지급하지 않는다.
 * 보관함(inventory)·잔액·포인트 어디에도 상품이 인입되지 않으며, 표시만 하고 소멸한다.
 */
export interface GuestDemoState {
  status: "idle" | "shown" | "expired";
  deadline?: number;
}

/** 스펙 지정 키 — 중복 체험 원천 차단 */
const DEMO_LS_KEY = "guest_trial_completed";

const readDemoDone = (): boolean => {
  try {
    return localStorage.getItem(DEMO_LS_KEY) === "true";
  } catch {
    return false;
  }
};

const markDemoDone = () => {
  try {
    localStorage.setItem(DEMO_LS_KEY, "true");
  } catch {
    /* 시크릿 창 등 */
  }
};

interface GachaState {
  balance: number;
  inventory: OwnedItem[];
  openLog: OpenEvent[];
  totalDeposited: number;

  // ── 진행도/부스터/멤버십 ──
  pityCount: number;
  totalSpent: number;
  points: number;
  isMember: boolean;
  firstChargeUsed: boolean;

  // ── 비회원 모의 체험 ──
  guestDemo: GuestDemoState;
  demoHydrated: boolean;
  demoModalOpen: boolean;
  /** 이미 체험을 마친 유저가 다시 눌렀을 때의 안내 모드 */
  demoRepeat: boolean;

  // ── UI ──
  detailBoxId: string | null;
  depositOpen: boolean;
  inventoryOpen: boolean;
  theater: TheaterSession | null;
  toasts: Toast[];

  // ── Actions ──
  priceFor: (box: Box, count: OpenCount) => number;
  openBox: (boxId: string, count: OpenCount) => Promise<OwnedItem[] | null>;
  refundItem: (uid: string) => number;
  shipItem: (uid: string) => string;
  deposit: (amount: number, method: DepositMethod) => void;

  runGuestDemo: () => Promise<void>;
  signupFromDemo: (provider: string) => void;
  expireDemo: () => void;
  hydrateDemo: () => void;
  setDemoModalOpen: (open: boolean) => void;

  setDetail: (id: string | null) => void;
  setDepositOpen: (open: boolean) => void;
  setInventoryOpen: (open: boolean) => void;
  closeTheater: () => void;
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
}

const priceFor = (box: Box, count: OpenCount): number =>
  count === 10 ? Math.round(box.price * 10 * MULTI_DISCOUNT) : box.price;

const patchResult = (theater: TheaterSession | null, itemUid: string, patch: Partial<OwnedItem>) =>
  theater
    ? { ...theater, results: theater.results.map((r) => (r.uid === itemUid ? { ...r, ...patch } : r)) }
    : null;

/** 모의 체험에 노출되는 고정 상품 = 데모 박스의 1등 상품 (지급되지 않음) */
export const demoBox = (): Box => getBox(DEMO_BOX_ID);
export const demoPrize = (): Item => topItem(demoBox());

export const useGachaStore = create<GachaState>()((set, get) => ({
  balance: INITIAL_BALANCE,
  inventory: [],
  openLog: SHOW_DEMO_FEED ? DEMO_FEED : [],
  totalDeposited: 0,

  pityCount: 0,
  totalSpent: 0,
  points: 0,
  isMember: false,
  firstChargeUsed: false,

  guestDemo: { status: "idle" },
  demoHydrated: false,
  demoModalOpen: false,
  demoRepeat: false,

  detailBoxId: null,
  depositOpen: false,
  inventoryOpen: false,
  theater: null,
  toasts: [],

  priceFor,

  // 확률/난수는 게이트웨이 너머(서버)에서 계산 — 응답으로 pityCount/boosterTriggered 만 동기화
  openBox: async (boxId, count) => {
    const box = getBox(boxId);
    const cost = priceFor(box, count);
    const st = get();
    if (st.balance < cost) {
      st.pushToast({
        title: "잔액이 부족합니다",
        body: `${cost} USDT 필요 · 충전 후 다시 시도하세요`,
        tone: "red",
      });
      set({ depositOpen: true });
      return null;
    }
    set((s) => ({ balance: +(s.balance - cost).toFixed(2) }));

    const r = await apiOpenBox(boxId, count, { pityCount: st.pityCount, totalSpent: st.totalSpent, cost });
    const now = Date.now();
    const results: OwnedItem[] = r.items.map((item) => ({
      uid: uid(),
      boxId: box.id,
      item,
      obtainedAt: now,
      status: "owned",
    }));
    const events: OpenEvent[] = results.map((o) => ({ id: o.uid, user: "나", boxId: box.id, item: o.item, at: now }));

    set((s) => ({
      inventory: [...results, ...s.inventory],
      openLog: [...events, ...s.openLog].slice(0, 200),
      theater: { box, count, results, boosterTriggered: r.boosterTriggered },
      detailBoxId: null,
      pityCount: r.pityCount,
      totalSpent: r.totalSpent,
    }));
    if (r.boosterTriggered) {
      get().pushToast({ title: "부스터 발동!", body: "[초대박 라인업] 확률 5배가 적용된 오픈이었습니다", tone: "gold" });
    }
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
    const s = get();
    // 첫 충전 리워드: 1+1 더블 충전 + 부스터 게이지 9/10
    const isFirstChargeBonus = s.isMember && !s.firstChargeUsed;
    const credited = isFirstChargeBonus ? amount * 2 : amount;
    set((st) => ({
      balance: +(st.balance + credited).toFixed(2),
      totalDeposited: st.totalDeposited + amount,
      firstChargeUsed: st.firstChargeUsed || isFirstChargeBonus,
      pityCount: isFirstChargeBonus ? Math.max(st.pityCount, BOOSTER_THRESHOLD - 1) : st.pityCount,
    }));
    get().pushToast({
      title: isFirstChargeBonus
        ? `첫 충전 1+1! +${credited.toLocaleString("en-US")} USDT`
        : `+${credited.toLocaleString("en-US")} USDT 충전 완료`,
      body: isFirstChargeBonus
        ? "충전 금액 100% 더블 지급 · 부스터 게이지 9/10 충전"
        : method === "usdt"
          ? "온체인 잔액 동기화 완료"
          : "카드 결제 승인 · 수수료 0%",
      tone: "gold",
    });
  },

  // ── 비회원 모의 체험 ──
  // 결과는 고정(데모 박스 1등 상품)이며, 어떤 저장소에도 인입되지 않는다.
  runGuestDemo: async () => {
    const s = get();
    if (s.guestDemo.status === "shown") {
      set({ demoModalOpen: true, demoRepeat: false });
      return;
    }
    // 이미 체험 완료 → 연출 없이 재진입 안내 모달
    if (s.guestDemo.status === "expired" || readDemoDone()) {
      set({ guestDemo: { status: "expired" }, demoModalOpen: true, demoRepeat: true });
      return;
    }
    const fp = await getFingerprint();
    const r = await apiGuestDemo(fp, readDemoDone());
    markDemoDone();
    if (!r.ok) {
      set({ guestDemo: { status: "expired" }, demoModalOpen: true, demoRepeat: true });
      return;
    }
    set({ guestDemo: { status: "shown", deadline: r.deadline }, demoModalOpen: true, demoRepeat: false });
  },

  /** 가입 보상은 포인트만. 체험 상품은 지급되지 않는다. */
  signupFromDemo: (provider) => {
    set((s) => ({
      isMember: true,
      points: s.points + 3000,
      demoModalOpen: false,
      guestDemo: { status: "expired" },
    }));
    markDemoDone();
    get().pushToast({
      title: `${provider} 간편가입 완료`,
      body: "웰컴 보너스 3,000P 적립 — 체험 상품은 지급되지 않습니다",
      tone: "gold",
    });
  },

  expireDemo: () => {
    if (get().guestDemo.status !== "shown") return;
    markDemoDone();
    set({ guestDemo: { status: "expired" } });
  },

  hydrateDemo: () => {
    set({ guestDemo: readDemoDone() ? { status: "expired" } : { status: "idle" }, demoHydrated: true });
  },

  setDemoModalOpen: (open) => set({ demoModalOpen: open }),

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

export { isBoosterActive, BOOSTER_THRESHOLD, DEMO_DURATION_MS };
