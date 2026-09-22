"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Wallet } from "lucide-react";
import { useCurrency } from "@/lib/useCurrency";

export interface SellConfirmModalProps {
  open: boolean;
  count: number;
  amountUsdt: number;
  refundRate: number;
  onClose: () => void;
  onConfirm: () => void;
}

/** 즉시 판매 확인 — "정가의 {rate}인 {amount}가 잔액으로 즉시 환급" (PROMPTS 5-2-1) */
export function SellConfirmModal({ open, count, amountUsdt, refundRate, onClose, onConfirm }: SellConfirmModalProps) {
  const t = useTranslations("inventory");
  const { fmt } = useCurrency();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    ref.current?.focus({ preventScroll: true });
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const rate = `${Math.round(refundRate * 100)}%`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[120] flex items-center justify-center bg-obsidian/85 px-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div
            ref={ref}
            tabIndex={-1}
            role="alertdialog"
            aria-modal="true"
            aria-label={t("sellTitle")}
            className="border-metallic-gold w-full max-w-sm rounded-xl bg-canvas p-5 outline-none"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-gold-champagne" strokeWidth={2.2} />
              <h2 className="font-display text-xl font-bold uppercase tracking-tight text-white">{t("sellTitle")}</h2>
            </div>
            <p className="mt-3 break-keep text-sm leading-relaxed text-secondary">
              {count > 1 ? t("sellBodyMulti", { n: count, rate, amount: fmt(amountUsdt) }) : t("sellBody", { rate, amount: fmt(amountUsdt) })}
            </p>
            <div className="text-gold-gradient mt-4 text-center font-display text-3xl font-bold tabular-nums">{fmt(amountUsdt)}</div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={onClose} className="glass-dark h-11 rounded-md text-sm font-semibold text-secondary hover:text-white">
                {t("cancel")}
              </button>
              <button type="button" onClick={onConfirm} className="h-11 rounded-md bg-gold-champagne text-sm font-bold text-obsidian hover:bg-gold-metallic">
                {t("confirm")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SellConfirmModal;
