"use client";

/**
 * 화면 전역 UI 상태 — 페이지 밖(하단 내비 등)에서 페이지 안의 모달을 열 때 쓴다.
 *   depositOpen  충전 모달. 호스트(DepositModal 을 렌더하는 페이지)가 마운트돼 있어야 실제로 열린다.
 *   depositHost  호스트 마운트 여부 — 없으면 하단 내비가 홈으로 이동(#deposit)해서 연다.
 */
import { create } from "zustand";

interface UiState {
  depositOpen: boolean;
  depositHost: boolean;
  openDeposit: () => void;
  closeDeposit: () => void;
  setDepositHost: (on: boolean) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  depositOpen: false,
  depositHost: false,
  openDeposit: () => set({ depositOpen: true }),
  closeDeposit: () => set({ depositOpen: false }),
  setDepositHost: (on) => set({ depositHost: on }),
}));
