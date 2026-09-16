"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { X, Wallet, Coins, CreditCard } from "lucide-react";
import { cn } from "@/lib/format";
import { UsdtDepositTab } from "@/components/wallet/UsdtDepositTab";

type Tab = "usdt" | "card";

export interface DepositModalProps {
  open: boolean;
  onClose: () => void;
  /** 모의 입금이 잔액에 반영된 뒤 — 호출측이 토스트를 띄운다 */
  onCredited: (amountUsdt: number) => void;
}

/**
 * 지갑 충전 모달 (PROMPTS 4-1). 탭: [USDT 암호화폐 입금] / [신용카드 결제(4-2)]
 */
export function DepositModal({ open, onClose, onCredited }: DepositModalProps) {
  const t = useTranslations("deposit");
  const [tab, setTab] = useState<Tab>("usdt");
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
            className="border-metallic-gold relative mx-auto w-full max-w-3xl rounded-xl bg-canvas p-5 outline-none md:p-7"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <button type="button" onClick={onClose} aria-label={t("close")} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-elevation hover:text-white">
              <X className="h-5 w-5" strokeWidth={2} />
            </button>

            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-gold-champagne" strokeWidth={2.2} />
              <div>
                <div className="caption-luxury">{t("eyebrow")}</div>
                <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-white">{t("title")}</h2>
              </div>
            </div>

            {/* 탭 */}
            <div role="tablist" className="mt-5 flex gap-1 rounded-lg bg-obsidian p-1">
              {(
                [
                  { key: "usdt", label: t("tabUsdt"), Icon: Coins },
                  { key: "card", label: t("tabCard"), Icon: CreditCard },
                ] as const
              ).map(({ key, label, Icon }) => (
                <button
                  key={key}
                  role="tab"
                  type="button"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "flex h-10 flex-1 items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors",
                    tab === key ? "border-metallic-gold bg-surface text-gold-champagne" : "text-muted hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-5">
              {tab === "usdt" ? (
                <UsdtDepositTab onCredited={onCredited} />
              ) : (
                <div className="border-metallic-subtle rounded-lg bg-obsidian p-8 text-center text-sm text-muted">{t("cardSoon")}</div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default DepositModal;
