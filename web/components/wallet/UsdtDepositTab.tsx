"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, AlertTriangle, Radio } from "lucide-react";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { MIN_DEPOSIT_USDT, NETWORKS, looksLikeAddress, resolveDepositAddress, validDepositReceipt, type DepositNetwork } from "@/lib/depositAddress";
import { DEPOSIT_ADDRESSES } from "@/lib/runtime";
import { api } from "@/lib/api";
import { recordConfirmedUsdtDeposit } from "@/lib/depositCredit";
import { useAuthStore } from "@/stores/authStore";
import { LoginRequired } from "@/components/auth/LoginRequired";
import { useSettingsStore } from "@/stores/settingsStore";
import { playChime } from "@/lib/audio";

type DepositStatus = { kind: "waiting" } | { kind: "checking" } | { kind: "pending"; confirmations: number; total: number } | { kind: "credited"; amount: number; txHash?: string };

/** 입금 확인 주기 */
const CHECK_INTERVAL_MS = 5_000;

/**
 * USDT 입금 탭.
 *   네트워크 선택 → 플랫폼 전용 입금 주소 + QR + 주소 복사 → 자동 온체인 확인.
 * 배포 주소와 계정별 발급 주소를 지원하고 같은 입금 영수증을 중복 정산하지 않는다.
 */
export function UsdtDepositTab({ onCredited }: { onCredited: (amountUsdt: number) => void }) {
  const t = useTranslations("deposit");
  const { fmt } = useCurrency();
  const [network, setNetwork] = useState<DepositNetwork>("TRC20");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<DepositStatus>({ kind: "waiting" });
  const user = useAuthStore(s => s.user);
  const onCreditedRef = useRef(onCredited);
  useEffect(() => { onCreditedRef.current = onCredited; }, [onCredited]);
  const userKey = user?.id ?? "";

  const meta = useMemo(() => NETWORKS.find((n) => n.key === network)!, [network]);

  const envAddress = DEPOSIT_ADDRESSES[network];
  const [issued, setIssued] = useState<{ address: string; network: DepositNetwork; accountId: string } | null>(null);
  const [addrError, setAddrError] = useState(false);
  useEffect(() => {
    setIssued(null);
    setCopied(false);
    setAddrError(false);
    setStatus({ kind: "waiting" });
    if (!userKey || resolveDepositAddress(network, envAddress)) return;
    let alive = true;
    api
      .depositAddress(network, userKey)
      .then((r) => {
        if (!alive) return;
        if (r.network === network && looksLikeAddress(network, r.address)) setIssued({ address: r.address, network, accountId: userKey });
        else setAddrError(true);
      })
      .catch(() => alive && setAddrError(true));
    return () => {
      alive = false;
    };
  }, [network, userKey, envAddress]);
  const address = resolveDepositAddress(network, envAddress, issued?.network === network && issued.accountId === userKey ? issued.address : null);
  const depositReady = !!address;

  const copy = useCallback(async () => {
    if (!depositReady || !address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* 클립보드 권한 없음, 사용자가 직접 선택해 복사 */
    }
  }, [address, depositReady]);

  // 주소가 준비되면 금액 신청이나 버튼 클릭 없이 확인을 계속한다.
  useEffect(() => {
    if (!depositReady || !address || !userKey) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    setStatus({ kind: "checking" });
    const check = async () => {
      try {
        const result = await api.depositCheck({ network, address, userKey });
        if (!active || useAuthStore.getState().user?.id !== userKey) return;
        if (result.status === "confirmed" && result.amountUsdt && result.txHash && result.confirmations >= meta.confirmations
          && validDepositReceipt({ network, address, amountUsdt: result.amountUsdt, txHash: result.txHash, confirmations: result.confirmations })) {
          const recorded = recordConfirmedUsdtDeposit({ accountId: userKey, address, network, amountUsdt: result.amountUsdt, txHash: result.txHash });
          if (recorded === "credited") {
            if (!useSettingsStore.getState().muted) playChime();
            onCreditedRef.current(result.amountUsdt);
          }
          if (recorded !== "invalid") setStatus({ kind: "credited", amount: result.amountUsdt, txHash: result.txHash });
        } else if (result.status === "pending") {
          setStatus({ kind: "pending", confirmations: result.confirmations, total: meta.confirmations });
        } else {
          setStatus({ kind: "waiting" });
        }
      } catch {
        if (active) setStatus({ kind: "checking" });
      } finally {
        if (active) timer = setTimeout(check, CHECK_INTERVAL_MS);
      }
    };
    void check();
    return () => { active = false; clearTimeout(timer); };
  }, [address, depositReady, network, userKey, meta.confirmations]);

  if (!user) return <LoginRequired />;

  return (
    <div className="grid gap-5 md:grid-cols-5">
      {/* ── 좌: 네트워크 + 주소 ── */}
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
                    {n.recommended && <span className="mt-1 inline-block text-xs font-semibold text-gold-champagne">{t("recommended")}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div>
          <div className="caption-luxury">{t("address")}</div>
          <div className="border-metallic-subtle mt-2 flex items-center gap-2 rounded-lg bg-obsidian p-3">
              <code className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed text-secondary">{depositReady ? address : t("checking")}</code>
              <button
                type="button"
                onClick={copy}
                aria-busy={!depositReady}
                className={cn("flex h-11 flex-none items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40", copied ? "bg-gold-champagne text-obsidian" : "bg-crimson text-white hover:bg-red-600")}
              >
                {copied ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Copy className="h-3.5 w-3.5" strokeWidth={2.2} />}
                {copied ? t("copied") : t("copy")}
              </button>
          </div>
          {addrError && <p className="mt-2 text-xs text-crimson">{t("addressError")}</p>}
        </div>

        {/* 안내 */}
        <div className="border-metallic-subtle rounded-lg bg-obsidian p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-gold-champagne" strokeWidth={2.2} />
            <span className="caption-luxury !text-gold-champagne">{t("guideTitle")}</span>
          </div>
          <ul className="mt-2 space-y-1 text-xs leading-relaxed text-secondary">
            <li className="font-semibold text-white">, {t("guideMin", { min: fmt(MIN_DEPOSIT_USDT) })}</li>
            <li>, {t("guideConfirm", { n: meta.confirmations })} ({t("guideTime", { sec: meta.blockSeconds, min: Math.ceil((meta.confirmations * meta.blockSeconds) / 60) })})</li>
            <li>, {t("guideToken")}</li>
          </ul>
        </div>
      </div>

      {/* ── 우: QR + 자동 확인 상태 ── */}
      <div className="grid content-start gap-4 md:col-span-2">
        {depositReady && address ? (
          <div className="border-metallic-gold mx-auto flex w-fit flex-col items-center rounded-lg bg-white p-4 md:mx-0 md:w-full">
            <QRCodeSVG value={address} size={168} level="M" bgColor="#ffffff" fgColor="#0B0B0B" includeMargin={false} />
            <span className="mt-2 text-center text-xs text-neutral-600">{t("qrHint")}</span>
          </div>
        ) : <div className="border-metallic-subtle mx-auto flex min-h-[200px] w-full flex-col items-center justify-center gap-2 rounded-lg bg-obsidian p-4 text-center text-xs text-muted"><Radio className="h-6 w-6 animate-pulse" aria-hidden="true" />{t("checking")}</div>}

        <div aria-live="polite" className="border-metallic-subtle rounded-lg bg-obsidian p-3">
          <div className="flex items-center justify-between">
            <span className="caption-luxury">{t("status")}</span>
            <span className={cn("flex items-center gap-1.5 text-xs font-semibold", status.kind === "credited" ? "text-gold-champagne" : status.kind === "waiting" ? "text-muted" : "text-white")}>
              <Radio className={cn("h-3 w-3", depositReady && status.kind !== "waiting" && status.kind !== "credited" && "animate-pulse")} strokeWidth={2.2} />
              {status.kind === "waiting" ? t("waiting") : status.kind === "checking" ? t("checking") : status.kind === "pending" ? t("confirming", { n: status.confirmations, total: status.total }) : t("credited")}
            </span>
          </div>
          {depositReady && <div className="mt-2 flex gap-0.5">
            {Array.from({ length: meta.confirmations }, (_, i) => {
              const done = status.kind === "credited" || (status.kind === "pending" && i < status.confirmations);
              return <span key={i} className={cn("h-1.5 flex-1 rounded-sm transition-colors duration-200", done ? "bg-gold-champagne" : "bg-white/10")} />;
            })}
          </div>}
          {depositReady && status.kind === "credited" && <div className="mt-2 text-right font-mono text-xs tabular-nums text-white">{fmt(status.amount)}</div>}
          {depositReady && <p className="mt-2 break-keep text-xs leading-relaxed text-faint">{status.kind === "pending" ? t("pendingNote") : t("watching")}</p>}
        </div>

      </div>
    </div>
  );
}

export default UsdtDepositTab;
