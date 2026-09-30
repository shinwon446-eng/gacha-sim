"use client";

import { useRef, useState, type FormEvent } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { AccountError, accountConfigured, accountRequest, browserAccountsEnabled } from "@/lib/account";
import { useModal } from "@/lib/useModal";
import { useAuthStore } from "@/stores/authStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useWalletStore } from "@/stores/walletStore";

type ClosureItem = { status: string };
type ClosureTransaction = { type: string; status?: string };
export type ClosureGateInput = {
  balance: number;
  cryptoBalance: number;
  cardBalance: number;
  transactions: readonly ClosureTransaction[];
  items: readonly ClosureItem[];
};
export type ClosureGate =
  | { stage: "balance"; balance: number; pendingCount: number }
  | { stage: "inventory"; count: number }
  | { stage: "verify" };

const terminalStatuses = new Set(["COMPLETED", "CANCELLED", "FAILED", "REJECTED"]);
const heldStatuses = new Set(["IN_STORAGE", "SHIPPING_REQUESTED", "SHIPPING"]);
const codePattern = /^\d{6}$/;
const CODE_LIFETIME_MS = 10 * 60 * 1000;

/** Check funds and unsettled transfers before examining any inventory. */
export function evaluateClosureGate(input: ClosureGateInput): ClosureGate {
  const pendingCount = input.transactions.filter(tx =>
    ["deposit_usdt", "deposit_card", "withdraw"].includes(tx.type) &&
    Boolean(tx.status) && !terminalStatuses.has(tx.status!)
  ).length;
  const balances = [input.balance, input.cryptoBalance, input.cardBalance];
  if (balances.some(value => !Number.isFinite(value) || value !== 0) || pendingCount > 0) {
    const splitTotal = input.cryptoBalance + input.cardBalance;
    const balance = Number.isFinite(input.balance) && input.balance !== 0 ? input.balance : Number.isFinite(splitTotal) ? splitTotal : 0;
    return { stage: "balance", balance, pendingCount };
  }
  const count = input.items.filter(item => heldStatuses.has(item.status)).length;
  return count > 0 ? { stage: "inventory", count } : { stage: "verify" };
}

export function createLocalClosureCode(): string {
  const random = new Uint32Array(1);
  globalThis.crypto.getRandomValues(random);
  return String(random[0] % 1_000_000).padStart(6, "0");
}

export function validClosureCode(code: string): boolean { return codePattern.test(code); }

export function matchesLocalClosureCode(input: string, issued: string, expiresAt: number, now = Date.now()): boolean {
  return validClosureCode(input) && input === issued && now < expiresAt;
}

function liveGate(): ClosureGate {
  const wallet = useWalletStore.getState();
  return evaluateClosureGate({ ...wallet, items: useInventoryStore.getState().items });
}

type Stage = ClosureGate["stage"] | "done" | null;

export function AccountClosureFlow() {
  const t = useTranslations("account");
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const authReady = useAuthStore(s => s.hydrated);
  const walletReady = useWalletStore(s => s.hydrated);
  const inventoryReady = useInventoryStore(s => s.hydrated);
  const clearSession = useAuthStore(s => s.clearSession);
  const [stage, setStage] = useState<Stage>(null);
  const [gate, setGate] = useState<ClosureGate>({ stage: "verify" });
  const [code, setCode] = useState("");
  const [issuedCode, setIssuedCode] = useState("");
  const [expiresAt, setExpiresAt] = useState(0);
  const [codeIssued, setCodeIssued] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);
  const configured = accountConfigured();
  const localMode = browserAccountsEnabled();
  const ready = authReady && walletReady && inventoryReady;

  const close = () => {
    if (busy) return;
    if (stage === "done") { router.push("/"); return; }
    setStage(null);
    setCode(""); setIssuedCode(""); setCodeIssued(false); setConsent(false); setError("");
  };
  useModal(stage !== null, close, modalRef);

  const applyGate = (next: ClosureGate) => {
    setGate(next);
    setStage(next.stage);
    setCode(""); setIssuedCode(""); setCodeIssued(false); setConsent(false); setError("");
  };

  const start = () => {
    if (!ready || !user || !configured || busy) return;
    applyGate(liveGate());
  };

  const issueCode = async () => {
    if (busy || !user) return;
    const latest = liveGate();
    if (latest.stage !== "verify") { applyGate(latest); return; }
    setBusy(true); setError(""); setCode("");
    try {
      if (localMode) {
        setIssuedCode(createLocalClosureCode());
        setExpiresAt(Date.now() + CODE_LIFETIME_MS);
      } else {
        const result = await accountRequest("/account/closure/code", { locale: document.documentElement.lang || "ko" });
        if (result.accepted !== true) throw new AccountError("invalid");
      }
      setCodeIssued(true);
    } catch (cause) {
      setCodeIssued(false);
      setError(t(`errors.${cause instanceof AccountError ? cause.code : "network"}`));
    } finally { setBusy(false); }
  };

  const complete = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !ready || !user || !codeIssued || !consent) return;
    if (!validClosureCode(code) || (localMode && !matchesLocalClosureCode(code, issuedCode, expiresAt))) {
      setError("인증코드가 올바르지 않거나 만료되었습니다. 새 코드를 받아 다시 입력해 주세요.");
      return;
    }
    const latest = liveGate();
    if (latest.stage !== "verify") { applyGate(latest); return; }
    setBusy(true); setError("");
    try {
      // The password field keeps the existing browser transport compatible until
      // its closure endpoint accepts the code directly. It is never used remotely.
      const payload = localMode ? { code, password: code, confirm: true } : { code, confirm: true };
      const result = await accountRequest("/account/closure", payload);
      if (result.deleted !== true) throw new AccountError("invalid");
      clearSession();
      setIssuedCode(""); setCode(""); setConsent(false);
      setStage("done");
    } catch (cause) {
      setError(cause instanceof AccountError && ["invalid", "credentials"].includes(cause.code)
        ? "인증코드가 올바르지 않거나 만료되었습니다. 새 코드를 받아 다시 입력해 주세요."
        : t(`errors.${cause instanceof AccountError ? cause.code : "network"}`));
    } finally { setBusy(false); }
  };

  const inputClass = "mt-2 h-12 w-full rounded-xl border border-hairline bg-obsidian px-4 text-base text-white focus:border-gold-champagne focus:outline-none";
  return <>
    <button type="button" onClick={start} disabled={!ready || !user || !configured || busy} className="mt-5 min-h-12 rounded-xl border border-red-300/40 px-5 text-sm font-semibold text-red-200 disabled:cursor-not-allowed disabled:opacity-35">회원탈퇴</button>
    {stage && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="closure-dialog-title" tabIndex={-1} className="w-full max-w-md rounded-2xl border border-hairline bg-surface p-6 shadow-2xl outline-none sm:p-7">
        {stage === "balance" && <>
          <h2 id="closure-dialog-title" className="text-xl font-semibold text-white">탈퇴 불가 , 출금 필요</h2>
          <p className="mt-4 text-sm text-secondary">현재 지갑 잔액: <strong className="text-white">{gate.stage === "balance" ? gate.balance.toLocaleString() : 0} USDT</strong></p>
          {gate.stage === "balance" && gate.pendingCount > 0 && <p className="mt-2 text-sm text-secondary">처리 중인 입출금: {gate.pendingCount}건</p>}
          <p className="mt-4 text-sm leading-7 text-secondary">계정에 남은 잔액이 있어 탈퇴할 수 없습니다. 모든 잔액을 출금하신 후 다시 신청해 주세요.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/#withdraw" onClick={close} className="inline-flex min-h-11 items-center rounded-xl bg-[#f1eee7] px-4 text-sm font-semibold text-obsidian">출금하러 가기</Link><button type="button" onClick={close} className="min-h-11 rounded-xl border border-hairline px-4 text-sm text-white">닫기</button></div>
        </>}
        {stage === "inventory" && <>
          <h2 id="closure-dialog-title" className="text-xl font-semibold text-white">탈퇴 불가 , 상품 정리 필요</h2>
          <p className="mt-4 text-sm text-secondary">정리할 상품: <strong className="text-white">{gate.stage === "inventory" ? gate.count : 0}개</strong></p>
          <p className="mt-4 text-sm leading-7 text-secondary">보관함에 정리되지 않은 상품이 있어 탈퇴할 수 없습니다. 실물 배송 수령 또는 90% 즉시 페이백으로 상품을 모두 정리한 뒤 다시 시도해 주세요.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/inventory?tab=held" onClick={close} className="inline-flex min-h-11 items-center rounded-xl bg-[#f1eee7] px-4 text-sm font-semibold text-obsidian">보관함에서 정리하기</Link><button type="button" onClick={close} className="min-h-11 rounded-xl border border-hairline px-4 text-sm text-white">닫기</button></div>
        </>}
        {stage === "verify" && <>
          <h2 id="closure-dialog-title" className="text-xl font-semibold text-white">본인 확인 인증</h2>
          <p className="mt-3 text-sm leading-6 text-secondary">회원탈퇴를 완료하려면 6자리 인증코드를 확인해 주세요.</p>
          <button type="button" onClick={issueCode} disabled={busy} className="mt-5 min-h-11 rounded-xl border border-gold-champagne/50 px-4 text-sm font-semibold text-gold-champagne disabled:opacity-40">인증코드 받기</button>
          {codeIssued && <p role="status" className="mt-3 text-sm leading-6 text-secondary">{localMode ? <>브라우저 테스트용 인증번호: <strong className="font-mono text-white">{issuedCode}</strong> (10분 유효)</> : "계정 이메일로 인증코드를 보냈습니다."}</p>}
          <form onSubmit={complete} className="mt-5 space-y-4">
            <label className="block text-sm text-secondary">6자리 인증코드<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} disabled={!codeIssued || busy} className={inputClass} /></label>
            <label className="flex min-h-11 items-start gap-3 text-sm leading-6 text-secondary"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} disabled={busy} className="mt-1 h-4 w-4 shrink-0 accent-[#d5bd87]" /><span>{t("closureConsent")}</span></label>
            {error && <p role="alert" className="text-sm leading-6 text-red-200">{error}</p>}
            <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy || !codeIssued || !validClosureCode(code) || !consent} className="min-h-11 rounded-xl border border-red-300/40 px-4 text-sm font-semibold text-red-200 disabled:opacity-40">{busy ? t("processing") : "인증 및 탈퇴 완료"}</button><button type="button" onClick={close} disabled={busy} className="min-h-11 rounded-xl border border-hairline px-4 text-sm text-white">닫기</button></div>
          </form>
        </>}
        {stage === "done" && <>
          <h2 id="closure-dialog-title" className="text-xl font-semibold text-white">탈퇴 완료</h2>
          <p className="mt-4 text-sm leading-7 text-secondary">회원탈퇴가 정상적으로 완료되었습니다. 그동안 이용해 주셔서 감사합니다.</p>
          <button type="button" onClick={close} className="mt-6 min-h-11 rounded-xl bg-[#f1eee7] px-5 text-sm font-semibold text-obsidian">확인</button>
        </>}
      </div>
    </div>}
  </>;
}
