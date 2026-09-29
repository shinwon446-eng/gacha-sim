"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Check, CreditCard, LockKeyhole, Package, ShieldCheck, Truck, UserRound, Wallet } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { useAuthStore } from "@/stores/authStore";
import { useWalletStore } from "@/stores/walletStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useCurrency } from "@/lib/useCurrency";
import { AccountError, accountConfigured, closureReadiness, deleteAccount, resetAccountPassword, validPassword } from "@/lib/account";
import { SecuritySettings } from "@/components/auth/SecuritySettings";
import { NicknameSettings } from "@/components/auth/NicknameSettings";
import { LoginRequired } from "@/components/auth/LoginRequired";
import { HistoryTab } from "@/components/wallet/HistoryTab";

export default function ProfilePage() {
  const t = useTranslations("account");
  const { user, openAuthModal, clearSession, hydrated: authReady } = useAuthStore();
  const wallet = useWalletStore();
  const items = useInventoryStore(s => s.items);
  const inventoryReady = useInventoryStore(s => s.hydrated);
  const { fmt } = useCurrency();
  const [confirm, setConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const ready = authReady && wallet.hydrated && inventoryReady;
  const closure = closureReadiness({ ...wallet, items });
  const configured = accountConfigured();
  useEffect(() => {
    // Recovery links use fragments so the credential is not included in server logs/referrers.
    const token = new URLSearchParams(window.location.hash.slice(1)).get("reset_token");
    if (token) { setResetToken(token); history.replaceState(null, "", window.location.pathname + window.location.search); }
  }, []);
  const closeAccount = async (event: FormEvent) => {
    event.preventDefault(); if (busy || !ready || !closure.eligible || !confirm || !user || user.local || !configured) return;
    // Re-read before requesting; server independently checks authoritative balances and open orders.
    if (!closureReadiness({ ...useWalletStore.getState(), items: useInventoryStore.getState().items }).eligible) return;
    setBusy(true); setError(""); setNotice("");
    try { await deleteAccount(password); clearSession(); setPassword(""); setConfirm(false); setNotice(t("deleted")); }
    catch (cause) { setError(t(`errors.${cause instanceof AccountError ? cause.code : "network"}`)); }
    finally { setBusy(false); }
  };
  const changePassword = async (event: FormEvent) => {
    event.preventDefault(); if (busy || !configured || !resetToken) return;
    if (!validPassword(newPassword) || newPassword !== repeatPassword) { setError(t("validation")); return; }
    setBusy(true); setError("");
    try { await resetAccountPassword(resetToken, newPassword); setResetToken(""); setNewPassword(""); setRepeatPassword(""); setNotice(t("passwordUpdated")); }
    catch (cause) { setError(t(`errors.${cause instanceof AccountError ? cause.code : "network"}`)); }
    finally { setBusy(false); }
  };
  const input = "mt-2 h-12 w-full rounded-xl border border-hairline bg-obsidian px-4 text-base text-white focus:border-gold-champagne focus:outline-none disabled:opacity-40";
  const checks = [
    { key: "balance", count: fmt(wallet.balance), ok: !closure.hasBalance, icon: Wallet, href: "/#withdraw" },
    { key: "held", count: closure.held, ok: !closure.held, icon: Package, href: "/inventory?tab=held" },
    { key: "shipping", count: closure.shipping, ok: !closure.shipping, icon: Truck, href: "/inventory?tab=shipping" },
    { key: "pending", count: closure.pending, ok: !closure.pending, icon: CreditCard, href: "/#withdraw" },
  ];
  return <><SiteHeader /><main className="mx-auto max-w-5xl px-4 pb-16 pt-9 sm:px-6 sm:pt-12">
    <p className="text-xs font-semibold tracking-[0.2em] text-gold-champagne">VOILA / ACCOUNT</p>
    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{t("profile")}</h1>
    <p className="mt-3 max-w-xl text-sm leading-7 text-secondary">{t("profileIntro")}</p>
    {notice && <p role="status" className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-4 text-sm leading-6 text-emerald-200">{notice}</p>}
    {error && <p role="alert" className="mt-6 rounded-xl border border-red-400/30 bg-red-400/5 p-4 text-sm leading-6 text-red-200">{error}</p>}
    {resetToken && <section className="mt-8 rounded-2xl border border-gold-champagne/30 bg-surface p-6"><h2 className="text-xl font-semibold text-white">{t("newPasswordTitle")}</h2><p className="mt-2 text-sm text-secondary">{t("passwordHint")}</p>{!configured && <p role="status" className="mt-4 rounded-xl border border-hairline p-4 text-sm leading-6 text-secondary">{t("unavailable")}</p>}<form onSubmit={changePassword} className="mt-5 max-w-md space-y-4"><label className="block text-sm text-secondary">{t("password")}<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={newPassword} onChange={e => setNewPassword(e.target.value)} className={input} disabled={busy || !configured} /></label><label className="block text-sm text-secondary">{t("confirmPassword")}<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={repeatPassword} onChange={e => setRepeatPassword(e.target.value)} className={input} disabled={busy || !configured} /></label><button disabled={busy || !configured} className="min-h-12 rounded-xl bg-[#f1eee7] px-5 text-sm font-semibold text-obsidian disabled:opacity-40">{t("updatePassword")}</button></form></section>}
    <section className="mt-8 flex flex-col justify-between gap-5 rounded-2xl border border-hairline bg-surface p-6 sm:flex-row sm:items-center">
      <div className="flex min-w-0 items-center gap-4"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-gold-champagne/20 bg-gold-champagne/5"><UserRound className="h-6 w-6 text-gold-champagne" /></span><div className="min-w-0"><h2 className="break-all text-lg font-semibold text-white">{user?.label ?? t("guest")}</h2><p className="mt-1 text-sm text-secondary">{t(user && !user.local ? "verifiedEmail" : "loginNeeded")}</p></div></div>
      {!user && <button onClick={() => openAuthModal("login")} className="min-h-12 shrink-0 rounded-xl bg-[#f1eee7] px-5 text-sm font-semibold text-obsidian">{t("loginTitle")}</button>}
    </section>
    <div className="mt-5 grid gap-4 sm:grid-cols-3">{[{ href: "/#deposit", icon: Wallet, label: "wallet" }, { href: "/inventory", icon: Package, label: "inventory" }, { href: "/community", icon: UserRound, label: "reviews" }].map(({ href, icon: Icon, label }) => <Link key={label} href={href} className="flex min-h-20 items-center justify-between rounded-xl border border-hairline px-5 text-sm font-semibold text-white transition-colors hover:border-gold-champagne/50"><span className="flex items-center gap-3"><Icon className="h-5 w-5 text-gold-champagne" />{t(label)}</span><ArrowUpRight className="h-4 w-4 text-muted" /></Link>)}</div>
    <section className="mt-9 border-t border-hairline pt-8"><div className="flex items-center gap-3"><LockKeyhole className="h-5 w-5 text-gold-champagne" /><h2 className="text-xl font-semibold text-white">{t("security")}</h2></div><p className="mt-3 text-sm leading-7 text-secondary">{t("securityIntro")}</p><button onClick={() => openAuthModal("recover")} className="mt-3 min-h-11 text-sm font-semibold text-gold-champagne underline underline-offset-4">{t("forgot")}</button></section>
    {/* 🔐 Google OTP(2FA) — 출금 모달 안에서도, 여기에서도 같은 컴포넌트로 등록한다 */}
    {user ? <><NicknameSettings key={user.id} user={user} /><SecuritySettings key={user.id} user={user} /><section className="mt-9 rounded-2xl border border-hairline bg-surface p-5 sm:p-7"><h2 className="text-xl font-semibold text-white">{t("transactionHistory")}</h2><HistoryTab /></section></> : <LoginRequired />}
    <section className="mt-9 rounded-2xl border border-hairline bg-surface p-5 sm:p-7"><div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-gold-champagne" /><h2 className="text-xl font-semibold text-white">{t("closureTitle")}</h2></div><p className="mt-3 text-sm leading-7 text-secondary">{t("closureIntro")}</p>
      <div className="mt-6 divide-y divide-hairline">{checks.map(({ key, count, ok, icon: Icon, href }) => <div key={key} className="flex items-start gap-3 py-5"><Icon className="mt-1 h-5 w-5 shrink-0 text-muted" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-white">{t(`checks.${key}.title`)}</h3><span className={ok ? "text-sm text-emerald-300" : "text-sm text-gold-champagne"}>{ready ? (ok ? t("settled") : count) : "—"}</span></div><p className="mt-2 text-sm leading-6 text-secondary">{t(`checks.${key}.body`)}</p>{!ok && <Link href={href} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-gold-champagne">{t(`checks.${key}.action`)}<ArrowUpRight className="h-4 w-4" /></Link>}</div>{ok && ready && <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />}</div>)}</div>
      <div className="mt-3 rounded-xl border border-hairline bg-obsidian p-4 text-sm leading-7 text-secondary"><p>{t("noForfeiture")}</p><p className="mt-2">{t("retention")}</p><Link href="/legal/privacy" className="mt-2 inline-flex min-h-11 items-center text-gold-champagne underline underline-offset-4">{t("privacy")}</Link></div>
      {!configured && <p className="mt-5 text-sm leading-6 text-secondary">{t("closureUnavailable")}</p>}
      <form onSubmit={closeAccount} className="mt-5 space-y-4"><label className="block max-w-md text-sm text-secondary">{t("reauth")}<input type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={e => setPassword(e.target.value)} disabled={busy || !configured || !user || !closure.eligible} className={input} /></label><label className="flex min-h-11 items-start gap-3 text-sm leading-6 text-secondary"><input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} disabled={busy || !configured || !user || !closure.eligible} className="mt-1 h-4 w-4 shrink-0 accent-[#d5bd87]" /><span>{t("closureConsent")}</span></label><button disabled={busy || !ready || !configured || !user || user.local || !closure.eligible || !confirm || !password} className="min-h-12 rounded-xl border border-red-300/40 px-5 text-sm font-semibold text-red-200 disabled:cursor-not-allowed disabled:opacity-35">{t(busy ? "processing" : "closeAccount")}</button></form>
    </section>
  </main></>;
}
