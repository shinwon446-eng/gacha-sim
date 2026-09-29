"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Gem, Package, ExternalLink, Landmark, Copy, Check, Clock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/format";
import { Link } from "@/i18n/navigation";
import { useProductText } from "@/lib/useProductText";
import { BOX_BY_SLUG } from "@/lib/products";
import { EXPLORERS, explorerTxUrl, explorerAddressUrl } from "@/lib/withdrawal";
import { trackingUrl } from "@/lib/carriers";
import { buildLocalPayouts, buildLocalShipments, type PayoutProof, type ShipmentProof } from "@/lib/proofFeed";
import { localHandle } from "@/lib/liveDrops";
import { isLive, RESERVE_ADDRESS, RESERVE_NETWORK } from "@/lib/runtime";
import { api } from "@/lib/api";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useWalletStore } from "@/stores/walletStore";
import { useFairStore } from "@/stores/fairStore";
import { Money } from "@/components/ui/Money";

type Tab = "payouts" | "shipments";

function useRelative(locale: string) {
  const rtf = useMemo(() => new Intl.RelativeTimeFormat(locale === "zh" ? "zh-CN" : locale, { numeric: "auto" }), [locale]);
  return (iso: string, now: number) => {
    const diffMin = Math.round((new Date(iso).getTime() - now) / 60_000);
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
    if (Math.abs(diffMin) < 1440) return rtf.format(Math.round(diffMin / 60), "hour");
    return rtf.format(Math.round(diffMin / 1440), "day");
  };
}

export interface ProofFeedProps {
  limit?: number;
  showReserve?: boolean;
  className?: string;
}

/**
 * 실지급 & 실배송 인증 피드 (CLAUDE.md §6).
 *   탭 1 USDT 실지급: 유저 · 금액 · 상태 · [TronScan/BscScan ↗] (TxID 가 실제 발급된 건만)
 *   탭 2 실물 출고: 수령인 · 국가 · 상품 · 택배사 · [운송장 추적 ↗] (운송장이 발급된 건만)
 *   + 지급 준비금 배너 — NEXT_PUBLIC_RESERVE_ADDRESS 가 설정된 경우에만.
 * live 모드는 API 집계, preview 모드는 이 기기의 실제 기록. 지어낸 활동은 없다.
 */
export function ProofFeed({ limit, showReserve = true, className }: ProofFeedProps) {
  const t = useTranslations("proof");
  const tabsId = useId();
  const ti = useTranslations("inventory");
  const locale = useLocale();
  const { boxTitle, itemName } = useProductText();
  const rel = useRelative(locale);
  const items = useInventoryStore((s) => s.items);
  const transactions = useWalletStore((s) => s.transactions);
  const clientSeed = useFairStore((s) => s.clientSeed);
  const [tab, setTab] = useState<Tab>("payouts");
  const [now, setNow] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [remote, setRemote] = useState<{ payouts: PayoutProof[]; shipments: ShipmentProof[] } | null>(null);
  const [reserve, setReserve] = useState<{ address: string; network: "TRC20" | "BEP20"; balanceUsdt?: number } | null>(RESERVE_ADDRESS ? { address: RESERVE_ADDRESS, network: RESERVE_NETWORK } : null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isLive()) return;
    let alive = true;
    const pull = () => api.proofFeed().then((d) => alive && setRemote(d)).catch(() => {});
    pull();
    api.reserve().then((r) => alive && setReserve(r)).catch(() => {});
    const id = setInterval(pull, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const handle = localHandle(clientSeed);
  const payouts = useMemo(() => (remote?.payouts ?? buildLocalPayouts(transactions, handle)).slice(0, limit ?? 99), [remote, transactions, handle, limit]);
  const shipments = useMemo(() => (remote?.shipments ?? buildLocalShipments(items)).slice(0, limit ?? 99), [remote, items, limit]);

  const copyReserve = async () => {
    if (!reserve) return;
    try {
      await navigator.clipboard.writeText(reserve.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* 클립보드 권한 없음 */
    }
  };

  const linkCls = "border-gold-gradient flex min-h-10 items-center gap-1 whitespace-nowrap rounded-md px-2 text-xs font-bold text-gold-champagne hover:bg-gold-champagne/10";

  return (
    <section className={cn("grid gap-4", className)} aria-label={t("title")}>
      {showReserve && reserve && (
        <div className="border-metallic-gold relative overflow-hidden rounded-xl bg-obsidian p-4 md:p-5">
          <span aria-hidden className="pedestal-glow pointer-events-none absolute inset-0" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-gold-champagne/10 text-gold-champagne">
                <Landmark className="h-5 w-5" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <div className="caption-luxury !text-gold-champagne">{t("reserveEyebrow")}</div>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-secondary">{t("reserveBody")}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-faint">{t("reserveWallet")}</span>
                  <code className="max-w-[14rem] truncate font-mono text-secondary md:max-w-none" title={reserve.address}>
                    {reserve.address}
                  </code>
                  <button type="button" onClick={copyReserve} aria-label={t("copyAddress")} className="glass-dark flex h-7 w-7 items-center justify-center rounded-md text-gold-champagne hover:border-gold-champagne">
                    {copied ? <Check className="h-3 w-3" strokeWidth={2.6} /> : <Copy className="h-3 w-3" strokeWidth={2.2} />}
                  </button>
                  <a href={explorerAddressUrl(reserve.network, reserve.address)} target="_blank" rel="noopener noreferrer" className={linkCls}>
                    {t("viewOnExplorer", { explorer: EXPLORERS[reserve.network].name })}
                    <ExternalLink className="h-3 w-3" strokeWidth={2.4} />
                  </a>
                </div>
              </div>
            </div>
            {typeof reserve.balanceUsdt === "number" && (
              <div className="ml-auto text-right">
                <div className="caption-luxury">{t("reserveBalance")}</div>
                <Money value={reserve.balanceUsdt} size="lg" numberClassName="text-gold-gradient" className="mt-1" />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="border-metallic-subtle overflow-hidden rounded-xl bg-surface">
        <div className="flex flex-wrap items-center gap-1 border-b border-hairline px-2 pt-2" role="tablist" aria-label={t("title")}>
          {(["payouts", "shipments"] as Tab[]).map((k) => {
            const active = tab === k;
            const Icon = k === "payouts" ? Gem : Package;
            return (
              <button key={k} id={`${tabsId}-${k}`} type="button" role="tab" aria-selected={active} aria-controls={`${tabsId}-panel-${k}`} tabIndex={active ? 0 : -1} onClick={() => setTab(k)} onKeyDown={(event) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const next = event.key === "Home" ? "payouts" : event.key === "End" ? "shipments" : k === "payouts" ? "shipments" : "payouts";
                setTab(next);
                document.getElementById(`${tabsId}-${next}`)?.focus();
              }} className={cn("relative flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-t-md px-2.5 text-xs font-medium transition-colors sm:gap-2 sm:px-3", active ? "text-white" : "text-muted hover:text-white")}>
                <Icon className={cn("h-3.5 w-3.5", active ? "text-gold-champagne" : "text-faint")} strokeWidth={2.2} />
                {t(`tab.${k}`)}
                {active && <motion.span layoutId="proof-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gold-champagne shadow-[0_0_8px_rgba(230,202,101,0.7)]" />}
              </button>
            );
          })}
          {isLive() && <span className="ml-auto flex items-center gap-1.5 pr-2 text-xs font-semibold text-muted">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-gold-champagne" />
            {t("live")}
          </span>}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {tab === "payouts" ? (
            <motion.div key="payouts" id={`${tabsId}-panel-payouts`} role="tabpanel" aria-labelledby={`${tabsId}-payouts`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              {payouts.length === 0 ? (
                <Empty text={t("emptyPayouts")} cta={t("emptyCta")} />
              ) : (
                <ul className="divide-y divide-hairline">
                  {payouts.map((p) => {
                    const box = p.boxSlug ? BOX_BY_SLUG[p.boxSlug] : undefined;
                    return (
                      <li key={p.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 px-4 py-4">
                        <span className="font-mono text-xs text-secondary">{p.user}</span>
                        <span className="min-w-0 truncate text-xs text-muted">
                          <span className={cn("mr-1.5 rounded-sm px-1.5 py-0.5 text-xs font-bold", p.kind === "withdraw" ? "bg-gold-champagne/15 text-gold-champagne" : "bg-white/10 text-secondary")}>{t(`kind.${p.kind}`)}</span>
                          {box ? boxTitle(box) : p.network ? `USDT ${p.network === "TRC20" ? "TRC-20" : "BEP-20"}` : ""}
                        </span>
                        <Money value={p.amountUsdt} size="sm" numberClassName="text-white" className="justify-self-end" />
                        <div className="col-span-3 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs text-faint">{now === null ? "" : rel(p.at, now)}</span>
                          {p.network && p.txHash ? (
                            <a href={explorerTxUrl(p.network, p.txHash)} target="_blank" rel="noopener noreferrer" className={linkCls}>
                              {t("viewOnExplorer", { explorer: EXPLORERS[p.network].name })}
                              <ExternalLink className="h-3 w-3" strokeWidth={2.4} />
                            </a>
                          ) : p.kind === "withdraw" ? (
                            <span className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-secondary">
                              <Clock className="h-3 w-3" strokeWidth={2.4} />
                              {t("pendingTx")}
                            </span>
                          ) : (
                            <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-secondary">{t("settledInstant")}</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </motion.div>
          ) : (
            <motion.div key="shipments" id={`${tabsId}-panel-shipments`} role="tabpanel" aria-labelledby={`${tabsId}-shipments`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              {shipments.length === 0 ? (
                <Empty text={t("emptyShipments")} cta={t("emptyCta")} />
              ) : (
                <ul className="divide-y divide-hairline">
                  {shipments.map((s) => {
                    const box = BOX_BY_SLUG[s.boxSlug];
                    const item = box?.items.find((i) => i.id === s.itemId);
                    return (
                      <li key={s.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 px-4 py-4">
                        <span className="min-w-0 truncate text-xs">
                          <span className="font-semibold text-white">{s.recipient}</span>
                          <span className="ml-1.5 text-xs text-faint">{ti(`countries.${s.country}`)}</span>
                        </span>
                        <span className="min-w-0 truncate text-xs text-secondary">{item ? itemName(item) : s.itemId}</span>
                        <span className="text-xs text-muted md:justify-self-end">{s.carrier ? ti(`carriers.${s.carrier}`) : ti("status.SHIPPING_REQUESTED")}</span>
                        <div className="col-span-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs text-faint">{now === null ? "" : rel(s.at, now)}</span>
                          {s.carrier && s.trackingNumber ? (
                            <a href={trackingUrl(s.carrier, s.trackingNumber)} target="_blank" rel="noopener noreferrer" className={linkCls}>
                              {t("track")}
                              <ExternalLink className="h-3 w-3" strokeWidth={2.4} />
                            </a>
                          ) : (
                            <span className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-secondary">
                              <Clock className="h-3 w-3" strokeWidth={2.4} />
                              {ti("trackingPending")}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

/**
 * 기록이 없을 때 — "없습니다" 한 줄로 비워 두지 않는다.
 * 지어낸 출금·출고를 채우는 대신, 지금 바로 확인 가능한 사실 3가지(검증 방식·환급률·수수료 정책)를 보여 준다.
 */
function Empty({ text, cta }: { text: string; cta: string }) {
  return (
    <div className="px-6 py-10 text-center">
      <ShieldCheck aria-hidden className="mx-auto h-7 w-7 text-gold-champagne" strokeWidth={1.4} />
      <p className="mt-4 break-keep text-sm leading-7 text-muted">{text}</p>
      <p className="mt-3 text-sm">
        <Link href="/" className="inline-flex min-h-11 items-center font-medium text-gold-champagne underline-offset-4 hover:underline">
          {cta}
        </Link>
      </p>
    </div>
  );
}

export default ProofFeed;
