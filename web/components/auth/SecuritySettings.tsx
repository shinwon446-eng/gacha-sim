"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AccountError } from "@/lib/account";
import { disableTotp } from "@/lib/security";
import { useAuthStore, type AuthUser } from "@/stores/authStore";
import { useSecurityStore } from "@/stores/securityStore";
import { TwoFactorSetup } from "@/components/wallet/TwoFactorSetup";

export function SecuritySettings({ user }: { user: AuthUser }) {
  const t = useTranslations("security");
  const ta = useTranslations("account");
  const locale = useLocale();
  const security = useSecurityStore();
  const [disabling, setDisabling] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const disable = async () => {
    if (busy || !/^\d{6}$/.test(code)) return;
    setBusy(true); setError("");
    try {
      const result = await disableTotp(code);
      if (useAuthStore.getState().user?.id !== user.id) return;
      security.accept(user.id, result); setDisabling(false); setCode("");
    } catch (cause) { setError(cause instanceof AccountError && cause.code === "credentials" ? t("codeWrong") : ta(`errors.${cause instanceof AccountError ? cause.code : "network"}`)); }
    finally { setBusy(false); }
  };
  return <section className="mt-9 rounded-2xl border border-hairline bg-surface p-5 sm:p-7">
    <h2 className="text-xl font-semibold text-white">{t("title")}</h2>
    {!security.hydrated ? <div className="mt-4 text-sm text-secondary"><p role="status">{t(security.error ? "loadFailed" : "loading")}</p>{security.error && <button type="button" onClick={() => void security.refresh(user.id)} className="mt-2 min-h-11 text-gold-champagne">{t("retry")}</button>}</div>
      : security.twoFactorEnabled ? <div className="mt-4 rounded-xl border border-emerald-500/40 p-4">
        <p className="font-semibold text-emerald-300">{t("enabledTitle")}</p>
        {security.enabledAt && <p className="mt-2 text-xs text-secondary">{t("enabledSince", { at: new Date(security.enabledAt).toLocaleString(locale) })}</p>}
        {disabling ? <form onSubmit={e => { e.preventDefault(); void disable(); }} className="mt-3 space-y-3">
          <label className="block text-sm text-secondary">{t("disableCode")}<input autoComplete="one-time-code" inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} disabled={busy} className="mt-2 block h-12 w-full rounded-lg border border-hairline bg-obsidian px-3 font-mono text-white" /></label>
          {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
          <div className="flex gap-4"><button disabled={busy || code.length !== 6} className="min-h-11 text-sm text-red-200 disabled:opacity-40">{t("disable")}</button><button type="button" disabled={busy} onClick={() => { setDisabling(false); setCode(""); setError(""); }} className="min-h-11 text-sm text-secondary">{t("cancel")}</button></div>
        </form> : <button type="button" onClick={() => setDisabling(true)} className="mt-3 min-h-11 text-sm text-red-200 underline underline-offset-4">{t("disable")}</button>}
      </div> : <TwoFactorSetup key={user.id} />}
  </section>;
}
