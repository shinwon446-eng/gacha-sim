"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { RefreshCw, X, Crown, TrendingUp, ShieldAlert, Zap } from "lucide-react";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import type { ProductBox } from "@/lib/products";
import { AUTOPLAY_DEFAULT_MULTIPLE, AUTOPLAY_SPINS, type AutoplayConfig } from "@/lib/autoplay";

interface Props {
  box: ProductBox | null;
  initial: AutoplayConfig;
  onClose: () => void;
  onStart: (config: AutoplayConfig) => void;
}

/**
 * 프라그마틱 스타일 오토플레이 설정 — 회전 수 · 자동 환전 · 스마트 정지 조건.
 */
export function AutoplaySettingsModal({ box, initial, onClose, onStart }: Props) {
  const t = useTranslations("autoplay");
  const { fmt } = useCurrency();
  const [cfg, setCfg] = useState<AutoplayConfig>(initial);
  const [useMultiple, setUseMultiple] = useState(initial.stopOnMultiple !== null);
  const [multiple, setMultiple] = useState(String(initial.stopOnMultiple ?? AUTOPLAY_DEFAULT_MULTIPLE));
  const [useStopLoss, setUseStopLoss] = useState(initial.stopLoss !== null);
  const [stopLoss, setStopLoss] = useState(String(initial.stopLoss ?? (box ? box.price * 20 : 100)));

  useEffect(() => {
    if (!box) return;
    setCfg(initial);
    setUseMultiple(initial.stopOnMultiple !== null);
    setUseStopLoss(initial.stopLoss !== null);
  }, [box, initial]);

  useEffect(() => {
    if (!box) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [box, onClose]);

  const start = () => {
    const m = Number(multiple);
    const sl = Number(stopLoss);
    onStart({
      ...cfg,
      stopOnMultiple: useMultiple && Number.isFinite(m) && m > 0 ? m : null,
      stopLoss: useStopLoss && Number.isFinite(sl) && sl > 0 ? sl : null,
    });
  };

  const Check = ({ on, onToggle, icon, label, children }: { on: boolean; onToggle: () => void; icon: React.ReactNode; label: string; children?: React.ReactNode }) => (
    <label className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors", on ? "border-gold-champagne/50 bg-gold-champagne/[0.06]" : "border-hairline bg-obsidian hover:border-white/20")}>
      <input type="checkbox" checked={on} onChange={onToggle} className="mt-0.5 h-4 w-4 flex-none accent-gold-champagne" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-white">
          {icon}
          {label}
        </span>
        {children}
      </span>
    </label>
  );

  return (
    <AnimatePresence>
      {box && (
        <motion.div className="fixed inset-0 z-[130] flex items-end justify-center bg-obsidian/85 px-0 backdrop-blur-sm sm:items-center sm:px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            className="border-metallic-gold w-full max-w-md rounded-t-2xl bg-canvas p-5 outline-none sm:rounded-xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="caption-luxury">{t("eyebrow")}</div>
                <h2 className="mt-1 flex items-center gap-2 font-display text-xl font-bold uppercase tracking-tight text-white">
                  <RefreshCw className="h-5 w-5 text-gold-champagne" strokeWidth={2.2} />
                  {t("title")}
                </h2>
                <div className="mt-1 text-xs text-muted">{box.title} · {fmt(box.price)} / {t("perSpin")}</div>
              </div>
              <button type="button" onClick={onClose} aria-label={t("close")} className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-muted hover:bg-elevation hover:text-white">
                <X className="h-5 w-5" strokeWidth={2.2} />
              </button>
            </div>

            {/* 회전 수 */}
            <div className="mt-5">
              <div className="caption-luxury">{t("spins")}</div>
              <div className="mt-2 grid grid-cols-5 gap-1.5">
                {AUTOPLAY_SPINS.map((n) => {
                  const on = cfg.spins === n;
                  return (
                    <button
                      key={String(n)}
                      type="button"
                      onClick={() => setCfg((c) => ({ ...c, spins: n }))}
                      className={cn("h-10 rounded-md text-sm font-bold transition-colors", on ? "border-metallic-gold bg-gold-champagne/15 text-gold-champagne" : "border-metallic-subtle bg-obsidian text-secondary hover:text-white")}
                    >
                      {Number.isFinite(n) ? t("times", { n }) : "∞"}
                    </button>
                  );
                })}
              </div>
              {Number.isFinite(cfg.spins) && (
                <div className="mt-1.5 text-right text-[11px] text-faint">
                  {t("budget", { amount: fmt(box.price * cfg.spins) })}
                </div>
              )}
            </div>

            {/* 자동 환전 */}
            <div className="mt-4 grid gap-2">
              <Check on={cfg.autoSell} onToggle={() => setCfg((c) => ({ ...c, autoSell: !c.autoSell }))} icon={<Zap className="h-3.5 w-3.5 text-gold-champagne" strokeWidth={2.4} />} label={t("autoSell")}>
                <span className="mt-0.5 block break-keep text-[11px] leading-relaxed text-muted">{t("autoSellBody")}</span>
              </Check>
            </div>

            {/* 스마트 정지 */}
            <div className="mt-4">
              <div className="caption-luxury">{t("smartStop")}</div>
              <div className="mt-2 grid gap-2">
                <Check on={cfg.stopOnJackpot} onToggle={() => setCfg((c) => ({ ...c, stopOnJackpot: !c.stopOnJackpot }))} icon={<Crown className="h-3.5 w-3.5 text-gold-champagne" strokeWidth={2.4} />} label={t("stopJackpot")} />
                <Check on={useMultiple} onToggle={() => setUseMultiple((v) => !v)} icon={<TrendingUp className="h-3.5 w-3.5 text-tier-prestige" strokeWidth={2.4} />} label={t("stopMultiple")}>
                  <span className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
                    <input
                      value={multiple}
                      onChange={(e) => setMultiple(e.target.value)}
                      onClick={(e) => e.preventDefault()}
                      inputMode="numeric"
                      disabled={!useMultiple}
                      className="h-8 w-20 rounded-md border border-hairline bg-obsidian px-2 text-right font-mono text-xs text-white outline-none focus:border-gold-champagne disabled:opacity-40"
                    />
                    {t("multipleUnit")}
                  </span>
                </Check>
                <Check on={useStopLoss} onToggle={() => setUseStopLoss((v) => !v)} icon={<ShieldAlert className="h-3.5 w-3.5 text-crimson" strokeWidth={2.4} />} label={t("stopLoss")}>
                  <span className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
                    <input
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      onClick={(e) => e.preventDefault()}
                      inputMode="decimal"
                      disabled={!useStopLoss}
                      className="h-8 w-24 rounded-md border border-hairline bg-obsidian px-2 text-right font-mono text-xs text-white outline-none focus:border-gold-champagne disabled:opacity-40"
                    />
                    USDT {t("stopLossUnit")}
                  </span>
                </Check>
              </div>
            </div>

            <button
              type="button"
              onClick={start}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-crimson text-sm font-bold text-white shadow-[0_0_24px_rgba(229,9,20,0.35)] transition-colors hover:bg-red-600"
            >
              <RefreshCw className="h-4 w-4" strokeWidth={2.4} />
              {t("start", { n: Number.isFinite(cfg.spins) ? String(cfg.spins) : "∞" })}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AutoplaySettingsModal;
