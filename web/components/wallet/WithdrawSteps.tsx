"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowLeft, ArrowRight, Loader2, Mail, ShieldCheck, Timer } from "lucide-react";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { Money } from "@/components/ui/Money";
import { AccountError, browserAccountsEnabled } from "@/lib/account";
import { sendWithdrawalEmail, verifyWithdrawalEmail, verifyWithdrawalOtp, type WithdrawalDraft, type WithdrawalProof } from "@/lib/security";
import { WITHDRAW_NETWORK_BY_KEY, netReceive } from "@/lib/withdrawal";
import { HOLD_HOURS, validEmail } from "@/lib/withdrawHold";


import type { Network } from "@/lib/depositAddress";

/** OTP 를 몇 번 틀리면 대체 수단으로 보내는가 */
export const OTP_MAX_ATTEMPTS = 3;

const panel = "border border-hairline rounded-xl bg-obsidian p-4";

/**
 * 2단계 — **수수료 제외 후 출금 확인**.
 * 실수령액이 화면에서 가장 큰 숫자다. 주소는 줄여 쓰지 않고 전부 보여 준다(오타는 여기서만 잡을 수 있다).
 */
export function ConfirmStep({
  network,
  address,
  amountUsdt,
  onBack,
  onNext,
}: {
  network: Network;
  address: string;
  amountUsdt: number;
  onBack: () => void;
  onNext: () => void;
}) {
  const t = useTranslations("withdraw");
  const { fmt } = useCurrency();
  const meta = WITHDRAW_NETWORK_BY_KEY[network];
  const net = netReceive(amountUsdt, network);

  return (
    <div className={cn(panel, "mt-4")}>
      <div className="caption-luxury">{t("confirmEyebrow")}</div>
      <h3 className="mt-1 break-keep text-[15px] font-bold text-white">{t("confirmTitle")}</h3>

      <dl className="mt-3 grid gap-2 text-xs">
        <div className="flex items-baseline justify-between gap-4 border-b border-hairline pb-2">
          <dt className="flex-none text-faint">{t("network")}</dt>
          <dd className="text-right font-mono text-secondary">{meta.token}</dd>
        </div>
        <div className="border-b border-hairline pb-2">
          <dt className="text-faint">{t("address")}</dt>
          {/* 오타 확인용 — 전체를 그대로 보여 준다 */}
          <dd className="mt-1 break-all rounded-md border border-gold-champagne/35 bg-gold-champagne/[0.06] px-2.5 py-2 font-mono text-[12px] leading-relaxed text-white">{address}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="flex-none text-faint">{t("amount")}</dt>
          <dd className="text-right font-mono text-secondary">{fmt(amountUsdt)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-b border-hairline pb-2">
          <dt className="flex-none text-faint">{t("feeLine")}</dt>
          <dd className="text-right font-mono text-crimson">− {fmt(meta.feeUsdt)}</dd>
        </div>
      </dl>

      {/* 실수령액 — 이 화면의 주인공 */}
      <div className="mt-3 rounded-xl border border-gold-champagne/50 bg-gold-champagne/[0.08] p-3.5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-champagne">{t("netLabel")}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-gold-gradient font-display text-[15px] font-black leading-none">=</span>
          <Money value={net} size="lg" numberClassName="text-gold-gradient" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr]">
        <button type="button" onClick={onBack} className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-hairline px-4 text-sm font-semibold text-secondary transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4" strokeWidth={2.3} />
          {t("confirmBack")}
        </button>
        <button type="button" onClick={onNext} className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#f1eee7] px-4 text-sm font-bold text-obsidian transition-colors hover:bg-gold-metallic">
          {t("confirmNext")}
          <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}

/**
 * 3~4단계 — **2차 인증 확인**. Google OTP 6자리.
 * 검증은 RFC 6238 실제 계산이다(`lib/totp.ts`) — 자릿수만 보는 관문이 아니다.
 * 3회 실패하면 이메일 · 72시간 대기 경로로 보낸다.
 */
export function OtpStep({ draft, onSuccess, onFallback, onBack }: {
  draft: WithdrawalDraft; onSuccess: (proof: WithdrawalProof) => void; onFallback: () => void; onBack: () => void;
}) {
  const t = useTranslations("withdraw");
  const ta = useTranslations("account");
  const [code, setCode] = useState("");
  const [left, setLeft] = useState(OTP_MAX_ATTEMPTS);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const submit = async (raw: string) => {
    if (lock.current || left <= 0) return;
    lock.current = true; setBusy(true); setError("");
    try { onSuccess(await verifyWithdrawalOtp(draft, raw)); }
    catch (cause) {
      setCode("");
      if (cause instanceof AccountError && ["credentials", "invalid", "rateLimit"].includes(cause.code)) {
        const remaining = cause.code === "rateLimit" ? 0 : left - 1;
        setLeft(remaining);
        if (remaining <= 0) { onFallback(); return; }
        setError(t("otpWrong", { left: remaining }));
      } else setError(ta(`errors.${cause instanceof AccountError ? cause.code : "network"}`));
    } finally { lock.current = false; setBusy(false); }
  };
  return <div className={cn(panel, "mt-4")}>
    <h3 className="text-base font-semibold text-white">{t("otpTitle")}</h3>
    <p className="mt-2 text-sm leading-7 text-secondary">{t("otpBody")}</p>
    <form onSubmit={e => { e.preventDefault(); if (code.length === 6) void submit(code); }}>
      <label className="mt-3 block text-sm text-secondary">{t("otpLabel")}<input autoFocus inputMode="numeric" autoComplete="one-time-code" value={code} disabled={busy} maxLength={6} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} className="mt-2 h-12 w-full rounded-lg border border-hairline bg-canvas px-3 font-mono tracking-widest text-white" /></label>
      <p className="mt-2 text-xs text-muted">{t("otpAttempts", { left })}</p>
      {error && <p role="alert" className="mt-2 text-sm text-red-200">{error}</p>}
      <button disabled={busy || code.length !== 6} className="mt-3 min-h-12 w-full rounded-lg bg-[#f1eee7] px-4 text-sm font-semibold text-obsidian disabled:opacity-40">{ta(busy ? "processing" : "verifyCode")}</button>
    </form>
    <button type="button" disabled={busy} onClick={onFallback} className="mt-3 min-h-12 w-full rounded-lg border border-hairline px-3 text-sm text-gold-champagne">{t("otpFallback", { hours: HOLD_HOURS })}</button>
    <button type="button" disabled={busy} onClick={onBack} className="mt-2 min-h-11 w-full text-sm text-secondary">{t("confirmBack")}</button>
  </div>;
}

export function EmailHoldStep({ draft, email, onVerified, onBack }: {
  draft: WithdrawalDraft; email: string; onVerified: (proof: WithdrawalProof) => void; onBack: () => void;
}) {
  const t = useTranslations("withdraw");
  const ta = useTranslations("account");
  const [challenge, setChallenge] = useState<Awaited<ReturnType<typeof sendWithdrawalEmail>> | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const send = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setCode(""); setChallenge(null);
    try { setChallenge(await sendWithdrawalEmail(draft)); }
    catch (cause) { setError(ta(`errors.${cause instanceof AccountError ? cause.code : "network"}`)); }
    finally { lock.current = false; setBusy(false); }
  };
  const verify = async () => {
    if (lock.current || !challenge || code.length !== 6) return;
    if (Date.now() >= challenge.expiresAt) { setError(t("emailExpired")); return; }
    lock.current = true; setBusy(true); setError("");
    try { onVerified(await verifyWithdrawalEmail(draft, challenge.challengeId, code)); }
    catch (cause) { setCode(""); setError(ta(`errors.${cause instanceof AccountError ? cause.code : "network"}`)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <div className={cn(panel, "mt-4")}>
    <p className="rounded-lg border border-gold-champagne/40 p-3 text-sm leading-7 text-gold-champagne">{t("holdBanner", { hours: HOLD_HOURS })}</p>
    <p className="mt-3 text-sm leading-7 text-secondary">{browserAccountsEnabled() ? ta("browserEmailNote") : t("registeredEmailOnly")}</p>
    <p className="mt-2 break-all text-sm text-white">{email}</p>
    <button type="button" disabled={busy} onClick={() => void send()} className="mt-3 min-h-12 w-full rounded-lg bg-[#f1eee7] px-4 text-sm font-semibold text-obsidian disabled:opacity-40">{busy ? ta("processing") : t(challenge ? "emailResend" : "emailSend")}</button>
    {challenge && <form onSubmit={e => { e.preventDefault(); void verify(); }} className="mt-4">
      <p role="status" className="text-sm text-secondary">{challenge.browserCode ? ta("browserCode", { code: challenge.browserCode }) : t("emailSentTo", { email: challenge.emailMasked })}</p>
      <label className="mt-3 block text-sm text-secondary">{t("emailCodeLabel")}<input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} disabled={busy} className="mt-2 h-12 w-full rounded-lg border border-hairline bg-canvas px-3 font-mono tracking-widest text-white" /></label>
      <button disabled={busy || code.length !== 6} className="mt-3 min-h-12 w-full rounded-lg bg-[#f1eee7] px-4 text-sm font-semibold text-obsidian disabled:opacity-40">{ta(busy ? "processing" : "verifyCode")}</button>
    </form>}
    {error && <p role="alert" className="mt-3 text-sm text-red-200">{error}</p>}
    <p className="mt-3 text-xs leading-6 text-muted">{t("holdCancelNote")}</p>
    <button type="button" disabled={busy} onClick={onBack} className="mt-2 min-h-11 w-full text-sm text-secondary">{t("confirmBack")}</button>
  </div>;
}
