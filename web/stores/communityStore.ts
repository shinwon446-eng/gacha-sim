"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { canReview, REVIEW_MAX_CHARS, REVIEW_MIN_CHARS } from "@/lib/community";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useAuthStore } from "@/stores/authStore";
export interface MyReview {
  id: string; ownedId: string; boxSlug: string; itemId: string; text: string; rating: number;
  photo?: string; at: string; updatedAt?: string; publishedAt?: string; bonusUsdt: number;
  source?: "member" | "example"; authorName?: string;
}
interface CommunityState {
  mine: MyReview[]; hydrated: boolean;
  add: (r: Omit<MyReview, "id" | "at">) => MyReview;
  update: (id: string, patch: Pick<MyReview, "text" | "rating" | "photo">) => void;
  remove: (id: string) => void;
  hasReviewed: (ownedId: string) => boolean;
}
/** Persist before committing state: a full or disabled storage must not appear to save successfully. */
function persistReviews(mine: MyReview[]) {
  if (typeof window !== "undefined") window.localStorage.setItem("gachaflix.community", JSON.stringify({ state: { mine }, version: 0 }));
}
function validateReview(review: Pick<MyReview, "rating" | "text">) {
  if (!Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5 || review.text.trim().length < REVIEW_MIN_CHARS || review.text.trim().length > REVIEW_MAX_CHARS) throw new Error("invalid-review");
}
export const useCommunityStore = create<CommunityState>()(
  persist((set, get) => ({
    mine: [], hydrated: false,
    add: r => {
      validateReview(r);
      const item = useInventoryStore.getState().items.find(item => item.id === r.ownedId);
      if (get().hasReviewed(r.ownedId)) throw new Error("duplicate");
      if (!item || !canReview(item, [])) throw new Error("ineligible-review-item");
      const now = new Date().toISOString();
      const rec: MyReview = { ownedId: item.id, rating: r.rating, photo: r.photo, text: r.text.trim(), itemId: item.itemId, boxSlug: item.boxSlug, bonusUsdt: 0, id: `my_${crypto.randomUUID()}`, at: now, publishedAt: now, source: "member", authorName: useAuthStore.getState().user?.nickname || undefined };
      const mine = [rec, ...get().mine];
      persistReviews(mine); set({ mine }); return rec;
    },
    update: (id, patch) => {
      validateReview(patch);
      if (!get().mine.some(r => r.id === id)) throw new Error("review-not-found");
      const ownedId = get().mine.find(r => r.id === id)!.ownedId;
      if (!useInventoryStore.getState().items.some(item => item.id === ownedId)) throw new Error("review-forbidden");
      const mine = get().mine.map(r => r.id === id ? { ...r, text: patch.text.trim(), rating: patch.rating, photo: patch.photo, updatedAt: new Date().toISOString() } : r);
      persistReviews(mine); set({ mine });
    },
    remove: id => {
      const review = get().mine.find(r => r.id === id);
      if (!review) throw new Error("review-not-found");
      if (!useInventoryStore.getState().items.some(item => item.id === review.ownedId)) throw new Error("review-forbidden");
      const mine = get().mine.filter(r => r.id !== id);
      persistReviews(mine); set({ mine });
    },
    hasReviewed: ownedId => get().mine.some(m => m.ownedId === ownedId),
  }), {
    name: "gachaflix.community", storage: createJSONStorage(() => localStorage),
    partialize: s => ({ mine: s.mine }), skipHydration: true,
    onRehydrateStorage: () => () => useCommunityStore.setState({ hydrated: true }),
  }),
);

/** Subscribe only while a review surface is mounted; cross-tab updates use persisted member records. */
export function subscribeCommunityReviews(): () => void {
  if (typeof window === "undefined") return () => {};
  const sync = () => { void useCommunityStore.persist.rehydrate(); };
  const storage = (event: StorageEvent) => {
    if (event.key !== "gachaflix.community" && event.key !== null) return;
    // Rehydrating an absent key preserves Zustand's in-memory state; explicitly clear it instead.
    if (event.newValue === null) useCommunityStore.setState({ mine: [], hydrated: true });
    else sync();
  };
  if (!useCommunityStore.getState().hydrated) sync();
  window.addEventListener("storage", storage);
  return () => window.removeEventListener("storage", storage);
}
