"use client";

/**
 * 스핀 텔레메트리 — 부정거래 탐지(lib/fraudScoring.ts)의 ③ 매크로 봇 신호 전용.
 * 개별 릴 스핀이 시작된 시각만 남긴다. 대량 개봉(BulkOpen)은 한 번의 동작이므로 기록하지 않는다.
 * 저장은 이 기기 로컬뿐이고, 마지막 60건만 갖고 있는다.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const KEEP = 60;

interface TelemetryState {
  spinTimes: number[];
  recordSpin: (at?: number) => void;
  clear: () => void;
}

export const useTelemetryStore = create<TelemetryState>()(
  persist(
    (set) => ({
      spinTimes: [],
      recordSpin: (at = Date.now()) => set((s) => ({ spinTimes: [...s.spinTimes, at].slice(-KEEP) })),
      clear: () => set({ spinTimes: [] }),
    }),
    {
      name: "gachaflix.telemetry",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ spinTimes: s.spinTimes }),
      skipHydration: true,
    },
  ),
);
