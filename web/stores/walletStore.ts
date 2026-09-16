"use client";

/**
 * 데모 지갑 (USDT 기준 정수/소수). 결제·계정 없음. localStorage 에 persist.
 * 표시는 항상 useCurrency().fmt 를 거친다 — 여기서는 숫자만 다룬다.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const START_BALANCE_USDT = 1000;

export type TxType = "deposit_usdt" | "deposit_card" | "open" | "sellback";

export interface Transaction {
  id: string;
  type: TxType;
  /** USDT 기준. 입금·판매는 +, 오픈은 - */
  amountUsdt: number;
  at: string;
  /** 부가 정보 — PG 거래 id, 네트워크, 박스 slug 등 */
  ref?: string;
}

interface WalletState {
  balance: number;
  transactions: Transaction[];
  hydrated: boolean;
  addTransaction: (tx: Omit<Transaction, "id" | "at">) => Transaction;
  /** 차감. 부족하면 false 를 돌려주고 아무것도 바꾸지 않는다. */
  debit: (usdt: number) => boolean;
  credit: (usdt: number) => void;
  topUp: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      balance: START_BALANCE_USDT,
      transactions: [],
      hydrated: false,
      addTransaction: (tx) => {
        const rec: Transaction = { ...tx, id: `tx_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`, at: new Date().toISOString() };
        set((s) => ({ transactions: [rec, ...s.transactions].slice(0, 200) }));
        return rec;
      },
      debit: (usdt) => {
        if (get().balance < usdt) return false;
        set((s) => ({ balance: +(s.balance - usdt).toFixed(2) }));
        return true;
      },
      credit: (usdt) => set((s) => ({ balance: +(s.balance + usdt).toFixed(2) })),
      topUp: () => set((s) => ({ balance: +(s.balance + START_BALANCE_USDT).toFixed(2) })),
    }),
    {
      name: "gachaflix.wallet",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ balance: s.balance, transactions: s.transactions }),
      skipHydration: true,
      onRehydrateStorage: () => () => useWalletStore.setState({ hydrated: true }),
    },
  ),
);
