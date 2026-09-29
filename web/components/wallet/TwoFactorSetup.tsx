"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, KeyRound, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { cn } from "@/lib/format";
import { TOTP_DIGITS, groupSecret, otpauthUri } from "@/lib/totp";
import { useSecurityStore } from "@/stores/securityStore";
import { AccountError } from "@/lib/account";
import { beginTotpSetup, confirmTotpSetup } from "@/lib/security";
import { LoginRequired } from "@/components/auth/LoginRequired";
import { useAuthStore } from "@/stores/authStore";

/**
 * Google OTP(2FA) 등록 — 출금 모달 인라인 스텝과 마이페이지 보안 설정이 **같은 컴포넌트**를 쓴다.
 *
 *   Step 1 앱 연결   — 표준 `otpauth://` QR + 수동 입력용 시크릿(복사)
 *   Step 2 등록 확인 — 6자리 입력 후 확인하면 보안 상태를 저장한다.
 *
 * 시크릿은 컴포넌트가 살아 있는 동안 한 번만 만들어진다 — 리렌더마다 새로 만들면 유저가 방금 스캔한 QR 이 무효가 된다.
 */
export function TwoFactorSetup({ onEnabled, compact, autoStart = false }: { onEnabled?: () => void; compact?: boolean; autoStart?: boolean }) {
  const t = useTranslations("security");
  const user = useAuthStore((s) => s.user);
  const ta = useTranslations("account");
  const [setup, setSetup] = useState<{ secret: string; setupId: string } | null>(null);
  const secret = setup?.secret ?? "";
  const uri = useMemo(() => otpauthUri({ secret, account: user?.email ?? user?.subLabel ?? "VOILA" }), [secret, user?.email, user?.subLabel]);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const autoStartedFor = useRef<string | null>(null);
  const prepare = useCallback(async () => {
    if (!user || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    const id = user.id;
    try {
      const next = await beginTotpSetup();
      if (useAuthStore.getState().user?.id === id) setSetup(next);
    } catch (cause) { setError(ta(`errors.${cause instanceof AccountError ? cause.code : "network"}`)); }
    finally { inFlight.current = false; setBusy(false); }
  }, [user, ta]);
  useEffect(() => {
    if (!autoStart || !user || autoStartedFor.current === user.id) return;
    autoStartedFor.current = user.id;
    void prepare();
  }, [autoStart, user, prepare]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { setError(t("copyFailed")); }
  }, [secret, t]);

  const submit = useCallback(
    async (raw: string) => {
      if (inFlight.current || !user || !setup || !/^\d{6}$/.test(raw)) return;
      inFlight.current = true; setBusy(true); setError("");
      const id = user.id;
      try {
        const status = await confirmTotpSetup(setup.setupId, raw);
        if (useAuthStore.getState().user?.id !== id) return;
        useSecurityStore.getState().accept(id, status);
        setSetup(null);
        onEnabled?.();
      } catch (cause) {
        setError(cause instanceof AccountError && cause.code === "credentials" ? t("codeWrong") : ta(`errors.${cause instanceof AccountError ? cause.code : "network"}`));
        setCode(""); codeRef.current?.focus();
      } finally { inFlight.current = false; setBusy(false); }
    },
    [user, setup, onEnabled, ta, t],
  );

  const onCode = (raw: string) => {
    const v = raw.replace(/\D+/g, "").slice(0, TOTP_DIGITS);
    setCode(v);
    setError("");
  };

  const stepCls = "border border-hairline rounded-xl bg-obsidian p-4";
  const label = "flex items-center gap-2 text-[12px] font-bold text-white";

  if (!user) return <LoginRequired />;
  if (!setup && autoStart && !error) return <p role="status" className="mt-4 text-sm text-secondary">{ta("processing")}</p>;
  if (!setup) return <div className="mt-4 space-y-3">
    <p className="text-sm leading-7 text-secondary">{t("intro")}</p>
    {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
    <button type="button" disabled={busy} onClick={() => void prepare()} className="min-h-12 rounded-xl bg-[#f1eee7] px-5 text-sm font-semibold text-obsidian disabled:opacity-40">{busy ? ta("processing") : t("startSetup")}</button>
  </div>;
  return (
    <div className={cn("grid gap-3", compact ? "mt-3" : "mt-4")}>
      <p className="break-keep rounded-xl border border-gold-champagne/40 bg-gold-champagne/[0.07] p-3 text-[12.5px] leading-relaxed text-gold-champagne">
        {t("intro")}
      </p>

      {/* Step 1 — 앱 연결 */}
      <div className={stepCls}>
        <div className={label}>
          <Smartphone className="h-4 w-4 flex-none text-gold-champagne" strokeWidth={2.3} />
          {t("step1Title")}
        </div>
        <p className="mt-1 break-keep text-xs leading-relaxed text-secondary">{t("step1Body")}</p>
        <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <span className="flex-none rounded-lg bg-white p-2">
            <QRCodeSVG value={uri} size={140} level="M" bgColor="#ffffff" fgColor="#0B0B0B" includeMargin={false} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] uppercase tracking-[0.12em] text-faint">{t("manualKey")}</span>
            <code className="mt-1 block break-all rounded-md border border-hairline bg-canvas px-2.5 py-2 font-mono text-[13px] font-bold tracking-wider text-white">
              {groupSecret(secret)}
            </code>
            <button
              type="button"
              onClick={copy}
              className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-md border border-hairline px-3 text-xs font-semibold text-gold-champagne transition-colors hover:border-gold-champagne"
            >
              {copied ? <Check className="h-3.5 w-3.5" strokeWidth={2.6} /> : <Copy className="h-3.5 w-3.5" strokeWidth={2.2} />}
              {copied ? t("copied") : t("copyKey")}
            </button>
          </span>
        </div>
      </div>

      <div className="flex items-start gap-2 px-1 text-xs leading-relaxed text-secondary">
        <KeyRound className="mt-0.5 h-4 w-4 flex-none" />
        <p>{t("step2Body")}</p>
      </div>

      {/* Step 2 — 등록 확인 */}
      <form className={stepCls} onSubmit={event => { event.preventDefault(); void submit(code); }}>
        <div className={label}>
          <ShieldCheck className="h-4 w-4 flex-none text-gold-champagne" strokeWidth={2.3} />
          {t("step3Title")}
        </div>
        <p className="mt-1 break-keep text-xs leading-relaxed text-secondary">{t("step3Body")}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <input
            ref={codeRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label={t("codeLabel")}
            disabled={busy}
            value={code}
            onChange={(e) => onCode(e.target.value)}
            maxLength={TOTP_DIGITS}
            placeholder="000000"
            className="h-12 w-[8.5rem] flex-none rounded-lg border border-hairline bg-canvas px-2 text-center font-mono text-[17px] font-bold tracking-[0.3em] text-white outline-none placeholder:text-faint/50 focus:border-gold-champagne disabled:cursor-not-allowed"
          />
          <button type="submit" disabled={busy || code.length !== TOTP_DIGITS} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-[#f1eee7] px-4 text-sm font-semibold text-obsidian disabled:opacity-40">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {ta(busy ? "processing" : "verifyCode")}
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 rounded-md bg-red-400/10 px-2.5 py-2 text-xs leading-relaxed text-red-200">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}

export default TwoFactorSetup;
