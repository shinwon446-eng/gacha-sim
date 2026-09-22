"use client";

/**
 * 내가 쓴 포토 후기 (CLAUDE.md §7-B). 업로드 백엔드가 없어 브라우저에만 저장한다 — 사진은 data URL(축소본).
 * 보너스 지급 여부는 보관함 레코드 id 로 1회만 (walletStore.credit 은 호출측).
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface MyReview {
  id: string;
  /** 보관함 레코드 id — 1회 제한 키 */
  ownedId: string;
  boxSlug: string;
  itemId: string;
  text: string;
  rating: number;
  /** 축소된 data URL — 없으면 카탈로그 이미지 */
  photo?: string;
  at: string;
  bonusUsdt: number;
}

interface CommunityState {
  mine: MyReview[];
  hydrated: boolean;
  add: (r: Omit<MyReview, "id" | "at">) => MyReview;
  hasReviewed: (ownedId: string) => boolean;
}

export const useCommunityStore = create<CommunityState>()(
  persist(
    (set, get) => ({
      mine: [],
      hydrated: false,
      add: (r) => {
        const rec: MyReview = { ...r, id: `my_${Date.now().toString(36)}`, at: new Date().toISOString() };
        set((s) => ({ mine: [rec, ...s.mine].slice(0, 20) }));
        return rec;
      },
      hasReviewed: (ownedId) => get().mine.some((m) => m.ownedId === ownedId),
    }),
    {
      name: "gachaflix.community",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ mine: s.mine }),
      skipHydration: true,
      onRehydrateStorage: () => () => useCommunityStore.setState({ hydrated: true }),
    },
  ),
);
