"use client";
import { create } from "zustand";
import { getSecurityStatus, type SecurityStatus } from "@/lib/security";

// Secrets and security state are never restored from browser storage.
interface SecurityState extends SecurityStatus {
  userId: string | null;
  hydrated: boolean;
  error: boolean;
  reset: (userId: string | null) => void;
  refresh: (userId: string) => Promise<void>;
  accept: (userId: string, status: SecurityStatus) => void;
}
export const useSecurityStore = create<SecurityState>((set, get) => ({
  userId: null, twoFactorEnabled: false, enabledAt: null, hydrated: false, error: false,
  reset: (userId) => set({ userId, twoFactorEnabled: false, enabledAt: null, hydrated: false, error: false }),
  accept: (userId, status) => { if (get().userId === userId) set({ ...status, hydrated: true, error: false }); },
  refresh: async (userId) => {
    if (get().userId !== userId) return;
    set({ error: false });
    try { get().accept(userId, await getSecurityStatus()); }
    catch { if (get().userId === userId) set({ hydrated: false, error: true }); }
  },
}));
