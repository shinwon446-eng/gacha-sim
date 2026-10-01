"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SettingsState {
  muted: boolean;
  toggleMuted: () => void;
}

/** 효과음 토글 (CLAUDE.md 접근성: 언박싱, 호버 사운드 Mute 제공). 배경 음악 기능은 제거했다(2026-10-01). */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      muted: false,
      toggleMuted: () => set((s) => ({ muted: !s.muted })),
    }),
    {
      name: "gachaflix.settings",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      // 예전 저장값의 bgm* 필드는 무시된다 — muted 만 읽고 쓴다
      partialize: (s) => ({ muted: s.muted }),
    },
  ),
);
