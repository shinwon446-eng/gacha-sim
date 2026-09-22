"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, AlertTriangle, ShieldAlert, Radio, Loader2 } from "lucide-react";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { MIN_DEPOSIT_USDT, NETWORKS, looksLikeAddress, type DepositNetwork } from "@/lib/depositAddress";
import { DEPOSIT_ADDRESSES, isLive } from "@/lib/runtime";
import { api } from "@/lib/api";
import { useFairStore } from "@/stores/fairStore";
import { useWalletStore } from "@/stores/walletStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { playChime } from "@/lib/audio";

type DepositStatus = { kind: "waiting" } | { kind: "checking" } | { kind: "pending"; confirmations: number; total: number } | { kind: "credited"; amount: number; txHash?: string };

/** 충전 금액 프리셋 — 입금 예정 금액(USDT). 실제 반영액은 체인에서 확인된 금액이다 */
const PRESETS = [10, 50, 100, 500];
/** 입금 확인 폴링(live) */
const CHECK_INTERVAL_MS = 5_000;
const CHECK_MAX_ROUNDS = 36;

/**
 * USDT 입금 탭.
 *   네트워크 [TRC-20 · 수수료 0원 추천] [BEP-20] [ERC-20] → 플랫폼 전용 입금 주소 + QR + [📋 주소 복사]
 *   → 충전 금액 프리셋 [+10][+50][+100][+500] + 직접 입력 → [⚡ 입금 전송 완료 (자동 잔고 확인)]
 * 주소는 운영자가 통제하는 지갑(env NEXT_PUBLIC_DEPOSIT_*) 또는 API 발급분만 보여준다. 잔고는 체인에서 확인된 입금만 올린다 —
 * 클라이언트가 스스로 잔액을 만드는 경로는 없다.
 */
export function UsdtDepositTab({ onCredited }: { onCredited: (amountUsdt: number) => void }) {
  const t = useTranslations("deposit");
  const { fmt } = useCurrency();
  const [network, setNetwork] = useState<DepositNetwork>("TRC20");
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState<string>("50");
  const [status, setStatus] = useState<DepositStatus>({ kind: "waiting" });
  const credit = useWalletStore((s) => s.credit);
  const addTransaction = useWalletStore((s) => s.addTransaction);
  const userKey = useFairStore((s) => s.clientSeed) || "anon";

  const meta = useMemo(() => NETWORKS.find((n) => n.key === network)!, [network]);
  const envAddress = DEPOSIT_ADDRESSES[network];
  const [apiAddress, setApiAddress] = useState<string | null>(null);
  const [addrError, setAddrError] = useState(false);
  useEffect(() => {
    setApiAddress(null);
    setAddrError(false);
    setStatus({ kind: "waiting" });
    if (!isLive()) return;
    let alive = true;
    api
      .depositAddress(network, userKey)
      .then((r) => {
        if (!alive) return;
        if (looksLikeAddress(network, r.address)) setApiAddress(r.address);
        else setAddrError(true);
      })
      .catch(() => alive && setAddrError(true));
    return () => {
      alive = false;
    };
  }, [network, userKey]);
  const address = apiAddress ?? (looksLikeAddress(network, envAddress) ? envAddress : null);

  const copy = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* 클립보드 권한 없음 — 사용자가 직접 선택해 복사 */
    }
  }, [address]);

  const expected = Number(amount);
  const amountOk = Number.isFinite(expected) && expected >= MIN_DEPOSIT_USDT;

  // [⚡ 입금 전송 완료] — 체인 확인을 시작한다. live: API 폴링 → confirmed 면 그 금액을 반영. 백엔드가 없으면 확인 대기 상태로 남긴다.
  const confirm = useCallback(async () => {
    if (!address) return;
    setStatus({ kind: "checking" });
    await new Promise((r) => setTimeout(r, 1400));
    if (!isLive()) {
      setStatus({ kind: "pending", confirmations: 0, total: meta.confirmations });
      return;
    }
    for (let i = 0; i < CHECK_MAX_ROUNDS; i++) {
      try {
        const r = await api.depositCheck({ network, address, userKey, expectedUsdt: amountOk ? expected : undefined });
        if (r.status === "confirmed" && r.amountUsdt && r.amountUsdt > 0) {
          credit(r.amountUsdt, "crypto");
          addTransaction({ type: "deposit_usdt", amountUsdt: r.amountUsdt, ref: `${network}:${r.txHash ?? "confirmed"}`, txHash: r.txHash });
          if (!useSettingsStore.getState().muted) playChime();
          setStatus({ kind: "credited", amount: r.amountUsdt, txHash: r.txHash });
          onCredited(r.amountUsdt);
          return;
        }
        setStatus({ kind: "pending", confirmations: r.confirmations, total: meta.confirmations });
      } catch {
        setStatus({ kind: "pending", confirmations: 0, total: meta.confirmations });
      }
      await new Promise((r) => setTimeout(r, CHECK_INTERVAL_MS));
    }
  }, [address, network, userKey, expected, amountOk, meta.confirmations, credit, addTransaction, onCredited]);

  const busy = status.kind === "checking";

  return (
    <div className="grid gap-5 md:grid-cols-5">
      {/* ── 좌: 네트워크 + 주소 + 금액 ── */}
      <div className="grid gap-4 md:col-span-3">
        <fieldset>
          <legend className="caption-luxury">{t("network")}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {NETWORKS.map((n) => {
              const active = n.key === network;
              return (
                <label
                  key={n.key}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-lg p-3 transition-colors",
                    active ? "border-metallic-gold bg-gold-champagne/5" : "border-metallic-subtle bg-obsidian hover:bg-elevation",
                  )}
                >
                  <input type="radio" name="network" value={n.key} checked={active} onChange={() => setNetwork(n.key)} className="mt-1 accent-gold-champagne" />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-white">{n.token}</span>
                    <span className="block text-xs text-muted">{n.chain}</span>
                    {n.recommended && <span className="mt-1 inline-block text-[10px] font-semibold text-gold-champagne">{t("recommended")}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div>
          <div className="caption-luxury">{t("address")}</div>
          {address ? (
            <div className="border-metallic-subtle mt-2 flex items-center gap-2 rounded-lg bg-obsidian p-3">
              <code className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed text-secondary">{address}</code>
              <button
                type="button"
                onClick={copy}
                className={cn("flex h-9 flex-none items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-bold transition-colors", copied ? "bg-gold-champagne text-obsidian" : "bg-crimson text-white hover:bg-red-600")}
              >
                {copied ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Copy className="h-3.5 w-3.5" strokeWidth={2.2} />}
                {copied ? t("copied") : `📋 ${t("copy")}`}
              </button>
            </div>
          ) : (
            <div className="mt-2 flex items-start gap-2 rounded-md border border-hairline bg-obsidian p-3 text-[11px] leading-relaxed text-secondary">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 flex-none text-gold-champagne" strokeWidth={2.2} />
              <span className="break-keep">{isLive() ? (addrError ? t("addressError") : t("addressIssuing")) : t("addressPending")}</span>
            </div>
          )}
        </div>

        {/* 충전 금액 프리셋 + 직접 입력 */}
        <div>
          <div className="caption-luxury">{t("amountTitle")}</div>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {PRESETS.map((p) => {
              const on = Number(amount) === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(String(p))}
                  className={cn("h-9 rounded-md text-xs font-bold transition-colors", on ? "border-metallic-gold bg-gold-champagne/15 text-gold-champagne" : "border-metallic-subtle bg-obsidian text-secondary hover:text-white")}
                >
                  +{p} USDT
                </button>
              );
            })}
          </div>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            inputMode="decimal"
            aria-label={t("amount")}
            placeholder={t("amount")}
            className="mt-2 w-full rounded-md border border-hairline bg-obsidian px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-gold-champagne"
          />
          {!amountOk && amount !== "" && <p className="mt-1 text-[11px] text-crimson">{t("belowMin", { min: fmt(MIN_DEPOSIT_USDT) })}</p>}
        </div>

        {/* 안내 */}
        <div className="border-metallic-subtle rounded-lg bg-obsidian p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-gold-champagne" strokeWidth={2.2} />
            <span className="caption-luxury !text-gold-champagne">{t("guideTitle")}</span>
          </div>
          <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-secondary">
            <li>· {t("guideMin", { min: fmt(MIN_DEPOSIT_USDT) })}</li>
            <li>· {t("guideConfirm", { n: meta.confirmations })} ({t("guideTime", { sec: meta.blockSeconds, min: Math.ceil((meta.confirmations * meta.blockSeconds) / 60) })})</li>
            <li>· {t("guideToken")}</li>
          </ul>
        </div>
      </div>

      {/* ── 우: QR + 확인 상태 + 확인 버튼 ── */}
      <div className="grid content-start gap-4 md:col-span-2">
        {address && (
          <div className="border-metallic-gold mx-auto flex w-fit flex-col items-center rounded-lg bg-white p-4 md:mx-0 md:w-full">
            <QRCodeSVG value={address} size={168} level="M" bgColor="#ffffff" fgColor="#0B0B0B" includeMargin={false} />
            <span className="mt-2 text-center text-[10px] text-neutral-600">{t("qrHint")}</span>
          </div>
        )}

        <div className="border-metallic-subtle rounded-lg bg-obsidian p-3">
          <div className="flex items-center justify-between">
            <span className="caption-luxury">{t("status")}</span>
            <span className={cn("flex items-center gap-1.5 text-[11px] font-semibold", status.kind === "credited" ? "text-gold-champagne" : status.kind === "waiting" ? "text-muted" : "text-white")}>
              <Radio className={cn("h-3 w-3", status.kind !== "waiting" && status.kind !== "credited" && "animate-pulse")} strokeWidth={2.2} />
              {status.kind === "waiting" && t("waiting")}
              {status.kind === "checking" && t("checking")}
              {status.kind === "pending" && t("confirming", { n: status.confirmations, total: status.total })}
              {status.kind === "credited" && t("credited")}
            </span>
          </div>
          <div className="mt-2 flex gap-0.5">
            {Array.from({ length: meta.confirmations }, (_, i) => {
              const done = status.kind === "credited" || (status.kind === "pending" && i < status.confirmations);
              return <span key={i} className={cn("h-1.5 flex-1 rounded-sm transition-colors duration-200", done ? "bg-gold-champagne" : "bg-white/10")} />;
            })}
          </div>
          {status.kind === "credited" && <div className="mt-2 text-right font-mono text-xs tabular-nums text-white">{fmt(status.amount)}</div>}
          <p className="mt-2 break-keep text-[10px] leading-relaxed text-faint">{status.kind === "pending" ? t("pendingNote") : t("watching")}</p>
        </div>

        <button
          type="button"
          onClick={confirm}
          disabled={!address || busy || status.kind === "credited"}
          className="flex h-12 items-center justify-center gap-2 rounded-lg bg-gold-champagne text-sm font-bold text-obsidian shadow-[0_0_24px_rgba(230,202,101,0.35)] transition-colors hover:bg-gold-metallic disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />}
          {busy ? t("checking") : t("confirmSent")}
        </button>
      </div>
    </div>
  );
}

export default UsdtDepositTab;
