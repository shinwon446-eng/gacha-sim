"use client";

/**
 * 데모 지갑 (USDT 기준 정수/소수). 결제·계정 없음. localStorage 에 persist.
 * 표시는 항상 useCurrency().fmt 를 거친다 — 여기서는 숫자만 다룬다.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const START_BALANCE_USDT = 1000;

interface WalletState {
  balance: number;
  hydrated: boolean;
  /** 차감. 부족하면 false 를 돌려주고 아무것도 바꾸지 않는다. */
  debit: (usdt: number) => boolean;
  credit: (usdt: number) => void;
  topUp: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      balance: START_BALANCE_USDT,
      hydrated: false,
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
      partialize: (s) => ({ balance: s.balance }),
      skipHydration: true,
      onRehydrateStorage: () => () => useWalletStore.setState({ hydrated: true }),
    },
  ),
);
