"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SettingsState {
  muted: boolean;
  toggleMuted: () => void;
}

/** 효과음 토글 (CLAUDE.md 접근성: 언박싱·호버 사운드 Mute 제공) */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({ muted: false, toggleMuted: () => set((s) => ({ muted: !s.muted })) }),
    { name: "gachaflix.settings", storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);
