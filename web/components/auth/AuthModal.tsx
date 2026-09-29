"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Mail, X } from "lucide-react";
import { useModal } from "@/lib/useModal";
import { Link } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/authStore";
import { AccountError, accountConfigured, loginAccount, recoverAccount, signupAccount, validPassword } from "@/lib/account";

export function AuthModal() {
  const t = useTranslations("account");
  const locale = useLocale();
  const { isModalOpen, modalMode, closeAuthModal, setModalMode, acceptSession } = useAuthStore();
  const panel = useRef<HTMLDivElement>(null);
  const [recover, setRecover] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const configured = accountConfigured();
  const signup = modalMode === "signup" && !recover;
  useModal(isModalOpen, () => { if (!busy) closeAuthModal(); }, panel);
  useEffect(() => {
    setPassword(""); setConfirm(""); setConsent(false); setNotice(""); setError(""); setRecover(modalMode === "recover");
    if (!isModalOpen) setEmail("");
  }, [isModalOpen, modalMode]);
  if (!isModalOpen) return null;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy || !configured) return;
    setError(""); setNotice("");
    if (signup && (!validPassword(password) || password !== confirm || !consent)) { setError(t("validation")); return; }
    setBusy(true);
    try {
      if (recover) { await recoverAccount(email, locale); setNotice(t("resetSent")); }
      else if (signup) { await signupAccount(email, password, locale); setNotice(t("verificationSent")); setPassword(""); setConfirm(""); }
      else acceptSession(await loginAccount(email, password));
    } catch (cause) { setError(t(`errors.${cause instanceof AccountError ? cause.code : "network"}`)); }
    finally { setBusy(false); }
  };
  const field = "mt-2 h-12 w-full rounded-xl border border-hairline bg-surface px-4 text-base text-white outline-none focus:border-gold-champagne disabled:opacity-50";
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => { if (!busy) closeAuthModal(); }}>
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="account-dialog-title" tabIndex={-1} onClick={event => event.stopPropagation()} className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-hairline bg-obsidian p-6 shadow-2xl sm:p-8">
      <button type="button" onClick={closeAuthModal} disabled={busy} aria-label={t("close")} className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-secondary hover:bg-white/10 disabled:opacity-40"><X className="h-5 w-5" /></button>
      <Mail className="mb-5 h-7 w-7 text-gold-champagne" aria-hidden="true" />
      <h2 id="account-dialog-title" className="pr-6 text-2xl font-semibold text-white">{t(recover ? "recoverTitle" : signup ? "signupTitle" : "loginTitle")}</h2>
      <p className="mt-2 text-sm leading-6 text-secondary">{t(recover ? "recoverIntro" : "emailIntro")}</p>
      {!configured && <p role="status" className="mt-5 rounded-xl border border-hairline bg-surface p-4 text-sm leading-6 text-secondary">{t("unavailable")}</p>}
      {notice ? <div role="status" className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-5"><CheckCircle2 className="mb-3 h-6 w-6 text-emerald-300" /><p className="text-sm leading-6 text-white">{notice}</p><button onClick={() => { setNotice(""); setRecover(false); setModalMode("login"); }} className="mt-4 min-h-11 text-sm font-semibold text-gold-champagne">{t("backLogin")}</button></div> : <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm text-secondary">{t("email")}<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} disabled={busy || !configured} className={field} /></label>
        {!recover && <label className="block text-sm text-secondary">{t("password")}<input type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 12 : 1} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} disabled={busy || !configured} className={field} />{signup && <span className="mt-2 block text-xs leading-5 text-muted">{t("passwordHint")}</span>}</label>}
        {signup && <><label className="block text-sm text-secondary">{t("confirmPassword")}<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirm} onChange={e => setConfirm(e.target.value)} disabled={busy || !configured} className={field} /></label><label className="flex min-h-11 items-start gap-3 text-sm leading-6 text-secondary"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} disabled={busy || !configured} className="mt-1 h-4 w-4 accent-[#d5bd87]" /><span>{t("consent")} <Link href="/legal/terms" className="underline underline-offset-4">{t("terms")}</Link> · <Link href="/legal/privacy" className="underline underline-offset-4">{t("privacy")}</Link></span></label></>}
        {error && <p role="alert" className="rounded-lg bg-red-400/10 p-3 text-sm leading-6 text-red-200">{error}</p>}
        <button disabled={busy || !configured} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f1eee7] px-4 text-sm font-semibold text-obsidian disabled:cursor-not-allowed disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{t(recover ? "sendReset" : signup ? "signupTitle" : "loginTitle")}</button>
      </form>}
      {!busy && !notice && <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-3 text-sm"><button type="button" onClick={() => { setRecover(false); setError(""); setModalMode(signup || recover ? "login" : "signup"); }} className="flex min-h-11 items-center gap-2 text-gold-champagne">{recover && <ArrowLeft className="h-4 w-4" />}{t(signup || recover ? "backLogin" : "signupTitle")}</button>{!signup && !recover && <button type="button" onClick={() => { setRecover(true); setError(""); setPassword(""); }} className="min-h-11 text-secondary underline underline-offset-4">{t("forgot")}</button>}</div>}
    </div>
  </div>;
}
