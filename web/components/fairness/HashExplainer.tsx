"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Fingerprint } from "lucide-react";
import { hashServerSeed } from "@/lib/fairness";

/** Computes a real SHA-256 digest of editable text; it is never an opening receipt. */
export function HashExplainer() {
  const t = useTranslations("fairnessGuide");
  const id = useId();
  const [value, setValue] = useState("VOILA");
  const [hash, setHash] = useState("");
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  useEffect(() => {
    let active = true;
    setHash("");
    setFailed(false);
    hashServerSeed(value).then((digest) => { if (active) setHash(digest); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [value]);
  return <section aria-labelledby={`${id}-title`} className="grid gap-6 rounded-lg border border-hairline bg-surface p-5 md:grid-cols-2 md:gap-10 md:p-7">
    <div>
      <Fingerprint aria-hidden className="h-5 w-5 text-gold-champagne" />
      <h2 id={`${id}-title`} className="mt-4 text-xl font-medium text-white">{t("hashTitle")}</h2>
      <p className="mt-3 text-sm leading-7 text-muted">{t("hashBody")}</p>
      <p className="mt-3 text-sm leading-7 text-secondary">{t("hashTry")}</p>
    </div>
    <div className="min-w-0">
      <label htmlFor={`${id}-text`} className="text-sm font-medium text-white">{t("hashInput")}</label>
      <input id={`${id}-text`} value={value} maxLength={200} disabled={!ready} onChange={(event) => setValue(event.target.value)} spellCheck={false} autoComplete="off" className="mt-2 min-h-12 w-full rounded-md border border-hairline bg-obsidian px-3 text-base text-white outline-none focus:border-gold-champagne disabled:opacity-60" />
      <p className="mt-4 text-sm text-secondary">{t("hashOutput")}</p>
      <output htmlFor={`${id}-text`} className="mt-2 block min-h-20 break-all rounded-md border border-hairline bg-obsidian p-3 font-mono text-sm leading-6 text-gold-champagne">{failed ? t("computeError") : hash || t("computing")}</output>
      <p className="mt-3 text-xs leading-6 text-muted">{t("hashNote")}</p>
    </div>
  </section>;
}
