"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, Check, CreditCard, LockKeyhole, Package, ShieldCheck, Truck, UserRound, Wallet, LayoutDashboard, Settings2, LogOut } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { useAuthStore } from "@/stores/authStore";
import { useWalletStore } from "@/stores/walletStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useCurrency } from "@/lib/useCurrency";
import { AccountError, accountConfigured, closureReadiness, resetAccountPassword, validPassword } from "@/lib/account";
import { AccountClosureFlow } from "@/components/auth/AccountClosureFlow";
import { SecuritySettings } from "@/components/auth/SecuritySettings";
import { NicknameSettings } from "@/components/auth/NicknameSettings";
import { LoginRequired } from "@/components/auth/LoginRequired";
import { AvatarSettings } from "@/components/auth/AvatarSettings";
import { ProfileAvatar } from "@/components/auth/ProfileAvatar";
import { useSecurityStore } from "@/stores/securityStore";
import { cn } from "@/lib/format";
import { HistoryTab } from "@/components/wallet/HistoryTab";

const panels = [{ id: "overview", icon: LayoutDashboard }, { id: "profile", icon: UserRound }, { id: "security", icon: ShieldCheck }, { id: "wallet", icon: Wallet }, { id: "activity", icon: Package }, { id: "account", icon: Settings2 }] as const;
type Panel = typeof panels[number]["id"];
export default function ProfilePage() {
  const t = useTranslations("account");
  const p = useTranslations("profileSettings");
  const locale = useLocale();
  const security = useSecurityStore();
  const [panel, setPanel] = useState<Panel>("overview");
  const panelHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const read = () => { const requested = new URLSearchParams(window.location.search).get("section"); setPanel(panels.some(item => item.id === requested) ? requested as Panel : "overview"); };
    read(); window.addEventListener("popstate", read); return () => window.removeEventListener("popstate", read);
  }, []);
  const navigate = (next: Panel) => {
    setPanel(next); const url = new URL(window.location.href); url.searchParams.set("section", next); window.history.pushState(null, "", url);
    requestAnimationFrame(() => panelHeading.current?.focus({ preventScroll: true }));
  };
  const { user, openAuthModal, hydrated: authReady } = useAuthStore();
  const wallet = useWalletStore();
  const items = useInventoryStore(s => s.items);
  const inventoryReady = useInventoryStore(s => s.hydrated);
  const { fmt } = useCurrency();
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
    { key: "balance", count: fmt(wallet.balance), ok: wallet.balance === 0 && !closure.hasBalance, icon: Wallet, href: "/#withdraw" },
    { key: "held", count: closure.held, ok: !closure.held, icon: Package, href: "/inventory?tab=held" },
    { key: "shipping", count: closure.shipping, ok: !closure.shipping, icon: Truck, href: "/inventory?tab=shipping" },
    { key: "pending", count: closure.pending, ok: !closure.pending, icon: CreditCard, href: "/#withdraw" },
  ];
  const securityReady = security.userId === user?.id && security.hydrated;
  const securityLabel = !securityReady ? p(security.error ? "statusFailed" : "checkingStatus") : p(security.twoFactorEnabled ? "complete" : "notSet");
  const signOut = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try { await useAuthStore.getState().logout(p("logoutDone")); }
    catch { setError(t("errors.network")); }
    finally { setBusy(false); }
  };
  const actionLink = (href: string, title: string, description?: string) => <Link href={href} className="group flex min-h-20 items-center justify-between gap-4 rounded-xl border border-hairline bg-surface p-5 transition-colors hover:border-gold-champagne/50"><div><span className="text-sm font-semibold text-white">{title}</span>{description && <p className="mt-2 text-xs leading-6 text-muted">{description}</p>}</div><ArrowUpRight className="h-4 w-4 shrink-0 text-gold-champagne transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>;
  return <><SiteHeader /><main className="mx-auto max-w-6xl px-4 pb-20 pt-9 sm:px-6 sm:pt-12">
    <header className="mb-8"><p className="text-xs font-semibold tracking-[0.2em] text-gold-champagne">VOILA / MY ACCOUNT</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{p("title")}</h1><p className="mt-3 text-sm leading-7 text-secondary">{p("intro")}</p></header>
    {notice && <p role="status" className="mb-5 rounded-xl border border-emerald-400/30 p-4 text-sm text-emerald-200">{notice}</p>}
    {error && <p role="alert" className="mb-5 rounded-xl border border-red-400/30 p-4 text-sm text-red-200">{error}</p>}
    {resetToken && <section className="mt-8 rounded-2xl border border-gold-champagne/30 bg-surface p-6"><h2 className="text-xl font-semibold text-white">{t("newPasswordTitle")}</h2><p className="mt-2 text-sm text-secondary">{t("passwordHint")}</p>{!configured && <p role="status" className="mt-4 rounded-xl border border-hairline p-4 text-sm leading-6 text-secondary">{t("unavailable")}</p>}<form onSubmit={changePassword} className="mt-5 max-w-md space-y-4"><label className="block text-sm text-secondary">{t("password")}<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={newPassword} onChange={e => setNewPassword(e.target.value)} className={input} disabled={busy || !configured} /></label><label className="block text-sm text-secondary">{t("confirmPassword")}<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={repeatPassword} onChange={e => setRepeatPassword(e.target.value)} className={input} disabled={busy || !configured} /></label><button disabled={busy || !configured} className="min-h-12 rounded-xl bg-[#f1eee7] px-5 text-sm font-semibold text-obsidian disabled:opacity-40">{t("updatePassword")}</button></form></section>}

    {!authReady ? <div role="status" className="workspace-empty">{p("checkingStatus")}</div> : !user ? <LoginRequired /> : <div className="grid gap-7 lg:grid-cols-[230px_minmax(0,1fr)]" key={user.id}>
      <aside className="min-w-0"><div className="lg:sticky lg:top-24">
        <div className="flex items-center gap-4 rounded-2xl border border-hairline bg-surface p-5 lg:flex-col lg:items-start"><ProfileAvatar src={user.avatarUrl} name={user.label} className="h-16 w-16" /><div className="min-w-0"><p className="break-words text-lg font-semibold text-white">{user.nickname || p("nicknameStatus")}</p><p className="mt-1 break-all text-xs leading-6 text-muted">{user.email}</p><button onClick={() => navigate("profile")} className="mt-2 min-h-11 text-xs font-semibold text-gold-champagne">{p("editProfile")} →</button></div></div>
        <nav aria-label={p("menu")} className="mt-4 grid grid-cols-2 gap-1 rounded-xl border border-hairline p-2 sm:grid-cols-3 lg:grid-cols-1">{panels.map(({ id, icon: Icon }) => <button key={id} type="button" onClick={() => navigate(id)} aria-current={panel === id ? "page" : undefined} aria-controls="account-panel" className={cn("flex min-h-12 items-center gap-2 rounded-lg px-3 text-left text-xs transition-colors sm:text-sm", panel === id ? "bg-gold-champagne/10 font-semibold text-gold-champagne" : "text-secondary hover:bg-white/5 hover:text-white")}><Icon className="h-4 w-4 shrink-0" aria-hidden />{p(id)}</button>)}</nav>
        <button type="button" disabled={busy} onClick={() => void signOut()} className="mt-3 flex min-h-11 items-center gap-2 px-3 text-xs text-muted hover:text-white"><LogOut className="h-4 w-4" />{p("logout")}</button>
      </div></aside>
      <div id="account-panel" className="min-w-0" aria-labelledby="account-panel-heading">
        <div className="mb-6 border-b border-hairline pb-5"><h2 id="account-panel-heading" ref={panelHeading} tabIndex={-1} className="scroll-mt-28 text-2xl font-semibold text-white outline-none">{p(panel)}</h2><p className="mt-2 text-sm leading-7 text-secondary">{p(panel + "Intro")}</p></div>
        {panel === "overview" && <div className="grid gap-6">
          <div className="grid gap-3 sm:grid-cols-3">{[{ key: "balance", value: ready ? fmt(wallet.balance) : "—", destination: "wallet" }, { key: "held", value: ready ? p("count", { count: closure.held }) : "—", destination: "activity" }, { key: "pending", value: ready ? p("count", { count: closure.pending }) : "—", destination: "wallet" }].map(card => <button key={card.key} onClick={() => navigate(card.destination as Panel)} className="rounded-2xl border border-hairline bg-surface p-5 text-left transition-colors hover:border-gold-champagne/50"><span className="text-xs text-muted">{p(card.key)}</span><span className="mt-4 block break-all text-xl font-semibold tabular-nums text-white">{card.value}</span><ArrowUpRight className="ml-auto mt-4 h-4 w-4 text-gold-champagne" /></button>)}</div>
          <section className="rounded-2xl border border-hairline p-5 sm:p-7"><h3 className="text-lg font-semibold text-white">{p("quickSetup")}</h3><div className="mt-4 divide-y divide-hairline">{[{ key: "nicknameStatus", done: !!user.nickname, destination: "profile" }, { key: "avatarStatus", done: !!user.avatarUrl, destination: "profile" }, { key: "otpStatus", done: securityReady && security.twoFactorEnabled, destination: "security" }].map(item => <button key={item.key} onClick={() => navigate(item.destination as Panel)} className="flex min-h-16 w-full items-center justify-between gap-3 text-left text-sm"><span className="text-secondary">{p(item.key)}</span><span className={cn("flex items-center gap-2 text-xs", item.done ? "text-emerald-300" : "text-gold-champagne")}>{item.done && <Check className="h-4 w-4" />}{item.key === "otpStatus" ? securityLabel : p(item.done ? "complete" : "notSet")}<ArrowUpRight className="h-3.5 w-3.5" /></span></button>)}</div></section>
          <div className="grid gap-3 sm:grid-cols-2">{actionLink("/inventory", p("inventory"), p("inventoryNote"))}{actionLink("/community", p("reviews"), p("reviewNote"))}</div>
        </div>}
        {panel === "profile" && <div className="grid gap-5"><AvatarSettings user={user} /><NicknameSettings user={user} /></div>}
        {panel === "security" && <><section className="rounded-2xl border border-hairline bg-surface p-5 sm:p-7"><div className="flex items-center gap-3"><LockKeyhole className="h-5 w-5 text-gold-champagne" /><h3 className="text-lg font-semibold text-white">{t("newPasswordTitle")}</h3></div><p className="mt-3 text-sm leading-7 text-secondary">{t("securityIntro")}</p><button onClick={() => openAuthModal("recover")} className="workspace-button mt-4">{t("updatePassword")}</button></section><SecuritySettings user={user} /><p className="mt-4 rounded-xl bg-gold-champagne/5 p-4 text-xs leading-7 text-secondary">{p("securityNote")}</p></>}
        {panel === "wallet" && <div className="grid gap-5"><section className="rounded-2xl border border-gold-champagne/25 bg-surface p-5 sm:p-7"><p className="text-sm text-muted">{p("balance")}</p><p className="mt-3 text-3xl font-semibold text-white">{ready ? fmt(wallet.balance) : "—"}</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/#deposit" className="workspace-button primary">{p("deposit")}</Link><Link href="/#withdraw" className="workspace-button">{p("withdraw")}</Link></div></section><section className="rounded-2xl border border-hairline bg-surface p-5 sm:p-7"><h3 className="mb-5 text-lg font-semibold text-white">{t("transactionHistory")}</h3><HistoryTab /></section></div>}
        {panel === "activity" && <div className="grid gap-3 sm:grid-cols-2">{actionLink("/inventory?tab=held", p("inventory"), p("inventoryNote"))}{actionLink("/inventory?tab=shipping", p("shipping"))}{actionLink("/community?tab=mine", p("reviews"))}{actionLink("/community?tab=eligible", p("eligibleReviews"), p("reviewNote"))}</div>}
        {panel === "account" && <><section className="rounded-2xl border border-hairline bg-surface p-5 sm:p-7"><h3 className="text-lg font-semibold text-white">{p("accountInfo")}</h3><dl className="mt-5 grid gap-5 text-sm"><div><dt className="text-muted">{p("email")}</dt><dd className="mt-2 break-all text-white">{user.email}</dd></div><div><dt className="text-muted">{p("created")}</dt><dd className="mt-2 text-white">{new Date(user.createdAt).toLocaleDateString(locale, { dateStyle: "long" })}</dd></div></dl><Link href="/legal/privacy" className="workspace-text-link mt-5">{t("privacy")}<ArrowUpRight className="h-4 w-4" /></Link></section><details className="mt-5 rounded-2xl border border-hairline p-5"><summary className="cursor-pointer py-2 text-sm font-semibold text-red-200">{p("closureOpen")}</summary>
    <section className="mt-9 rounded-2xl border border-hairline bg-surface p-5 sm:p-7"><div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-gold-champagne" /><h2 className="text-xl font-semibold text-white">{t("closureTitle")}</h2></div><p className="mt-3 text-sm leading-7 text-secondary">{t("closureIntro")}</p>
      <div className="mt-6 divide-y divide-hairline">{checks.map(({ key, count, ok, icon: Icon, href }) => <div key={key} className="flex items-start gap-3 py-5"><Icon className="mt-1 h-5 w-5 shrink-0 text-muted" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-white">{t(`checks.${key}.title`)}</h3><span className={ok ? "text-sm text-emerald-300" : "text-sm text-gold-champagne"}>{ready ? (ok ? t("settled") : count) : "—"}</span></div><p className="mt-2 text-sm leading-6 text-secondary">{t(`checks.${key}.body`)}</p>{!ok && <Link href={href} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-gold-champagne">{t(`checks.${key}.action`)}<ArrowUpRight className="h-4 w-4" /></Link>}</div>{ok && ready && <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />}</div>)}</div>
      <div className="mt-3 rounded-xl border border-hairline bg-obsidian p-4 text-sm leading-7 text-secondary"><p>{t("noForfeiture")}</p><p className="mt-2">{t("retention")}</p><Link href="/legal/privacy" className="mt-2 inline-flex min-h-11 items-center text-gold-champagne underline underline-offset-4">{t("privacy")}</Link></div>
      {!configured && <p className="mt-5 text-sm leading-6 text-secondary">{t("closureUnavailable")}</p>}
      <AccountClosureFlow />
    </section>

        </details></>}
      </div>
    </div>}
  </main></>;
}
