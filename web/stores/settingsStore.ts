"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SettingsState {
  muted: boolean;
  toggleMuted: () => void;
  /** 배경 음악 선택(opt-in). 기본 꺼짐 — 켜져 있어도 사용자 제스처 전에는 재생하지 않는다 */
  bgmEnabled: boolean;
  bgmVolume: number;
  /** 이번 세션에서 실제로 재생 중인지(저장하지 않음) — 헤더가 여러 번 마운트돼도 같은 값을 본다 */
  bgmPlaying: boolean;
  setBgmEnabled: (enabled: boolean) => void;
  setBgmPlaying: (playing: boolean) => void;
}

/** 효과음 토글 (CLAUDE.md 접근성: 언박싱, 호버 사운드 Mute 제공) · 배경 음악은 효과음과 별개로 저장 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      muted: false,
      toggleMuted: () => set((s) => ({ muted: !s.muted })),
      bgmEnabled: false,
      bgmVolume: 0.45,
      bgmPlaying: false,
      setBgmEnabled: (bgmEnabled) => set({ bgmEnabled }),
      setBgmPlaying: (bgmPlaying) => set({ bgmPlaying }),
    }),
    {
      name: "gachaflix.settings",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ muted: s.muted, bgmEnabled: s.bgmEnabled, bgmVolume: s.bgmVolume }),
    },
  ),
);
