"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowUpRight, X } from "lucide-react";
import type { Network } from "@/lib/depositAddress";
import { WithdrawTab } from "@/components/wallet/WithdrawTab";

export interface WithdrawalModalProps {
  open: boolean;
  onClose: () => void;
  /** 출금 신청 확정 후 — 호출측이 토스트를 띄운다 */
  onRequested?: (amountUsdt: number, network: Network) => void;
  /** 롤오버 미달로 막혔을 때 — 호출측이 경고 토스트를 띄운다 */
  onBlocked?: (progressPct: number) => void;
}

/**
 * USDT 출금 모달 — 껍데기(헤더·닫기)만 갖고 본문은 WithdrawTab 이 그린다.
 * 같은 본문이 지갑 모달(DepositModal)의 3번째 탭으로도 쓰인다.
 */
export function WithdrawalModal({ open, onClose, onRequested, onBlocked }: WithdrawalModalProps) {
  const t = useTranslations("withdraw");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[120] overflow-y-auto bg-obsidian/85 px-3 py-6 backdrop-blur-sm md:px-6 md:py-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            className="border-metallic-gold relative mx-auto w-full max-w-lg rounded-xl bg-canvas p-5 outline-none md:p-6"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <button type="button" onClick={onClose} aria-label={t("close")} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-elevation hover:text-white">
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
            <div className="flex items-center gap-2 pr-10">
              <ArrowUpRight className="h-5 w-5 text-gold-champagne" strokeWidth={2.2} />
              <h2 className="font-display text-xl font-bold uppercase tracking-tight text-white">{t("title")}</h2>
            </div>

            <WithdrawTab onRequested={onRequested} onBlocked={onBlocked} onDone={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default WithdrawalModal;
