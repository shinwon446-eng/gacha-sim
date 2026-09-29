"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Clock3, Loader2 } from "lucide-react";
import { AccountError, ProfileError, checkAccountNickname } from "@/lib/account";
import { nicknameIssue, normalizeNickname, nextNicknameChangeAt } from "@/lib/profilePolicy";
import { useAuthStore, type AuthUser } from "@/stores/authStore";

export function NicknameSettings({ user }: { user: AuthUser }) {
  const t = useTranslations("profileSettings");
  const a = useTranslations("account");
  const locale = useLocale();
  const [nickname, setNickname] = useState(user.nickname ?? "");
  const [now, setNow] = useState(Date.now);
  const [retry, setRetry] = useState(0);
  const [check, setCheck] = useState<"idle" | "checking" | "available" | "taken" | "failed">("idle");
  const [checkedName, setCheckedName] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [serverNext, setServerNext] = useState<string>();
  const normalized = normalizeNickname(nickname);
  const issue = nickname ? nicknameIssue(nickname) : null;
  const next = serverNext ?? nextNicknameChangeAt(user);
  const locked = !!next && Date.parse(next) > now;
  const changed = normalized !== (user.nickname ?? "");
  const canSave = !locked && !issue && changed && check === "available" && checkedName === normalized;
  const date = (value: string) => new Date(value).toLocaleString(locale, { dateStyle: "long", timeStyle: "short" });
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    let active = true;
    setCheck("idle"); setCheckedName("");
    if (locked || !changed || !normalized || issue) return;
    setCheck("checking");
    const timer = setTimeout(() => {
      checkAccountNickname(normalized).then(available => {
        if (!active) return;
        setCheckedName(normalized); setCheck(available ? "available" : "taken");
      }).catch(cause => {
        if (!active) return;
        setCheck("failed");
        if (cause instanceof ProfileError) setError(t(`errors.${cause.reason}`));
      });
    }, 450);
    return () => { active = false; clearTimeout(timer); };
  }, [normalized, issue, locked, changed, retry, t]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !canSave) return;
    if (!confirming) { setConfirming(true); return; }
    setBusy(true); setError(""); setSaved(false);
    try {
      if (!await useAuthStore.getState().updateNickname(normalized)) throw new AccountError("credentials");
      setSaved(true); setConfirming(false); setNow(Date.now());
    } catch (cause) {
      if (cause instanceof ProfileError) {
        setError(t(`errors.${cause.reason}`));
        if (cause.reason === "nickname_cooldown" && cause.nextChangeAt) setServerNext(cause.nextChangeAt);
        if (cause.reason === "nickname_taken") setCheck("taken");
      } else setError(cause instanceof AccountError && cause.code === "conflict" ? a("nicknameTaken") : a(`errors.${cause instanceof AccountError ? cause.code : "network"}`));
      setConfirming(false);
    } finally { setBusy(false); }
  };
  return <section className="rounded-2xl border border-hairline bg-surface p-5 sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold text-white">{a("nicknameTitle")}</h3><span className="rounded-full bg-white/5 px-3 py-1 text-xs text-secondary">{t("every14Days")}</span></div>
    <p className="mt-3 text-sm leading-7 text-secondary">{t("nicknamePolicy")}</p>
    <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-gold-champagne"><Clock3 className="mt-1 h-4 w-4 shrink-0" />{locked && next ? t("nextChange", { date: date(next) }) : t("changeAvailable")}</p>
    <form onSubmit={submit} className="mt-5 max-w-lg">
      <label className="block text-sm text-secondary" htmlFor="profile-nickname">{a("nickname")}</label>
      <div className="relative mt-2"><input id="profile-nickname" value={nickname} onChange={e => { setNickname(e.target.value); setCheck("idle"); setCheckedName(""); setSaved(false); setConfirming(false); setError(""); }} autoComplete="nickname" maxLength={40} required disabled={busy || locked || confirming} aria-invalid={!!issue || check === "taken"} aria-describedby="nickname-hint nickname-feedback" className="h-12 w-full rounded-xl border border-hairline bg-obsidian px-4 pr-16 text-base text-white outline-none focus:border-gold-champagne disabled:opacity-50" /><span className="absolute right-4 top-4 text-xs tabular-nums text-muted">{Array.from(normalized).length}/20</span></div>
      <p id="nickname-hint" className="mt-2 text-xs leading-6 text-muted">{t("nicknameFormat")}</p>
      <div id="nickname-feedback" aria-live="polite" className="mt-2 text-sm">
        {issue ? <p className="text-red-200">{t(`errors.${issue}`)}</p> : check === "checking" ? <p className="flex items-center gap-2 text-secondary"><Loader2 className="h-4 w-4 animate-spin" />{t("checking")}</p> : check === "taken" ? <p className="text-red-200">{t("errors.nickname_taken")}</p> : canSave ? <p className="flex items-center gap-2 text-emerald-300"><Check className="h-4 w-4" />{t("available")}</p> : check === "failed" ? <p className="text-red-200">{t("checkFailed")} <button type="button" onClick={() => setRetry(n => n + 1)} className="min-h-11 underline">{t("retry")}</button></p> : null}
      </div>
      {confirming && <div className="mt-4 rounded-xl border border-gold-champagne/30 bg-gold-champagne/5 p-4"><p className="text-sm font-semibold text-white">{t("confirmNickname", { nickname: normalized })}</p><p className="mt-2 text-sm leading-6 text-secondary">{t("confirmPolicy")}</p></div>}
      {error && <p role="alert" className="mt-3 text-sm text-red-200">{error}</p>}
      {saved && <p role="status" className="mt-3 text-sm text-emerald-300">{a("nicknameSaved")}</p>}
      <div className="mt-4 flex flex-wrap gap-3"><button disabled={busy || !canSave} className="workspace-button primary disabled:opacity-40">{busy ? a("processing") : confirming ? t("confirmSave") : a("saveNickname")}</button>{confirming && <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="workspace-button">{t("cancel")}</button>}</div>
    </form>
  </section>;
}
