"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, X, Check, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { useCurrencyStore } from "@/stores/currencyStore";
import { useWalletStore, type Transaction, type TxStatus } from "@/stores/walletStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { playChime } from "@/lib/audio";
import type { Network } from "@/lib/depositAddress";
import { MIN_WITHDRAW_USDT, WITHDRAW_NETWORKS, WITHDRAW_NETWORK_BY_KEY, maxWithdrawable, netReceive, validateWithdrawal, type WithdrawError } from "@/lib/withdrawal";
import { Money } from "@/components/ui/Money";

export interface WithdrawalModalProps {
  open: boolean;
  onClose: () => void;
  /** 출금 신청 확정 후 — 호출측이 토스트를 띄운다 */
  onRequested?: (amountUsdt: number, network: Network) => void;
}

type Stage = { kind: "form" } | { kind: "submitting" } | { kind: "done"; tx: Transaction; amountUsdt: number; network: Network; address: string };

const inputCls = "mt-1.5 w-full rounded-md border border-hairline bg-obsidian px-3 py-2.5 font-mono text-sm text-white outline-none transition-colors placeholder:text-faint focus:border-gold-champagne";

/** 데모: 신청 직후 PENDING, 1.6초 뒤 PROCESSING 으로 넘어간다. 실서비스는 핫월렛 서명·브로드캐스트 뒤 웹훅이 갱신한다. */
const DEMO_PROCESSING_DELAY_MS = 1600;

/**
 * USDT 출금 모달. 네트워크(TRC-20 / BEP-20) → 개인 지갑 주소 → 수량(최소 20 USDT, MAX) → 실수령액 계산기 → 신청.
 * 신청 시 잔액을 즉시 차감하고 거래를 PENDING 으로 기록한다. 화면 금액은 선택 통화 하나로만 표기한다.
 */
export function WithdrawalModal({ open, onClose, onRequested }: WithdrawalModalProps) {
  const t = useTranslations("withdraw");
  const locale = useLocale();
  const { currency, fmt } = useCurrency();
  const rates = useCurrencyStore((s) => s.rates);
  const balance = useWalletStore((s) => s.balance);
  const debit = useWalletStore((s) => s.debit);
  const addTransaction = useWalletStore((s) => s.addTransaction);
  const setTransactionStatus = useWalletStore((s) => s.setTransactionStatus);
  const transactions = useWalletStore((s) => s.transactions);
  const panelRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [network, setNetwork] = useState<Network>("TRC20");
  const [address, setAddress] = useState("");
  const [amountText, setAmountText] = useState("");
  const [touched, setTouched] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: "form" });

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

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const meta = WITHDRAW_NETWORK_BY_KEY[network];
  const decimals = currency === "KRW" ? 0 : 2;
  // 입력은 선택 통화 단위 — 잔액 반영·온체인 금액은 USDT 로 환산
  const amountNative = Number(amountText);
  const amountUsdt = useMemo(() => (Number.isFinite(amountNative) ? +(amountNative / rates[currency]).toFixed(2) : NaN), [amountNative, rates, currency]);
  const errors = useMemo(() => validateWithdrawal({ network, address, amountUsdt, balanceUsdt: balance }), [network, address, amountUsdt, balance]);
  const has = (k: WithdrawError) => touched && errors.includes(k);
  const amountOk = !errors.includes("nan") && !errors.includes("min") && !errors.includes("insufficient");
  const net = amountOk ? netReceive(amountUsdt, network) : 0;

  const setMax = () => {
    const usdt = maxWithdrawable(balance);
    setAmountText((usdt * rates[currency]).toFixed(decimals));
  };

  const submit = useCallback(() => {
    setTouched(true);
    if (errors.length || stage.kind !== "form") return;
    setStage({ kind: "submitting" });
    if (!debit(amountUsdt)) {
      setStage({ kind: "form" });
      return;
    }
    const addr = address.trim();
    const tx = addTransaction({ type: "withdraw", amountUsdt: -amountUsdt, ref: `${network}:${addr}`, status: "PENDING" });
    if (!useSettingsStore.getState().muted) playChime();
    onRequested?.(amountUsdt, network);
    setStage({ kind: "done", tx, amountUsdt, network, address: addr });
    timer.current = setTimeout(() => setTransactionStatus(tx.id, "PROCESSING"), DEMO_PROCESSING_DELAY_MS);
  }, [errors, stage.kind, debit, amountUsdt, address, addTransaction, network, onRequested, setTransactionStatus]);

  const reset = () => {
    setStage({ kind: "form" });
    setAmountText("");
    setAddress("");
    setTouched(false);
  };

  const liveStatus: TxStatus | undefined = stage.kind === "done" ? transactions.find((x) => x.id === stage.tx.id)?.status ?? stage.tx.status : undefined;
  const recent = transactions.filter((x) => x.type === "withdraw").slice(0, 3);

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
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-gold-champagne" strokeWidth={2.2} />
              <h2 className="font-display text-xl font-bold uppercase tracking-tight text-white">{t("title")}</h2>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <span className="text-xs text-muted">{t("available")}</span>
              <Money value={balance} size="sm" />
            </div>

            {stage.kind === "done" ? (
              <div className="border-metallic-subtle mt-4 rounded-lg bg-obsidian p-4">
                <div className="flex items-center justify-between">
                  <span className="caption-luxury">{t("requested")}</span>
                  <span className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold", liveStatus === "PENDING" ? "bg-white/10 text-secondary" : "bg-gold-champagne/15 text-gold-champagne")}>
                    {liveStatus === "PENDING" ? <Clock className="h-3 w-3" strokeWidth={2.4} /> : <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.4} />}
                    {t(`status.${liveStatus ?? "PENDING"}`)}
                  </span>
                </div>
                <div className="mt-3">
                  <Money value={netReceive(stage.amountUsdt, stage.network)} size="lg" numberClassName="text-gold-gradient" />
                  <div className="mt-1 text-[11px] text-faint">{t("netLabel")}</div>
                </div>
                <dl className="mt-4 grid gap-2 text-xs">
                  {[
                    [t("network"), WITHDRAW_NETWORK_BY_KEY[stage.network].token],
                    [t("address"), stage.address],
                    [t("amount"), fmt(stage.amountUsdt)],
                    [t("fee"), fmt(WITHDRAW_NETWORK_BY_KEY[stage.network].feeUsdt)],
                    [t("txId"), stage.tx.id],
                    [t("at"), new Date(stage.tx.at).toLocaleString(locale)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-4 border-b border-hairline pb-1.5">
                      <dt className="flex-none text-faint">{k}</dt>
                      <dd className="min-w-0 break-all text-right font-mono text-secondary">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-[10px] leading-relaxed text-faint">{t("demoNote")}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" onClick={reset} className="glass-dark h-11 rounded-md text-sm font-semibold text-secondary hover:text-white">
                    {t("another")}
                  </button>
                  <button type="button" onClick={onClose} className="flex h-11 items-center justify-center gap-2 rounded-md bg-gold-champagne text-sm font-bold text-obsidian hover:bg-gold-metallic">
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                    {t("done")}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 네트워크 */}
                <fieldset className="mt-4">
                  <legend className="caption-luxury">{t("network")}</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {WITHDRAW_NETWORKS.map((n) => {
                      const active = n.key === network;
                      return (
                        <label key={n.key} className={cn("flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors", active ? "border-metallic-gold bg-gold-champagne/5" : "border-metallic-subtle bg-obsidian hover:bg-elevation")}>
                          <input type="radio" name="withdraw-network" value={n.key} checked={active} onChange={() => setNetwork(n.key)} className="mt-1 accent-gold-champagne" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold text-white">{n.token}</span>
                            <span className="block text-xs text-muted">{n.chain}</span>
                            <span className="mt-1 flex items-baseline gap-1 text-[10px] text-faint">
                              {t("feeShort")} <Money value={n.feeUsdt} size="xs" numberClassName="text-secondary" />
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                {/* 주소 */}
                <label className="mt-4 block">
                  <span className="caption-luxury">{t("address")}</span>
                  <input value={address} onChange={(e) => setAddress(e.target.value)} onBlur={() => setTouched(true)} spellCheck={false} autoComplete="off" placeholder={t("addressHint", { hint: meta.addressHint })} className={cn(inputCls, has("address") && "border-crimson")} />
                  {has("address") && <span className="mt-1 block text-[11px] text-crimson">{t(`errors.${network}`)}</span>}
                </label>

                {/* 수량 */}
                <label className="mt-3 block">
                  <span className="flex items-center justify-between">
                    <span className="caption-luxury">{t("amount")}</span>
                    <span className="text-[10px] text-faint">{t("min", { min: fmt(MIN_WITHDRAW_USDT) })}</span>
                  </span>
                  <span className="mt-1.5 flex gap-2">
                    <input value={amountText} onChange={(e) => setAmountText(e.target.value)} onBlur={() => setTouched(true)} inputMode="decimal" placeholder={currency} className={cn(inputCls, "mt-0 flex-1", (has("min") || has("insufficient") || has("nan")) && "border-crimson")} />
                    <button type="button" onClick={setMax} className="glass-dark h-[42px] flex-none rounded-md px-3 text-xs font-bold text-gold-champagne hover:border-gold-champagne">
                      {t("max")}
                    </button>
                  </span>
                  {has("min") && <span className="mt-1 block text-[11px] text-crimson">{t("errors.min", { min: fmt(MIN_WITHDRAW_USDT) })}</span>}
                  {has("insufficient") && <span className="mt-1 block text-[11px] text-crimson">{t("errors.insufficient")}</span>}
                  {has("nan") && !has("min") && <span className="mt-1 block text-[11px] text-crimson">{t("errors.nan")}</span>}
                </label>

                {/* 계산기 */}
                <div className="border-metallic-subtle mt-4 rounded-lg bg-obsidian p-3">
                  <div className="grid gap-1.5 text-xs">
                    <div className="flex items-baseline justify-between">
                      <span className="text-muted">{t("amount")}</span>
                      <Money value={amountOk ? amountUsdt : 0} size="sm" numberClassName="text-secondary" />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-muted">{t("fee")}</span>
                      <Money value={meta.feeUsdt} size="sm" sign="−" numberClassName="text-secondary" />
                    </div>
                    <div className="mt-1 flex items-baseline justify-between border-t border-hairline pt-2">
                      <span className="font-semibold text-white">{t("net")}</span>
                      <Money value={net} size="md" numberClassName="text-gold-gradient" />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={submit}
                  disabled={stage.kind !== "form" || (touched && errors.length > 0)}
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-crimson text-sm font-bold text-white shadow-[0_0_24px_rgba(229,9,20,0.35)] transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  <ArrowUpRight className="h-4 w-4" strokeWidth={2.4} />
                  {t("submit")}
                </button>

                {recent.length > 0 && (
                  <div className="mt-4">
                    <div className="caption-luxury">{t("history")}</div>
                    <ul className="mt-2 space-y-1.5 text-[11px]">
                      {recent.map((x) => {
                        const [net, addr] = (x.ref ?? "").split(":");
                        return (
                          <li key={x.id} className="flex items-center justify-between gap-2">
                            <span className="truncate font-mono text-faint">
                              {net} · {addr?.slice(0, 10)}
                            </span>
                            <span className="flex items-center gap-2">
                              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-secondary">{t(`status.${x.status ?? "PENDING"}`)}</span>
                              <Money value={Math.abs(x.amountUsdt)} size="xs" numberClassName="text-secondary" />
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default WithdrawalModal;
