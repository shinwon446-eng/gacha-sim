"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { LogIn, LogOut, Smartphone } from "lucide-react";
import { cn } from "@/lib/format";
import { useAuthStore } from "@/stores/authStore";
import { GoogleMark, AppleMark } from "@/components/auth/ProviderMarks";

const EASE = [0.16, 1, 0.3, 1] as const;

function ProviderBadge({ provider }: { provider: "google" | "apple" | "phone" }) {
  if (provider === "google") return <GoogleMark className="h-3.5 w-3.5" />;
  if (provider === "apple") return <AppleMark className="h-3.5 w-3.5 text-white" />;
  return <Smartphone className="h-3.5 w-3.5 text-gold-champagne" strokeWidth={2.4} />;
}

/** 초록 온라인 도트 */
function OnlineDot() {
  return (
    <span className="relative flex h-1.5 w-1.5 flex-none">
      <motion.span
        className="absolute inset-0 rounded-full bg-emerald-400"
        animate={{ opacity: [1, 0.35, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </span>
  );
}

/**
 * 헤더 우측 인증 컨트롤 — 다섯 페이지 헤더가 이 하나를 쓴다.
 *
 * **비로그인** `[로그인]`(고스트) + `[회원가입]`(샴페인 골드 캡슐)이 분리돼 보인다.
 *   375px 헤더는 이미 여유가 없으므로(부록 A ⑤) sm 미만에서는 골드 아이콘 버튼 하나로 접고,
 *   모달 상단 듀얼 탭이 회원가입을 한 번의 탭 거리로 유지한다.
 * **로그인** 공급자 마크 + 계정 식별명 + 초록 온라인 도트 프로필 캡슐, 옆에 `[로그아웃]` 퀵 버튼(sm 이상).
 *   캡슐을 누르면 계정·로그아웃이 들어 있는 슬림 드롭다운이 열린다(모바일의 로그아웃 경로).
 *
 * 하이드레이션 전에는 `user` 가 항상 null 이라(스토어 `skipHydration`) 서버·클라 첫 렌더가 같다.
 */
export function HeaderAuthControl({ className }: { className?: string }) {
  const t = useTranslations("auth");
  const user = useAuthStore((s) => s.user);
  const openAuthModal = useAuthStore((s) => s.openAuthModal);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const signOut = () => {
    setOpen(false);
    logout(t("toastLogout"));
  };

  if (!user) {
    return (
      <span className={cn("flex flex-none items-center gap-1.5", className)}>
        {/* sm 미만 — 헤더 폭 예산 때문에 골드 아이콘 하나로 접는다 */}
        <button
          type="button"
          onClick={() => openAuthModal("login")}
          aria-label={t("login")}
          className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-gradient-to-r from-gold-metallic to-gold-champagne text-obsidian transition-transform hover:scale-105 sm:hidden"
        >
          <LogIn className="h-3.5 w-3.5" strokeWidth={2.6} />
        </button>

        <button
          type="button"
          onClick={() => openAuthModal("login")}
          className="hidden h-9 flex-none items-center whitespace-nowrap rounded-md px-2 text-xs font-semibold text-white transition-colors hover:text-gold-champagne sm:flex"
        >
          {t("login")}
        </button>
        <button
          type="button"
          onClick={() => openAuthModal("signup")}
          className="hidden h-9 flex-none items-center whitespace-nowrap rounded-full bg-gold-champagne px-3 text-xs font-bold text-obsidian transition-transform hover:scale-[1.04] sm:flex"
          style={{ boxShadow: "0 0 20px rgba(230,202,101,0.32)" }}
        >
          {t("signup")}
        </button>
      </span>
    );
  }

  return (
    <div ref={ref} className={cn("relative flex flex-none items-center gap-1.5", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={user.label}
        className="glass-dark flex h-7 flex-none items-center gap-1.5 whitespace-nowrap rounded-full px-2 transition-colors hover:border-gold-champagne lg:h-9 lg:px-2.5"
      >
        <ProviderBadge provider={user.provider} />
        <span className="hidden max-w-[104px] truncate text-[11px] font-semibold text-white sm:inline">{user.label}</span>
        <OnlineDot />
      </button>

      {/* 데스크톱 1클릭 로그아웃 */}
      <button
        type="button"
        onClick={signOut}
        className="hidden h-9 flex-none items-center gap-1 whitespace-nowrap rounded-md border border-hairline px-2.5 text-[11px] font-semibold text-muted transition-colors hover:border-gold-champagne/50 hover:text-gold-champagne lg:flex"
      >
        <LogOut className="h-3.5 w-3.5" strokeWidth={2.3} />
        {t("logout")}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            className="border-metallic-subtle absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl bg-obsidian p-1.5 shadow-2xl"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: EASE }}
          >
            <div className="flex items-center gap-2 rounded-lg bg-surface px-2.5 py-2">
              <ProviderBadge provider={user.provider} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-bold text-white">{user.label}</span>
                <span className="block truncate text-[10px] text-faint">{user.local ? t("accountLocal") : user.subLabel}</span>
              </span>
              <OnlineDot />
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] font-semibold text-secondary transition-colors hover:bg-elevation hover:text-gold-champagne"
            >
              <LogOut className="h-3.5 w-3.5 flex-none" strokeWidth={2.3} />
              {t("logout")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default HeaderAuthControl;
