"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, X, ShieldCheck, RefreshCw, Eye, ArrowDownToLine } from "lucide-react";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { useProductText } from "@/lib/useProductText";
import { BOXES, dropTable, type ProductBox, type ProductItem } from "@/lib/products";
import { tierOf, glow } from "@/lib/tiers";
import {
  ROLL_MAX,
  ROLL_RANGE,
  generateClientSeed,
  generateServerSeed,
  hashServerSeed,
  rollRanges,
  verifyRoll,
  type VerifyOutput,
} from "@/lib/fairness";

const RESOLUTION_PCT = (100 / ROLL_RANGE).toString();

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="caption-luxury block">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-hairline bg-obsidian px-3 py-2 font-mono text-xs text-white outline-none transition-colors placeholder:text-faint focus:border-gold-champagne";

/**
 * Provably Fair 검증기 (PROMPTS 3-1-2).
 *   입력: 서버 시드 · (선택) 공개 해시 · 클라이언트 시드 · Nonce · 박스
 *   출력: 서버 시드 SHA-256(+공개 해시 일치 여부) · HMAC · 롤 · 당첨 항목과 구간
 * 계산은 lib/fairness.ts 그대로 — 화면은 재현만 한다.
 */
export function FairnessVerifier({ initialBox, compact = false }: { initialBox?: ProductBox; compact?: boolean }) {
  const t = useTranslations("fairness");
  const { fmt } = useCurrency();
  const { boxTitle, itemName } = useProductText();

  const [boxSlug, setBoxSlug] = useState((initialBox ?? BOXES[0]).slug);
  const [serverSeed, setServerSeed] = useState("");
  const [serverSeedHash, setServerSeedHash] = useState("");
  const [clientSeed, setClientSeed] = useState(() => "");
  const [nonce, setNonce] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyOutput<ProductItem> | null>(null);

  // 시드 커밋 데모 상태
  const [demoSeed, setDemoSeed] = useState<string | null>(null);
  const [demoHash, setDemoHash] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const box = useMemo(() => BOXES.find((b) => b.slug === boxSlug) ?? BOXES[0], [boxSlug]);
  const ranges = useMemo(() => rollRanges(dropTable(box)), [box]);

  const run = useCallback(async () => {
    const n = Number(nonce);
    if (!serverSeed.trim() || !clientSeed.trim() || !Number.isInteger(n) || n < 0) {
      setError(t("invalidInput"));
      setResult(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const out = await verifyRoll({
        serverSeed: serverSeed.trim(),
        serverSeedHash: serverSeedHash.trim() || undefined,
        clientSeed: clientSeed.trim(),
        nonce: n,
        items: dropTable(box),
      });
      setResult(out);
    } finally {
      setBusy(false);
    }
  }, [serverSeed, serverSeedHash, clientSeed, nonce, box, t]);

  const clear = () => {
    setServerSeed("");
    setServerSeedHash("");
    setClientSeed("");
    setNonce("0");
    setResult(null);
    setError(null);
  };

  const generate = async () => {
    const s = generateServerSeed();
    setDemoSeed(s);
    setDemoHash(await hashServerSeed(s));
    setRevealed(false);
  };

  const useDemo = () => {
    if (!demoSeed || !demoHash) return;
    setServerSeed(demoSeed);
    setServerSeedHash(demoHash);
    if (!clientSeed) setClientSeed(generateClientSeed());
  };

  const winRange = result ? ranges.find((r) => r.item.id === result.item.id) : null;
  const winTier = result ? tierOf(result.item.value, box.price) : null;

  return (
    <div className={cn("grid gap-6", compact ? "" : "lg:grid-cols-5")}>
      {/* ── 입력 ── */}
      <section className={cn("border-metallic-subtle rounded-xl bg-surface p-4 md:p-5", compact ? "" : "lg:col-span-3")}>
        <div className="grid gap-4">
          <Field label={t("box")}>
            <select value={boxSlug} onChange={(e) => setBoxSlug(e.target.value)} className={cn(inputCls, "font-sans")}>
              {BOXES.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {boxTitle(b)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("serverSeed")}>
            <textarea value={serverSeed} onChange={(e) => setServerSeed(e.target.value)} rows={2} spellCheck={false} placeholder="128 hex" className={cn(inputCls, "resize-none")} />
          </Field>
          <Field label={t("serverSeedHash")}>
            <input value={serverSeedHash} onChange={(e) => setServerSeedHash(e.target.value)} spellCheck={false} placeholder="64 hex" className={inputCls} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label={t("clientSeed")}>
                <div className="flex gap-2">
                  <input value={clientSeed} onChange={(e) => setClientSeed(e.target.value)} spellCheck={false} className={inputCls} />
                  <button type="button" onClick={() => setClientSeed(generateClientSeed())} aria-label={t("generate")} className="glass-dark flex h-9 w-9 flex-none items-center justify-center rounded-md text-muted hover:text-white">
                    <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              </Field>
            </div>
            <Field label={t("nonce")}>
              <input value={nonce} onChange={(e) => setNonce(e.target.value)} inputMode="numeric" className={inputCls} />
            </Field>
          </div>

          {error && <p className="text-xs text-crimson">{error}</p>}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={run}
              disabled={busy}
              className="flex h-11 items-center gap-2 rounded-md bg-crimson px-5 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" strokeWidth={2.2} />
              {busy ? t("verifying") : t("verify")}
            </button>
            <button type="button" onClick={clear} className="glass-dark h-11 rounded-md px-4 text-sm font-semibold text-secondary hover:text-white">
              {t("clear")}
            </button>
            <span className="ml-auto text-right text-[10px] leading-tight text-faint">
              {t("rangeNote", { max: ROLL_MAX.toLocaleString("en-US"), resolution: RESOLUTION_PCT })}
            </span>
          </div>
        </div>

        {/* ── 결과 ── */}
        {result && winRange && winTier && (
          <div className="border-metallic-gold mt-5 rounded-lg bg-obsidian p-4">
            <div
              className={cn("flex items-center gap-2 text-xs font-semibold", result.hashMatches === false ? "text-crimson" : result.hashMatches ? "text-gold-champagne" : "text-muted")}
            >
              {result.hashMatches === false ? <X className="h-4 w-4" strokeWidth={2.5} /> : <Check className="h-4 w-4" strokeWidth={2.5} />}
              {result.hashMatches === null ? t("hashSkipped") : result.hashMatches ? t("hashMatch") : t("hashMismatch")}
            </div>

            <dl className="mt-3 grid gap-3 text-xs">
              <Row label={t("resultHash")} mono value={result.serverSeedHash} />
              <Row label={t("resultHmac")} mono value={result.hmac} />
              <div className="grid grid-cols-2 gap-3">
                <Row label={t("resultRoll")} mono value={t("outOf", { roll: result.roll.toLocaleString("en-US"), max: ROLL_MAX.toLocaleString("en-US") })} big />
                <Row label={t("resultRange")} mono value={`${winRange.from.toLocaleString("en-US")} – ${winRange.to.toLocaleString("en-US")}`} />
              </div>
            </dl>

            <div className="mt-4 flex items-center gap-3 rounded-md p-3" style={{ backgroundColor: glow(winTier.accent, 0.08), boxShadow: `inset 0 0 0 1px ${glow(winTier.accent, 0.4)}` }}>
              <span className="caption-luxury" style={{ color: winTier.accent }}>
                {winTier.label}
              </span>
              <span className="flex-1 truncate text-sm font-bold text-white">{itemName(result.item)}</span>
              <span className="font-mono text-sm font-bold tabular-nums" style={{ color: winTier.accent }}>
                {fmt(result.item.value)}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* ── 시드 커밋 데모 ── */}
      <aside className={cn("border-metallic-subtle rounded-xl bg-surface p-4 md:p-5", compact ? "" : "lg:col-span-2")}>
        <div className="caption-luxury">{t("demoTitle")}</div>
        <p className="mt-2 text-xs leading-relaxed text-muted">{t("demoBody")}</p>

        <button type="button" onClick={generate} className="glass mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-semibold text-white hover:bg-white/15">
          <RefreshCw className="h-4 w-4" strokeWidth={2} />
          {t("generate")}
        </button>

        {demoHash && (
          <div className="mt-4 grid gap-3 text-xs">
            <Row label={t("resultHash")} mono value={demoHash} />
            <div>
              <div className="caption-luxury">{t("serverSeed")}</div>
              {revealed && demoSeed ? (
                <code className="mt-1 block break-all rounded-md border border-hairline bg-obsidian p-2 font-mono text-[10px] leading-relaxed text-gold-champagne">{demoSeed}</code>
              ) : (
                <div className="mt-1 flex items-center gap-2 rounded-md border border-dashed border-hairline bg-obsidian p-2 text-[11px] text-faint">
                  <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                  {t("hidden")}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {!revealed && (
                <button type="button" onClick={() => setRevealed(true)} className="glass-dark flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-semibold text-white hover:border-gold-champagne">
                  <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                  {t("reveal")}
                </button>
              )}
              {revealed && (
                <button type="button" onClick={useDemo} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-gold-champagne text-xs font-bold text-obsidian hover:bg-gold-metallic">
                  <ArrowDownToLine className="h-3.5 w-3.5" strokeWidth={2.2} />
                  {t("useInVerifier")}
                </button>
              )}
            </div>
          </div>
        )}

        {/* 구간표 */}
        <div className="mt-5 border-t border-hairline pt-4">
          <div className="caption-luxury">{boxTitle(box)}</div>
          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1 text-[10px]">
            {ranges.map((r) => {
              const tier = tierOf(r.item.value, box.price);
              const active = result?.item.id === r.item.id;
              return (
                <li key={r.item.id} className={cn("flex items-center gap-2 rounded px-1.5 py-1", active && "bg-elevation")}>
                  <span aria-hidden className="h-2.5 w-0.5 flex-none rounded-full" style={{ background: tier.accent }} />
                  <span className="min-w-0 flex-1 truncate text-secondary">{itemName(r.item)}</span>
                  <span className="font-mono tabular-nums text-faint">
                    {r.from.toLocaleString("en-US")}–{r.to.toLocaleString("en-US")}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value, mono = false, big = false }: { label: string; value: string; mono?: boolean; big?: boolean }) {
  return (
    <div>
      <dt className="caption-luxury">{label}</dt>
      <dd className={cn("mt-1 break-all leading-relaxed text-secondary", mono && "font-mono", big ? "text-lg font-bold text-white" : "text-[11px]")}>{value}</dd>
    </div>
  );
}

export default FairnessVerifier;
