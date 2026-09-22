"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, Check, Clock, Loader2, Copy, ExternalLink, CheckCircle2, ShieldCheck, ShieldAlert, CreditCard, Activity, Gavel } from "lucide-react";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { useCurrencyStore } from "@/stores/currencyStore";
import { useWalletStore, type Transaction, type TxStatus } from "@/stores/walletStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { playChime } from "@/lib/audio";
import type { Network } from "@/lib/depositAddress";
import { EXPLORERS, MIN_WITHDRAW_USDT, WITHDRAW_NETWORKS, WITHDRAW_NETWORK_BY_KEY, explorerTxUrl, maxWithdrawable, netReceive, validateWithdrawal, type WithdrawError } from "@/lib/withdrawal";
import { LOW_RISK_WEIGHT, requiredRollover, rolloverProgress } from "@/lib/rollover";
import { assessWithdrawalRisk, circuitState, needsManualReview, CIRCUIT_LIMIT_USDT, REVIEW_THRESHOLD } from "@/lib/fraudScoring";
import { useTelemetryStore } from "@/stores/telemetryStore";
import { isLive } from "@/lib/runtime";
import { api } from "@/lib/api";
import { useFairStore } from "@/stores/fairStore";
import { Money } from "@/components/ui/Money";

/** 온체인 전송 준비 연출 길이(ms) — 이 동안 신청서를 만들고, 실제 브로드캐스트는 백엔드가 한다 */
const SUBMIT_MS = 1500;

export interface WithdrawTabProps {
  /** 출금 신청 확정 후 — 호출측이 토스트를 띄운다 */
  onRequested?: (amountUsdt: number, network: Network) => void;
  /** 롤오버 미달로 막혔을 때 — 호출측이 경고 토스트를 띄운다 */
  onBlocked?: (progressPct: number) => void;
  /** [확인] 으로 모달을 닫을 수 있을 때 */
  onDone?: () => void;
}

type Stage =
  | { kind: "form" }
  | { kind: "submitting" }
  | { kind: "done"; tx: Transaction; amountUsdt: number; network: Network; address: string; review: boolean; riskScore: number };

const inputCls = "mt-1.5 w-full rounded-md border border-hairline bg-obsidian px-3 py-2.5 font-mono text-sm text-white outline-none transition-colors placeholder:text-faint focus:border-gold-champagne";

/** 네트워크 키 → 거래 ref("TRC20:주소") 파싱 */
const parseRef = (ref?: string): { network: Network; address: string } => {
  const [n, a] = (ref ?? "").split(":");
  return { network: n === "BEP20" ? "BEP20" : "TRC20", address: a ?? "" };
};

type TFn = ReturnType<typeof useTranslations<"withdraw">>;

function StatusPill({ status, t }: { status: TxStatus; t: TFn }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold", status === "PENDING_ADMIN_REVIEW" ? "bg-crimson/15 text-crimson" : status === "PENDING" ? "bg-white/10 text-secondary" : status === "BROADCASTING" ? "bg-gold-champagne/15 text-gold-champagne" : "bg-emerald-500/15 text-emerald-300")}>
      {status === "PENDING_ADMIN_REVIEW" ? <Gavel className="h-3 w-3" strokeWidth={2.4} /> : status === "PENDING" ? <Clock className="h-3 w-3" strokeWidth={2.4} /> : status === "BROADCASTING" ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.4} /> : <CheckCircle2 className="h-3 w-3" strokeWidth={2.4} />}
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

/** 🛡️ 자금세탁 방지(AML) 롤오버 바 — 입금액의 100% 를 개봉에 소진해야 출금이 열린다 */
function RolloverBar({ t }: { t: TFn }) {
  const { fmt } = useCurrency();
  const depositedCrypto = useWalletStore((s) => s.totalDepositedCrypto);
  const current = useWalletStore((s) => s.totalWagered);
  const required = requiredRollover(depositedCrypto);
  const pct = rolloverProgress(current, depositedCrypto);
  const met = pct >= 100;
  const remaining = +Math.max(0, required - current).toFixed(2);
  return (
    <div className={cn("mt-4 rounded-lg p-3", met ? "border border-emerald-500/40 bg-emerald-500/[0.07]" : "border-metallic-gold bg-gold-champagne/[0.06]")}>
      <div className="flex items-start gap-2">
        {met ? <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-emerald-300" strokeWidth={2.2} /> : <ShieldAlert className="mt-0.5 h-4 w-4 flex-none text-gold-champagne" strokeWidth={2.2} />}
        <div className="min-w-0 flex-1">
          <div className={cn("break-keep text-[12px] font-bold leading-snug", met ? "text-emerald-300" : "text-gold-champagne")}>{met ? t("amlMet") : t("amlTitle")}</div>
          {!met && <div className="mt-0.5 break-keep text-[11px] leading-relaxed text-secondary">{t("amlRule")}</div>}
        </div>
        <span className={cn("flex-none font-display text-lg font-bold tabular-nums", met ? "text-emerald-300" : "text-gold-champagne")}>{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className={cn("h-full rounded-full transition-[width] duration-500", met ? "bg-emerald-400" : "bg-gold-champagne")} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[10px] text-faint">
        <span className="flex items-baseline gap-1">
          {t("amlRequired")} <span className="font-mono text-secondary">{fmt(required)}</span>
        </span>
        <span className="flex items-baseline gap-1">
          {t("amlCurrent")} <span className="font-mono text-secondary">{fmt(current)}</span>
        </span>
      </div>
      {!met && remaining > 0 && <div className="mt-1.5 break-keep text-[11px] font-semibold text-white">{t("amlRemaining", { amount: fmt(remaining) })}</div>}
      {/* 안티 그라인딩 — 저위험 상자만 반복해 롤오버를 채우는 우회를 막는다 */}
      <p className="mt-2 break-keep text-[10px] leading-relaxed text-faint">{t("amlGrinding", { pct: Math.round(LOW_RISK_WEIGHT * 100) })}</p>
      <p className="mt-1 break-keep text-[10px] leading-relaxed text-faint">{t("amlWhy")}</p>
    </div>
  );
}

/** ⛔ 서킷 브레이커 — 1시간 누적 출금이 한도를 넘으면 핫월렛 자동 출금을 멈추고 전부 수동 승인으로 돌린다 */
function CircuitBanner({ t, used, limit, remaining, tripped }: { t: TFn; used: number; limit: number; remaining: number; tripped: boolean }) {
  const { fmt } = useCurrency();
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className={cn("mt-3 rounded-lg p-3", tripped ? "border border-crimson/50 bg-crimson/[0.08]" : "border-metallic-subtle bg-obsidian")}>
      <div className="flex items-start gap-2">
        <Activity className={cn("mt-0.5 h-3.5 w-3.5 flex-none", tripped ? "text-crimson" : "text-muted")} strokeWidth={2.2} />
        <div className="min-w-0 flex-1">
          <div className={cn("break-keep text-[11px] font-bold", tripped ? "text-crimson" : "text-secondary")}>{tripped ? t("circuitTripped") : t("circuitTitle")}</div>
          <div className="mt-0.5 break-keep text-[10px] leading-relaxed text-faint">{tripped ? t("circuitTrippedNote") : t("circuitNote", { limit: fmt(limit), remaining: fmt(remaining) })}</div>
        </div>
        <span className={cn("flex-none font-mono text-[11px] tabular-nums", tripped ? "text-crimson" : "text-faint")}>{fmt(used)}</span>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div className={cn("h-full rounded-full transition-[width] duration-500", tripped ? "bg-crimson" : "bg-secondary/60")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * USDT 출금 탭 — 지갑 모달 3번째 탭이자 출금 모달의 본문.
 * 네트워크(TRC-20 / BEP-20) → 개인 지갑 주소 → 수량(최소 20 USDT, +25%/+50%/전액) → 실수령액 → 신청.
 * 🛡️ 롤오버 100% 미달이면 버튼이 잠긴다(lib/rollover.ts).
 * 신청 시 잔액을 즉시 차감하고 거래를 PENDING 으로 기록한다. live 모드는 API 가 서명·브로드캐스트 뒤 상태·TxID 를 주고,
 * preview 모드(백엔드 없음)는 PENDING 에 머문다 — TxID 를 지어내지 않는다 (CLAUDE.md 부록 C).
 */
export function WithdrawTab({ onRequested, onBlocked, onDone }: WithdrawTabProps) {
  const t = useTranslations("withdraw");
  const locale = useLocale();
  const { currency, fmt } = useCurrency();
  const rates = useCurrencyStore((s) => s.rates);
  const balance = useWalletStore((s) => s.cryptoBalance);
  const cardBalance = useWalletStore((s) => s.cardBalance);
  const totalDepositedCrypto = useWalletStore((s) => s.totalDepositedCrypto);
  const totalWagered = useWalletStore((s) => s.totalWagered);
  const debitCrypto = useWalletStore((s) => s.debitCrypto);
  const addTransaction = useWalletStore((s) => s.addTransaction);
  const setTransactionStatus = useWalletStore((s) => s.setTransactionStatus);
  const transactions = useWalletStore((s) => s.transactions);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const userKey = useFairStore((s) => s.clientSeed) || "anon";
  const [copied, setCopied] = useState<string | null>(null);

  const [network, setNetwork] = useState<Network>("TRC20");
  const [address, setAddress] = useState("");
  const [amountText, setAmountText] = useState("");
  const [touched, setTouched] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: "form" });

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

  // 부정거래 탐지 입력 — 첫 입금 시각, 스핀 간격, 1시간 누적 출금
  const spinTimes = useTelemetryStore((s) => s.spinTimes);
  const firstDepositAt = useMemo(() => {
    const deposits = transactions.filter((x) => x.type === "deposit_usdt" || x.type === "deposit_card");
    if (deposits.length === 0) return undefined;
    return Math.min(...deposits.map((x) => Date.parse(x.at)).filter(Number.isFinite));
  }, [transactions]);
  const withdrawHistory = useMemo(() => transactions.filter((x) => x.type === "withdraw").map((x) => ({ amountUsdt: x.amountUsdt, at: x.at })), [transactions]);
  const circuit = useMemo(() => circuitState(withdrawHistory), [withdrawHistory]);

  const amlPct = rolloverProgress(totalWagered, totalDepositedCrypto);
  const amlOk = amlPct >= 100;

  /** 잔액의 일정 비율을 입력창에 넣는다 (선택 통화 단위) */
  const setRatio = (ratio: number) => {
    const usdt = +(maxWithdrawable(balance) * ratio).toFixed(2);
    setAmountText((usdt * rates[currency]).toFixed(decimals));
  };

  const submit = useCallback(() => {
    setTouched(true);
    if (stage.kind !== "form") return;
    if (!amlOk) {
      onBlocked?.(amlPct);
      return;
    }
    if (errors.length) return;
    setStage({ kind: "submitting" });
    const addr = address.trim();
    timers.current.push(
      setTimeout(() => {
        if (!debitCrypto(amountUsdt)) {
          setStage({ kind: "form" });
          return;
        }
        const risk = assessWithdrawalRisk({ amountUsdt, firstDepositAt, spinTimes });
        const review = needsManualReview(risk, circuitState(withdrawHistory));
        const tx = addTransaction({ type: "withdraw", amountUsdt: -amountUsdt, ref: `${network}:${addr}`, status: review ? "PENDING_ADMIN_REVIEW" : "PENDING" });
        if (!useSettingsStore.getState().muted) playChime();
        onRequested?.(amountUsdt, network);
        setStage({ kind: "done", tx, amountUsdt, network, address: addr, review, riskScore: risk.score });
        // 심사 대상이면 자동 송금 경로를 타지 않는다 — 관리자 승인 후 백엔드가 브로드캐스트한다.
        // live: 서버가 서명·브로드캐스트 → 상태·TxID 를 폴링으로 반영. preview: 상태에 머문다 (TxID 를 지어내지 않는다).
        if (!review && isLive()) {
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
      }, SUBMIT_MS),
    );
  }, [errors, stage.kind, amlOk, amlPct, onBlocked, firstDepositAt, spinTimes, withdrawHistory, debitCrypto, amountUsdt, address, addTransaction, network, onRequested, setTransactionStatus, userKey]);

  const reset = () => {
    setStage({ kind: "form" });
    setAmountText("");
    setAddress("");
    setTouched(false);
  };

  const liveTx = stage.kind === "done" ? transactions.find((x) => x.id === stage.tx.id) ?? stage.tx : undefined;
  const liveStatus: TxStatus | undefined = liveTx?.status;
  const recent = transactions.filter((x) => x.type === "withdraw").slice(0, 4);

  if (stage.kind === "done") {
    return (
      <div className="border-metallic-subtle mt-4 rounded-lg bg-obsidian p-4">
        <div className="flex items-center justify-between">
          <span className="caption-luxury">{t("requested")}</span>
          <StatusPill status={liveStatus ?? "PENDING"} t={t} />
        </div>
        {/* 상태 타임라인 */}
        <ol className="mt-3 flex items-center gap-1.5">
          {(["PENDING", "BROADCASTING", "COMPLETED"] as TxStatus[]).map((s, i) => {
            const order = ["PENDING", "PENDING_ADMIN_REVIEW", "BROADCASTING", "COMPLETED"].filter((x) => x !== "PENDING_ADMIN_REVIEW");
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
        {stage.review ? (
          <div className="mt-3 rounded-md border border-crimson/40 bg-crimson/[0.08] p-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-crimson">
              <Gavel className="h-3.5 w-3.5" strokeWidth={2.4} />
              {t("reviewTitle")}
            </div>
            <p className="mt-1 break-keep text-[10px] leading-relaxed text-secondary">{t("reviewNote")}</p>
            <p className="mt-1 break-keep text-[10px] leading-relaxed text-faint">{t("riskScore", { score: stage.riskScore, threshold: REVIEW_THRESHOLD })}</p>
          </div>
        ) : (
          <p className="mt-3 text-[10px] leading-relaxed text-faint">{isLive() ? t("processingNote") : t("networkNote")}</p>
        )}
        <div className={cn("mt-4 grid gap-2", onDone ? "grid-cols-2" : "grid-cols-1")}>
          <button type="button" onClick={reset} className="glass-dark h-11 rounded-md text-sm font-semibold text-secondary hover:text-white">
            {t("another")}
          </button>
          {onDone && (
            <button type="button" onClick={onDone} className="flex h-11 items-center justify-center gap-2 rounded-md bg-gold-champagne text-sm font-bold text-obsidian hover:bg-gold-metallic">
              <Check className="h-4 w-4" strokeWidth={2.5} />
              {t("done")}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 출금 가능액은 암호화폐 입금분만 — 카드 충전분은 온체인 출금 불가 (CLAUDE.md §7-B) */}
      <div className="mt-2 grid gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs text-muted">{t("availableCrypto")}</span>
          <Money value={balance} size="sm" />
        </div>
        {cardBalance > 0 && (
          <div className="border-metallic-subtle flex items-start gap-2 rounded-md bg-obsidian p-2.5">
            <CreditCard className="mt-0.5 h-3.5 w-3.5 flex-none text-muted" strokeWidth={2.2} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-semibold text-secondary">{t("cardLocked")}</span>
                <Money value={cardBalance} size="xs" numberClassName="text-secondary" />
              </div>
              <p className="mt-0.5 break-keep text-[10px] leading-relaxed text-faint">{t("cardLockedNote")}</p>
            </div>
          </div>
        )}
      </div>

      {/* 🛡️ 자금세탁 방지(AML) 롤오버 */}
      <RolloverBar t={t} />

      {/* ⛔ 시간당 출금 서킷 브레이커 */}
      <CircuitBanner t={t} used={circuit.usedUsdt} limit={CIRCUIT_LIMIT_USDT} remaining={circuit.remainingUsdt} tripped={circuit.tripped} />

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

      {/* 수량 + 퀵 비율 */}
      <label className="mt-3 block">
        <span className="flex items-center justify-between">
          <span className="caption-luxury">{t("amount")}</span>
          <span className="text-[10px] text-faint">{t("min", { min: fmt(MIN_WITHDRAW_USDT) })}</span>
        </span>
        <input value={amountText} onChange={(e) => setAmountText(e.target.value)} onBlur={() => setTouched(true)} inputMode="decimal" placeholder={currency} className={cn(inputCls, (has("min") || has("insufficient") || has("nan")) && "border-crimson")} />
        <span className="mt-2 grid grid-cols-3 gap-1.5">
          {(
            [
              [t("quick25"), 0.25],
              [t("quick50"), 0.5],
              [t("quickMax"), 1],
            ] as const
          ).map(([label, ratio]) => (
            <button key={label} type="button" onClick={() => setRatio(ratio)} className="glass-dark h-9 whitespace-nowrap rounded-md px-1 text-xs font-bold text-gold-champagne hover:border-gold-champagne">
              {label}
            </button>
          ))}
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

      {!amlOk && <p className="mt-3 break-keep rounded-md border border-gold-champagne/40 bg-gold-champagne/10 p-2.5 text-[11px] leading-relaxed text-gold-champagne">{t("amlBlocked", { pct: amlPct })}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={stage.kind !== "form" || !amlOk || (touched && errors.length > 0)}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md bg-gold-champagne px-3 text-sm font-bold text-obsidian shadow-[0_0_24px_rgba(230,202,101,0.35)] transition-colors hover:bg-gold-metallic disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
      >
        {stage.kind === "submitting" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />
            {t("submitting")}
          </>
        ) : (
          t("submitAmount", { amount: fmt(amountOk ? amountUsdt : 0) })
        )}
      </button>

      {recent.length > 0 && (
        <div className="mt-4">
          <div className="caption-luxury">{t("history")}</div>
          <ul className="mt-2 space-y-1.5 text-[11px]">
            {recent.map((x) => {
              const { network: net2, address: addr } = parseRef(x.ref);
              return (
                <li key={x.id} className="border-metallic-subtle rounded-md bg-obsidian p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-faint">
                      {WITHDRAW_NETWORK_BY_KEY[net2].token} · {addr.slice(0, 10)}…
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusPill status={x.status ?? "PENDING"} t={t} />
                      <Money value={Math.abs(x.amountUsdt)} size="xs" numberClassName="text-secondary" />
                    </span>
                  </div>
                  {x.txHash && (
                    <div className="mt-1.5">
                      <TxLink network={net2} hash={x.txHash} compact t={t} copied={copied} onCopy={copy} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

export default WithdrawTab;
