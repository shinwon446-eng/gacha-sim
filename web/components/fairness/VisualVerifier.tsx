"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronDown, CircleHelp, Download, Fingerprint, Loader2, X } from "lucide-react";
import { cn } from "@/lib/format";
import { Link } from "@/i18n/navigation";
import { useProductText } from "@/lib/useProductText";
import { BOX_BY_SLUG } from "@/lib/products";
import { ROLL_MAX } from "@/lib/fairness";
import { useInventoryStore, type OwnedItem } from "@/stores/inventoryStore";
import { FairnessVerifier } from "@/components/fairness/FairnessVerifier";
import { verifyOpeningRecord, type RecordVerification } from "@/components/fairness/verifyRecord";

export interface VisualVerifierProps { className?: string; record?: OwnedItem; autoRun?: boolean; embedded?: boolean }

export function VisualVerifier({ className, record, autoRun = false, embedded = false }: VisualVerifierProps) {
  const t = useTranslations("fairnessGuide");
  const locale = useLocale();
  const id = useId();
  const { boxTitle, itemName } = useProductText();
  const items = useInventoryStore((s) => s.items);
  const recent = useMemo(() => record ? [record] : [...items].sort((a, b) => b.acquiredAt.localeCompare(a.acquiredAt)), [items, record]);
  const [pickedId, setPickedId] = useState("");
  const picked = record ?? recent.find((item) => item.id === pickedId) ?? recent[0];
  const box = picked ? BOX_BY_SLUG[picked.boxSlug] : undefined;
  const [result, setResult] = useState<{ id: string; value: RecordVerification } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const running = useRef(false);
  const autoRecord = useRef<string | null>(null);
  const out = result?.id === picked?.id ? result?.value : null;

  useEffect(() => { generation.current += 1; running.current = false; autoRecord.current = null; setBusy(false); setResult(null); setError(null); }, [picked?.id]);
  useEffect(() => () => { generation.current += 1; }, []);
  const run = useCallback(async () => {
    if (!picked || running.current) return;
    const current = ++generation.current;
    running.current = true;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const value = await verifyOpeningRecord(picked);
      if (generation.current === current) setResult({ id: picked.id, value });
    } catch {
      if (generation.current === current) setError(t("computeError"));
    } finally {
      if (generation.current === current) { running.current = false; setBusy(false); }
    }
  }, [picked, t]);
  useEffect(() => {
    if (autoRun && picked && autoRecord.current !== picked.id) { autoRecord.current = picked.id; void run(); }
  }, [autoRun, picked, run]);

  const labelFor = (itemId: string) => {
    const item = box?.items.find((entry) => entry.id === itemId);
    return item ? itemName(item) : itemId;
  };
  const download = () => {
    if (!picked) return;
    const data = { format: "voila-opening-proof-v1", recordId: picked.id, boxSlug: picked.boxSlug, itemId: picked.itemId, acquiredAt: picked.acquiredAt, fair: picked.fair };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `voila-proof-${picked.id.replace(/[^a-zA-Z0-9_-]/g, "")}.json`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const checks = out ? [out.hashMatch, out.rollMatch, out.itemMatch] : [];
  const failed = checks.some((check) => check === false);
  const complete = checks.length === 3 && checks.every((check) => check === true);

  return <section aria-labelledby={`${id}-title`} className={cn("min-w-0", !embedded && "rounded-lg border border-hairline bg-surface p-5 md:p-8", className)}>
    <div className={cn(embedded && "pr-10")}>
      <p className="flex items-center gap-2 text-xs tracking-widest text-gold-champagne"><Fingerprint aria-hidden className="h-4 w-4" />{t("verifierEyebrow")}</p>
      <h2 id={`${id}-title`} className="mt-3 text-2xl font-medium tracking-tight text-white">{t("verifierTitle")}</h2>
      <p className="mt-3 text-sm leading-7 text-muted">{t("verifierBody")}</p>
    </div>

    {!picked ? <div className="mt-6 rounded-md border border-dashed border-hairline p-6">
      <p className="text-sm font-medium text-white">{t("emptyTitle")}</p><p className="mt-2 text-sm leading-7 text-muted">{t("emptyBody")}</p>
      <Link href="/" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-gold-champagne underline-offset-4 hover:underline">{t("browse")}</Link>
    </div> : <>
      <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        {record ? <div className="min-w-0 rounded-md border border-hairline bg-obsidian p-4"><p className="text-sm font-medium leading-6 text-white">{labelFor(record.itemId)}</p><p className="mt-1 text-xs leading-6 text-muted">{box ? boxTitle(box) : record.boxSlug} , {new Date(record.acquiredAt).toLocaleString(locale)}</p></div> : <label className="min-w-0 text-sm text-secondary" htmlFor={`${id}-record`}>{t("pick")}<select id={`${id}-record`} value={picked.id} disabled={busy} onChange={(event) => setPickedId(event.target.value)} className="mt-2 min-h-12 w-full min-w-0 rounded-md border border-hairline bg-obsidian px-3 text-sm text-white outline-none focus:border-gold-champagne disabled:opacity-60">{recent.map((item) => {
          const productBox = BOX_BY_SLUG[item.boxSlug]; const product = productBox?.items.find((entry) => entry.id === item.itemId);
          return <option key={item.id} value={item.id}>{new Date(item.acquiredAt).toLocaleString(locale)} , {product ? itemName(product) : item.itemId} , #{item.fair.nonce}</option>;
        })}</select></label>}
        <button type="button" disabled={busy} onClick={() => void run()} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#f1eee7] px-5 text-sm font-semibold text-obsidian hover:bg-white disabled:cursor-wait disabled:opacity-60">{busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Fingerprint aria-hidden className="h-4 w-4" />}{busy ? t("computing") : out ? t("verifyAgain") : t("verify")}</button>
      </div>

      <ol className="mt-6 divide-y divide-hairline">
        {[1, 2, 3].map((step, index) => <li key={step} className="flex gap-3 py-5">
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs", !out ? "border-hairline text-muted" : checks[index] === true ? "border-gold-champagne/40 text-gold-champagne" : checks[index] === false ? "border-crimson/50 text-crimson" : "border-hairline text-muted")}>{!out ? step : checks[index] === true ? <Check aria-hidden className="h-4 w-4" /> : checks[index] === false ? <X aria-hidden className="h-4 w-4" /> : <CircleHelp aria-hidden className="h-4 w-4" />}</span>
          <div className="min-w-0 flex-1"><h3 className="text-sm font-medium leading-6 text-white">{t(`check${step}Title`)}</h3><p className="mt-1 text-sm leading-7 text-muted">{t(`check${step}Body`)}</p>
            {out && <p className={cn("mt-2 text-sm font-medium leading-6", checks[index] === false ? "text-crimson" : checks[index] === true ? "text-gold-champagne" : "text-secondary")}>{checks[index] === null ? t("historicalMissing") : t(`check${step}${checks[index] ? "Pass" : "Fail"}`)}</p>}
            {out && step === 2 && <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm"><span className="text-muted">{t("savedNumber")} <strong className="ml-1 font-mono font-medium text-white">{picked.fair.roll.toLocaleString(locale)}</strong></span><span className="text-muted">{t("calculatedNumber")} <strong className="ml-1 font-mono font-medium text-white">{out.roll.toLocaleString(locale)}</strong></span></div>}
            {out && step === 3 && out.expectedItemId && <div className="mt-3 rounded-md border border-hairline bg-obsidian p-3 text-sm leading-7"><p className="text-muted">{t("savedItem")} <span className="text-white">{labelFor(picked.itemId)}</span></p><p className="text-muted">{t("calculatedItem")} <span className="text-white">{labelFor(out.expectedItemId)}</span></p>{out.range && <p className="mt-2 text-xs leading-6 text-muted">{t("range", { from: out.range.from.toLocaleString(locale), to: out.range.to.toLocaleString(locale), pct: out.range.dropRate })}</p>}</div>}
          </div>
        </li>)}
      </ol>

      <div role="status" aria-live="polite" aria-atomic="true">{out && <div className={cn("mt-2 rounded-md border p-4", failed ? "border-crimson/40 bg-crimson/5" : "border-hairline bg-obsidian")}><p className={cn("text-base font-medium", failed ? "text-crimson" : complete ? "text-gold-champagne" : "text-white")}>{t(failed ? "verdictFail" : complete ? "verdictPass" : "verdictPartial")}</p><p className="mt-2 text-sm leading-7 text-muted">{t(failed ? "verdictFailBody" : complete ? "verdictPassBody" : "verdictPartialBody")}</p></div>}{error && <p className="mt-4 rounded-md border border-crimson/40 p-4 text-sm leading-7 text-crimson">{error}</p>}</div>
      <p className="mt-4 text-xs leading-6 text-muted">{t("resultLimit")}</p>

      <details className="group mt-5 border-t border-hairline pt-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-white [&::-webkit-details-marker]:hidden">{t("evidenceTitle")}<ChevronDown aria-hidden className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" /></summary>
        <p className="mt-2 text-sm leading-7 text-muted">{t("evidenceBody")}</p>
        <dl className="mt-4 grid gap-4 rounded-md border border-hairline bg-obsidian p-4">
          {[["savedHash", picked.fair.serverSeedHash], ["computedHash", out?.hash ?? t("notCalculated")], ["seed", picked.fair.serverSeed], ["client", picked.fair.clientSeed], ["nonce", String(picked.fair.nonce)], ["tableVersion", picked.fair.oddsVersion ?? t("unknownVersion")]].map(([key, value]) => <div key={key}><dt className="text-xs leading-6 text-muted">{t(key)}</dt><dd className="mt-1 break-all font-mono text-xs leading-6 text-secondary">{value}</dd></div>)}
        </dl>
        <p className="mt-3 text-xs leading-6 text-muted">{t("formula", { max: ROLL_MAX.toLocaleString(locale) })}</p>
        <button type="button" onClick={download} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md border border-hairline px-4 text-sm text-secondary hover:text-white"><Download aria-hidden className="h-4 w-4" />{t("download")}</button>
      </details>
    </>}
    {!embedded && <details className="group mt-5 border-t border-hairline pt-3"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-white [&::-webkit-details-marker]:hidden">{t("manualTitle")}<ChevronDown aria-hidden className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" /></summary><p className="mb-5 mt-2 text-sm leading-7 text-muted">{t("manualBody")}</p><FairnessVerifier compact /></details>}
  </section>;
}

export default VisualVerifier;
