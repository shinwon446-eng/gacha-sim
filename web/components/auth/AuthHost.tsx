"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, LogOut } from "lucide-react";
import { cn } from "@/lib/format";
import { useAuthStore, rehydrateAuth } from "@/stores/authStore";
import { useSecurityStore } from "@/stores/securityStore";
import { AuthModal } from "@/components/auth/AuthModal";

/**
 * 전역 인증 호스트 — `app/[locale]/layout.tsx` 한 곳에 마운트한다.
 *   ① 저장된 세션 복원(`skipHydration` 이라 마운트 후에만 적용 → 서버·클라 첫 렌더 동일)
 *   ② 로그인/회원가입 모달 — 어느 페이지에서든 열린다
 *   ③ 상단 확인 토스트 — 페이지마다 토스트를 따로 굴리지 않고 여기서 하나로 띄운다
 */
export function AuthHost() {
  const toast = useAuthStore((s) => s.toast);
  const userId = useAuthStore(s => s.user?.id);

  useEffect(() => {
    // Remove the old unscoped browser secret; account security is fetched from the server.
    try { localStorage.removeItem("voila-security-v1"); } catch { /* Storage may be disabled. */ }
    void rehydrateAuth();
  }, []);
  useEffect(() => { if (userId) void useSecurityStore.getState().refresh(userId); }, [userId]);

  return (
    <>
      <AuthModal />
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            aria-live="polite"
            className="pointer-events-none fixed inset-x-0 top-3 z-[110] flex justify-center px-4"
            initial={{ opacity: 0, y: -18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.97 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          >
            <span
              className={cn(
                "flex max-w-full items-center gap-2 rounded-full border bg-obsidian/95 px-4 py-2.5 text-[12px] font-bold backdrop-blur-md",
                toast.tone === "gold" ? "border-gold-champagne/60 text-gold-champagne" : "border-hairline text-white",
              )}
              style={toast.tone === "gold" ? { boxShadow: "0 0 30px rgba(230,202,101,0.28)" } : undefined}
            >
              {toast.tone === "gold" ? (
                <Check className="h-3.5 w-3.5 flex-none" strokeWidth={3} />
              ) : (
                <LogOut className="h-3.5 w-3.5 flex-none" strokeWidth={2.6} />
              )}
              <span className="truncate">{toast.text}</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default AuthHost;
