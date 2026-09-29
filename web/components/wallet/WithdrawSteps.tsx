"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowLeft, ArrowRight, Loader2, Mail, ShieldCheck, Timer } from "lucide-react";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { Money } from "@/components/ui/Money";
import { TOTP_DIGITS, totpNow, totpSecondsRemaining, verifyTotp } from "@/lib/totp";
import { WITHDRAW_NETWORK_BY_KEY, netReceive } from "@/lib/withdrawal";
import { HOLD_HOURS, validEmail } from "@/lib/withdrawHold";
import { twoFactorServerBacked } from "@/stores/securityStore";
import { accountConfigured } from "@/lib/account";
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
export function OtpStep({
  secret,
  onSuccess,
  onFallback,
  onBack,
}: {
  secret: string;
  onSuccess: () => void;
  onFallback: () => void;
  onBack: () => void;
}) {
  const t = useTranslations("withdraw");
  const [code, setCode] = useState("");
  const [left, setLeft] = useState(OTP_MAX_ATTEMPTS);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<{ code: string; left: number } | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const local = !twoFactorServerBacked();

  useEffect(() => {
    ref.current?.focus();
  }, []);

  // 서버 검증이 붙기 전에는 지금 유효한 코드를 보여 준다 — 등록된 시크릿에서 계산한 실제 값이다
  useEffect(() => {
    if (!local) return;
    let alive = true;
    const tick = async () => {
      try {
        const next = await totpNow(secret);
        if (alive) setHint({ code: next, left: totpSecondsRemaining() });
      } catch {
        if (alive) setHint(null);
      }
    };
    void tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [local, secret]);

  const submit = useCallback(
    async (raw: string) => {
      if (busy) return;
      setBusy(true);
      setError("");
      try {
        if (await verifyTotp(secret, raw)) {
          onSuccess();
          return;
        }
        const remaining = left - 1;
        setLeft(remaining);
        setCode("");
        if (remaining <= 0) {
          onFallback();
          return;
        }
        setError(t("otpWrong", { left: remaining }));
        ref.current?.focus();
      } finally {
        setBusy(false);
      }
    },
    [busy, secret, left, onSuccess, onFallback, t],
  );

  const onCode = (raw: string) => {
    const v = raw.replace(/\D+/g, "").slice(0, TOTP_DIGITS);
    setCode(v);
    setError("");
    if (v.length === TOTP_DIGITS) void submit(v);
  };

  return (
    <div className={cn(panel, "mt-4")}>
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 flex-none text-gold-champagne" strokeWidth={2.3} />
        <h3 className="break-keep text-[15px] font-bold text-white">{t("otpTitle")}</h3>
      </div>
      <p className="mt-1.5 break-keep text-xs leading-relaxed text-secondary">{t("otpBody")}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label={t("otpLabel")}
          value={code}
          disabled={busy}
          onChange={(e) => onCode(e.target.value)}
          maxLength={TOTP_DIGITS}
          placeholder="000000"
          className="h-12 w-[8.5rem] flex-none rounded-lg border border-hairline bg-canvas px-2 text-center font-mono text-[17px] font-bold tracking-[0.3em] text-white outline-none placeholder:text-faint/50 focus:border-gold-champagne"
        />
        {busy && <Loader2 className="h-4 w-4 animate-spin text-gold-champagne" strokeWidth={2.6} />}
        {local && hint && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onCode(hint.code)}
            className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gold-champagne/55 bg-gold-champagne/[0.09] px-2.5 text-[11.5px] font-bold text-gold-champagne transition-colors hover:bg-gold-champagne/20"
          >
            <span className="truncate">{t("otpUseCurrent")}</span>
            <span className="flex-none rounded bg-gold-champagne/20 px-1.5 py-0.5 font-mono tracking-wider">{hint.code}</span>
            <span className="flex-none tabular-nums text-gold-champagne/70">{hint.left}s</span>
          </button>
        )}
      </div>

      <p className="mt-2 text-[11px] tabular-nums text-faint">{t("otpAttempts", { left })}</p>
      {error && (
        <p role="alert" className="mt-2 rounded-md bg-red-400/10 px-2.5 py-2 text-xs leading-relaxed text-red-200">
          {error}
        </p>
      )}

      <div className="mt-4 grid gap-2">
        <button type="button" onClick={onFallback} className="flex min-h-12 items-center justify-center gap-2 break-keep rounded-lg border border-hairline px-3 text-[12px] font-semibold leading-snug text-gold-champagne transition-colors hover:border-gold-champagne">
          <Mail className="h-4 w-4 flex-none" strokeWidth={2.2} />
          {t("otpFallback", { hours: HOLD_HOURS })}
        </button>
        <button type="button" onClick={onBack} className="min-h-11 text-xs font-semibold text-secondary hover:text-white">
          {t("confirmBack")}
        </button>
      </div>
    </div>
  );
}

/**
 * 대체 경로 — **이메일 인증 / 72시간 출금**.
 * 인증이 끝나면 잔액을 동결하고 `PENDING_72H_HOLD` 로 기록한다. 대기 중에는 본인이 언제든 취소할 수 있다.
 *
 * ⚠️ 메일 발송은 서버만 할 수 있다. `NEXT_PUBLIC_AUTH_API_BASE` 가 없으면 **메일을 보냈다고 말하지 않고**
 *    이 기기에서 확인하는 코드임을 그대로 적는다(부록 C).
 */
export function EmailHoldStep({ defaultEmail, onVerified, onBack }: { defaultEmail?: string; onVerified: (email: string) => void; onBack: () => void }) {
  const t = useTranslations("withdraw");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [sent, setSent] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const codeRef = useRef<HTMLInputElement>(null);
  const serverEmail = accountConfigured();

  const send = () => {
    if (!validEmail(email)) {
      setError(t("emailInvalid"));
      return;
    }
    setError("");
    // 서버가 붙으면 여기서 발송을 요청하고 검증도 서버가 한다. 그전에는 이 기기에서 확인하는 코드다.
    const bytes = new Uint32Array(1);
    globalThis.crypto.getRandomValues(bytes);
    setSent(String(bytes[0] % 10 ** 6).padStart(6, "0"));
    setCode("");
    window.setTimeout(() => codeRef.current?.focus(), 200);
  };

  const onCode = (raw: string) => {
    const v = raw.replace(/\D+/g, "").slice(0, 6);
    setCode(v);
    setError("");
    if (v.length === 6) {
      if (sent && v === sent) onVerified(email.trim());
      else {
        setError(t("emailCodeWrong"));
        setCode("");
      }
    }
  };

  return (
    <div className={cn(panel, "mt-4")}>
      <div className="flex items-start gap-2 rounded-lg border border-gold-champagne/45 bg-gold-champagne/[0.07] p-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-gold-champagne" strokeWidth={2.3} />
        <p className="break-keep text-[12px] leading-relaxed text-gold-champagne">{t("holdBanner", { hours: HOLD_HOURS })}</p>
      </div>

      <label className="mt-3 block text-xs text-secondary">
        {t("emailLabel")}
        <input
          type="email"
          autoComplete="email"
          maxLength={254}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSent(null);
            setError("");
          }}
          placeholder="you@example.com"
          className="mt-1.5 h-12 w-full rounded-lg border border-hairline bg-canvas px-3 text-sm text-white outline-none placeholder:text-faint/60 focus:border-gold-champagne"
        />
      </label>
      <button
        type="button"
        onClick={send}
        disabled={!validEmail(email)}
        className={cn(
          "mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors",
          validEmail(email) ? "bg-[#f1eee7] text-obsidian hover:bg-gold-metallic" : "cursor-not-allowed border border-hairline text-faint",
        )}
      >
        <Mail className="h-4 w-4" strokeWidth={2.3} />
        {sent ? t("emailResend") : t("emailSend")}
      </button>

      {sent && (
        <div className="mt-3 border-t border-hairline pt-3">
          <p className="break-keep text-[11px] leading-relaxed text-faint">{serverEmail ? t("emailSentTo", { email: email.trim() }) : t("emailLocalHint")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              ref={codeRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label={t("emailCodeLabel")}
              value={code}
              onChange={(e) => onCode(e.target.value)}
              maxLength={6}
              placeholder="000000"
              className="h-12 w-[8.5rem] flex-none rounded-lg border border-hairline bg-canvas px-2 text-center font-mono text-[17px] font-bold tracking-[0.3em] text-white outline-none placeholder:text-faint/50 focus:border-gold-champagne"
            />
            {!serverEmail && (
              <button
                type="button"
                onClick={() => onCode(sent)}
                className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gold-champagne/55 bg-gold-champagne/[0.09] px-2.5 text-[11.5px] font-bold text-gold-champagne transition-colors hover:bg-gold-champagne/20"
              >
                <span className="truncate">{t("emailUseCode")}</span>
                <span className="flex-none rounded bg-gold-champagne/20 px-1.5 py-0.5 font-mono tracking-wider">{sent}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 rounded-md bg-red-400/10 px-2.5 py-2 text-xs leading-relaxed text-red-200">
          {error}
        </p>
      )}

      <p className="mt-3 flex items-start gap-1.5 break-keep text-[11px] leading-relaxed text-faint">
        <Timer className="mt-0.5 h-3 w-3 flex-none" strokeWidth={2.4} />
        {t("holdCancelNote")}
      </p>
      <button type="button" onClick={onBack} className="mt-2 min-h-11 w-full text-xs font-semibold text-secondary hover:text-white">
        {t("confirmBack")}
      </button>
    </div>
  );
}
