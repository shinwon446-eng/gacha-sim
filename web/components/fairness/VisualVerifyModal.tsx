"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import type { OwnedItem } from "@/stores/inventoryStore";
import { VisualVerifier } from "@/components/fairness/VisualVerifier";

export interface VisualVerifyModalProps {
  item: OwnedItem | null;
  onClose: () => void;
}

/**
 * 3-Step 비주얼 검증 모달 (CLAUDE.md §5-A "모든 언박싱 결과·보관함 카드").
 * 레코드 하나를 받아 열리자마자 자동 검증한다. hex 검증기는 안의 전문가 모드 토글로.
 */
export function VisualVerifyModal({ item, onClose }: VisualVerifyModalProps) {
  const t = useTranslations("fairness.visual");
  const ref = useRef<HTMLDivElement>(null);
  const open = !!item;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {item && (
        <motion.div className="fixed inset-0 z-[130] overflow-y-auto bg-obsidian/85 px-3 py-6 backdrop-blur-sm md:px-6 md:py-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div
            ref={ref}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            className="border-metallic-gold relative mx-auto w-full max-w-2xl rounded-xl bg-canvas p-5 outline-none md:p-6"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <span aria-hidden className="pedestal-glow pointer-events-none absolute inset-0 rounded-xl" />
            <button type="button" onClick={onClose} aria-label={t("close")} className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-elevation hover:text-white">
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
            <VisualVerifier key={item.id} record={item} autoRun embedded />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default VisualVerifyModal;
