import { create } from "zustand";
import { getBox } from "@/lib/data";
import { rollOnce, TRIAL_MAP, isBoosterActive, BOOSTER_THRESHOLD } from "@/lib/engine";
import { apiOpenBox, apiGuestTrial } from "@/lib/gateway";
import { getFingerprint } from "@/lib/fingerprint";
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

/** 게스트 무료체험 상태 머신: idle → won → (claimed | expired) */
export interface TrialState {
  status: "idle" | "won" | "claimed" | "expired";
  prizeId?: string;
  deadline?: number;
}

// 스펙 명세 키: localStorage 이중 플래그 (서버 HttpOnly 쿠키와 함께 사용)
const TRIAL_LS_KEY = "_guest_trial_claim";

function readTrialLS(): TrialState | null {
  try {
    const raw = localStorage.getItem(TRIAL_LS_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as TrialState;
    return t && typeof t.status === "string" ? t : null;
  } catch {
    return null;
  }
}

function writeTrialLS(t: TrialState) {
  try {
    localStorage.setItem(TRIAL_LS_KEY, JSON.stringify(t));
  } catch {
    /* 시크릿 창 등 */
  }
}

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

  // ── 게스트 무료체험 ──
  trial: TrialState;
  trialHydrated: boolean;
  trialModalOpen: boolean;

  // ── UI ──
  detailBoxId: string | null;
  depositOpen: boolean;
  inventoryOpen: boolean;
  theater: TheaterSession | null;
  toasts: Toast[];

  // ── Actions ──
  priceFor: (box: Box, count: OpenCount) => number;
  openBox: (boxId: string, count: OpenCount) => Promise<OwnedItem[] | null>;
  demoRoll: (boxId: string) => OwnedItem[];
  refundItem: (uid: string) => number;
  shipItem: (uid: string) => string;
  deposit: (amount: number, method: DepositMethod) => void;

  guestTrial: () => Promise<void>;
  claimTrialSignup: (provider: string) => void;
  expireTrial: () => void;
  hydrateTrial: () => void;
  setTrialModalOpen: (open: boolean) => void;
  copyInviteLink: () => Promise<void>;

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

  trial: { status: "idle" },
  trialHydrated: false,
  trialModalOpen: false,

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
      theater: { box, count, results, demo: false, boosterTriggered: r.boosterTriggered },
      detailBoxId: null,
      pityCount: r.pityCount,
      totalSpent: r.totalSpent,
    }));
    if (r.boosterTriggered) {
      get().pushToast({ title: "BOOST 발동!", body: "상위 등급 확률 500% 상승이 적용된 뽑기였습니다", tone: "gold" });
    }
    return results;
  },

  demoRoll: (boxId) => {
    const box = getBox(boxId);
    const results: OwnedItem[] = [
      { uid: uid(), boxId: box.id, item: rollOnce(box, { boost: false, tierMult: 1 }), obtainedAt: Date.now(), status: "owned" },
    ];
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
    const s = get();
    // Step 3 리워드: 회원 첫 충전 시 100% 더블 + 부스터 게이지 9/10
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

  // ── 게스트 무료체험 ──
  guestTrial: async () => {
    const { trial } = get();
    if (trial.status === "won") {
      set({ trialModalOpen: true });
      return;
    }
    if (trial.status === "claimed" || trial.status === "expired") {
      get().pushToast({ title: "이미 체험을 완료하셨습니다", body: "가입하고 다음 혜택을 받아보세요", tone: "red" });
      return;
    }
    const fp = await getFingerprint();
    const r = await apiGuestTrial(fp, readTrialLS() !== null);
    if (!r.ok) {
      // 서버가 이미 사용을 기록한 경우 — 로컬 상태 동기화 + 가입 모달 트리거
      const ls = readTrialLS();
      if (ls && ls.status === "won") {
        set({ trial: ls, trialModalOpen: true });
      } else {
        if (ls) set({ trial: ls });
        else {
          const t: TrialState = { status: "expired" };
          writeTrialLS(t);
          set({ trial: t });
        }
        get().pushToast({ title: r.message, body: "가입하면 새로운 혜택이 열립니다", tone: "red" });
      }
      return;
    }
    const t: TrialState = { status: "won", prizeId: r.prize.id, deadline: r.deadline };
    writeTrialLS(t);
    set({ trial: t, trialModalOpen: true });
  },

  claimTrialSignup: (provider) => {
    const { trial } = get();
    if (trial.status !== "won" || !trial.prizeId) return;
    const prize = TRIAL_MAP[trial.prizeId];
    const owned: OwnedItem = {
      uid: uid(),
      boxId: "guest-trial",
      item: prize,
      obtainedAt: Date.now(),
      status: "owned",
    };
    const t: TrialState = { status: "claimed", prizeId: trial.prizeId };
    writeTrialLS(t);
    set((s) => ({
      isMember: true,
      points: s.points + 3000,
      inventory: [owned, ...s.inventory],
      trial: t,
      trialModalOpen: false,
    }));
    get().pushToast({
      title: `${provider} 간편가입 완료`,
      body: `${prize.name} 확정 수령 + 가입 축하 3,000P 지급`,
      tone: "gold",
    });
  },

  expireTrial: () => {
    const { trial } = get();
    if (trial.status !== "won") return;
    const t: TrialState = { status: "expired", prizeId: trial.prizeId };
    writeTrialLS(t);
    set({ trial: t, trialModalOpen: false });
    get().pushToast({ title: "임시 보관 상품이 소멸되었습니다", body: "보관 시간이 만료되었습니다", tone: "red" });
  },

  // 새로고침 시 임시 보관함 상태 복원 (시나리오 B)
  hydrateTrial: () => {
    const ls = readTrialLS();
    set({ trial: ls ?? { status: "idle" }, trialHydrated: true });
  },

  setTrialModalOpen: (open) => set({ trialModalOpen: open }),

  copyInviteLink: async () => {
    const link = `${location.origin}${location.pathname}?ref=me`;
    try {
      await navigator.clipboard.writeText(link);
      get().pushToast({ title: "초대 링크 복사 완료", body: "친구가 가입하면 티켓 1장 + 5% 캐시백", tone: "gold" });
    } catch {
      get().pushToast({ title: "복사 실패", body: link, tone: "neutral" });
    }
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

export { isBoosterActive, BOOSTER_THRESHOLD };
