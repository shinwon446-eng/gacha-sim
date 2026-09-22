"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Gift, X, Clock, Sparkles, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { TIER_BY_KEY, glow } from "@/lib/tiers";
import { calculateRollResult } from "@/lib/fairness";
import { DAILY_MAX_USDT, DAILY_MIN_USDT, DAILY_REWARDS, canOpenDaily, formatCountdown, nextAvailableAt, rewardForRoll, type DailyReward } from "@/lib/dailyBox";
import { useDailyStore } from "@/stores/dailyStore";
import { useFairStore } from "@/stores/fairStore";
import { useWalletStore } from "@/stores/walletStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { playChime, playWin } from "@/lib/audio";
import { Money } from "@/components/ui/Money";

/** 남은 시간을 1초 단위로 — 마운트 후에만 값이 있다(하이드레이션 안전) */
function useCountdown(lastOpenedAt: string | null) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const target = nextAvailableAt(lastOpenedAt);
  const ready = now !== null && now >= target;
  return { now, ready, left: now === null ? null : Math.max(0, target - now) };
}

/** 헤더용 필 — 준비되면 골드로 점등, 아니면 카운트다운 */
export function DailyFreeBoxPill({ onOpen, className }: { onOpen: () => void; className?: string }) {
  const t = useTranslations("daily");
  const lastOpenedAt = useDailyStore((s) => s.lastOpenedAt);
  const { ready, left } = useCountdown(lastOpenedAt);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-bold transition-colors",
        ready ? "border-gold-gradient text-gold-champagne hover:bg-gold-champagne/10" : "glass-dark text-muted hover:text-white",
        className,
      )}
    >
      <Gift className={cn("h-3.5 w-3.5", ready && "animate-pulse")} strokeWidth={2.4} />
      {t("pill")}
      {!ready && left !== null && <span className="font-mono text-[10px] tabular-nums text-faint">{formatCountdown(left)}</span>}
    </button>
  );
}

/** 홈 스트립 — TOP 10 아래. 무료·무위험을 한 줄로 */
export function DailyFreeBoxStrip({ onOpen, className }: { onOpen: () => void; className?: string }) {
  const t = useTranslations("daily");
  const { fmt } = useCurrency();
  const lastOpenedAt = useDailyStore((s) => s.lastOpenedAt);
  const { ready, left } = useCountdown(lastOpenedAt);
  return (
    <section className={cn("px-[4%]", className)} aria-label={t("title")}>
      <div className="border-metallic-gold relative flex flex-wrap items-center gap-3 overflow-hidden rounded-xl bg-obsidian px-4 py-3 md:px-5">
        <span aria-hidden className="pedestal-glow pointer-events-none absolute inset-0" />
        <span className="relative flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-gold-champagne/10 text-gold-champagne">
          <Gift className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="relative min-w-[11rem] flex-1">
          <div className="text-sm font-bold text-white">{t("title")}</div>
          <div className="text-xs text-muted">{t("stripBody", { min: fmt(DAILY_MIN_USDT), max: fmt(DAILY_MAX_USDT) })}</div>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className={cn("relative flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-bold transition-colors sm:w-auto", ready ? "bg-gold-champagne text-obsidian hover:bg-gold-metallic" : "glass-dark text-secondary hover:text-white")}
        >
          {ready ? <Sparkles className="h-4 w-4" strokeWidth={2.4} /> : <Clock className="h-4 w-4" strokeWidth={2.2} />}
          {ready ? t("openFree") : left !== null ? t("nextIn", { time: formatCountdown(left) }) : t("pill")}
        </button>
      </div>
    </section>
  );
}

type Stage = { kind: "pick" } | { kind: "revealing"; picked: number } | { kind: "done"; picked: number; reward: DailyReward; roll: number };

const CARDS = 3;

/**
 * 데일리 프리 박스 모달 — 골드 카드 3장 중 1장 선택 → 뒤집기 → 금액 적립.
 * 결과는 선택 전에 Provably Fair 롤로 확정된다(카드 선택은 연출). 24h 쿨다운은 브라우저 단위(데모).
 */
export function DailyFreeBoxModal({ open, onClose, onCredited }: { open: boolean; onClose: () => void; onCredited?: (amountUsdt: number) => void }) {
  const t = useTranslations("daily");
  const { fmt } = useCurrency();
  const lastOpenedAt = useDailyStore((s) => s.lastOpenedAt);
  const record = useDailyStore((s) => s.record);
  const history = useDailyStore((s) => s.history);
  const fair = useFairStore();
  const credit = useWalletStore((s) => s.credit);
  const addTransaction = useWalletStore((s) => s.addTransaction);
  const { ready, left } = useCountdown(lastOpenedAt);
  const [stage, setStage] = useState<Stage>({ kind: "pick" });

  // 열릴 때만 초기화 — onClose 는 부모 렌더마다 새 함수라 의존성에 넣으면 진행 중 상태가 날아간다
  useEffect(() => {
    if (open) setStage({ kind: "pick" });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const pick = useCallback(
    async (i: number) => {
      if (!ready || stage.kind !== "pick") return;
      // 이중 확인 — 스토어 기준(다른 탭에서 이미 열었을 수 있다)
      if (!canOpenDaily(useDailyStore.getState().lastOpenedAt)) return;
      setStage({ kind: "revealing", picked: i });
      // 결과 확정 — 연출 전에
      const nonce = fair.takeNonce();
      const { serverSeed, serverSeedHash, clientSeed } = useFairStore.getState();
      const r = await calculateRollResult(serverSeed, clientSeed, nonce);
      const reward = rewardForRoll(r.roll);
      record({ amountUsdt: reward.amount, fair: { serverSeedHash, serverSeed, clientSeed, nonce, roll: r.roll } });
      credit(reward.amount);
      addTransaction({ type: "bonus", amountUsdt: reward.amount, ref: "daily" });
      await new Promise((res) => setTimeout(res, 900));
      if (!useSettingsStore.getState().muted) (reward.tone === "royal" || reward.tone === "prestige" ? () => playWin("jackpot") : playChime)();
      setStage({ kind: "done", picked: i, reward, roll: r.roll });
      onCredited?.(reward.amount);
    },
    [ready, stage.kind, fair, record, credit, addTransaction, onCredited],
  );

  const odds = useMemo(() => DAILY_REWARDS, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[120] overflow-y-auto bg-obsidian/85 px-3 py-6 backdrop-blur-sm md:px-6 md:py-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            className="border-metallic-gold relative mx-auto w-full max-w-lg overflow-hidden rounded-xl bg-canvas p-5 md:p-6"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <span aria-hidden className="pedestal-glow pointer-events-none absolute inset-0" />
            <button type="button" onClick={onClose} aria-label={t("close")} className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-elevation hover:text-white">
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
            <div className="relative flex items-center gap-2">
              <Gift className="h-5 w-5 text-gold-champagne" strokeWidth={2.2} />
              <h2 className="font-display text-xl font-bold uppercase tracking-tight text-white">{t("title")}</h2>
            </div>
            <p className="relative mt-1 text-xs leading-relaxed text-muted">{t("body", { min: fmt(DAILY_MIN_USDT), max: fmt(DAILY_MAX_USDT) })}</p>

            {/* 카드 3장 */}
            <div className="relative mt-5 grid grid-cols-3 gap-3">
              {Array.from({ length: CARDS }, (_, i) => {
                const isPicked = stage.kind !== "pick" && stage.picked === i;
                const flipped = stage.kind === "done" && stage.picked === i;
                const tone = stage.kind === "done" ? TIER_BY_KEY[stage.reward.tone] : undefined;
                const disabled = !ready || stage.kind !== "pick";
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={disabled}
                    onClick={() => pick(i)}
                    aria-label={t("card", { n: i + 1 })}
                    className={cn("group relative aspect-[3/4] rounded-xl [perspective:900px] focus:outline-none", disabled && !isPicked && "opacity-60")}
                  >
                    <motion.div
                      className="relative h-full w-full [transform-style:preserve-3d]"
                      animate={{ rotateY: flipped ? 180 : 0, scale: isPicked ? 1.04 : 1, y: isPicked && stage.kind === "revealing" ? -6 : 0 }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {/* 앞면 — 골드 헤어라인 봉인 */}
                      <div className={cn("border-metallic-gold absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-obsidian [backface-visibility:hidden]", !disabled && "transition-transform group-hover:-translate-y-1")}>
                        <span className="sheen pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity group-hover:opacity-100" />
                        <Gift className="h-8 w-8 text-gold-champagne" strokeWidth={1.6} />
                        <span className="caption-luxury mt-2 !text-gold-champagne">Voila.gg</span>
                        {isPicked && stage.kind === "revealing" && (
                          <motion.span aria-hidden className="absolute inset-0 rounded-xl" style={{ background: "radial-gradient(60% 60% at 50% 50%, rgba(230,202,101,0.35) 0%, transparent 70%)" }} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.4, 1] }} transition={{ duration: 0.9 }} />
                        )}
                      </div>
                      {/* 뒷면 — 금액 */}
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-canvas [backface-visibility:hidden] [transform:rotateY(180deg)]"
                        style={tone ? { border: `1px solid ${glow(tone.accent, 0.6)}`, boxShadow: `0 0 28px ${glow(tone.accent, 0.35)}` } : undefined}
                      >
                        {stage.kind === "done" && flipped && (
                          <>
                            <span className="caption-luxury" style={{ color: tone?.accent }}>
                              {t("won")}
                            </span>
                            <Money value={stage.reward.amount} size="lg" numberClassName="text-gold-gradient" className="mt-1" />
                          </>
                        )}
                      </div>
                    </motion.div>
                  </button>
                );
              })}
            </div>

            {/* 상태 줄 */}
            <div className="relative mt-4 min-h-[2.5rem] text-center text-sm">
              {!ready && left !== null && stage.kind === "pick" && (
                <span className="inline-flex items-center gap-2 text-muted">
                  <Clock className="h-4 w-4" strokeWidth={2.2} />
                  {t("nextIn", { time: formatCountdown(left) })}
                </span>
              )}
              {ready && stage.kind === "pick" && <span className="font-semibold text-gold-champagne">{t("pickOne")}</span>}
              {stage.kind === "revealing" && <span className="text-secondary">{t("revealing")}</span>}
              {stage.kind === "done" && (
                <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="font-semibold text-white">
                  {t("credited", { amount: fmt(stage.reward.amount) })}
                </motion.span>
              )}
            </div>

            {/* 확률표 + 공정성 */}
            <div className="border-metallic-subtle relative mt-2 rounded-lg bg-obsidian p-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="caption-luxury whitespace-nowrap">{t("odds")}</span>
                <span className="flex items-start gap-1 text-[10px] leading-snug text-faint">
                  <ShieldCheck className="mt-0.5 h-3 w-3 flex-none text-gold-champagne" strokeWidth={2.4} />
                  {t("fairNote")}
                </span>
              </div>
              <ul className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1 sm:grid-cols-6">
                {odds.map((r) => (
                  <li key={r.amount} className="flex items-baseline justify-between gap-1 text-[11px]">
                    <Money value={r.amount} size="xs" numberClassName="text-secondary" />
                    <span className="font-mono text-faint">{r.dropRate}%</span>
                  </li>
                ))}
              </ul>
              {stage.kind === "done" && (
                <div className="mt-2 break-all font-mono text-[10px] text-faint">
                  roll {stage.roll.toLocaleString("en-US")} · nonce #{history[0]?.fair.nonce ?? "—"}
                </div>
              )}
            </div>
            <p className="relative mt-3 text-[10px] leading-relaxed text-faint">{t("cooldownNote")}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default DailyFreeBoxModal;
