"use client";

/**
 * 데모 지갑 (USDT 기준 정수/소수). 결제·계정 없음. localStorage 에 persist.
 * 표시는 항상 useCurrency().fmt 를 거친다 — 여기서는 숫자만 다룬다.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const START_BALANCE_USDT = 1000;
/** 무료 체험 후 1회 지급되는 웰컴 보너스 (CLAUDE.md §4-A) */
export const WELCOME_BONUS_USDT = 5;

export type TxType = "deposit_usdt" | "deposit_card" | "open" | "sellback" | "withdraw" | "bonus";

export type TxStatus = "PENDING" | "BROADCASTING" | "COMPLETED";

export interface Transaction {
  id: string;
  type: TxType;
  /** USDT 기준. 입금·판매는 +, 오픈은 - */
  amountUsdt: number;
  at: string;
  /** 부가 정보 — PG 거래 id, 네트워크, 박스 slug 등 */
  ref?: string;
  /** 출금처럼 비동기 처리되는 거래의 진행 상태 */
  status?: TxStatus;
  /** 온체인 TxID — BROADCASTING 이후 */
  txHash?: string;
}

interface WalletState {
  balance: number;
  transactions: Transaction[];
  /** 웰컴 보너스 수령 여부 — 브라우저당 1회 */
  welcomeClaimed: boolean;
  hydrated: boolean;
  addTransaction: (tx: Omit<Transaction, "id" | "at">) => Transaction;
  setTransactionStatus: (id: string, status: TxStatus, patch?: Partial<Pick<Transaction, "txHash">>) => void;
  /** 차감. 부족하면 false 를 돌려주고 아무것도 바꾸지 않는다. */
  debit: (usdt: number) => boolean;
  credit: (usdt: number) => void;
  topUp: () => void;
  /** 웰컴 보너스 지급. 이미 받았으면 false. */
  claimWelcome: () => boolean;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      balance: START_BALANCE_USDT,
      transactions: [],
      welcomeClaimed: false,
      hydrated: false,
      addTransaction: (tx) => {
        const rec: Transaction = { ...tx, id: `tx_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`, at: new Date().toISOString() };
        set((s) => ({ transactions: [rec, ...s.transactions].slice(0, 200) }));
        return rec;
      },
      setTransactionStatus: (id, status, patch) => set((s) => ({ transactions: s.transactions.map((x) => (x.id === id ? { ...x, status, ...patch } : x)) })),
      debit: (usdt) => {
        if (get().balance < usdt) return false;
        set((s) => ({ balance: +(s.balance - usdt).toFixed(2) }));
        return true;
      },
      credit: (usdt) => set((s) => ({ balance: +(s.balance + usdt).toFixed(2) })),
      topUp: () => set((s) => ({ balance: +(s.balance + START_BALANCE_USDT).toFixed(2) })),
      claimWelcome: () => {
        if (get().welcomeClaimed) return false;
        set((s) => ({ balance: +(s.balance + WELCOME_BONUS_USDT).toFixed(2), welcomeClaimed: true }));
        get().addTransaction({ type: "bonus", amountUsdt: WELCOME_BONUS_USDT, ref: "welcome" });
        return true;
      },
    }),
    {
      name: "gachaflix.wallet",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ balance: s.balance, transactions: s.transactions, welcomeClaimed: s.welcomeClaimed }),
      version: 1,
      // v0 → v1: 출금 상태명 PROCESSING → BROADCASTING
      migrate: (persisted, version) => {
        const s = persisted as { transactions?: Transaction[] };
        if (version < 1 && Array.isArray(s.transactions)) {
          s.transactions = s.transactions.map((x) => ((x.status as string) === "PROCESSING" ? { ...x, status: "BROADCASTING" } : x));
        }
        return s as never;
      },
      skipHydration: true,
      onRehydrateStorage: () => () => useWalletStore.setState({ hydrated: true }),
    },
  ),
);
