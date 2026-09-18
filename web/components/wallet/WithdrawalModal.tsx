"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, X, Check, Clock, Loader2, Copy, ExternalLink, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { useCurrencyStore } from "@/stores/currencyStore";
import { useWalletStore, type Transaction, type TxStatus } from "@/stores/walletStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { playChime } from "@/lib/audio";
import type { Network } from "@/lib/depositAddress";
import { EXPLORERS, MIN_WITHDRAW_USDT, WITHDRAW_NETWORKS, WITHDRAW_NETWORK_BY_KEY, explorerTxUrl, maxWithdrawable, netReceive, validateWithdrawal, type WithdrawError } from "@/lib/withdrawal";
import { isLive } from "@/lib/runtime";
import { api } from "@/lib/api";
import { useFairStore } from "@/stores/fairStore";
import { Money } from "@/components/ui/Money";

export interface WithdrawalModalProps {
  open: boolean;
  onClose: () => void;
  /** 출금 신청 확정 후 — 호출측이 토스트를 띄운다 */
  onRequested?: (amountUsdt: number, network: Network) => void;
}

type Stage = { kind: "form" } | { kind: "submitting" } | { kind: "done"; tx: Transaction; amountUsdt: number; network: Network; address: string };

const inputCls = "mt-1.5 w-full rounded-md border border-hairline bg-obsidian px-3 py-2.5 font-mono text-sm text-white outline-none transition-colors placeholder:text-faint focus:border-gold-champagne";

/** 네트워크 키 → 거래 ref("TRC20:주소") 파싱 */
const parseRef = (ref?: string): { network: Network; address: string } => {
  const [n, a] = (ref ?? "").split(":");
  return { network: n === "BEP20" ? "BEP20" : "TRC20", address: a ?? "" };
};

type TFn = ReturnType<typeof useTranslations<"withdraw">>;

function StatusPill({ status, t }: { status: TxStatus; t: TFn }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold", status === "PENDING" ? "bg-white/10 text-secondary" : status === "BROADCASTING" ? "bg-gold-champagne/15 text-gold-champagne" : "bg-emerald-500/15 text-emerald-300")}>
      {status === "PENDING" ? <Clock className="h-3 w-3" strokeWidth={2.4} /> : status === "BROADCASTING" ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.4} /> : <CheckCircle2 className="h-3 w-3" strokeWidth={2.4} />}
      {t(`status.${status}`)}
    </span>
  );
}

/** TxID + 복사 + 익스플로러 링크 (CLAUDE.md §6-B) */
function TxLink({ network, hash, compact, t, copied, onCopy }: { network: Network; hash: string; compact?: boolean; t: TFn; copied: string | null; onCopy: (h: string) => void }) {
  return (
    <div className={cn("flex items-center gap-1.5", compact ? "text-[10px]" : "text-xs")}>
      <code className={cn("min-w-0 truncate font-mono text-secondary", compact ? "max-w-[9rem]" : "flex-1")} title={hash}>
        {compact ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash}
      </code>
      <button type="button" onClick={() => onCopy(hash)} aria-label={t("copyHash")} className="glass-dark flex h-7 w-7 flex-none items-center justify-center rounded-md text-gold-champagne hover:border-gold-champagne">
        {copied === hash ? <Check className="h-3 w-3" strokeWidth={2.6} /> : <Copy className="h-3 w-3" strokeWidth={2.2} />}
      </button>
      <a href={explorerTxUrl(network, hash)} target="_blank" rel="noopener noreferrer" className="border-gold-gradient flex h-7 flex-none items-center gap-1 whitespace-nowrap rounded-md px-2 text-[10px] font-bold text-gold-champagne hover:bg-gold-champagne/10">
        {t("viewOnExplorer", { explorer: EXPLORERS[network].name })}
        <ExternalLink className="h-3 w-3" strokeWidth={2.4} />
      </a>
    </div>
  );
}

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
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const userKey = useFairStore((s) => s.clientSeed) || "anon";
  const [copied, setCopied] = useState<string | null>(null);

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
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied((c) => (c === text ? null : c)), 1600);
    } catch {
      /* 클립보드 권한 없음 */
    }
  }, []);

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
    // live: 서버가 서명·브로드캐스트 → 상태·TxID 를 폴링으로 반영. preview: PENDING 에 머문다 (TxID 를 지어내지 않는다).
    if (isLive()) {
      api
        .withdraw({ network, address: addr, amountUsdt, userKey })
        .then((r) => {
          setTransactionStatus(tx.id, r.status, r.txHash ? { txHash: r.txHash } : undefined);
          const poll = () =>
            api
              .withdrawStatus(r.id)
              .then((s) => {
                setTransactionStatus(tx.id, s.status, s.txHash ? { txHash: s.txHash } : undefined);
                if (s.status !== "COMPLETED") timers.current.push(setTimeout(poll, 5000));
              })
              .catch(() => timers.current.push(setTimeout(poll, 10000)));
          if (r.status !== "COMPLETED") timers.current.push(setTimeout(poll, 5000));
        })
        .catch(() => {
          /* 신청은 기록됐다 — 상태는 다음 조회에서 동기화 */
        });
    }
  }, [errors, stage.kind, debit, amountUsdt, address, addTransaction, network, onRequested, setTransactionStatus, userKey]);

  const reset = () => {
    setStage({ kind: "form" });
    setAmountText("");
    setAddress("");
    setTouched(false);
  };

  const liveTx = stage.kind === "done" ? transactions.find((x) => x.id === stage.tx.id) ?? stage.tx : undefined;
  const liveStatus: TxStatus | undefined = liveTx?.status;
  const recent = transactions.filter((x) => x.type === "withdraw").slice(0, 4);


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
                  <StatusPill status={liveStatus ?? "PENDING"} t={t} />
                </div>
                {/* 상태 타임라인 */}
                <ol className="mt-3 flex items-center gap-1.5">
                  {(["PENDING", "BROADCASTING", "COMPLETED"] as TxStatus[]).map((s, i) => {
                    const order = ["PENDING", "BROADCASTING", "COMPLETED"];
                    const done = order.indexOf(liveStatus ?? "PENDING") >= i;
                    return (
                      <li key={s} className="flex flex-1 items-center gap-1.5">
                        <span className={cn("h-1 flex-1 rounded-full transition-colors duration-500", done ? "bg-gold-champagne" : "bg-white/10")} />
                      </li>
                    );
                  })}
                </ol>
                <div className="mt-1 flex justify-between text-[9px] uppercase tracking-wider text-faint">
                  <span>{t("status.PENDING")}</span>
                  <span>{t("status.BROADCASTING")}</span>
                  <span>{t("status.COMPLETED")}</span>
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
                {/* 온체인 TxID — BROADCASTING 이후 */}
                <div className="border-metallic-subtle mt-3 rounded-md bg-canvas p-2.5">
                  <div className="caption-luxury">{t("txHash")}</div>
                  <div className="mt-1.5">
                    {liveTx?.txHash ? <TxLink network={stage.network} hash={liveTx.txHash} t={t} copied={copied} onCopy={copy} /> : <span className="text-xs text-faint">{t("txHashPending")}</span>}
                  </div>
                </div>
                <p className="mt-3 text-[10px] leading-relaxed text-faint">{isLive() ? t("processingNote") : t("previewNote")}</p>
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
                        const { network: net, address: addr } = parseRef(x.ref);
                        return (
                          <li key={x.id} className="border-metallic-subtle rounded-md bg-obsidian p-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate font-mono text-faint">
                                {WITHDRAW_NETWORK_BY_KEY[net].token} · {addr.slice(0, 10)}…
                              </span>
                              <span className="flex items-center gap-2">
                                <StatusPill status={x.status ?? "PENDING"} t={t} />
                                <Money value={Math.abs(x.amountUsdt)} size="xs" numberClassName="text-secondary" />
                              </span>
                            </div>
                            {x.txHash && (
                              <div className="mt-1.5">
                                <TxLink network={net} hash={x.txHash} compact t={t} copied={copied} onCopy={copy} />
                              </div>
                            )}
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
