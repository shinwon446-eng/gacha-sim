"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, Check, Clock, Loader2, Copy, ExternalLink, CheckCircle2, ShieldCheck, ShieldAlert, Gavel } from "lucide-react";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { useCurrencyStore } from "@/stores/currencyStore";
import { useWalletStore, type Transaction, type TxStatus } from "@/stores/walletStore";
import type { Network } from "@/lib/depositAddress";
import { EXPLORERS, MIN_WITHDRAW_USDT, WITHDRAW_NETWORKS, WITHDRAW_NETWORK_BY_KEY, explorerTxUrl, maxWithdrawable, netReceive, validateWithdrawal, type WithdrawError } from "@/lib/withdrawal";
import { AccountError } from "@/lib/account";
import type { WithdrawalProof } from "@/lib/security";
import { useAuthStore } from "@/stores/authStore";
import { LoginRequired } from "@/components/auth/LoginRequired";
import { api } from "@/lib/api";
import { Money } from "@/components/ui/Money";
import { useSecurityStore } from "@/stores/securityStore";
import { TwoFactorSetup } from "@/components/wallet/TwoFactorSetup";
import { ConfirmStep, EmailHoldStep, OtpStep } from "@/components/wallet/WithdrawSteps";
import { HOLD_HOURS } from "@/lib/withdrawHold";

export interface WithdrawTabProps {
  /** 출금 신청 확정 후, 호출측이 토스트를 띄운다 */
  onRequested?: (amountUsdt: number, network: Network) => void;
  /** 롤오버 미달로 막혔을 때, 호출측이 경고 토스트를 띄운다 */
  onBlocked?: (progressPct: number) => void;
  /** [확인] 으로 모달을 닫을 수 있을 때 */
  onDone?: () => void;
}

/**
 * 출금 상태 머신 (2026-09-29 운영자 지시)
 *   form → confirm(수수료 제외 후 실수령액) → otp(2차 인증) → 성공: submitting → done
 *                                                        └ 실패, 대체: email(이메일 인증 + 72시간 대기) → submitting → done
 * 2FA 미등록 계정은 form 앞에 gate(Google OTP 설정)가 붙는다.
 */
type Draft = { amountUsdt: number; network: Network; address: string };
type Stage =
  | { kind: "form" }
  | ({ kind: "confirm" } & Draft)
  | ({ kind: "otp" } & Draft)
  | ({ kind: "email" } & Draft)
  | { kind: "submitting" }
  | { kind: "done"; tx: Transaction; amountUsdt: number; network: Network; address: string; review: boolean; hold?: number };

const inputCls = "mt-1.5 w-full rounded-md border border-hairline bg-obsidian px-3 py-2.5 font-mono text-sm text-white outline-none transition-colors placeholder:text-faint focus:border-gold-champagne";

/** 네트워크 키 → 거래 ref("TRC20:주소") 파싱 */
const parseRef = (ref?: string): { network: Network; address: string } => {
  const [n, a] = (ref ?? "").split(":");
  return { network: n === "BEP20" ? "BEP20" : "TRC20", address: a ?? "" };
};

type TFn = ReturnType<typeof useTranslations<"withdraw">>;

function StatusPill({ status, t }: { status: TxStatus; t: TFn }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold", (status === "PENDING_ADMIN_REVIEW" || status === "FAILED") ? "bg-crimson/15 text-crimson" : status === "COMPLETED" ? "bg-emerald-500/15 text-emerald-300" : status === "PENDING_72H_HOLD" || status === "BROADCASTING" ? "bg-gold-champagne/15 text-gold-champagne" : "bg-white/10 text-secondary")}>
      {status === "PENDING_ADMIN_REVIEW" ? <Gavel className="h-3 w-3" strokeWidth={2.4} /> : status !== "COMPLETED" && status !== "BROADCASTING" ? <Clock className="h-3 w-3" strokeWidth={2.4} /> : status === "BROADCASTING" ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.4} /> : <CheckCircle2 className="h-3 w-3" strokeWidth={2.4} />}
      {t(`status.${status}`)}
    </span>
  );
}

/** TxID + 복사 + 익스플로러 링크 (CLAUDE.md §6-B) */
function TxLink({ network, hash, compact, t, copied, onCopy }: { network: Network; hash: string; compact?: boolean; t: TFn; copied: string | null; onCopy: (h: string) => void }) {
  return (
    <div className={cn("flex items-center gap-1.5", compact ? "text-xs" : "text-xs")}>
      <code className={cn("min-w-0 truncate font-mono text-secondary", compact ? "max-w-[9rem]" : "flex-1")} title={hash}>
        {compact ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash}
      </code>
      <button type="button" onClick={() => onCopy(hash)} aria-label={t("copyHash")} className="glass-dark flex h-7 w-7 flex-none items-center justify-center rounded-md text-gold-champagne hover:border-gold-champagne">
        {copied === hash ? <Check className="h-3 w-3" strokeWidth={2.6} /> : <Copy className="h-3 w-3" strokeWidth={2.2} />}
      </button>
      <a href={explorerTxUrl(network, hash)} target="_blank" rel="noopener noreferrer" className="border-gold-gradient flex h-7 flex-none items-center gap-1 whitespace-nowrap rounded-md px-2 text-xs font-bold text-gold-champagne hover:bg-gold-champagne/10">
        {t("viewOnExplorer", { explorer: EXPLORERS[network].name })}
        <ExternalLink className="h-3 w-3" strokeWidth={2.4} />
      </a>
    </div>
  );
}

/**
 * USDT 출금 탭, 지갑 모달 3번째 탭이자 출금 모달의 본문.
 * 네트워크(TRC-20 / BEP-20) → 개인 지갑 주소 → 수량(최소 20 USDT, +25%/+50%/전액) → 실수령액 → 신청.
 * 신청 시 잔액을 즉시 차감하고 거래를 PENDING 으로 기록한다. live 모드는 API 가 서명, 브로드캐스트 뒤 상태, TxID 를 주고,
 * preview 모드(백엔드 없음)는 PENDING 에 머문다, TxID 를 지어내지 않는다 (CLAUDE.md 부록 C).
 */
export function WithdrawTab({ onRequested, onBlocked, onDone }: WithdrawTabProps) {
  const t = useTranslations("withdraw");
  const r = useTranslations("refinement");
  const locale = useLocale();
  const { currency, fmt } = useCurrency();
  const rates = useCurrencyStore((s) => s.rates);
  const balance = useWalletStore((s) => s.cryptoBalance);
  const debitCrypto = useWalletStore((s) => s.debitCrypto);
  const addTransaction = useWalletStore((s) => s.addTransaction);
  const transactions = useWalletStore((s) => s.transactions);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // 1단계 관문, Google OTP(2FA) 등록 여부
  const twoFactorEnabled = useSecurityStore((s) => s.twoFactorEnabled);
  const user = useAuthStore(s => s.user);
  const securityReady = useSecurityStore(s => s.hydrated && s.userId === user?.id);
  const securityError = useSecurityStore(s => s.error);
  const ta = useTranslations("account");
  const ts = useTranslations("security");
  const [submitError, setSubmitError] = useState("");
  const submission = useRef(false);
  const requestId = useRef<string>("");
  const requestDraft = useRef<string>("");
  const [emailOnly, setEmailOnly] = useState(false);
  useEffect(() => { setStage({ kind: "form" }); setEmailOnly(false); }, [user?.id]);
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
  // 입력은 선택 통화 단위, 잔액 반영, 온체인 금액은 USDT 로 환산
  const amountNative = Number(amountText);
  const amountUsdt = useMemo(() => (Number.isFinite(amountNative) ? +(amountNative / rates[currency]).toFixed(2) : NaN), [amountNative, rates, currency]);
  const errors = useMemo(() => validateWithdrawal({ network, address, amountUsdt, balanceUsdt: balance }), [network, address, amountUsdt, balance]);
  const has = (k: WithdrawError) => touched && errors.includes(k);
  const amountOk = !errors.includes("nan") && !errors.includes("min") && !errors.includes("insufficient");
  const net = amountOk ? netReceive(amountUsdt, network) : 0;

  /** 잔액의 일정 비율을 입력창에 넣는다 (선택 통화 단위) */
  const setRatio = (ratio: number) => {
    const usdt = +(maxWithdrawable(balance) * ratio).toFixed(2);
    setAmountText((usdt * rates[currency]).toFixed(decimals));
  };

  /** [출금 신청], 바로 보내지 않고 반드시 [수수료 제외 후 출금 확인] 요약을 거친다 */
  const beginConfirm = useCallback(() => {
    setTouched(true);
    if (stage.kind !== "form" || !user || !securityReady || submission.current) return;
    if (errors.length) return;
    const fingerprint = JSON.stringify([user.id, amountUsdt, network, address.trim()]);
    if (requestDraft.current !== fingerprint) {
      requestDraft.current = fingerprint;
      requestId.current = globalThis.crypto.randomUUID();
    }
    setSubmitError("");
    setStage({ kind: "confirm", amountUsdt, network, address: address.trim() });
  }, [user, securityReady, stage.kind, errors.length, amountUsdt, network, address]);

  /**
   * 2차 인증을 통과한 뒤에만 불린다, 여기서 잔액이 차감되고 출금 내역이 생긴다.
   * 이메일 경로는 `PENDING_72H_HOLD` 로 기록되고 `unlockAt` 이 붙는다.
   * TxID, COMPLETED 는 백엔드가 준 값으로만 올라간다, preview 는 신청 상태에 머문다(부록 C).
   */
  const commit = useCallback(async (draft: Draft, proof: WithdrawalProof) => {
    if (submission.current || !user || useAuthStore.getState().user?.id !== user.id) return;
    const current = useWalletStore.getState();
    if (validateWithdrawal({ ...draft, balanceUsdt: current.cryptoBalance }).length) {
      setStage({ kind: "form" }); setSubmitError(t("errors.insufficient")); return;
    }
    submission.current = true; setSubmitError(""); setStage({ kind: "submitting" });
    try {
      const result = await api.withdraw({ ...draft, requestId: requestId.current, authorization: proof.authorization, authMethod: proof.method });
      if (useAuthStore.getState().user?.id !== user.id) return;
      const existing = useWalletStore.getState().transactions.find(x => x.serverId === result.id);
      if (existing) { setStage({ kind: "form" }); return; }
      const hold = result.unlockAt;
      const review = result.status === "PENDING_ADMIN_REVIEW";
      // The server reserves funds atomically before acknowledging the request.
      if (!["CANCELLED", "FAILED"].includes(result.status)) debitCrypto(draft.amountUsdt);
      const tx = addTransaction({ type: "withdraw", accountId: user.id, serverId: result.id,
        amountUsdt: -draft.amountUsdt, ref: `${draft.network}:${draft.address}`, network: draft.network,
        address: draft.address, feeUsdt: WITHDRAW_NETWORK_BY_KEY[draft.network].feeUsdt,
        netUsdt: netReceive(draft.amountUsdt, draft.network), authMethod: proof.method,
        unlockAt: hold, emailMasked: proof.emailMasked, status: result.status, txHash: result.txHash });
      requestDraft.current = "";
      onRequested?.(draft.amountUsdt, draft.network);
      setStage({ kind: "done", tx, ...draft, review, hold });
    } catch (cause) {
      setSubmitError(ta(`errors.${cause instanceof AccountError ? cause.code : "network"}`));
      setStage({ kind: "form" });
    } finally { submission.current = false; }
  }, [user, debitCrypto, addTransaction, onRequested, ta, t]);

  const reset = () => {
    setStage({ kind: "form" });
    setAmountText("");
    setAddress("");
    setTouched(false);
  };

  // ── 1단계 관문: 2FA 미등록이면 출금 입력 앞에 Google OTP 설정이 선다 ──
  if (!user) return <LoginRequired />;
  if (!securityReady) return <div className="mt-4 text-sm text-secondary"><p role="status">{ts(securityError ? "loadFailed" : "loading")}</p>{securityError && <button type="button" onClick={() => void useSecurityStore.getState().refresh(user.id)} className="mt-2 min-h-11 text-gold-champagne">{ts("retry")}</button>}</div>;
  if (!twoFactorEnabled && !emailOnly && stage.kind !== "done") {
    return (
      <div className="mt-4">
        <div className="border border-hairline mt-4 rounded-xl bg-obsidian p-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 flex-none text-gold-champagne" strokeWidth={2.3} />
            <h3 className="break-keep text-[15px] font-bold text-white">{t("gateTitle")}</h3>
          </div>
          <p className="mt-1.5 break-keep text-xs leading-relaxed text-secondary">{t("gateBody")}</p>
        </div>
        <TwoFactorSetup key={user.id} autoStart onEnabled={() => setStage({ kind: "form" })} compact />
        <button type="button" onClick={() => setEmailOnly(true)} className="mt-3 min-h-12 w-full rounded-lg border border-hairline px-3 text-sm text-gold-champagne">{t("otpFallback", { hours: HOLD_HOURS })}</button>
      </div>
    );
  }

  // ── 2단계: 수수료 제외 후 출금 확인 ──
  if (stage.kind === "confirm") {
    return (
      <ConfirmStep
        network={stage.network}
        address={stage.address}
        amountUsdt={stage.amountUsdt}
        onBack={() => setStage({ kind: "form" })}
        onNext={() => setStage({ kind: emailOnly ? "email" : "otp", amountUsdt: stage.amountUsdt, network: stage.network, address: stage.address })}
      />
    );
  }

  // ── 3~4단계: 2차 인증 확인 → 성공 / 이메일, 72시간 대기 ──
  if (stage.kind === "otp") {
    const draft: Draft = { amountUsdt: stage.amountUsdt, network: stage.network, address: stage.address };
    return (
      <OtpStep
        draft={draft}
        onSuccess={(proof) => void commit(draft, proof)}
        onFallback={() => setStage({ kind: "email", ...draft })}
        onBack={() => setStage({ kind: "confirm", ...draft })}
      />
    );
  }

  if (stage.kind === "email") {
    const draft: Draft = { amountUsdt: stage.amountUsdt, network: stage.network, address: stage.address };
    return <EmailHoldStep draft={draft} email={user.email ?? user.subLabel} onVerified={(proof) => void commit(draft, proof)} onBack={() => setStage({ kind: "confirm", ...draft })} />;
  }

  const liveTx = stage.kind === "done" ? transactions.find((x) => x.id === stage.tx.id) ?? stage.tx : undefined;
  const liveStatus: TxStatus | undefined = liveTx?.status;
  const recent = transactions.filter((x) => x.type === "withdraw" && x.accountId === user?.id && !["CANCELLED", "FAILED"].includes(x.status ?? "")).slice(0, 4);

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
        <div className="mt-1 flex justify-between text-xs uppercase tracking-wider text-faint">
          <span>{t("status.PENDING")}</span>
          <span>{t("status.BROADCASTING")}</span>
          <span>{t("status.COMPLETED")}</span>
        </div>
        <div className="mt-3">
          <Money value={netReceive(stage.amountUsdt, stage.network)} size="lg" numberClassName="text-gold-gradient" />
          <div className="mt-1 text-xs text-faint">{t("netLabel")}</div>
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
        {/* 온체인 TxID, BROADCASTING 이후 */}
        <div className="border-metallic-subtle mt-3 rounded-md bg-canvas p-2.5">
          <div className="caption-luxury">{t("txHash")}</div>
          <div className="mt-1.5">
            {liveTx?.txHash ? <TxLink network={stage.network} hash={liveTx.txHash} t={t} copied={copied} onCopy={copy} /> : <span className="text-xs text-faint">{t("txHashPending")}</span>}
          </div>
        </div>
        {/* 이메일 인증 경로, 72시간 보안 대기 후 자동 송금. 남은 시간과 취소 경로를 내역 탭이 이어받는다 */}
        {stage.hold ? (
          <div className="mt-3 rounded-md border border-gold-champagne/45 bg-gold-champagne/[0.07] p-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gold-champagne">
              <Clock className="h-3.5 w-3.5" strokeWidth={2.4} />
              {t("holdDoneTitle", { hours: HOLD_HOURS })}
            </div>
            <p className="mt-1 break-keep text-xs leading-relaxed text-secondary">{t("holdDoneNote")}</p>
          </div>
        ) : null}
        {stage.review ? (
          <div className="mt-3 rounded-md border border-crimson/40 bg-crimson/[0.08] p-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-crimson">
              <Gavel className="h-3.5 w-3.5" strokeWidth={2.4} />
              {t("reviewTitle")}
            </div>
            <p className="mt-1 break-keep text-xs leading-relaxed text-secondary">{t("reviewNote")}</p>
          </div>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-faint">{t("processingNote")}</p>
        )}
        <div className={cn("mt-4 grid gap-2", onDone ? "grid-cols-2" : "grid-cols-1")}>
          <button type="button" onClick={reset} className="glass-dark h-11 rounded-md text-sm font-semibold text-secondary hover:text-white">
            {t("another")}
          </button>
          {onDone && (
            <button type="button" onClick={onDone} className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#f1eee7] text-sm font-bold text-obsidian hover:bg-gold-metallic">
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
      {submitError && <p role="alert" className="mt-3 text-sm text-red-200">{submitError}</p>}
      {/* 2FA 보호 중, 1단계 관문을 통과한 계정 */}
      <p className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/[0.07] px-3 py-2 text-xs font-bold text-emerald-300">
        <ShieldCheck className="h-3.5 w-3.5 flex-none" strokeWidth={2.4} />
        {t("gateProtected")}
      </p>
      {/* 출금 가능액은 암호화폐 입금분만, 카드 충전분은 온체인 출금 불가 (CLAUDE.md §7-B) */}
      <div className="mt-2 grid gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs text-muted">{t("availableCrypto")}</span>
          <Money value={balance} size="sm" />
        </div>
      </div>

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
                  <span className="mt-1 flex items-baseline gap-1 text-xs text-faint">
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
        {has("address") && <span className="mt-1 block text-xs text-crimson">{t(`errors.${network}`)}</span>}
      </label>

      {/* 수량 + 퀵 비율 */}
      <label className="mt-3 block">
        <span className="flex items-center justify-between">
          <span className="caption-luxury">{t("amount")}</span>
          <span className="text-xs text-faint">{t("min", { min: fmt(MIN_WITHDRAW_USDT) })}</span>
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
            <button key={label} type="button" onClick={() => setRatio(ratio)} className="glass-dark h-11 whitespace-nowrap rounded-md px-1 text-xs font-bold text-gold-champagne hover:border-gold-champagne">
              {label}
            </button>
          ))}
        </span>
        {has("min") && <span className="mt-1 block text-xs text-crimson">{t("errors.min", { min: fmt(MIN_WITHDRAW_USDT) })}</span>}
        {has("insufficient") && <span className="mt-1 block text-xs text-crimson">{t("errors.insufficient")}</span>}
        {has("nan") && !has("min") && <span className="mt-1 block text-xs text-crimson">{t("errors.nan")}</span>}
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
        onClick={beginConfirm}
        disabled={stage.kind !== "form" || (touched && errors.length > 0)}
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
          <ul className="mt-2 space-y-1.5 text-xs">
            {recent.map((x) => {
              const { network: net2, address: addr } = parseRef(x.ref);
              return (
                <li key={x.id} className="border-metallic-subtle rounded-md bg-obsidian p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-faint">
                      {WITHDRAW_NETWORK_BY_KEY[net2].token} , {addr.slice(0, 10)}…
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
