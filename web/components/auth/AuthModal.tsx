"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, X } from "lucide-react";
import { useModal } from "@/lib/useModal";
import { Link } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/authStore";
import { AccountError, beginSocialLogin, completePasswordRecovery, loginAccount, recoverAccount, resendAccountEmail, signupAccount, validAccountEmail, validAccountPassword, verifyAccountEmail, type ServerAccount, type SocialProvider } from "@/lib/account";
import { useWalletStore } from "@/stores/walletStore";

type Step = "email" | "password" | "verify" | "reset" | "done";
const providers: SocialProvider[] = ["google", "apple", "microsoft"];
const providerNames = { google: "Google", apple: "Apple", microsoft: "Microsoft" };
const field = "h-14 w-full rounded-full border border-[#c2c2c2] bg-white px-5 text-base text-[#171717] outline-none transition focus:border-black focus:ring-1 focus:ring-black disabled:opacity-50";
const primary = "flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#171717] px-5 text-base font-medium text-white transition hover:bg-[#333] disabled:opacity-40";

function ProviderIcon({ provider }: { provider: SocialProvider }) {
  if (provider === "microsoft") return <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5"><path fill="#f25022" d="M0 0h9v9H0z" /><path fill="#7fba00" d="M11 0h9v9h-9z" /><path fill="#00a4ef" d="M0 11h9v9H0z" /><path fill="#ffb900" d="M11 11h9v9h-9z" /></svg>;
  if (provider === "apple") return <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M17.1 12.3c0-2 1.6-3 1.7-3.1-1-1.5-2.6-1.7-3.2-1.7-1.3-.1-2.5.8-3.2.8-.6 0-1.6-.8-2.7-.8-1.4 0-2.7.8-3.4 2-1.5 2.4-.4 6.1 1 8.1.7 1 1.4 2 2.5 1.9 1-.1 1.4-.6 2.7-.6s1.6.6 2.8.6 1.8-1 2.5-1.9c.8-1.1 1.1-2.2 1.1-2.3-.1 0-1.8-.7-1.8-3ZM15.1 6.2c.6-.8 1.1-1.8 1-2.9-1 .1-2.1.7-2.8 1.4-.6.6-1.1 1.7-1 2.7 1.1.1 2.1-.5 2.8-1.2Z" /></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.7 4.7 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z" /><path fill="#34A853" d="M12 22c2.7 0 5-1 6.6-2.4l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.9-1.8-5.7-4.2H3v2.6A10 10 0 0 0 12 22Z" /><path fill="#FBBC05" d="M6.3 13.8a6 6 0 0 1 0-3.6V7.6H3a10 10 0 0 0 0 8.8l3.3-2.6Z" /><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.8A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9 5.6l3.3 2.6A6 6 0 0 1 12 6Z" /></svg>;
}

export function AuthModal() {
  const t = useTranslations("account");
  const locale = useLocale();
  const { isModalOpen, modalMode, closeAuthModal, setModalMode, acceptSession: setAuthSession } = useAuthStore();
  const user = useAuthStore((state) => state.user);
  const grantDemoWelcome = (account: Pick<ServerAccount, "id">) => {
    // Client-side demo credit for testing the deployed demo, regardless of auth provider.
    const wallet = useWalletStore.getState();
    wallet.setWelcomeAccount(account.id);
    wallet.claimWelcome(account.id);
  };
  useEffect(() => {
    if (user) grantDemoWelcome(user);
  }, [user?.id]);
  const acceptSession = (user: ServerAccount) => {
    grantDemoWelcome(user);
    setAuthSession(user);
  };
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const signup = modalMode === "signup";
  const recover = modalMode === "recover";
  useModal(isModalOpen, () => { if (!lock.current) closeAuthModal(); }, panel);
  useEffect(() => {
    setStep("email"); setPassword(""); setCode(""); setVisible(false); setNotice(""); setError("");
    if (!isModalOpen) setEmail("");
  }, [isModalOpen, modalMode]);
  useEffect(() => {
    if (!isModalOpen) return;
    const timer = window.setTimeout(() => input.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [isModalOpen, step, modalMode]);

  const perform = async (operation: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setNotice("");
    try { await operation(); }
    catch (cause) { setError(t(`errors.${cause instanceof AccountError ? cause.code : "network"}`)); }
    finally { lock.current = false; setBusy(false); }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void perform(async () => {
      if (step === "email") {
        if (!validAccountEmail(email)) throw new AccountError("invalid");
        setEmail(email.trim());
        if (recover) { await recoverAccount(email, locale); setStep("reset"); }
        else setStep("password");
      } else if (step === "password") {
        if (signup) {
          if (!validAccountPassword(password)) throw new AccountError("invalid");
          const user = await signupAccount(email, password, locale);
          if (user) acceptSession(user); else { setPassword(""); setStep("verify"); }
        } else acceptSession(await loginAccount(email, password));
      } else if (step === "verify") acceptSession(await verifyAccountEmail(email, code));
      else if (step === "reset") { await completePasswordRecovery(email, code, password); setPassword(""); setStep("done"); }
    });
  };
  const social = (provider: SocialProvider) => void perform(async () => {
    const result = await beginSocialLogin(provider, window.location.href);
    if (result.user) acceptSession(result.user);
    else if (result.redirectUrl) window.location.assign(result.redirectUrl);
  });
  const back = () => { setStep("email"); setPassword(""); setCode(""); setError(""); setNotice(""); };
  if (!isModalOpen) return null;
  const title = step === "done" ? "passwordUpdated" : step === "verify" ? "verifyTitle" : step === "reset" ? "newPasswordTitle" : step === "password" ? (signup ? "createPasswordTitle" : "enterPasswordTitle") : recover ? "recoverTitle" : signup ? "createAccountTitle" : "welcomeTitle";
  const passwordField = <label className="block text-left text-sm font-medium">{t(step === "reset" ? "newPasswordTitle" : "password")}
    <span className="relative mt-2 block">
      <input ref={step === "password" ? input : undefined} aria-label={t(step === "reset" ? "newPasswordTitle" : "password")} type={visible ? "text" : "password"} autoComplete={signup || recover ? "new-password" : "current-password"} required minLength={signup || recover ? 12 : 1} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} disabled={busy} className={field + " pr-14"} />
      <button type="button" onClick={() => setVisible(!visible)} disabled={busy} aria-label={t(visible ? "hidePassword" : "showPassword")} className="absolute right-2 top-1 flex h-12 w-12 items-center justify-center rounded-full hover:bg-black/5">{visible ? <EyeOff size={19} /> : <Eye size={19} />}</button>
    </span>
    {signup && <span className="mt-2 block text-xs font-normal text-[#666]">{t("passwordHint")}</span>}
  </label>;
  return <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="account-dialog-title" tabIndex={-1} className="fixed inset-0 z-[100] overflow-y-auto bg-white text-[#171717] outline-none" style={{ colorScheme: "light" }}>
    <div className="flex min-h-full flex-col px-6">
      <header className="relative flex h-24 shrink-0 items-center justify-center"><span className="text-2xl font-semibold tracking-[0.12em]">VOILA</span><button type="button" onClick={closeAuthModal} disabled={busy} aria-label={t("close")} className="absolute right-0 flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/5 disabled:opacity-40"><X size={22} /></button></header>
      <main className="mx-auto flex w-full max-w-[360px] flex-1 flex-col justify-center py-8 sm:py-12">
        {step !== "email" && step !== "done" && <button type="button" disabled={busy} onClick={back} aria-label={t("backEmail")} className="mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-[#dedede] hover:bg-black/5"><ArrowLeft size={20} /></button>}
        <h2 id="account-dialog-title" className="text-center text-[30px] font-semibold leading-tight tracking-tight">{t(title)}</h2>
        {(step === "verify" || step === "reset") && <p className="mt-3 text-center text-sm leading-6 text-[#666]">{t("verificationCode")}</p>}
        {step !== "email" && step !== "done" && <div className="mt-6 flex min-h-14 items-center justify-between gap-3 rounded-full border border-[#dedede] px-5"><span className="min-w-0 truncate text-sm" title={email}>{email}</span><button type="button" disabled={busy} onClick={back} className="min-h-11 shrink-0 text-sm font-medium underline underline-offset-4">{t("editEmail")}</button></div>}
        {step === "email" && !recover && <>
          <div className="mt-8 space-y-3">{providers.map(provider => <button key={provider} type="button" disabled={busy} onClick={() => social(provider)} className="relative flex min-h-14 w-full items-center justify-center gap-3 rounded-full border border-[#c2c2c2] px-5 text-sm font-medium hover:bg-[#f7f7f7] disabled:opacity-40"><span className="absolute left-5"><ProviderIcon provider={provider} /></span>{t("continueProvider", { provider: providerNames[provider] })}</button>)}</div>
          <div className="my-6 flex items-center gap-4 text-xs text-[#666]"><span className="h-px flex-1 bg-[#dedede]" />{t("or")}<span className="h-px flex-1 bg-[#dedede]" /></div>
        </>}
        {step === "done" ? <div role="status" className="mt-7 text-center"><CheckCircle2 className="mx-auto mb-5 h-10 w-10 text-emerald-600" /><button onClick={() => setModalMode("login")} className={primary}>{t("backLogin")}</button></div> :
          <form onSubmit={submit} className={(step === "email" && !recover ? "" : "mt-6 ") + "space-y-5"}>
            {step === "email" && <label className="block text-left text-sm font-medium">{t("email")}<input ref={input} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} disabled={busy} className={"mt-2 " + field} /></label>}
            {step === "password" && passwordField}
            {(step === "verify" || step === "reset") && <label className="block text-left text-sm font-medium">{t("verificationCode")}<input ref={input} inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} disabled={busy} className={"mt-2 text-center tracking-[0.4em] " + field} /></label>}
            {step === "reset" && passwordField}
            {step === "password" && !signup && <button type="button" disabled={busy} onClick={() => setModalMode("recover")} className="min-h-8 text-sm underline underline-offset-4">{t("forgot")}</button>}
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-700">{error}</p>}
            <button disabled={busy} className={primary}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{t(busy ? "processing" : "continue")}</button>
          </form>}
        {step === "email" && <p className="mt-6 text-center text-sm">{t(recover ? "rememberPassword" : signup ? "haveAccount" : "noAccount")} <button disabled={busy} onClick={() => setModalMode(signup || recover ? "login" : "signup")} className="min-h-11 font-medium underline underline-offset-4">{t(signup || recover ? "loginTitle" : "signupTitle")}</button></p>}
        {(step === "verify" || step === "reset") && <button type="button" disabled={busy} onClick={() => void perform(async () => { if (step === "verify") await resendAccountEmail(email, locale); else await recoverAccount(email, locale); setCode(""); setNotice(t("verificationCode")); })} className="mt-4 min-h-11 text-sm underline underline-offset-4">{t("resendCode")}</button>}
        {notice && <p role="status" className="mt-3 text-center text-sm text-[#666]">{notice}</p>}
      </main>
      <footer className="pb-7 pt-5 text-center text-xs leading-6 text-[#666]"><p>{t("continueTerms")}</p><Link href="/legal/terms" className="underline underline-offset-4">{t("terms")}</Link><span className="mx-3">, </span><Link href="/legal/privacy" className="underline underline-offset-4">{t("privacy")}</Link></footer>
    </div>
  </div>;
}
