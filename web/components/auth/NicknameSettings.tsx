"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AccountError, normalizeNickname, type NicknameAvailability } from "@/lib/account";
import { canChangeNickname, validateNewNickname } from "@/lib/nicknameRules";
import { useAuthStore, type AuthUser } from "@/stores/authStore";

const NICKNAME_UPDATED_AT_KEY = "voila.nickname-updated-at.v1";
type NicknameUser = AuthUser & { nicknameUpdatedAt?: string | number | null };

function readNicknameUpdatedAt(userId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(NICKNAME_UPDATED_AT_KEY) || "{}");
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const updatedAt = (value as Record<string, unknown>)[userId];
      return typeof updatedAt === "string" || typeof updatedAt === "number" ? String(updatedAt) : null;
    }
  } catch { /* An invalid legacy value is treated as no change history. */ }
  return null;
}

function saveNicknameUpdatedAt(userId: string, updatedAt: string) {
  if (typeof window === "undefined") return;
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(NICKNAME_UPDATED_AT_KEY) || "{}");
    const history = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
    window.localStorage.setItem(NICKNAME_UPDATED_AT_KEY, JSON.stringify({ ...history, [userId]: updatedAt }));
  } catch {
    window.localStorage.setItem(NICKNAME_UPDATED_AT_KEY, JSON.stringify({ [userId]: updatedAt }));
  }
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}

export function NicknameSettings({ user }: { user: AuthUser }) {
  const t = useTranslations("account");
  const locale = useLocale();
  const [nickname, setNickname] = useState(user.nickname ?? "");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [checkedNickname, setCheckedNickname] = useState<string | null>(null);
  const [availability, setAvailability] = useState<NicknameAvailability | null>(null);
  const [completion, setCompletion] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<ReturnType<typeof canChangeNickname> & { lastChangedAt: string } | null>(null);

  useEffect(() => { setNickname(user.nickname ?? ""); setCheckedNickname(null); setAvailability(null); }, [user.nickname]);

  const latestUpdatedAt = () => (user as NicknameUser).nicknameUpdatedAt ?? readNicknameUpdatedAt(user.id);
  const validationMessage = (reason: NonNullable<NicknameAvailability["reason"]>) => t(`nickname${reason === "format" ? "Invalid" : reason === "same" ? "Same" : reason === "forbidden" ? "Forbidden" : "Taken"}`);
  const checkAvailability = async (): Promise<NicknameAvailability> => {
    const normalized = normalizeNickname(nickname);
    const validation = validateNewNickname(normalized, user.nickname);
    if (!validation.valid) {
      const result = { available: false, reason: validation.reason } as NicknameAvailability;
      setCheckedNickname(normalized); setAvailability(result); setError(validationMessage(validation.reason ?? "format"));
      return result;
    }

    setChecking(true); setError(""); setCompletion(null);
    try {
      const result = await useAuthStore.getState().checkNicknameAvailability(normalized);
      setCheckedNickname(normalized); setAvailability(result);
      if (!result.available) setError(validationMessage(result.reason ?? "taken"));
      return result;
    } catch (cause) {
      const result: NicknameAvailability = { available: false, reason: "taken" };
      setCheckedNickname(normalized); setAvailability(result);
      setError(t(`errors.${cause instanceof AccountError ? cause.code : "network"}`));
      return result;
    } finally { setChecking(false); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || checking) return;

    const lastChangedAt = latestUpdatedAt();
    const eligibility = canChangeNickname(lastChangedAt);
    if (!eligibility.allowed && lastChangedAt) {
      setCooldown({ ...eligibility, lastChangedAt: String(lastChangedAt) });
      return;
    }

    const normalized = normalizeNickname(nickname);
    const validation = validateNewNickname(normalized, user.nickname);
    if (!validation.valid) {
      setCompletion(null);
      setCheckedNickname(normalized); setAvailability({ available: false, reason: validation.reason });
      setError(validationMessage(validation.reason ?? "format"));
      return;
    }

    if (checkedNickname !== normalized || !availability?.available) {
      const result = await checkAvailability();
      if (result.available) setError(t("nicknameCheckRequired"));
      return;
    }

    setBusy(true); setError(""); setCompletion(null);
    try {
      const saved = await useAuthStore.getState().updateNickname(normalized);
      if (!saved) throw new AccountError("network");
      const updatedAt = new Date().toISOString();
      saveNicknameUpdatedAt(user.id, updatedAt);
      setNickname(normalized);
      setCheckedNickname(null); setAvailability(null);
      setCompletion(canChangeNickname(updatedAt).nextAvailableAt);
    } catch (cause) {
      setError(cause instanceof AccountError && cause.code === "conflict" ? t("nicknameTaken") : t(`errors.${cause instanceof AccountError ? cause.code : "network"}`));
    } finally { setBusy(false); }
  };

  return <section className="mt-5 rounded-2xl border border-hairline bg-surface p-5 sm:p-7">
    <h2 className="text-xl font-semibold text-white">{t("nicknameTitle")}</h2>
    <form onSubmit={submit} className="mt-4 max-w-md">
      <label className="block text-sm text-secondary">{t("nickname")}
        <span className="mt-2 flex gap-2">
          <input value={nickname} onChange={e => { setNickname(e.target.value); setCompletion(null); setCheckedNickname(null); setAvailability(null); setError(""); }} autoComplete="nickname" maxLength={12} required disabled={busy || checking} aria-describedby="nickname-hint nickname-check-status" className="h-12 min-w-0 flex-1 rounded-xl border border-hairline bg-obsidian px-4 text-base text-white focus:border-gold-champagne focus:outline-none" />
          <button type="button" onClick={() => void checkAvailability()} disabled={busy || checking} className="h-12 shrink-0 rounded-xl border border-gold-champagne/50 px-4 text-sm font-semibold text-gold-champagne disabled:opacity-40">{t(checking ? "checkingDuplicate" : "checkDuplicate")}</button>
        </span>
      </label>
      <p id="nickname-hint" className="mt-2 text-xs leading-6 text-muted">{t("nicknameHint")}</p>
      {availability?.available && checkedNickname === normalizeNickname(nickname) && <p id="nickname-check-status" role="status" className="mt-2 text-sm text-emerald-300">✓ {t("nicknameAvailable")}</p>}
      {error && <p role="alert" className="mt-2 text-sm text-red-200">{error}</p>}
      {completion && <p role="status" className="mt-2 text-sm text-emerald-300">{t("nicknameChanged", { nextAvailable: formatDate(completion, locale) })}</p>}
      <button disabled={busy || checking} className="mt-4 min-h-12 rounded-xl bg-[#f1eee7] px-5 text-sm font-semibold text-obsidian disabled:opacity-40">{t(busy ? "processing" : "saveNickname")}</button>
    </form>

    {cooldown && <div role="dialog" aria-modal="true" aria-labelledby="nickname-cooldown-title" className="fixed inset-0 z-[140] flex items-center justify-center bg-obsidian/85 p-4 backdrop-blur-sm" onMouseDown={event => event.target === event.currentTarget && setCooldown(null)}>
      <div className="w-full max-w-md rounded-2xl border border-hairline bg-surface p-6 shadow-2xl">
        <h3 id="nickname-cooldown-title" className="text-lg font-semibold text-white">{t("nicknameCooldownTitle")}</h3>
        <p className="mt-3 leading-6 text-secondary">{t("nicknameCooldownBody")}</p>
        <dl className="mt-5 space-y-2 rounded-xl bg-obsidian p-4 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-muted">{t("nicknameLastChanged")}</dt><dd className="text-right text-white">{formatDate(cooldown.lastChangedAt, locale)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted">{t("nicknameNextAvailable", { days: cooldown.remainingDays })}</dt><dd className="text-right text-white">{cooldown.nextAvailableAt && formatDate(cooldown.nextAvailableAt, locale)}</dd></div>
        </dl>
        <button type="button" onClick={() => setCooldown(null)} className="mt-6 min-h-11 w-full rounded-xl bg-[#f1eee7] px-4 text-sm font-semibold text-obsidian">{t("confirm")}</button>
      </div>
    </div>}
  </section>;
}
