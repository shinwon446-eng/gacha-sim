"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { X, Wallet, Coins, CreditCard, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/format";
import { UsdtDepositTab } from "@/components/wallet/UsdtDepositTab";
import { WithdrawTab } from "@/components/wallet/WithdrawTab";
import { useWalletStore } from "@/stores/walletStore";
import { Money } from "@/components/ui/Money";
import { CardDepositTab } from "@/components/wallet/CardDepositTab";

type Tab = "usdt" | "card" | "withdraw";

export interface DepositModalProps {
  open: boolean;
  onClose: () => void;
  /** 모의 입금이 잔액에 반영된 뒤 — 호출측이 토스트를 띄운다 */
  onCredited: (amountUsdt: number, source: "usdt" | "card") => void;
  /** 출금 신청 확정 후 — 호출측이 토스트를 띄운다 */
  onWithdrawn?: (amountUsdt: number) => void;
  /** 롤오버 미달로 출금이 막혔을 때 */
  onWithdrawBlocked?: (progressPct: number) => void;
  /** 열리자마자 보여줄 탭 — 모바일 [출금] 진입용 */
  initialTab?: Tab;
}

/**
 * 지갑 모달 (PROMPTS 4-1). 탭: [USDT 암호화폐 입금] / [신용카드 결제(4-2)] / [↗ 출금]
 * 출금은 자체 모달이라 탭을 누르면 이 모달을 닫고 그쪽을 연다 — 모바일에서 하단 내비 [💳 충전]이 유일한 지갑 진입점이므로 여기서 출금까지 닿아야 한다.
 */
/** 출금 가능(USDT 입금분) / 플레이·배송 전용(카드 충전분) 분리 표시 */
function BalanceSplit() {
  const t = useTranslations("withdraw");
  const cryptoBalance = useWalletStore((s) => s.cryptoBalance);
  const cardBalance = useWalletStore((s) => s.cardBalance);
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <div className="border-metallic-subtle rounded-lg bg-obsidian p-2.5">
        <div className="break-keep text-[10px] leading-tight text-faint">{t("availableCrypto")}</div>
        <Money value={cryptoBalance} size="sm" className="mt-1" numberClassName="text-gold-gradient" />
      </div>
      <div className="border-metallic-subtle rounded-lg bg-obsidian p-2.5">
        <div className="break-keep text-[10px] leading-tight text-faint">{t("cardLocked")}</div>
        <Money value={cardBalance} size="sm" className="mt-1" numberClassName="text-secondary" />
      </div>
    </div>
  );
}

export function DepositModal({ open, onClose, onCredited, onWithdrawn, onWithdrawBlocked, initialTab = "usdt" }: DepositModalProps) {
  const t = useTranslations("deposit");
  const tw = useTranslations("withdraw");
  const [tab, setTab] = useState<Tab>(initialTab);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

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
                <div className="caption-luxury">{tab === "withdraw" ? t("eyebrowWithdraw") : t("eyebrow")}</div>
                <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-white">{tab === "withdraw" ? tw("title") : t("title")}</h2>
              </div>
            </div>

            {/* 탭 */}
            <div role="tablist" className="mt-5 flex gap-1 rounded-lg bg-obsidian p-1">
              {(
                [
                  { key: "usdt", label: t("tabUsdt"), Icon: Coins },
                  { key: "card", label: t("tabCard"), Icon: CreditCard },
                  { key: "withdraw", label: t("tabWithdraw"), Icon: ArrowUpRight },
                ] as const
              ).map(({ key, label, Icon }) => (
                <button
                  key={key}
                  role="tab"
                  type="button"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "flex h-10 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md px-1.5 text-xs font-semibold transition-colors sm:gap-2 sm:px-2 sm:text-sm",
                    tab === key ? "border-metallic-gold bg-surface text-gold-champagne" : "text-muted hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                  {label}
                </button>
              ))}
            </div>

            {/* 원천 분리 요약 — 입금 탭에서만(출금 탭은 자체 표시) */}
            {tab !== "withdraw" && <BalanceSplit />}

            <div className="mt-5">
              {tab === "usdt" && <UsdtDepositTab onCredited={(a) => onCredited(a, "usdt")} />}
              {tab === "card" && <CardDepositTab onCredited={(a) => onCredited(a, "card")} />}
              {tab === "withdraw" && <WithdrawTab onRequested={(a) => onWithdrawn?.(a)} onBlocked={onWithdrawBlocked} onDone={onClose} />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default DepositModal;
