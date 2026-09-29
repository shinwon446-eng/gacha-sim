"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthMode } from "@/lib/auth";
import { AccountError, accountConfigured, browserAccountsEnabled, checkNicknameAvailability as requestNicknameAvailability, getAccountSession, logoutAccount, updateAccountNickname, updateAccountAvatar, type AccountProvider, type NicknameAvailability, type ServerAccount } from "@/lib/account";
import { useSecurityStore } from "@/stores/securityStore";
export interface AuthUser { id: string; provider: AccountProvider; label: string; subLabel: string; createdAt: string; local: boolean; email?: string; nickname?: string; nicknameUpdatedAt?: string; nicknameChangedAt?: string; nextNicknameChangeAt?: string; avatarUrl?: string | null; passwordFailures?: number; passwordChangedAt?: string; sessionVersion?: number; twoFactorEnabled?: boolean }
export interface AuthToast { id: number; text: string; tone: "gold" | "neutral" }
interface AuthState {
  user: AuthUser | null; isModalOpen: boolean; modalMode: AuthMode; toast: AuthToast | null; hydrated: boolean;
  openAuthModal: (mode?: AuthMode) => void; closeAuthModal: () => void; setModalMode: (mode: AuthMode) => void;
  acceptSession: (user: ServerAccount) => void; clearSession: () => void; logout: (text: string) => Promise<void>;
  updateNickname: (nickname: string) => Promise<boolean>;
  checkNicknameAvailability: (nickname: string) => Promise<NicknameAvailability>;
  updateAvatar: (avatar: string | null) => Promise<boolean>;
  refreshAccount: () => Promise<boolean>;
  setPasswordFailures: (accountId: string, failures: number) => void;
  pushToast: (text: string, tone?: AuthToast["tone"]) => void; clearToast: (id: number) => void;
}
let sequence = 0;
export const useAuthStore = create<AuthState>()(persist((set, get) => ({
  user: null, isModalOpen: false, modalMode: "login", toast: null, hydrated: false,
  openAuthModal: (modalMode = "login") => set({ isModalOpen: true, modalMode }),
  closeAuthModal: () => set({ isModalOpen: false }), setModalMode: (modalMode) => set({ modalMode }),
  acceptSession: (user) => {
    if (get().user?.id !== user.id) useSecurityStore.getState().reset(user.id);
    const nicknameAt = [user.nicknameUpdatedAt, user.nicknameChangedAt].filter((value): value is string => !!value).sort((a, b) => Date.parse(b) - Date.parse(a))[0];
    set({ user: { id: user.id, label: user.nickname || user.email, nickname: user.nickname, nicknameUpdatedAt: nicknameAt, nicknameChangedAt: nicknameAt, nextNicknameChangeAt: user.nextNicknameChangeAt, avatarUrl: user.avatarUrl, email: user.email, provider: user.provider ?? "email", passwordFailures: user.passwordFailures ?? 0, passwordChangedAt: user.passwordChangedAt, sessionVersion: user.sessionVersion ?? 0, twoFactorEnabled: user.twoFactorEnabled, subLabel: user.email, createdAt: user.createdAt, local: browserAccountsEnabled() && user.local === true }, isModalOpen: false });
  },
  updateNickname: async (nickname) => {
    const id = get().user?.id;
    if (!id) return false;
    const updated = await updateAccountNickname(nickname, id);
    if (get().user?.id !== id || updated.id !== id) return false;
    get().acceptSession(updated);
    return true;
  },
  checkNicknameAvailability: async (nickname) => {
    const id = get().user?.id;
    if (!id) return { available: false, reason: "taken" };
    return requestNicknameAvailability(nickname, id);
  },
  updateAvatar: async (avatar) => {
    const id = get().user?.id;
    if (!id) return false;
    const updated = await updateAccountAvatar(avatar, id);
    if (get().user?.id !== id || updated.id !== id) return false;
    get().acceptSession(updated);
    return true;
  },
  refreshAccount: async () => {
    const id = get().user?.id;
    if (!id) return false;
    const user = await getAccountSession();
    if (get().user?.id !== id || user.id !== id) return false;
    get().acceptSession(user); return true;
  },
  setPasswordFailures: (accountId, failures) => {
    if (!Number.isInteger(failures) || failures < 0 || failures > 5) return;
    set(s => s.user?.id === accountId ? { user: { ...s.user, passwordFailures: failures } } : s);
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

// Browser storage events reach every other open tab. A password change or closure
// removes the session and increments its version, so old tabs cannot keep their UI session.
if (typeof window !== "undefined") {
  const host = window as Window & { __accountSessionCleanup?: () => void };
  host.__accountSessionCleanup?.();
  const sync = (event: StorageEvent) => {
    const user = useAuthStore.getState().user;
    if (user && event.key === "voila.account-revocation.v1") {
      try { if (JSON.parse(event.newValue ?? "{}").accountId === user.id) useAuthStore.getState().clearSession(); } catch { /* Ignore malformed unrelated storage. */ }
    }
    if (!user?.local || !browserAccountsEnabled()) return;
    if (event.key === "voila.browser-session.v1" && event.newValue !== user.id) useAuthStore.getState().clearSession();
    if (event.key === "voila.browser-accounts.v1") {
      try {
        const record = (JSON.parse(event.newValue ?? "[]") as { user: ServerAccount }[]).find(a => a.user.id === user.id);
        if (!record || (record.user.sessionVersion ?? 0) !== (user.sessionVersion ?? 0)) useAuthStore.getState().clearSession();
      } catch { useAuthStore.getState().clearSession(); }
    }
    if (event.key === null) useAuthStore.getState().clearSession();
  };
  const recheck = () => {
    const user = useAuthStore.getState().user;
    if (!user || document.visibilityState === "hidden") return;
    void getAccountSession().then(account => {
      if (useAuthStore.getState().user?.id !== user.id) return;
      if (account.id !== user.id || (account.sessionVersion ?? 0) !== (user.sessionVersion ?? 0)) useAuthStore.getState().clearSession();
    }).catch(error => {
      if (error instanceof AccountError && error.code === "credentials" && useAuthStore.getState().user?.id === user.id) useAuthStore.getState().clearSession();
    });
  };
  window.addEventListener("storage", sync);
  window.addEventListener("focus", recheck);
  document.addEventListener("visibilitychange", recheck);
  host.__accountSessionCleanup = () => { window.removeEventListener("storage", sync); window.removeEventListener("focus", recheck); document.removeEventListener("visibilitychange", recheck); };
}
