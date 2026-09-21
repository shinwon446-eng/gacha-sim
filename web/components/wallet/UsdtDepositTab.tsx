"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, AlertTriangle, ShieldAlert, Radio } from "lucide-react";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { MIN_DEPOSIT_USDT, NETWORKS, looksLikeAddress, type Network } from "@/lib/depositAddress";
import { isLive } from "@/lib/runtime";
import { api } from "@/lib/api";
import { useFairStore } from "@/stores/fairStore";

type DepositStatus = { kind: "waiting" } | { kind: "confirming"; n: number; total: number; amount: number } | { kind: "credited"; amount: number };

/**
 * USDT 입금 탭 (PROMPTS 4-1-2).
 *   네트워크 라디오(TRC-20 추천 / BEP-20) → 게이트웨이가 발급한 주소 + QR + 원클릭 복사 → 입금 안내 → 컨펌 인디케이터
 * 주소·컨펌·입금 반영은 전부 API 가 준 값으로만 그린다. 잔액을 임의로 만드는 경로는 없다.
 */
export function UsdtDepositTab(_props: { onCredited: (amountUsdt: number) => void }) {
  const t = useTranslations("deposit");
  const { fmt } = useCurrency();
  const [network, setNetwork] = useState<Network>("TRC20");
  const [copied, setCopied] = useState(false);
  const [status] = useState<DepositStatus>({ kind: "waiting" });
  // 유저 식별자 흉내 — 클라이언트 시드를 키로 쓰면 브라우저마다 다른 고정 주소가 나온다
  const userKey = useFairStore((s) => s.clientSeed) || "anon";

  const meta = useMemo(() => NETWORKS.find((n) => n.key === network)!, [network]);
  // 입금 주소는 게이트웨이(API)만 발급한다. 없으면 null — 형식만 맞는 가짜 주소를 보여주지 않는다.
  const [address, setAddress] = useState<string | null>(null);
  const [addrError, setAddrError] = useState(false);
  useEffect(() => {
    setAddress(null);
    setAddrError(false);
    if (!isLive()) return;
    let alive = true;
    api
      .depositAddress(network, userKey)
      .then((r) => {
        if (!alive) return;
        if (looksLikeAddress(network, r.address)) setAddress(r.address);
        else setAddrError(true);
      })
      .catch(() => alive && setAddrError(true));
    return () => {
      alive = false;
    };
  }, [network, userKey]);

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


  return (
    <div className="grid gap-5 md:grid-cols-5">
      {/* ── 좌: 네트워크 + 주소 + QR ── */}
      <div className="grid gap-4 md:col-span-3">
        <fieldset>
          <legend className="caption-luxury">{t("network")}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {NETWORKS.map((n) => {
              const active = n.key === network;
              return (
                <label
                  key={n.key}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors",
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
                className={cn("flex h-9 flex-none items-center gap-1.5 rounded-md px-3 text-xs font-bold transition-colors", copied ? "bg-gold-champagne text-obsidian" : "bg-crimson text-white hover:bg-red-600")}
              >
                {copied ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Copy className="h-3.5 w-3.5" strokeWidth={2.2} />}
                {copied ? t("copied") : t("copy")}
              </button>
            </div>
          ) : (
            <div className="mt-2 flex items-start gap-2 rounded-md border border-hairline bg-obsidian p-3 text-[11px] leading-relaxed text-secondary">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 flex-none text-gold-champagne" strokeWidth={2.2} />
              <span>{isLive() ? (addrError ? t("addressError") : t("addressIssuing")) : t("addressPending")}</span>
            </div>
          )}
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

      {/* ── 우: QR + 컨펌 상태 ── */}
      <div className="grid gap-4 md:col-span-2">
        {address && (
          <div className="border-metallic-gold flex flex-col items-center rounded-lg bg-white p-4">
            <QRCodeSVG value={address} size={168} level="M" bgColor="#ffffff" fgColor="#0B0B0B" includeMargin={false} />
            <span className="mt-2 text-center text-[10px] text-neutral-600">{t("qrHint")}</span>
          </div>
        )}

        {/* 컨펌 인디케이터 */}
        <div className="border-metallic-subtle rounded-lg bg-obsidian p-3">
          <div className="flex items-center justify-between">
            <span className="caption-luxury">{t("status")}</span>
            <span className={cn("flex items-center gap-1.5 text-[11px] font-semibold", status.kind === "credited" ? "text-gold-champagne" : status.kind === "confirming" ? "text-white" : "text-muted")}>
              <Radio className={cn("h-3 w-3", status.kind === "confirming" && "animate-pulse")} strokeWidth={2.2} />
              {status.kind === "waiting" && t("waiting")}
              {status.kind === "confirming" && t("confirming", { n: status.n, total: status.total })}
              {status.kind === "credited" && t("credited")}
            </span>
          </div>
          <div className="mt-2 flex gap-0.5">
            {Array.from({ length: meta.confirmations }, (_, i) => {
              const done = status.kind === "credited" || (status.kind === "confirming" && i < status.n);
              return <span key={i} className={cn("h-1.5 flex-1 rounded-sm transition-colors duration-200", done ? "bg-gold-champagne" : "bg-white/10")} />;
            })}
          </div>
          {status.kind !== "waiting" && (
            <div className="mt-2 text-right font-mono text-xs tabular-nums text-white">{fmt(status.amount)}</div>
          )}
          <p className="mt-2 text-[10px] leading-relaxed text-faint">{t("watching")}</p>
        </div>

      </div>
    </div>
  );
}

export default UsdtDepositTab;
