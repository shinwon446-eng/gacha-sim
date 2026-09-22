"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Lock, Dices, Target, Check, ShieldCheck, ChevronDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/format";
import { Link } from "@/i18n/navigation";
import { useProductText } from "@/lib/useProductText";
import { BOX_BY_SLUG, dropTable, type ProductBox, type ProductItem } from "@/lib/products";
import { TIER_BY_KEY, glow, tierOf } from "@/lib/tiers";
import { ROLL_RANGE, calculateRollResult, determineItem, hashServerSeed, rollRanges, type RollRange } from "@/lib/fairness";
import { useInventoryStore, type OwnedItem } from "@/stores/inventoryStore";
import { FairnessVerifier } from "@/components/fairness/FairnessVerifier";
import { Money } from "@/components/ui/Money";

type StepState = "idle" | "running" | "pass" | "fail";

interface Outcome {
  hash: string;
  hashMatch: boolean;
  roll: number;
  itemId: string;
  itemMatch: boolean;
}

const STEP_MS = 850;

/**
 * 3-Step 1-Click 비주얼 공정성 검증기 (CLAUDE.md §5-A, PROMPTS 3-1).
 *   최근 언박싱(보관함 레코드의 fair 스냅샷)을 고르고 [검증하기] →
 *   1 🔒 사전 봉인: SHA-256(서버 시드) == 개봉 전 공개 해시
 *   2 🎲 난수 결합: HMAC(서버 시드, 클라 시드:nonce) → 롤 넘버
 *   3 🎯 구간 매칭: 게이지 바 위 롤 위치가 당첨 항목 구간 안
 * 계산은 lib/fairness.ts 그대로. hex 입력은 "전문가 모드" 토글 뒤에 있다.
 */
export interface VisualVerifierProps {
  className?: string;
  /** 고정 레코드 — 주어지면 선택 드롭다운을 숨기고 이 건만 검증한다 (룰렛 팝업·보관함 카드) */
  record?: OwnedItem;
  /** 마운트 즉시 검증 시작 */
  autoRun?: boolean;
  /** 모달 안에서 쓸 때 — 헤더·전문가 토글을 간소화 */
  embedded?: boolean;
}

export function VisualVerifier({ className, record, autoRun = false, embedded = false }: VisualVerifierProps) {
  const t = useTranslations("fairness.visual");
  const locale = useLocale();
  const { boxTitle, itemName } = useProductText();
  const items = useInventoryStore((s) => s.items);
  const recent = useMemo(() => (record ? [record] : [...items].sort((a, b) => b.acquiredAt.localeCompare(a.acquiredAt)).slice(0, 12)), [items, record]);

  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked: OwnedItem | undefined = record ?? (recent.find((o) => o.id === pickedId) ?? recent[0]);
  const [steps, setSteps] = useState<[StepState, StepState, StepState]>(["idle", "idle", "idle"]);
  const [out, setOut] = useState<Outcome | null>(null);
  const [expert, setExpert] = useState(false);
  const [busy, setBusy] = useState(false);

  const box: ProductBox | undefined = picked ? BOX_BY_SLUG[picked.boxSlug] : undefined;
  const table = useMemo(() => (box ? dropTable(box) : []), [box]);
  const ranges = useMemo(() => (table.length ? rollRanges(table) : []), [table]);

  // 선택이 바뀌면 결과 초기화
  useEffect(() => {
    setSteps(["idle", "idle", "idle"]);
    setOut(null);
  }, [picked?.id]);

  const run = useCallback(async () => {
    if (!picked || !box || busy) return;
    setBusy(true);
    setOut(null);
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    // 1. 사전 봉인
    setSteps(["running", "idle", "idle"]);
    const hash = await hashServerSeed(picked.fair.serverSeed);
    const hashMatch = hash === picked.fair.serverSeedHash;
    await wait(STEP_MS);
    setSteps([hashMatch ? "pass" : "fail", "running", "idle"]);
    // 2. 난수 결합
    const r = await calculateRollResult(picked.fair.serverSeed, picked.fair.clientSeed, picked.fair.nonce);
    await wait(STEP_MS);
    setSteps([hashMatch ? "pass" : "fail", "pass", "running"]);
    // 3. 구간 매칭
    const item = determineItem(r.roll, table);
    const itemMatch = item.id === picked.itemId && r.roll === picked.fair.roll;
    await wait(STEP_MS);
    setOut({ hash, hashMatch, roll: r.roll, itemId: item.id, itemMatch });
    setSteps([hashMatch ? "pass" : "fail", "pass", itemMatch ? "pass" : "fail"]);
    setBusy(false);
  }, [picked, box, busy, table]);

  // 자동 실행 — 레코드가 주어진 모달에서 한 번
  const [autoFired, setAutoFired] = useState(false);
  useEffect(() => {
    if (!autoRun || autoFired || !picked) return;
    setAutoFired(true);
    void run();
  }, [autoRun, autoFired, picked, run]);

  const allPass = steps.every((s) => s === "pass");
  const winRange = out ? ranges.find((x) => x.item.id === out.itemId) : undefined;
  const rollPct = out ? (out.roll / ROLL_RANGE) * 100 : 0;

  return (
    <section className={cn(embedded ? "relative" : "border-metallic-gold relative overflow-hidden rounded-xl bg-surface p-5 md:p-6", className)} aria-label={t("title")}>
      {!embedded && <span aria-hidden className="pedestal-glow pointer-events-none absolute inset-0" />}
      {/* 모달 안에서는 우상단 닫기 버튼(absolute right-3, 36px) 자리를 비워 둔다 — 전문가 모드 칩이 X 아래로 들어가지 않게 */}
      <div className={cn("relative flex flex-wrap items-start justify-between gap-3", embedded && "pr-10")}>
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-gold-champagne" strokeWidth={2.2} />
            <span className="caption-luxury !text-gold-champagne">{t("eyebrow")}</span>
          </div>
          <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-tight text-white">{t("title")}</h2>
          {!embedded && <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">{t("body")}</p>}
        </div>
        <button type="button" onClick={() => setExpert((v) => !v)} aria-expanded={expert} className="glass-dark flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold text-secondary hover:text-white">
          {t("expert")}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expert && "rotate-180")} strokeWidth={2.2} />
        </button>
      </div>

      {/* 최근 언박싱 선택 + 검증 버튼 (고정 레코드면 요약 줄) */}
      <div className="relative mt-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        {record && box ? (
          <div className="border-metallic-subtle flex min-w-0 items-baseline gap-2 rounded-lg bg-obsidian px-3 py-2.5 text-sm">
            <span className="truncate font-semibold text-white">{(() => { const it = box.items.find((i) => i.id === record.itemId); return it ? itemName(it) : record.itemId; })()}</span>
            <span className="truncate text-xs text-muted">{boxTitle(box)}</span>
            <span className="ml-auto flex-none font-mono text-[10px] text-faint">nonce #{record.fair.nonce}</span>
          </div>
        ) : recent.length === 0 ? (
          <div className="border-metallic-subtle rounded-lg bg-obsidian p-4 text-sm text-muted">
            {t("noRecent")}{" "}
            <Link href="/" className="font-semibold text-gold-champagne underline-offset-2 hover:underline">
              {t("goOpen")}
            </Link>
          </div>
        ) : (
          <label className="block">
            <span className="caption-luxury">{t("pick")}</span>
            <span className="relative mt-1.5 block">
              <select value={picked?.id ?? ""} onChange={(e) => setPickedId(e.target.value)} className="w-full appearance-none rounded-md border border-hairline bg-obsidian px-3 py-2.5 pr-9 text-sm text-white outline-none focus:border-gold-champagne">
                {recent.map((o) => {
                  const b = BOX_BY_SLUG[o.boxSlug];
                  const it = b?.items.find((i) => i.id === o.itemId);
                  return (
                    <option key={o.id} value={o.id} className="bg-obsidian">
                      {new Date(o.acquiredAt).toLocaleString(locale)} · {b ? boxTitle(b) : o.boxSlug} → {it ? itemName(it) : o.itemId} · #{o.fair.nonce}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={2.2} />
            </span>
          </label>
        )}
        <button
          type="button"
          onClick={run}
          disabled={!picked || busy}
          className="flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-crimson px-6 text-sm font-bold text-white shadow-[0_0_24px_rgba(229,9,20,0.35)] transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} /> : <ShieldCheck className="h-4 w-4" strokeWidth={2.4} />}
          {busy ? t("verifying") : out ? t("reverify") : t("verify")}
        </button>
      </div>

      {/* 3-Step 타임라인 */}
      <ol className="relative mt-6 grid gap-3">
        {/* Step 1 */}
        <li className="flex gap-3">
          <StepIcon i={0} s={steps[0]} />
          <div className="min-w-0 flex-1 border-b border-hairline pb-4">
            <div className="text-sm font-bold text-white">{t("s1Title")}</div>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">{t("s1Body")}</p>
            <AnimatePresence>
              {steps[0] !== "idle" && steps[0] !== "running" && out === null && picked && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 font-mono text-[10px] text-secondary">
                  <span className="text-faint">SHA-256 → </span>
                  {picked.fair.serverSeedHash.slice(0, 24)}…
                </motion.div>
              )}
              {out && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={cn("mt-2 text-xs font-semibold", out.hashMatch ? "text-gold-champagne" : "text-crimson")}>
                  {out.hashMatch ? t("s1Pass") : t("s1Fail")}
                  <div className="mt-1 break-all font-mono text-[10px] font-normal text-secondary">{out.hash}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </li>
        {/* Step 2 */}
        <li className="flex gap-3">
          <StepIcon i={1} s={steps[1]} />
          <div className="min-w-0 flex-1 border-b border-hairline pb-4">
            <div className="text-sm font-bold text-white">{t("s2Title")}</div>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">{t("s2Body")}</p>
            <AnimatePresence>
              {(steps[1] === "pass" || out) && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-xs text-faint">{t("rollLabel")}</span>
                  <RollNumber value={out?.roll ?? picked?.fair.roll ?? 0} animate={!!out} />
                  <span className="font-mono text-[10px] text-faint">/ {ROLL_RANGE.toLocaleString("en-US")}</span>
                  {picked && <span className="font-mono text-[10px] text-faint">nonce #{picked.fair.nonce}</span>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </li>
        {/* Step 3 */}
        <li className="flex gap-3">
          <StepIcon i={2} s={steps[2]} />
          <div className="min-w-0 flex-1 pb-1">
            <div className="text-sm font-bold text-white">{t("s3Title")}</div>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">{t("s3Body")}</p>
            {box && (
              <div className="mt-3">
                <Gauge ranges={ranges} box={box} rollPct={out ? rollPct : null} winId={out?.itemId ?? null} />
                <AnimatePresence>
                  {out && winRange && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-semibold", out.itemMatch ? "text-gold-champagne" : "text-crimson")}>{out.itemMatch ? t("s3Pass") : t("s3Fail")}</span>
                        <span className="text-xs text-white">{itemName(winRange.item)}</span>
                        <Money value={winRange.item.value} size="xs" numberClassName="text-secondary" />
                      </div>
                      <span className="font-mono text-[10px] text-faint">
                        {t("bracket", { from: winRange.from.toLocaleString("en-US"), to: winRange.to.toLocaleString("en-US"), pct: winRange.item.dropRate })}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </li>
      </ol>

      {/* 최종 판정 */}
      <AnimatePresence>
        {out && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={cn("relative mt-5 flex items-center gap-3 rounded-lg p-4", allPass ? "border-metallic-gold bg-gold-champagne/10" : "border border-crimson/40 bg-crimson/10")}>
            {allPass ? <ShieldCheck className="h-6 w-6 flex-none text-gold-champagne" strokeWidth={2.2} /> : <X className="h-6 w-6 flex-none text-crimson" strokeWidth={2.4} />}
            <div>
              <div className={cn("font-display text-lg font-bold uppercase tracking-tight", allPass ? "text-gold-champagne" : "text-crimson")}>{allPass ? t("verdictPass") : t("verdictFail")}</div>
              <div className="text-xs text-secondary">{allPass ? t("verdictPassBody") : t("verdictFailBody")}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 전문가 모드 — hex 입력형 검증기 */}
      <AnimatePresence initial={false}>
        {expert && (
          <motion.div key="expert" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="relative overflow-hidden">
            <div className="mt-6 border-t border-hairline pt-6">
              <div className="caption-luxury mb-3">{t("expertTitle")}</div>
              <FairnessVerifier key={picked?.id ?? "none"} initialBox={box} initial={picked ? { serverSeed: picked.fair.serverSeed, serverSeedHash: picked.fair.serverSeedHash, clientSeed: picked.fair.clientSeed, nonce: picked.fair.nonce } : undefined} compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function StepIcon({ i, s }: { i: 0 | 1 | 2; s: StepState }) {
  const Base = i === 0 ? Lock : i === 1 ? Dices : Target;
  return (
    <span className={cn("flex h-10 w-10 flex-none items-center justify-center rounded-full border transition-colors duration-500", s === "pass" ? "border-gold-champagne bg-gold-champagne text-obsidian" : s === "fail" ? "border-crimson bg-crimson/20 text-crimson" : s === "running" ? "border-gold-champagne bg-obsidian text-gold-champagne" : "border-hairline bg-obsidian text-faint")}>
      {s === "pass" ? <Check className="h-5 w-5" strokeWidth={3} /> : s === "fail" ? <X className="h-5 w-5" strokeWidth={3} /> : s === "running" ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.4} /> : <Base className="h-5 w-5" strokeWidth={2} />}
    </span>
  );
}

/** 롤 넘버 카운트업 */
function RollNumber({ value, animate }: { value: number; animate: boolean }) {
  const [shown, setShown] = useState(animate ? 0 : value);
  useEffect(() => {
    if (!animate) {
      setShown(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const dur = 700;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, animate]);
  return <span className="font-display text-2xl font-bold tabular-nums tracking-tight text-white">[{shown.toLocaleString("en-US")}]</span>;
}

/** 당첨 구간 게이지 — 항목별 구간을 등급색으로, 롤 위치에 마커 */
function Gauge({ ranges, box, rollPct, winId }: { ranges: RollRange<ProductItem>[]; box: ProductBox; rollPct: number | null; winId: string | null }) {
  const t = useTranslations("fairness.visual");
  return (
    <div>
      <div className="relative h-4 w-full overflow-visible rounded-full">
        <div className="flex h-4 w-full overflow-hidden rounded-full bg-obsidian">
          {ranges.map((r) => {
            const tier = tierOf(r.item.value, box.price);
            const w = (r.units / ROLL_RANGE) * 100;
            const isWin = r.item.id === winId;
            return (
              <span
                key={r.item.id}
                title={`${r.item.dropRate}%`}
                className={cn("h-full transition-opacity duration-500", winId && !isWin && "opacity-35")}
                style={{ width: `${w}%`, minWidth: 2, background: tier.accent, boxShadow: isWin ? `0 0 12px ${glow(tier.accent, 0.9)}` : undefined }}
              />
            );
          })}
        </div>
        <AnimatePresence>
          {rollPct !== null && (
            <motion.span
              aria-hidden
              className="absolute -top-1.5 h-7 w-0.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]"
              initial={{ left: "0%", opacity: 0 }}
              animate={{ left: `${rollPct}%`, opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
        </AnimatePresence>
      </div>
      <div className="mt-3 flex justify-between font-mono text-[9px] text-faint">
        <span>0</span>
        <span>{t("gaugeHint")}</span>
        <span>{(ROLL_RANGE - 1).toLocaleString("en-US")}</span>
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
        {Object.values(TIER_BY_KEY).map((tier) => (
          <li key={tier.key} className="flex items-center gap-1 text-[10px]">
            <span aria-hidden className="h-2 w-2 rounded-[1px]" style={{ background: tier.accent }} />
            <span style={{ color: tier.accent }}>{tier.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default VisualVerifier;
