"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthMode, AuthProvider } from "@/lib/auth";
import { accountConfigured, browserAccountsEnabled, getAccountSession, logoutAccount, updateAccountNickname, type ServerAccount } from "@/lib/account";
import { useSecurityStore } from "@/stores/securityStore";
export interface AuthUser { id: string; provider: AuthProvider; label: string; subLabel: string; createdAt: string; local: boolean; email?: string; nickname?: string }
export interface AuthToast { id: number; text: string; tone: "gold" | "neutral" }
interface AuthState {
  user: AuthUser | null; isModalOpen: boolean; modalMode: AuthMode; toast: AuthToast | null; hydrated: boolean;
  openAuthModal: (mode?: AuthMode) => void; closeAuthModal: () => void; setModalMode: (mode: AuthMode) => void;
  acceptSession: (user: ServerAccount) => void; clearSession: () => void; logout: (text: string) => Promise<void>;
  updateNickname: (nickname: string) => Promise<boolean>;
  pushToast: (text: string, tone?: AuthToast["tone"]) => void; clearToast: (id: number) => void;
}
let sequence = 0;
export const useAuthStore = create<AuthState>()(persist((set, get) => ({
  user: null, isModalOpen: false, modalMode: "login", toast: null, hydrated: false,
  openAuthModal: (modalMode = "login") => set({ isModalOpen: true, modalMode }),
  closeAuthModal: () => set({ isModalOpen: false }), setModalMode: (modalMode) => set({ modalMode }),
  acceptSession: (user) => {
    if (get().user?.id !== user.id) useSecurityStore.getState().reset(user.id);
    set({ user: { id: user.id, label: user.nickname || user.email, nickname: user.nickname, email: user.email, provider: "email", subLabel: user.email, createdAt: user.createdAt, local: browserAccountsEnabled() && user.local === true }, isModalOpen: false });
  },
  updateNickname: async (nickname) => {
    const id = get().user?.id;
    if (!id) return false;
    const updated = await updateAccountNickname(nickname);
    if (get().user?.id !== id || updated.id !== id) return false;
    get().acceptSession(updated);
    return true;
  },
  clearSession: () => { useSecurityStore.getState().reset(null); set({ user: null, isModalOpen: false }); },
  logout: async (text) => {
    if (get().user) await logoutAccount();
    get().clearSession(); get().pushToast(text, "neutral");
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
    catch {
      // A slow initial session lookup must not close a login dialog the user just opened.
      if (!useAuthStore.getState().user) useSecurityStore.getState().reset(null);
    }
  }
  useAuthStore.setState({ hydrated: true });
}
