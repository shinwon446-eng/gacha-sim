"use client";

/**
 * 통화 스토어 (CLAUDE.md §4, §6)
 *
 *  - 선택 통화 하나가 플랫폼 전체의 모든 금액 표기를 지배한다. 혼용 없음.
 *  - 기준 통화는 USDT. 데이터는 전부 USDT 로 들어 있고, 표시 직전에만 환산한다.
 *  - localStorage 에 persist. SSR 마크업은 항상 기본값(USDT)으로 나가고,
 *    클라이언트가 마운트된 뒤 `rehydrate()` 로 저장값을 적용한다 (skipHydration).
 *    이렇게 해야 서버/클라이언트 첫 렌더가 일치해 하이드레이션 불일치가 나지 않는다.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Currency = "USDT" | "USD" | "KRW";

export const CURRENCIES: Currency[] = ["USDT", "USD", "KRW"];

/** 1 USDT 당 환율. 모의 고정값 — 실시간 연동 시 setRates 로 갱신한다. */
export const DEFAULT_RATES: Record<Currency, number> = { USDT: 1, USD: 1.0, KRW: 1380 };

export interface CurrencyState {
  currency: Currency;
  rates: Record<Currency, number>;
  /** 저장값이 적용됐는지 — 적용 전엔 서버와 같은 기본값을 렌더한다 */
  hydrated: boolean;
  setCurrency: (c: Currency) => void;
  setRates: (r: Partial<Record<Currency, number>>) => void;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      currency: "USDT",
      rates: DEFAULT_RATES,
      hydrated: false,
      setCurrency: (currency) => set({ currency }),
      setRates: (r) => set((s) => ({ rates: { ...s.rates, ...r } })),
    }),
    {
      name: "gachaflix.currency",
      storage: createJSONStorage(() => localStorage),
      // 통화만 저장한다. 환율은 세션마다 새로 받는 값이라 저장하지 않는다.
      partialize: (s) => ({ currency: s.currency }),
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        state?.setRates({});
        useCurrencyStore.setState({ hydrated: true });
      },
    },
  ),
);

/** 마운트 후 한 번 호출. layout 의 CurrencyHydrator 가 담당한다. */
export function rehydrateCurrency(): void {
  void useCurrencyStore.persist.rehydrate();
}
