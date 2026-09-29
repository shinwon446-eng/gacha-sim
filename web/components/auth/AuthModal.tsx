"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useModal } from "@/lib/useModal";
import { PolicyNotice } from "@/components/legal/PolicyNotice";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Smartphone, X, Zap } from "lucide-react";
import { cn } from "@/lib/format";
import {
  DIAL_BY_LOCALE,
  OTP_LENGTH,
  PHONE_SPECS,
  digitsOnly,
  formatPhone,
  isPhoneComplete,
  newLocalOtp,
  providerConfigured,
  specFor,
  type AuthMode,
} from "@/lib/auth";
import { useAuthStore } from "@/stores/authStore";
import { GoogleMark, AppleMark } from "@/components/auth/ProviderMarks";

const EASE = [0.16, 1, 0.3, 1] as const;
const SPRING = { type: "spring" as const, stiffness: 430, damping: 34, mass: 0.7 };

/**
 * 로그인 · 회원가입 모달 — 타이핑 없이 한 번의 클릭으로 끝나는 세 갈래.
 *
 *   ① 상단 듀얼 탭(`layoutId` 스프링) + 하단 원터치 모드 스위처 — 로그인 ↔ 회원가입이 0.1초에 바뀐다
 *   ② Google / Apple 원클릭 (0.4초 핸드셰이크)
 *   ③ 휴대폰 빠른 인증 — 국가 알약 → 자동 하이픈 입력 → 6자리 OTP(1클릭 자동입력, 마지막 자리 입력 시 자동 완료)
 *
 * ⚠️ 공급자 키가 없으면 여기서 만들어지는 계정은 **이 기기 로컬 세션**이다(`lib/auth.ts`). 그때는
 *    ⑴ 문자를 보냈다고 하지 않고(`codeLocalHint`) ⑵ 토스트가 공급자 이름을 주장하지 않으며
 *    ⑶ 하단에 잔액이 이 브라우저에만 있다는 사실을 한 줄로 고지한다. 가짜 OAuth 토큰은 만들지 않는다(부록 C).
 *
 * SSR 안전: 모달은 `isModalOpen` 이 false 인 동안 아무것도 렌더하지 않고, OTP 코드는 클릭 시에만 생성된다.
 */
export function AuthModal() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const { isModalOpen, modalMode, pending, closeAuthModal, setModalMode, authenticateWithOAuth, authenticateWithPhone } = useAuthStore();

  const [dial, setDial] = useState(DIAL_BY_LOCALE[locale] ?? "+82");
  const [phone, setPhone] = useState("");
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const otpRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isSignup = modalMode === "signup";
  const phoneLive = providerConfigured("phone");
  const showLocalNote = !providerConfigured("google") || !providerConfigured("apple") || !phoneLive;

  // 모달을 닫으면 입력을 비운다 — 다음에 열었을 때 남의 번호가 남아 있지 않게
  useEffect(() => {
    if (isModalOpen) return;
    setPhone("");
    setOtp("");
    setOtpOpen(false);
    setCode(null);
  }, [isModalOpen]);

  // 로케일이 바뀌면 기본 국가번호도 따라간다(유저가 직접 고른 뒤에는 건드리지 않는다)
  useEffect(() => {
    setDial(DIAL_BY_LOCALE[locale] ?? "+82");
  }, [locale]);

  useModal(isModalOpen, closeAuthModal, panelRef);

  const oauth = (provider: "google" | "apple") =>
    void authenticateWithOAuth(provider, modalMode, (name) => {
      const live = providerConfigured(provider);
      if (isSignup) return live ? t("toastSignup", { name }) : t("toastSignupLocal");
      return live ? t("toastLogin", { name }) : t("toastLoginLocal");
    });

  const finishPhone = useCallback(() => {
    authenticateWithPhone(
      dial,
      phone,
      modalMode,
      isSignup
        ? phoneLive
          ? t("toastSignup", { name: t("phoneName") })
          : t("toastSignupLocal")
        : phoneLive
          ? t("toastLogin", { name: t("phoneName") })
          : t("toastLoginLocal"),
    );
  }, [authenticateWithPhone, dial, phone, modalMode, isSignup, phoneLive, t]);

  const requestCode = () => {
    if (!isPhoneComplete(phone, dial)) return;
    // live 에서는 서버가 문자를 보내고 서버가 검증한다. 로컬 세션에서는 이 자리에서 코드를 만들어 화면에 보여 준다.
    setCode(phoneLive ? null : newLocalOtp());
    setOtpOpen(true);
    setOtp("");
    window.setTimeout(() => otpRef.current?.focus(), 220);
  };

  const onOtpChange = (raw: string) => {
    const v = digitsOnly(raw).slice(0, OTP_LENGTH);
    setOtp(v);
    // 마지막 자리를 채우는 순간 엔터 없이 완료된다
    if (v.length === OTP_LENGTH) window.setTimeout(finishPhone, 120);
  };

  const phoneReady = isPhoneComplete(phone, dial);
  const spec = useMemo(() => specFor(dial), [dial]);

  return (
    <AnimatePresence>
      {isModalOpen && (
        <motion.div
          // ⚠️ key 가 없으면 framer 가 exit 완료를 놓쳐 오버레이가 `opacity: 0` 인 채로 남는다.
          //    보이지는 않지만 z-100 전체 화면이라 페이지 전체의 클릭을 먹는다(2026-09-28 실측).
          //    pointerEvents 를 variant 에 넣어 혹시 남더라도 클릭을 막지 않게 이중으로 잠근다.
          key="auth-overlay"
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/75 px-4 py-6 backdrop-blur-md sm:py-12"
          initial={{ opacity: 0, pointerEvents: "none" }}
          animate={{ opacity: 1, pointerEvents: "auto" }}
          exit={{ opacity: 0, pointerEvents: "none" }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAuthModal();
          }}
          role="dialog"
          aria-modal="true"
          aria-label={isSignup ? t("tabSignup") : t("tabLogin")}
        >
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            className="relative my-auto w-full max-w-[440px] rounded-2xl border border-hairline bg-surface p-6 outline-none sm:p-8"
            initial={{ opacity: 0, y: 34, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.32, ease: EASE }}
            style={{ boxShadow: "0 32px 100px rgba(0,0,0,0.5)" }}
          >
            <button
              type="button"
              onClick={closeAuthModal}
              aria-label={t("close")}
              className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" strokeWidth={2.4} />
            </button>

            {/* ① 슬라이딩 듀얼 탭 */}
            <div className="mt-7 flex rounded-xl border border-hairline bg-surface p-1">
              {(["login", "signup"] as AuthMode[]).map((m) => {
                const on = modalMode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModalMode(m)}
                    aria-pressed={on}
                    className={cn(
                      "relative flex-1 whitespace-nowrap rounded-lg px-2 py-2.5 text-sm font-bold transition-colors sm:text-[13px]",
                      on ? "text-obsidian" : "text-muted hover:text-white",
                    )}
                  >
                    {on && (
                      <motion.span
                        layoutId="authTabPill"
                        className="absolute inset-0 rounded-lg bg-[#f1eee7]"
                        transition={SPRING}
                      />
                    )}
                    <span className="relative">{m === "login" ? t("tabLogin") : t("tabSignup")}</span>
                  </button>
                );
              })}
            </div>

            <h2 className="mt-4 break-keep text-center font-display text-2xl font-black leading-tight tracking-[-0.02em] text-white sm:text-xl">
              {isSignup ? t("titleSignup") : t("titleLogin")}
            </h2>
            <p className="mt-1.5 break-keep text-center text-sm leading-relaxed text-secondary">
              {isSignup ? t("subSignup") : t("subLogin")}
            </p>

            {/* ② 원클릭 소셜 듀오 */}
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={() => oauth("google")}
                disabled={!!pending}
                className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-white text-[13.5px] font-bold text-[#1F1F1F] transition-transform duration-150 hover:scale-[1.015] active:scale-[0.99] disabled:opacity-60"
              >
                {pending === "google" ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.6} /> : <GoogleMark />}
                {isSignup ? t("googleSignup") : t("googleLogin")}
              </button>
              <button
                type="button"
                onClick={() => oauth("apple")}
                disabled={!!pending}
                className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-white/20 bg-[#0A0A0A] text-[13.5px] font-bold text-white transition-transform duration-150 hover:scale-[1.015] active:scale-[0.99] disabled:opacity-60"
              >
                {pending === "apple" ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.6} /> : <AppleMark />}
                {isSignup ? t("appleSignup") : t("appleLogin")}
              </button>
            </div>

            {/* ③ 휴대폰 빠른 인증 */}
            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-hairline" />
              <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.1em] text-faint">{t("orPhone")}</span>
              <span className="h-px flex-1 bg-hairline" />
            </div>

            <div className="rounded-xl border border-hairline bg-surface p-3">
              {/* 국가번호 알약 */}
              <div className="flex flex-wrap gap-1.5">
                {PHONE_SPECS.map((s) => {
                  const on = s.dial === dial;
                  return (
                    <button
                      key={s.dial}
                      type="button"
                      onClick={() => {
                        setDial(s.dial);
                        setPhone("");
                        setOtpOpen(false);
                      }}
                      aria-pressed={on}
                      className={cn(
                        "flex h-11 flex-none items-center gap-1 rounded-full border px-2 text-xs font-bold tabular-nums transition-colors",
                        on ? "border-gold-champagne/70 bg-gold-champagne/[0.14] text-gold-champagne" : "border-hairline text-secondary hover:text-white",
                      )}
                    >
                      <span aria-hidden>{s.flag}</span>
                      {s.dial}
                    </button>
                  );
                })}
              </div>

              {/* Step 1 — 번호 입력 */}
              <div className="mt-2.5 flex items-center gap-2">
                <span className="relative flex min-w-0 flex-1 items-center">
                  <Smartphone className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-faint" strokeWidth={2.2} />
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value, dial))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && phoneReady) requestCode();
                    }}
                    placeholder={formatPhone(spec.quickFill, dial)}
                    aria-label={t("phoneLabel")}
                    className="h-11 w-full rounded-lg border border-hairline bg-obsidian pl-8 pr-2.5 text-[13px] font-semibold tabular-nums text-white outline-none transition-colors placeholder:text-faint/60 focus:border-gold-champagne/60"
                  />
                </span>
                <button
                  type="button"
                  onClick={requestCode}
                  disabled={!phoneReady}
                  className={cn(
                    "h-11 flex-none whitespace-nowrap rounded-lg px-3 text-[12px] font-bold transition-all",
                    phoneReady
                      ? "bg-[#f1eee7] text-obsidian hover:brightness-110"
                      : "cursor-not-allowed border border-hairline text-faint",
                  )}
                >
                  {t("sendCode")}
                </button>
              </div>

              {/* 타이핑조차 귀찮을 때 — 한 번에 채운다 */}
              <button
                type="button"
                onClick={() => setPhone(formatPhone(spec.quickFill, dial))}
                className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-full border border-hairline px-2.5 py-1 text-[10.5px] font-semibold text-secondary transition-colors hover:border-gold-champagne/50 hover:text-gold-champagne"
              >
                <Zap className="h-3 w-3" strokeWidth={2.6} />
                {t("quickFill")}
              </button>

              {/* Step 2 — 6자리 인증 */}
              <AnimatePresence initial={false}>
                {otpOpen && (
                  <motion.div
                    key="otp"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.22, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <p className="text-[10.5px] text-faint">{phoneLive ? t("codeSentTo", { phone }) : t("codeLocalHint")}</p>
                    {/* 375px 에서 한 줄에 넣으면 자동입력 버튼의 코드가 잘린다 — 세로로 쌓고 sm 부터 나란히 */}
                    <div className="mt-1.5 grid gap-2 sm:grid-cols-[7.5rem_1fr]">
                      <input
                        ref={otpRef}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={otp}
                        onChange={(e) => onOtpChange(e.target.value)}
                        maxLength={OTP_LENGTH}
                        placeholder="000000"
                        aria-label={t("otpLabel")}
                        className="h-11 w-full rounded-lg border border-hairline bg-obsidian px-2 text-center font-mono text-[15px] font-bold tracking-[0.3em] text-white outline-none placeholder:text-faint/50 focus:border-gold-champagne/60"
                      />
                      {code && (
                        <button
                          type="button"
                          onClick={() => onOtpChange(code)}
                          className="flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-gold-champagne/60 bg-gold-champagne/[0.1] px-2 text-sm font-bold text-gold-champagne transition-colors hover:bg-gold-champagne/20"
                        >
                          <Zap className="h-3.5 w-3.5 flex-none" strokeWidth={2.6} />
                          <span className="truncate">{t("otpAutofill")}</span>
                          <span className="flex-none rounded bg-gold-champagne/20 px-1.5 py-0.5 font-mono text-xs tracking-wider">{code}</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ① 하단 원터치 모드 스위처 */}
            <button
              type="button"
              onClick={() => setModalMode(isSignup ? "login" : "signup")}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-gold-champagne/30 bg-gold-champagne/[0.05] px-3 py-3 text-[12px] transition-colors hover:border-gold-champagne/60 hover:bg-gold-champagne/[0.1]"
            >
              <span className="text-secondary">{isSignup ? t("switchToLoginQ") : t("switchToSignupQ")}</span>
              <span className="font-bold text-gold-champagne">{isSignup ? t("switchToLogin") : t("switchToSignup")}</span>
            </button>

            {/* 공급자 미연결 — 잔액이 이 브라우저에만 있다는 사실을 숨기지 않는다 */}
            <PolicyNotice kind="account" />
            {showLocalNote && <p className="mt-3 break-keep text-center text-xs leading-relaxed text-faint">{t("localNote")}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AuthModal;
