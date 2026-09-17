"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Gem, Package, ExternalLink, Landmark, Copy, Check } from "lucide-react";
import { cn } from "@/lib/format";
import { useProductText } from "@/lib/useProductText";
import { BOX_BY_SLUG } from "@/lib/products";
import { EXPLORERS, explorerTxUrl } from "@/lib/withdrawal";
import { trackingUrl } from "@/lib/carriers";
import { RESERVE, buildPayoutFeed, buildShipmentFeed } from "@/lib/proofFeed";
import { Money } from "@/components/ui/Money";

type Tab = "payouts" | "shipments";
type Loc = "ko" | "en" | "zh";

/** 상대 시간 — "3분 전" 류. Intl.RelativeTimeFormat 으로 로케일별 자연어 */
function useRelative(locale: string) {
  const rtf = useMemo(() => new Intl.RelativeTimeFormat(locale === "zh" ? "zh-CN" : locale, { numeric: "auto" }), [locale]);
  return (iso: string, now: number) => {
    const diffMin = Math.round((new Date(iso).getTime() - now) / 60_000);
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
    return rtf.format(Math.round(diffMin / 60), "hour");
  };
}

export interface ProofFeedProps {
  /** 홈 요약용 — 각 탭 n 행만 */
  limit?: number;
  showReserve?: boolean;
  className?: string;
}

/**
 * 실지급 & 실배송 라이브 인증 피드 (CLAUDE.md §5-B, PROMPTS 3-2).
 *   탭 1 USDT 실지급: 마스킹 유저 · 금액 · 박스 · 시각 · [TronScan/BscScan 조회 ↗]
 *   탭 2 실물 출고: 마스킹 수령인·지역 · 상품 · 택배사 · [운송장 추적 ↗]
 *   + 지급 준비금 배너(§5-B-3). 데이터는 lib/proofFeed 모의값 — "데모 데이터" 상시 표기.
 */
export function ProofFeed({ limit, showReserve = true, className }: ProofFeedProps) {
  const t = useTranslations("proof");
  const locale = useLocale() as Loc;
  const { boxTitle, itemName } = useProductText();
  const rel = useRelative(locale);
  const [tab, setTab] = useState<Tab>("payouts");
  // 시각은 마운트 후에만 — 정적 프리렌더 HTML 과 클라이언트의 "n분 전"이 달라 하이드레이션이 깨지는 것을 막는다
  const [now, setNow] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // 상대 시간 갱신 — 피드가 "살아있게" 보이도록 30초마다
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const base = useMemo(() => (now === null ? 0 : now - (now % 60_000)), [now]);
  const payouts = useMemo(() => buildPayoutFeed(base).slice(0, limit ?? 99), [base, limit]);
  const shipments = useMemo(() => buildShipmentFeed(base).slice(0, limit ?? 99), [base, limit]);

  const copyReserve = async () => {
    try {
      await navigator.clipboard.writeText(RESERVE.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* 클립보드 권한 없음 */
    }
  };

  return (
    <section className={cn("grid gap-4", className)} aria-label={t("title")}>
      {/* 지급 준비금 */}
      {showReserve && (
        <div className="border-metallic-gold relative overflow-hidden rounded-xl bg-obsidian p-4 md:p-5">
          <span aria-hidden className="pedestal-glow pointer-events-none absolute inset-0" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-gold-champagne/10 text-gold-champagne">
                <Landmark className="h-5 w-5" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <div className="caption-luxury !text-gold-champagne">{t("reserveEyebrow")}</div>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-secondary">{t("reserveBody", { min: RESERVE.minUsdt.toLocaleString("en-US") })}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="text-faint">{t("reserveWallet")}</span>
                  <code className="max-w-[14rem] truncate font-mono text-secondary md:max-w-none" title={RESERVE.address}>
                    {RESERVE.address}
                  </code>
                  <button type="button" onClick={copyReserve} aria-label={t("copyAddress")} className="glass-dark flex h-7 w-7 items-center justify-center rounded-md text-gold-champagne hover:border-gold-champagne">
                    {copied ? <Check className="h-3 w-3" strokeWidth={2.6} /> : <Copy className="h-3 w-3" strokeWidth={2.2} />}
                  </button>
                  <a href={RESERVE.explorerUrl(RESERVE.address)} target="_blank" rel="noopener noreferrer" className="border-gold-gradient flex h-7 items-center gap-1 whitespace-nowrap rounded-md px-2 text-[10px] font-bold text-gold-champagne hover:bg-gold-champagne/10">
                    {t("viewOnExplorer", { explorer: EXPLORERS[RESERVE.network].name })}
                    <ExternalLink className="h-3 w-3" strokeWidth={2.4} />
                  </a>
                </div>
              </div>
            </div>
            <div className="ml-auto text-right">
              <div className="caption-luxury">{t("reserveBalance")}</div>
              <Money value={RESERVE.balanceUsdt} size="lg" numberClassName="text-gold-gradient" className="mt-1" />
            </div>
          </div>
        </div>
      )}

      {/* 피드 */}
      <div className="border-metallic-subtle overflow-hidden rounded-xl bg-surface">
        <div className="flex items-center gap-1 border-b border-hairline px-2 pt-2" role="tablist">
          {(["payouts", "shipments"] as Tab[]).map((k) => {
            const active = tab === k;
            const Icon = k === "payouts" ? Gem : Package;
            return (
              <button key={k} type="button" role="tab" aria-selected={active} onClick={() => setTab(k)} className={cn("relative flex h-10 items-center gap-2 rounded-t-md px-3 text-xs font-bold transition-colors", active ? "text-white" : "text-muted hover:text-white")}>
                <Icon className={cn("h-3.5 w-3.5", active ? "text-gold-champagne" : "text-faint")} strokeWidth={2.2} />
                {t(`tab.${k}`)}
                {active && <motion.span layoutId="proof-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gold-champagne shadow-[0_0_8px_rgba(230,202,101,0.7)]" />}
              </button>
            );
          })}
          <span className="ml-auto flex items-center gap-1.5 pr-2 text-[10px] font-semibold text-faint">
            <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-crimson" />
            {t("live")}
          </span>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {tab === "payouts" ? (
            <motion.ul key="payouts" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="divide-y divide-hairline">
              {payouts.map((p) => {
                const box = BOX_BY_SLUG[p.boxSlug];
                return (
                  <li key={p.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-3 md:grid-cols-[7rem_1fr_auto_auto] md:gap-x-4">
                    <span className="font-mono text-[11px] text-secondary">{p.user}</span>
                    <span className="min-w-0 truncate text-xs text-muted">
                      <span className={cn("mr-1.5 rounded-sm px-1.5 py-0.5 text-[10px] font-bold", p.kind === "withdraw" ? "bg-gold-champagne/15 text-gold-champagne" : "bg-white/10 text-secondary")}>{t(`kind.${p.kind}`)}</span>
                      {box ? boxTitle(box) : p.boxSlug}
                    </span>
                    <Money value={p.amountUsdt} size="sm" numberClassName="text-white" className="justify-self-end" />
                    <div className="col-span-3 flex items-center justify-between gap-2 md:col-span-1 md:justify-end">
                      <span className="text-[10px] text-faint">{now === null ? "" : rel(p.at, now)}</span>
                      <a href={explorerTxUrl(p.network, p.txHash)} target="_blank" rel="noopener noreferrer" className="border-gold-gradient flex h-7 items-center gap-1 whitespace-nowrap rounded-md px-2 text-[10px] font-bold text-gold-champagne hover:bg-gold-champagne/10">
                        {t("viewOnExplorer", { explorer: EXPLORERS[p.network].name })}
                        <ExternalLink className="h-3 w-3" strokeWidth={2.4} />
                      </a>
                    </div>
                  </li>
                );
              })}
            </motion.ul>
          ) : (
            <motion.ul key="shipments" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="divide-y divide-hairline">
              {shipments.map((s) => {
                const box = BOX_BY_SLUG[s.boxSlug];
                const item = box?.items.find((i) => i.id === s.itemId);
                return (
                  <li key={s.id} className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 px-4 py-3 md:grid-cols-[9rem_1fr_auto_auto] md:gap-x-4">
                    <span className="min-w-0 truncate text-xs">
                      <span className="font-semibold text-white">{s.recipient[locale]}</span>
                      <span className="ml-1.5 text-[10px] text-faint">{s.region[locale]}</span>
                    </span>
                    <span className="min-w-0 truncate text-xs text-secondary">{item ? itemName(item) : s.itemId}</span>
                    <span className="text-[10px] text-muted md:justify-self-end">{t(`carriers.${s.carrier}`)}</span>
                    <div className="col-span-2 flex items-center justify-between gap-2 md:col-span-1 md:justify-end">
                      <span className="text-[10px] text-faint">{now === null ? "" : rel(s.at, now)}</span>
                      <a href={trackingUrl(s.carrier, s.trackingNumber)} target="_blank" rel="noopener noreferrer" className="border-gold-gradient flex h-7 items-center gap-1 whitespace-nowrap rounded-md px-2 text-[10px] font-bold text-gold-champagne hover:bg-gold-champagne/10">
                        {t("track")}
                        <ExternalLink className="h-3 w-3" strokeWidth={2.4} />
                      </a>
                    </div>
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>
        <div className="border-t border-hairline px-4 py-1.5 text-[10px] text-faint">{t("demoNote")}</div>
      </div>
    </section>
  );
}

export default ProofFeed;
