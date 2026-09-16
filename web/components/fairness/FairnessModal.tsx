"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { X, ShieldCheck } from "lucide-react";
import { ROLL_RANGE } from "@/lib/fairness";
import type { ProductBox } from "@/lib/products";
import { FairnessVerifier, type FairnessInitial } from "@/components/fairness/FairnessVerifier";

export interface FairnessModalProps {
  open: boolean;
  onClose: () => void;
  box?: ProductBox;
  initial?: FairnessInitial;
}

/** 검증기 모달 — 페이지(/fairness)와 같은 FairnessVerifier 를 쓴다. */
export function FairnessModal({ open, onClose, box, initial }: FairnessModalProps) {
  const t = useTranslations("fairness");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[110] overflow-y-auto bg-obsidian/85 px-3 py-6 backdrop-blur-sm md:px-6 md:py-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            className="border-metallic-gold relative mx-auto w-full max-w-4xl rounded-xl bg-canvas p-5 outline-none md:p-7"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <button type="button" onClick={onClose} aria-label={t("close")} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-elevation hover:text-white">
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
            <div className="mb-5 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-gold-champagne" strokeWidth={2.2} />
              <div>
                <div className="caption-luxury">{t("eyebrow")}</div>
                <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-white">{t("title")}</h2>
              </div>
            </div>
            <p className="mb-5 max-w-3xl text-xs leading-relaxed text-muted">{t("formula", { range: ROLL_RANGE.toLocaleString("en-US") })}</p>
            <FairnessVerifier initialBox={box} initial={initial} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default FairnessModal;
