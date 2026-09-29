"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthMode, AuthProvider } from "@/lib/auth";
import { accountConfigured, getAccountSession, logoutAccount, type ServerAccount } from "@/lib/account";
export interface AuthUser { id: string; provider: AuthProvider; label: string; subLabel: string; createdAt: string; local: boolean }
export interface AuthToast { id: number; text: string; tone: "gold" | "neutral" }
interface AuthState {
  user: AuthUser | null; isModalOpen: boolean; modalMode: AuthMode; toast: AuthToast | null; hydrated: boolean;
  openAuthModal: (mode?: AuthMode) => void; closeAuthModal: () => void; setModalMode: (mode: AuthMode) => void;
  acceptSession: (user: ServerAccount) => void; clearSession: () => void; logout: (text: string) => Promise<void>;
  pushToast: (text: string, tone?: AuthToast["tone"]) => void; clearToast: (id: number) => void;
}
let sequence = 0;
export const useAuthStore = create<AuthState>()(persist((set, get) => ({
  user: null, isModalOpen: false, modalMode: "login", toast: null, hydrated: false,
  openAuthModal: (modalMode = "login") => set({ isModalOpen: true, modalMode }),
  closeAuthModal: () => set({ isModalOpen: false }), setModalMode: (modalMode) => set({ modalMode }),
  acceptSession: (user) => set({ user: { id: user.id, label: user.email, provider: "email", subLabel: user.email, createdAt: user.createdAt, local: false }, isModalOpen: false }),
  clearSession: () => set({ user: null, isModalOpen: false }),
  logout: async (text) => {
    if (get().user && !get().user?.local) await logoutAccount();
    set({ user: null, isModalOpen: false }); get().pushToast(text, "neutral");
  },
  pushToast: (text, tone = "gold") => {
    const id = ++sequence; set({ toast: { id, text, tone } });
    if (typeof window !== "undefined") window.setTimeout(() => get().clearToast(id), 5000);
  },
  clearToast: (id) => set(s => s.toast?.id === id ? { toast: null } : s),
}), {
  name: "voila-auth-v1", storage: createJSONStorage(() => localStorage),
  // A server identity must be restored from its verified cookie, never localStorage.
  partialize: () => ({ user: null }), skipHydration: true,
  merge: (_persisted, current) => ({ ...current, user: null }),
}));
export async function rehydrateAuth() {
  await useAuthStore.persist.rehydrate();
  if (accountConfigured()) {
    try { useAuthStore.getState().acceptSession(await getAccountSession()); }
    catch { useAuthStore.getState().clearSession(); }
  }
  useAuthStore.setState({ hydrated: true });
}
