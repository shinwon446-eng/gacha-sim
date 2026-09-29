"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff, LockKeyhole, ShieldCheck, X } from "lucide-react";
import { useModal } from "@/lib/useModal";
import { AccountActionError, AccountError, changeAccountPasswordWithOtp, getPasswordChangeStatus, isSocialAccount, sendPasswordChangeOtpCode, sendPasswordUnlockCode, unlockPasswordChangeWithCode, validPassword, verifyCurrentPassword, type AccountProvider, type AccountVerificationCode } from "@/lib/account";
import { useAuthStore, type AuthUser } from "@/stores/authStore";

/** No translation-file dependency. Integration may override any Korean fallback. */
export const PASSWORD_CHANGE_COPY = {
  title: "비밀번호 변경", intro: "현재 비밀번호 확인과 6자리 2차 인증을 거쳐 비밀번호를 변경합니다.", start: "비밀번호 변경",
  loading: "계정 정보를 확인하고 있습니다…", socialTitle: "비밀번호 변경 불가 , 소셜 계정 안내",
  socialBody: "{provider} 소셜 계정으로 가입한 회원은 해당 소셜 서비스에서 비밀번호를 관리합니다. 플랫폼 내에서는 비밀번호를 변경할 수 없습니다.",
  currentTitle: "현재 비밀번호 확인", current: "현재 비밀번호", next: "확인", mismatchTitle: "현재 비밀번호 불일치",
  mismatch: "현재 비밀번호가 일치하지 않습니다. (오류 횟수: {count}/5회, 5회 오류 시 본인인증이 필요합니다)",
  lockedTitle: "5회 오류 , 본인인증 필요", lockedBody: "현재 비밀번호 입력이 잠겼습니다. 발급된 인증코드 6자리를 정확히 입력해야 잠금이 해제됩니다.",
  unlock: "본인인증하고 잠금 해제", unlocked: "본인인증이 완료되었습니다. 현재 비밀번호를 다시 확인해 주세요.",
  newTitle: "신규 비밀번호 설정 및 2차 인증", newPassword: "신규 비밀번호", repeat: "신규 비밀번호 확인", passwordRule: "12~128자로 입력해 주세요. 현재 비밀번호와 같은 비밀번호는 사용할 수 없습니다.",
  passwordLength: "신규 비밀번호는 12~128자로 입력해 주세요.", samePassword: "현재 비밀번호와 동일한 비밀번호로 변경할 수 없습니다.",
  repeatMismatch: "신규 비밀번호와 확인 입력이 일치하지 않습니다.", repeatMatch: "비밀번호가 일치합니다.",
  otp: "2차 인증 (OTP 6자리)", googleOtp: "Google Authenticator에 표시된 6자리 코드를 입력해 주세요.",
  issuedOtp: "인증코드를 발급받은 뒤, 발급된 6자리 코드를 정확히 입력해 주세요.", code: "본인인증 코드 6자리", send: "인증코드 발송", resend: "인증코드 다시 발송",
  sent: "가입 이메일 {email}로 인증코드를 발송했습니다.", browserCode: "현재 브라우저에서 발급된 인증코드: {code}",
  expires: "유효시간 {seconds}초", resendAfter: "{seconds}초 후 재발송 가능", expired: "인증코드가 만료되었습니다. 다시 발송해 주세요.",
  change: "비밀번호 변경 완료", busy: "확인 중…", show: "비밀번호 표시", hide: "비밀번호 숨기기", close: "닫기", cancel: "취소", retry: "다시 시도", confirm: "확인",
  doneTitle: "변경완료 , 모든 접속 로그아웃", doneBody: "비밀번호가 안전하게 변경되었습니다. 보안을 위해 모든 기기 및 접속에서 자동 로그아웃됩니다. 새 비밀번호로 다시 로그인해 주세요.",
  done: "확인 , 다시 로그인", login: "로그인 후 이용해 주세요.", network: "요청을 완료하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.",
  credentials: "로그인 상태가 변경되었습니다. 다시 로그인해 주세요.", invalid: "응답을 확인하지 못했습니다. 다시 시도해 주세요.",
  codeInvalid: "인증코드가 일치하지 않습니다. 발급된 6자리 코드를 확인해 주세요.", codeAttempts: "인증코드 오류가 5회 누적되었습니다. 재발송 가능 시간이 지나면 새 코드를 받아주세요.",
  verificationRequired: "현재 비밀번호 확인이 만료되었습니다. 처음부터 다시 확인해 주세요.", rateLimit: "요청이 많습니다. 잠시 후 다시 시도해 주세요.",
};
type Copy = typeof PASSWORD_CHANGE_COPY;
type Step = "closed" | "loading" | "social" | "current" | "mismatch" | "locked" | "new" | "done" | "loadError";
export interface PasswordChangeFlowProps {
  user?: AuthUser;
  /** Use autoStart for entry on section mount, or open/onClose for a controlled dialog. */
  autoStart?: boolean;
  open?: boolean;
  onClose?: () => void;
  onCompleted?: () => void;
  messages?: Partial<Copy>;
}

export function PasswordChangeFlow({ user: suppliedUser, autoStart = false, open, onClose, onCompleted, messages }: PasswordChangeFlowProps) {
  const storeUser = useAuthStore(s => s.user);
  const user = suppliedUser ?? storeUser;
  const copy = { ...PASSWORD_CHANGE_COPY, ...messages };
  const text = (key: keyof Copy, values: Record<string, string | number> = {}) => Object.entries(values).reduce((value, [name, replacement]) => value.replace(`{${name}}`, String(replacement)), copy[key]);
  const [step, setStep] = useState<Step>("closed");
  const [provider, setProvider] = useState<AccountProvider>(user?.provider ?? "email");
  const [failures, setFailures] = useState(0);
  const [twoFactor, setTwoFactor] = useState(false);
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<AccountVerificationCode>();
  const [exhausted, setExhausted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(Date.now);
  const dialog = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const generation = useRef(0);
  const userId = user?.id;
  const accountIsCurrent = () => !!userId && useAuthStore.getState().user?.id === userId;
  const clearSecrets = () => { setCurrent(""); setPassword(""); setRepeat(""); setCode(""); setChallenge(undefined); setExhausted(false); setVisible(false); };
  const finish = () => {
    clearSecrets(); setStep("closed");
    if (useAuthStore.getState().user?.id === userId) useAuthStore.getState().clearSession();
    onClose?.(); onCompleted?.(); useAuthStore.getState().openAuthModal("login");
  };
  const close = () => {
    if (inFlight.current) return;
    if (step === "done") { finish(); return; }
    generation.current++; clearSecrets(); setStep("closed"); setError(""); onClose?.();
  };
  useModal(step !== "closed", close, dialog);
  useEffect(() => {
    generation.current++; inFlight.current = false; setBusy(false); setStep("closed"); clearSecrets();
    return () => { generation.current++; };
  }, [userId]);
  useEffect(() => {
    if (step === "closed") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [step]);
  const report = (cause: unknown) => {
    if (cause instanceof AccountActionError) {
      if (cause.reason === "social_account") { clearSecrets(); setStep("social"); return; }
      if (cause.reason === "password_locked" || cause.reason === "password_mismatch") {
        const n = cause.failures ?? 5; setFailures(n); useAuthStore.getState().setPasswordFailures(userId!, n); clearSecrets(); setStep(n >= 5 ? "locked" : "mismatch"); return;
      }
      if (cause.reason === "verification_required") {
        if (step === "locked") { setChallenge(undefined); setCode(""); setError(copy.expired); return; }
        clearSecrets(); setStep("current"); setError(copy.verificationRequired); return;
      }
      if (cause.reason === "code_attempts_exceeded") setExhausted(true);
      setError(cause.reason === "password_reused" ? copy.samePassword : cause.reason === "password_invalid" ? copy.passwordLength : cause.reason === "code_expired" ? copy.expired : cause.reason === "code_attempts_exceeded" ? copy.codeAttempts : cause.reason === "resend_wait" ? copy.rateLimit : copy.codeInvalid);
    } else setError(cause instanceof AccountError && cause.code === "credentials" ? copy.credentials : cause instanceof AccountError && cause.code === "invalid" ? copy.invalid : copy.network);
  };
  const run = async (operation: (active: () => boolean) => Promise<void>) => {
    if (inFlight.current || !accountIsCurrent()) return;
    const token = generation.current;
    const active = () => token === generation.current && accountIsCurrent();
    inFlight.current = true; setBusy(true); setError("");
    try { await operation(active); }
    catch (cause) { if (active()) report(cause); }
    finally { if (token === generation.current) { inFlight.current = false; setBusy(false); } }
  };
  const begin = () => {
    if (!user || inFlight.current) return;
    clearSecrets(); setError(""); setNotice(""); setProvider(user.provider ?? "email");
    if (isSocialAccount(user.provider)) { setStep("social"); return; }
    setStep("loading");
    void run(async active => {
      try {
        const status = await getPasswordChangeStatus(user.id);
        if (!active()) return;
        setProvider(status.provider); setFailures(status.failures); setTwoFactor(status.twoFactorEnabled);
        useAuthStore.getState().setPasswordFailures(user.id, status.failures);
        setStep(isSocialAccount(status.provider) ? "social" : status.locked ? "locked" : "current");
      } catch (cause) { if (active()) setStep("loadError"); throw cause; }
    });
  };
  useEffect(() => { if (open || (open === undefined && autoStart)) begin(); }, [open, autoStart, userId]);
  useEffect(() => { if (open === false && !inFlight.current) close(); }, [open]);
  const sendCode = () => void run(async active => {
    const result = await (step === "locked" ? sendPasswordUnlockCode(userId) : sendPasswordChangeOtpCode(userId));
    if (!active()) return;
    setChallenge(result); setCode(""); setExhausted(false); setNow(Date.now());
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run(async active => {
      if (step === "current") {
        const result = await verifyCurrentPassword(current, userId);
        if (!active()) return;
        setFailures(result.failures); setTwoFactor(result.twoFactorEnabled); setNotice("");
        useAuthStore.getState().setPasswordFailures(userId!, result.failures);
        if (!result.matched) { clearSecrets(); setStep(result.locked ? "locked" : "mismatch"); }
        else setStep("new");
      } else if (step === "locked") {
        await unlockPasswordChangeWithCode(code, userId);
        if (!active()) return;
        useAuthStore.getState().setPasswordFailures(userId!, 0); setFailures(0); clearSecrets(); setStep("current"); setNotice(copy.unlocked);
      } else if (step === "new") {
        if (!validPassword(password) || password !== repeat || password === current) return;
        await changeAccountPasswordWithOtp(current, password, code, userId);
        if (!active()) return;
        clearSecrets(); setStep("done");
      }
    });
  };
  const samePassword = !!password && password === current;
  const validNew = validPassword(password) && password === repeat && !samePassword;
  const expired = !!challenge && challenge.expiresAt <= now;
  const codeReady = /^\d{6}$/.test(code) && !exhausted && (step === "new" && twoFactor || !!challenge && !expired);
  const field = "mt-2 h-12 w-full rounded-xl border border-hairline bg-obsidian px-4 text-base text-white outline-none focus:border-gold-champagne disabled:opacity-40";
  const passwordField = (id: string, label: string, value: string, update: (value: string) => void, isNew = false) => <label className="block text-sm text-secondary" htmlFor={id}>{label}<span className="relative block"><input id={id} type={visible ? "text" : "password"} autoComplete={isNew ? "new-password" : "current-password"} required minLength={isNew ? 12 : 1} maxLength={128} value={value} onChange={e => update(e.target.value)} disabled={busy} className={field + " pr-14"} /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? copy.hide : copy.show} className="absolute right-1 top-3 flex h-11 w-11 items-center justify-center">{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>;
  const codeInput = <div className="grid gap-3">
    {step === "new" && twoFactor ? <p className="text-sm leading-6 text-secondary">{copy.googleOtp}</p> : <>
      <p className="text-sm leading-6 text-secondary">{copy.issuedOtp}</p>
      <button type="button" onClick={sendCode} disabled={busy || !!challenge && challenge.resendAt > now} className="workspace-button disabled:opacity-40">{challenge ? copy.resend : copy.send}</button>
      {challenge && <div role="status" className="rounded-xl bg-white/5 p-3 text-sm leading-7 text-secondary"><p>{challenge.browserCode ? text("browserCode", { code: challenge.browserCode }) : text("sent", { email: challenge.emailMasked })}</p><p>{expired ? copy.expired : text("expires", { seconds: Math.max(0, Math.ceil((challenge.expiresAt - now) / 1000)) })}</p>{challenge.resendAt > now && <p>{text("resendAfter", { seconds: Math.ceil((challenge.resendAt - now) / 1000) })}</p>}</div>}
    </>}
    <label className="block text-sm text-secondary" htmlFor="password-change-code">{step === "locked" ? copy.code : copy.otp}<input id="password-change-code" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} disabled={busy || !(step === "new" && twoFactor) && (!challenge || expired || exhausted)} className={field + " text-center font-mono tracking-[0.3em]"} /></label>
  </div>;
  const title = step === "social" ? copy.socialTitle : step === "mismatch" ? copy.mismatchTitle : step === "locked" ? copy.lockedTitle : step === "new" ? copy.newTitle : step === "done" ? copy.doneTitle : copy.currentTitle;
  return <section className="rounded-2xl border border-hairline bg-surface p-5 sm:p-7">
    <div className="flex items-center gap-3"><LockKeyhole className="h-5 w-5 text-gold-champagne" /><h3 className="text-lg font-semibold text-white">{copy.title}</h3></div><p className="mt-3 text-sm leading-7 text-secondary">{copy.intro}</p>
    {user ? <button type="button" onClick={begin} disabled={busy} className="workspace-button mt-4">{copy.start}</button> : <button type="button" onClick={() => useAuthStore.getState().openAuthModal("login")} className="workspace-button mt-4">{copy.login}</button>}
    {step !== "closed" && <div className="fixed inset-0 z-[130] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
      <div ref={dialog} role={step === "mismatch" || step === "locked" || step === "social" ? "alertdialog" : "dialog"} aria-modal="true" aria-labelledby="password-change-title" tabIndex={-1} className="relative my-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-hairline bg-surface p-6 outline-none sm:p-8">
        <button type="button" onClick={close} disabled={busy} aria-label={copy.close} className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center text-muted"><X className="h-5 w-5" /></button>
        <h2 id="password-change-title" className="pr-10 text-xl font-semibold leading-8 text-white">{title}</h2>
        {step === "loading" && <p role="status" className="mt-5 text-secondary">{copy.loading}</p>}
        {step === "social" && <><p className="mt-5 text-sm leading-7 text-secondary">{text("socialBody", { provider: ({ google: "Google", apple: "Apple", microsoft: "Microsoft", email: "소셜 서비스", phone: "소셜 서비스" })[provider] })}</p><button type="button" onClick={close} className="workspace-button primary mt-6 w-full">{copy.confirm}</button></>}
        {step === "mismatch" && <><p className="mt-5 text-sm leading-7 text-secondary">{text("mismatch", { count: failures })}</p><button type="button" onClick={() => { setError(""); setStep("current"); }} className="workspace-button primary mt-6 w-full">{copy.confirm}</button></>}
        {step === "done" && <><ShieldCheck className="mt-5 h-9 w-9 text-emerald-300" /><p role="status" className="mt-4 text-sm leading-7 text-secondary">{copy.doneBody}</p><button type="button" onClick={finish} className="workspace-button primary mt-6 w-full">{copy.done}</button></>}
        {["current", "locked", "new"].includes(step) && <form onSubmit={submit} className="mt-5 grid gap-5">
          {step === "current" && passwordField("password-change-current", copy.current, current, setCurrent)}
          {step === "locked" && <><p className="text-sm leading-7 text-red-200">{text("mismatch", { count: failures })}</p><p className="text-sm leading-7 text-secondary">{copy.lockedBody}</p>{codeInput}</>}
          {step === "new" && <>{passwordField("password-change-new", copy.newPassword, password, setPassword, true)}<p className="text-xs leading-6 text-muted">{copy.passwordRule}</p>{password && !validPassword(password) && <p role="status" className="text-sm text-red-200">{copy.passwordLength}</p>}{samePassword && <p role="status" className="text-sm text-red-200">{copy.samePassword}</p>}{passwordField("password-change-repeat", copy.repeat, repeat, setRepeat, true)}{repeat && <p role="status" className={password === repeat ? "text-sm text-emerald-300" : "text-sm text-red-200"}>{password === repeat ? copy.repeatMatch : copy.repeatMismatch}</p>}{codeInput}</>}
          {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
          <button disabled={busy || (step === "current" ? !current : step === "locked" ? !codeReady : !validNew || !codeReady)} className="workspace-button primary disabled:opacity-40">{busy ? copy.busy : step === "current" ? copy.next : step === "locked" ? copy.unlock : copy.change}</button>
        </form>}
        {error && <p role="alert" className="mt-4 text-sm leading-6 text-red-200">{error}</p>}
        {step === "loadError" && <button type="button" onClick={begin} disabled={busy} className="workspace-button mt-5">{copy.retry}</button>}
      </div>
    </div>}
  </section>;
}
export default PasswordChangeFlow;
