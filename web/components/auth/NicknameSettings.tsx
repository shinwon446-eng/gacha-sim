"use client";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { AccountError, normalizeNickname, validNickname } from "@/lib/account";
import { useAuthStore, type AuthUser } from "@/stores/authStore";

export function NicknameSettings({ user }: { user: AuthUser }) {
  const t = useTranslations("account");
  const [nickname, setNickname] = useState(user.nickname ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !validNickname(nickname)) return;
    setBusy(true); setError(""); setSaved(false);
    try { setSaved(await useAuthStore.getState().updateNickname(nickname)); }
    catch (cause) { setError(cause instanceof AccountError && cause.code === "conflict" ? t("nicknameTaken") : t(`errors.${cause instanceof AccountError ? cause.code : "network"}`)); }
    finally { setBusy(false); }
  };
  return <section className="mt-5 rounded-2xl border border-hairline bg-surface p-5 sm:p-7">
    <h2 className="text-xl font-semibold text-white">{t("nicknameTitle")}</h2>
    <form onSubmit={submit} className="mt-4 max-w-md">
      <label className="block text-sm text-secondary">{t("nickname")}<input value={nickname} onChange={e => { setNickname(e.target.value); setSaved(false); setError(""); }} autoComplete="nickname" maxLength={20} required disabled={busy} aria-describedby="nickname-hint" className="mt-2 h-12 w-full rounded-xl border border-hairline bg-obsidian px-4 text-base text-white focus:border-gold-champagne focus:outline-none" /></label>
      <p id="nickname-hint" className="mt-2 text-xs leading-6 text-muted">{t("nicknameHint")}</p>
      {nickname && !validNickname(nickname) && <p role="alert" className="mt-2 text-sm text-red-200">{t("nicknameInvalid")}</p>}
      {error && <p role="alert" className="mt-2 text-sm text-red-200">{error}</p>}
      {saved && <p role="status" className="mt-2 text-sm text-emerald-300">{t("nicknameSaved")}</p>}
      <button disabled={busy || !validNickname(nickname) || normalizeNickname(nickname) === user.nickname} className="mt-4 min-h-12 rounded-xl bg-[#f1eee7] px-5 text-sm font-semibold text-obsidian disabled:opacity-40">{t(busy ? "processing" : "saveNickname")}</button>
    </form>
  </section>;
}
