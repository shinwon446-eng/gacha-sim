"use client";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/authStore";

export function LoginRequired() {
  const t = useTranslations("account");
  const ready = useAuthStore(s => s.hydrated);
  const open = useAuthStore(s => s.openAuthModal);
  return <div className="mt-4 rounded-xl border border-hairline bg-obsidian p-5">
    <p className="text-sm leading-7 text-secondary">{t(ready ? "settingsLoginNeeded" : "processing")}</p>
    {ready && <button type="button" onClick={() => open("login")} className="mt-3 min-h-12 rounded-xl bg-[#f1eee7] px-5 text-sm font-semibold text-obsidian">{t("loginTitle")}</button>}
  </div>;
}
