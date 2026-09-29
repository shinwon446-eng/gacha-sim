"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Clock, Copy, Check, CreditCard, Coins, ExternalLink, Gavel, Loader2, Timer, Undo2, XCircle } from "lucide-react";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { useWalletStore, type Transaction, type TxStatus } from "@/stores/walletStore";
import { EXPLORERS, WITHDRAW_NETWORK_BY_KEY, explorerTxUrl } from "@/lib/withdrawal";
import { holdCountdown } from "@/lib/withdrawHold";
import type { Network } from "@/lib/depositAddress";
import { api } from "@/lib/api";
import { AccountError } from "@/lib/account";
import { useAuthStore } from "@/stores/authStore";
import { LoginRequired } from "@/components/auth/LoginRequired";
import { Money } from "@/components/ui/Money";

type Filter = "all" | "deposit" | "withdraw";

const DEPOSIT_TYPES = ["deposit_usdt", "deposit_card"] as const;

/** 거래 유형 배지, [입금 , USDT] / [입금 , 카드] / [출금 , 2FA 즉시] / [출금 , 이메일 72H 대기] */
function TypeBadge({ tx }: { tx: Transaction }) {
  const t = useTranslations("history");
  const deposit = tx.type === "deposit_usdt" || tx.type === "deposit_card";
  const key = tx.type === "deposit_usdt" ? "typeDepositUsdt" : tx.type === "deposit_card" ? "typeDepositCard" : tx.authMethod === "EMAIL_72H_HOLD" ? "typeWithdrawHold" : "typeWithdrawOtp";
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-bold", deposit ? "bg-emerald-500/12 text-emerald-300" : "bg-gold-champagne/14 text-gold-champagne")}>
      {tx.type === "deposit_card" ? <CreditCard className="h-3 w-3" strokeWidth={2.4} /> : <Coins className="h-3 w-3" strokeWidth={2.4} />}
      {t(key)}
    </span>
  );
}

/** 진행 상태 배지, 72시간 대기는 남은 시간을 함께 보여 준다 */
function StatusBadge({ status, unlockAt, now }: { status: TxStatus; unlockAt?: number; now: number }) {
  const t = useTranslations("history");
  const tone =
    status === "COMPLETED" ? "bg-emerald-500/15 text-emerald-300"
    : (status === "CANCELLED" || status === "FAILED") ? "bg-white/8 text-faint"
    : status === "PENDING_ADMIN_REVIEW" ? "bg-crimson/15 text-crimson"
    : status === "BROADCASTING" ? "bg-gold-champagne/15 text-gold-champagne"
    : status === "PENDING_72H_HOLD" ? "bg-gold-champagne/12 text-gold-champagne"
    : "bg-white/10 text-secondary";
  const Icon =
    status === "COMPLETED" ? CheckCircle2
    : (status === "CANCELLED" || status === "FAILED") ? XCircle
    : status === "PENDING_ADMIN_REVIEW" ? Gavel
    : status === "BROADCASTING" ? Loader2
    : status === "PENDING_72H_HOLD" ? Timer
    : Clock;
  let label = t(`status.${status}`);
  if (status === "PENDING_72H_HOLD" && typeof unlockAt === "number") {
    const c = holdCountdown(unlockAt, now);
    label = c.released ? t("holdReleased") : t("holdRemaining", { hours: c.hours, minutes: c.minutes });
  }
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-bold", tone)}>
      <Icon className={cn("h-3 w-3", status === "BROADCASTING" && "animate-spin")} strokeWidth={2.4} />
      {label}
    </span>
  );
}

function short(address: string): string {
  return address.length > 16 ? `${address.slice(0, 8)}…${address.slice(-6)}` : address;
}

/**
 * 지갑 모달 4번째 탭, **입출금 내역** 통합 조회.
 *
 * `walletStore.transactions` 하나만 읽는다(별도 집계, 서버 호출 없음). 입금, 출금 필터, 유형/상태 배지,
 * 금액, 수수료, 실수령액, 네트워크, 주소(복사), 생성 일시, TxID(익스플로러 링크)를 한 카드에 담는다.
 * 72시간 대기 건은 남은 시간이 1초마다 줄고 [출금 취소]로 즉시 환불할 수 있다.
 */
export function HistoryTab() {
  const t = useTranslations("history");
  const locale = useLocale();
  const { fmt } = useCurrency();
  const transactions = useWalletStore((s) => s.transactions);
  const user = useAuthStore(s => s.user);
  const ta = useTranslations("account");
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState<string | null>(null);
  const cancelLock = useRef(false);
  const cancel = async (tx: Transaction) => {
    if (cancelLock.current || !user || !tx.serverId || tx.accountId !== user.id) return;
    cancelLock.current = true; setCancelling(tx.id); setError("");
    try {
      const result = await api.cancelWithdrawal(tx.serverId);
      if (result.id !== tx.serverId || useAuthStore.getState().user?.id !== user.id) return;
      useWalletStore.getState().syncWithdrawal(tx.id, result.status, { txHash: result.txHash, unlockAt: result.unlockAt });
    } catch (cause) { setError(ta(`errors.${cause instanceof AccountError ? cause.code : "network"}`)); }
    finally { cancelLock.current = false; setCancelling(null); }
  };
  useEffect(() => {
    if (!user) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      const pending = useWalletStore.getState().transactions.filter(x => x.accountId === user.id && x.type === "withdraw" && x.serverId && !["COMPLETED", "CANCELLED", "FAILED"].includes(x.status ?? ""));
      for (const tx of pending) {
        if (!active) return;
        try {
          const result = await api.withdrawStatus(tx.serverId!);
          if (!active || useAuthStore.getState().user?.id !== user.id || result.id !== tx.serverId) return;
          useWalletStore.getState().syncWithdrawal(tx.id, result.status, { txHash: result.txHash, unlockAt: result.unlockAt });
        } catch { /* Preserve the last confirmed status while offline. */ }
      }
      if (active) timer = setTimeout(poll, 10000);
    };
    void poll();
    return () => { active = false; clearTimeout(timer); };
  }, [user?.id]);
  const [filter, setFilter] = useState<Filter>("all");
  const [copied, setCopied] = useState<string | null>(null);
  // 카운트다운, 마운트 후에만 흐른다(첫 렌더는 서버와 같은 값)
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const rows = useMemo(
    () =>
      transactions.filter((x) => {
        if (x.accountId !== user?.id) return false;
        const deposit = (DEPOSIT_TYPES as readonly string[]).includes(x.type);
        const withdraw = x.type === "withdraw";
        if (!deposit && !withdraw) return false;
        return filter === "all" ? true : filter === "deposit" ? deposit : withdraw;
      }),
    [transactions, filter, user?.id],
  );

  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(text);
      window.setTimeout(() => setCopied((c) => (c === text ? null : c)), 1600);
    }).catch(() => setError(t("copyFailed")));
  };

  if (!user) return <LoginRequired />;
  return (
    <div className="mt-4">
      {error && <p role="alert" className="mb-3 text-sm text-red-200">{error}</p>}
      <div role="group" aria-label={t("title")} className="flex gap-1 rounded-lg bg-obsidian p-1">
        {(["all", "deposit", "withdraw"] as Filter[]).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={filter === k}
            onClick={() => setFilter(k)}
            className={cn(
              "min-h-11 flex-1 whitespace-nowrap rounded-md px-2 text-xs font-semibold transition-colors",
              filter === k ? "bg-[#f1eee7] text-obsidian" : "text-muted hover:text-white",
            )}
          >
            {t(`filter.${k}`)}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-xl border border-hairline bg-obsidian p-5 text-center text-sm leading-relaxed text-secondary">{t("empty")}</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {rows.map((tx) => {
            const deposit = (DEPOSIT_TYPES as readonly string[]).includes(tx.type);
            const status = tx.status ?? (deposit ? "COMPLETED" : "PENDING");
            const net = (tx.network === "BEP20" ? "BEP20" : "TRC20") as Network;
            const explorerName = tx.network === "ERC20" ? "Etherscan" : EXPLORERS[net].name;
            const explorerUrl = tx.network === "ERC20" ? `https://etherscan.io/tx/${encodeURIComponent(tx.txHash ?? "")}` : explorerTxUrl(net, tx.txHash ?? "");
            const held = status === "PENDING_72H_HOLD" && typeof tx.unlockAt === "number";
            return (
              <li key={tx.id} className="border border-hairline rounded-xl bg-obsidian p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <TypeBadge tx={tx} />
                  <StatusBadge status={status} unlockAt={tx.unlockAt} now={now ?? 0} />
                  <span className="ml-auto flex-none">
                    <Money
                      value={Math.abs(tx.amountUsdt)}
                      size="sm"
                      sign={deposit ? "+" : "−"}
                      numberClassName={deposit ? "text-emerald-300" : "text-white"}
                    />
                  </span>
                </div>

                {/* 출금은 수수료, 실수령액을 반드시 같이 보여 준다 */}
                {!deposit && typeof tx.netUsdt === "number" && (
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg bg-canvas px-2.5 py-2 text-[11px]">
                    <span className="text-faint">
                      {t("fee")} <span className="font-mono text-secondary">{fmt(tx.feeUsdt ?? 0)}</span>
                    </span>
                    <span className="ml-auto font-bold text-gold-champagne">
                      {t("net")} <span className="font-mono tabular-nums">{fmt(tx.netUsdt)}</span>
                    </span>
                  </div>
                )}

                <dl className="mt-2 grid gap-1 text-[11px]">
                  {tx.network && <div className="flex justify-between gap-2"><dt className="text-faint">{t("method")}</dt><dd className="font-mono text-secondary">{tx.network}</dd></div>}
                  <div className="flex justify-between gap-2"><dt className="text-faint">{t("requestId")}</dt><dd className="min-w-0 break-all text-right font-mono text-secondary">{tx.serverId ?? tx.id}</dd></div>
                  {held && <div className="flex justify-between gap-2"><dt className="text-faint">{t("unlockAt")}</dt><dd className="text-right text-secondary">{new Date(tx.unlockAt!).toLocaleString(locale)}</dd></div>}
                  {tx.address && (
                    <div className="flex items-center justify-between gap-2">
                      <dt className="flex-none text-faint">{tx.network === "ERC20" ? "USDT (ERC-20)" : WITHDRAW_NETWORK_BY_KEY[net].token}</dt>
                      <dd className="flex min-w-0 items-center gap-1.5">
                        <code className="truncate font-mono text-secondary" title={tx.address}>
                          {short(tx.address)}
                        </code>
                        <button type="button" onClick={() => copy(tx.address!)} aria-label={t("copyAddress")} className="flex h-7 w-7 flex-none items-center justify-center rounded-md border border-hairline text-gold-champagne hover:border-gold-champagne">
                          {copied === tx.address ? <Check className="h-3 w-3" strokeWidth={2.6} /> : <Copy className="h-3 w-3" strokeWidth={2.2} />}
                        </button>
                      </dd>
                    </div>
                  )}
                  {tx.emailMasked && (
                    <div className="flex items-baseline justify-between gap-2">
                      <dt className="flex-none text-faint">{t("verifiedEmail")}</dt>
                      <dd className="truncate font-mono text-secondary">{tx.emailMasked}</dd>
                    </div>
                  )}
                  {tx.receipt && (
                    <div className="flex items-baseline justify-between gap-2">
                      <dt className="flex-none text-faint">{t("receipt")}</dt>
                      <dd className="truncate font-mono text-secondary">{tx.receipt}</dd>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="flex-none text-faint">{t("at")}</dt>
                    <dd className="font-mono text-secondary">{new Date(tx.at).toLocaleString(locale)}</dd>
                  </div>
                </dl>

                {/* TxID, 백엔드가 준 실제 해시가 있을 때만 */}
                <div className="mt-2 flex items-center gap-1.5 border-t border-hairline pt-2 text-[11px]">
                  <span className="flex-none text-faint">{t("txId")}</span>
                  {tx.txHash ? (
                    <>
                      <code className="min-w-0 flex-1 truncate font-mono text-secondary" title={tx.txHash}>
                        {tx.txHash}
                      </code>
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-7 flex-none items-center gap-1 whitespace-nowrap rounded-md border border-gold-champagne/50 px-2 font-bold text-gold-champagne hover:bg-gold-champagne/10"
                      >
                        {explorerName}
                        <ExternalLink className="h-3 w-3" strokeWidth={2.4} />
                      </a>
                    </>
                  ) : (
                    <span className="text-faint">{t("txIdPending")}</span>
                  )}
                </div>

                {/* 72시간 대기, 이상 징후를 발견하면 본인이 즉시 되돌릴 수 있다 */}
                {held && tx.serverId && (
                  <button
                    type="button"
                    disabled={cancelling !== null}
                    onClick={() => void cancel(tx)}
                    className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 break-keep rounded-lg border border-crimson/50 px-3 text-[12px] font-bold text-crimson transition-colors hover:bg-crimson/10"
                  >
                    <Undo2 className="h-3.5 w-3.5 flex-none" strokeWidth={2.4} />
                    {t("cancelHold")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default HistoryTab;
