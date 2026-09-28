"use client";

/**
 * 인증 스토어 — 로그인 상태 · 모달 · 토스트.
 *
 * persist 키는 **`voila-auth-v1`** (새 스토어라 기존 `gachaflix.*` 데이터와 무관하다).
 * `skipHydration` + `AuthHydrator` 로 서버·클라 첫 렌더가 같다(통화 스토어와 같은 방식).
 *
 * ⚠️ **로그아웃은 지갑·보관함을 건드리지 않는다.** 잔액(`gachaflix.wallet`)과 보관함(`gachaflix.inventory`)은
 *    별도 스토어·별도 키이고, 여기서는 세션만 지운다(`tests/auth.test.ts` 가 강제).
 *
 * ⚠️ 공급자 키가 없으면(`providerConfigured` false) 만들어지는 것은 **이 기기 로컬 세션**이다.
 *    `user.local = true` 로 남기고 화면이 그 사실을 그대로 말한다 — 일어나지 않은 계정 연동을 주장하지 않는다(부록 C).
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { localHandle, maskPhone, providerConfigured, type AuthMode, type AuthProvider } from "@/lib/auth";

/** OAuth 핸드셰이크 연출 시간 — 실제 공급자가 붙으면 리다이렉트가 이 자리를 대신한다 */
const HANDSHAKE_MS = 400;

export interface AuthUser {
  id: string;
  provider: AuthProvider;
  /** 화면에 뜨는 계정 식별명 — `voila_a3f91` 또는 `010-****-5678` */
  label: string;
  /** 보조 라벨 — 공급자 이름 */
  subLabel: string;
  createdAt: string;
  /** 이 기기에만 저장된 세션인가(공급자 미연결) */
  local: boolean;
}

export interface AuthToast {
  id: number;
  text: string;
  tone: "gold" | "neutral";
}

export interface AuthState {
  user: AuthUser | null;
  isModalOpen: boolean;
  modalMode: AuthMode;
  /** 진행 중인 공급자 — 버튼 스피너용 */
  pending: AuthProvider | null;
  toast: AuthToast | null;
  hydrated: boolean;

  openAuthModal: (mode?: AuthMode) => void;
  closeAuthModal: () => void;
  setModalMode: (mode: AuthMode) => void;
  authenticateWithOAuth: (provider: "google" | "apple", mode: AuthMode, toastText: (name: string) => string) => Promise<void>;
  authenticateWithPhone: (countryCode: string, phoneNumber: string, mode: AuthMode, toastText: string) => void;
  logout: (toastText: string) => void;
  pushToast: (text: string, tone?: AuthToast["tone"]) => void;
  clearToast: (id: number) => void;
}

let toastSeq = 0;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isModalOpen: false,
      modalMode: "login",
      pending: null,
      toast: null,
      hydrated: false,

      openAuthModal: (mode = "login") => set({ isModalOpen: true, modalMode: mode, pending: null }),
      closeAuthModal: () => set({ isModalOpen: false, pending: null }),
      setModalMode: (modalMode) => set({ modalMode }),

      pushToast: (text, tone = "gold") => {
        toastSeq += 1;
        const id = toastSeq;
        set({ toast: { id, text, tone } });
        if (typeof window !== "undefined") {
          window.setTimeout(() => get().clearToast(id), 3600);
        }
      },
      clearToast: (id) => set((s) => (s.toast?.id === id ? { toast: null } : s)),

      authenticateWithOAuth: async (provider, _mode, toastText) => {
        if (get().pending) return;
        set({ pending: provider });
        // 공급자가 연결돼 있으면 여기서 실제 authorize 엔드포인트로 나간다(리다이렉트라 아래로 돌아오지 않는다).
        // 연결 전에는 이 기기 로컬 세션을 만든다 — 가짜 토큰을 만들지 않는다.
        await new Promise((r) => setTimeout(r, HANDSHAKE_MS));
        const local = !providerConfigured(provider);
        const createdAt = new Date().toISOString();
        set({
          user: {
            id: `${provider}:${createdAt}`,
            provider,
            label: localHandle(`${provider}${createdAt}`),
            subLabel: provider === "google" ? "Google" : "Apple",
            createdAt,
            local,
          },
          pending: null,
          isModalOpen: false,
        });
        get().pushToast(toastText(provider === "google" ? "Google" : "Apple"));
      },

      authenticateWithPhone: (countryCode, phoneNumber, _mode, toastText) => {
        const createdAt = new Date().toISOString();
        set({
          user: {
            id: `phone:${createdAt}`,
            provider: "phone",
            // 전체 번호는 저장하지 않는다 — 마스킹된 표시 문자열만 남는다
            label: maskPhone(phoneNumber, countryCode),
            subLabel: countryCode,
            createdAt,
            local: !providerConfigured("phone"),
          },
          pending: null,
          isModalOpen: false,
        });
        get().pushToast(toastText);
      },

      logout: (toastText) => {
        // 세션만 지운다 — 지갑 잔액·보관함은 다른 스토어·다른 persist 키다
        set({ user: null, isModalOpen: false, pending: null });
        get().pushToast(toastText, "neutral");
      },
    }),
    {
      name: "voila-auth-v1",
      storage: createJSONStorage(() => localStorage),
      // 세션만 저장한다. 모달 상태·토스트는 새로고침하면 사라져야 한다.
      partialize: (s) => ({ user: s.user }),
      skipHydration: true,
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ hydrated: true });
      },
    },
  ),
);

/** 마운트 후 한 번. `AuthHost` 가 호출한다. */
export function rehydrateAuth(): void {
  void useAuthStore.persist.rehydrate();
}
