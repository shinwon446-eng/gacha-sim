"use client";

import { useEffect, useRef, useState } from "react";
import { useModal } from "@/lib/useModal";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { X, Wallet, Coins, ArrowUpRight, ReceiptText } from "lucide-react";
import { cn } from "@/lib/format";
import { UsdtDepositTab } from "@/components/wallet/UsdtDepositTab";
import { WithdrawTab } from "@/components/wallet/WithdrawTab";
import { useWalletStore } from "@/stores/walletStore";
import { Money } from "@/components/ui/Money";
import { HistoryTab } from "@/components/wallet/HistoryTab";

type Tab = "usdt" | "withdraw" | "history";

export interface DepositModalProps {
  open: boolean;
  onClose: () => void;
  /** 입금이 잔액에 반영된 뒤 — 호출측이 토스트를 띄운다 */
  onCredited: (amountUsdt: number) => void;
  /** 출금 신청 확정 후 — 호출측이 토스트를 띄운다 */
  onWithdrawn?: (amountUsdt: number) => void;
  /** 롤오버 미달로 출금이 막혔을 때 */
  onWithdrawBlocked?: (progressPct: number) => void;
  /** 열리자마자 보여줄 탭 — 모바일 [출금] 진입용 */
  initialTab?: Tab;
}

/**
 * 지갑 모달. 탭: [USDT 암호화폐 입금] / [↗ 출금]
 * 출금은 자체 모달이라 탭을 누르면 이 모달을 닫고 그쪽을 연다 — 모바일에서 하단 내비 [💳 충전]이 유일한 지갑 진입점이므로 여기서 출금까지 닿아야 한다.
 */
/** 출금 가능한 USDT 잔액 */
function BalanceSplit() {
  const t = useTranslations("withdraw");
  const cryptoBalance = useWalletStore((s) => s.cryptoBalance);
  return (
    <div className="mt-4">
      <div className="border-metallic-subtle rounded-lg bg-obsidian p-2.5">
        <div className="break-keep text-xs leading-tight text-faint">{t("availableCrypto")}</div>
        <Money value={cryptoBalance} size="sm" className="mt-1" numberClassName="text-gold-gradient" />
      </div>
    </div>
  );
}

export function DepositModal({ open, onClose, onCredited, onWithdrawn, onWithdrawBlocked, initialTab = "usdt" }: DepositModalProps) {
  const t = useTranslations("deposit");
  const tw = useTranslations("withdraw");
  const th = useTranslations("history");
  const [tab, setTab] = useState<Tab>(initialTab);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  useModal(open, onClose, panelRef);

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
            className="border border-hairline relative mx-auto w-full max-w-3xl rounded-2xl bg-surface p-6 outline-none md:p-8"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <button type="button" onClick={onClose} aria-label={t("close")} className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-elevation hover:text-white">
              <X className="h-5 w-5" strokeWidth={2} />
            </button>

            <div className="flex items-center gap-3 pr-10">
              <Wallet className="h-5 w-5 text-gold-champagne" strokeWidth={2.2} />
              <div>
                <div className="caption-luxury">{tab === "withdraw" ? t("eyebrowWithdraw") : tab === "history" ? t("eyebrowHistory") : t("eyebrow")}</div>
                <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-white">{tab === "withdraw" ? tw("title") : tab === "history" ? th("title") : t("title")}</h2>
              </div>
            </div>

            {/* 탭 */}
            <div aria-label={t("title")} className="mt-5 flex gap-1 rounded-lg bg-obsidian p-1">
              {(
                [
                  { key: "usdt", label: t("tabUsdt"), Icon: Coins },
                  { key: "withdraw", label: t("tabWithdraw"), Icon: ArrowUpRight },
                  { key: "history", label: t("tabHistory"), Icon: ReceiptText },
                ] as const
              ).map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={tab === key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "flex min-h-12 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md px-1.5 text-xs font-semibold transition-colors sm:gap-2 sm:px-2 sm:text-sm",
                    tab === key ? "bg-[#f1eee7] text-obsidian" : "text-muted hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4 flex-none" strokeWidth={2} />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>

            <div className="mt-5">
              {tab === "usdt" && <UsdtDepositTab onCredited={onCredited} />}
              {tab === "withdraw" && <WithdrawTab onRequested={(a) => onWithdrawn?.(a)} onBlocked={onWithdrawBlocked} onDone={onClose} />}
              {tab === "history" && <HistoryTab />}
            </div>
            {tab !== "history" && (
              <section className="mt-8 border-t border-hairline pt-6" aria-label={t("tabHistory")} aria-live="polite">
                <HistoryTab />
              </section>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default DepositModal;
