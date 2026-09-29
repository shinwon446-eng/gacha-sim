"use client";

/**
 * 계정 보안 — Google OTP(2FA) 등록 상태.
 *
 * persist 키 `voila-security-v1`. `skipHydration` 이라 서버·클라 첫 렌더가 같다.
 *
 * ⚠️ **시크릿이 이 기기에만 있으면 그것은 관문이지 자물쇠가 아니다.** 기기를 장악한 공격자는 저장소를 고쳐
 *    지나갈 수 있다. 그래서 화면은 `serverBacked` 를 그대로 노출해, 서버 검증이 붙기 전에는 "이 기기에서 확인"
 *    이라고 적는다(부록 C). `NEXT_PUBLIC_AUTH_API_BASE` 가 붙으면 등록·검증을 서버로 옮기고 시크릿은
 *    클라이언트에 남기지 않는다 — 그때 바꿀 곳은 이 스토어와 `lib/account.ts` 두 군데뿐이다.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { accountConfigured } from "@/lib/account";

export interface SecurityState {
  /** 2FA 활성화 여부 — 출금 관문이 이 값을 본다 */
  twoFactorEnabled: boolean;
  /** Base32 TOTP 시크릿. 서버 검증이 붙으면 여기 남기지 않는다 */
  totpSecret: string | null;
  /** 활성화 시각(ISO) */
  enabledAt: string | null;
  hydrated: boolean;
  enableTwoFactor: (secret: string) => void;
  disableTwoFactor: () => void;
}

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set) => ({
      twoFactorEnabled: false,
      totpSecret: null,
      enabledAt: null,
      hydrated: false,
      enableTwoFactor: (secret) => set({ twoFactorEnabled: true, totpSecret: secret, enabledAt: new Date().toISOString() }),
      disableTwoFactor: () => set({ twoFactorEnabled: false, totpSecret: null, enabledAt: null }),
    }),
    {
      name: "voila-security-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ twoFactorEnabled: s.twoFactorEnabled, totpSecret: s.totpSecret, enabledAt: s.enabledAt }),
      skipHydration: true,
      onRehydrateStorage: () => () => useSecurityStore.setState({ hydrated: true }),
    },
  ),
);

export function rehydrateSecurity(): void {
  void useSecurityStore.persist.rehydrate();
}

/** 서버가 2FA 를 검증해 주는가 — 화면 문구가 이 값에 따라 달라진다 */
export const twoFactorServerBacked = (): boolean => accountConfigured();
