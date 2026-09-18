"use client";

/**
 * 일일 무료 상자 상태 (CLAUDE.md §7-A). 브라우저 단위 24h 쿨다운 + 개봉 기록(공정성 메타 포함).
 * 잔액 적립은 호출측(walletStore.credit)이 한다 — 여기서는 시각과 기록만.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface DailyOpen {
  id: string;
  amountUsdt: number;
  at: string;
  fair: { serverSeedHash: string; serverSeed: string; clientSeed: string; nonce: number; roll: number };
}

interface DailyState {
  lastOpenedAt: string | null;
  history: DailyOpen[];
  hydrated: boolean;
  record: (open: Omit<DailyOpen, "id" | "at">) => DailyOpen;
}

export const useDailyStore = create<DailyState>()(
  persist(
    (set) => ({
      lastOpenedAt: null,
      history: [],
      hydrated: false,
      record: (open) => {
        const rec: DailyOpen = { ...open, id: `dy_${Date.now().toString(36)}`, at: new Date().toISOString() };
        set((s) => ({ lastOpenedAt: rec.at, history: [rec, ...s.history].slice(0, 30) }));
        return rec;
      },
    }),
    {
      name: "gachaflix.daily",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lastOpenedAt: s.lastOpenedAt, history: s.history }),
      skipHydration: true,
      onRehydrateStorage: () => () => useDailyStore.setState({ hydrated: true }),
    },
  ),
);
