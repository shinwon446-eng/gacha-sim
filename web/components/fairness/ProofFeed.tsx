"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Gem, ExternalLink, Landmark, Copy, Check, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/format";
import { Link } from "@/i18n/navigation";
import { useProductText } from "@/lib/useProductText";
import { BOX_BY_SLUG } from "@/lib/products";
import { EXPLORERS, explorerTxUrl, explorerAddressUrl } from "@/lib/withdrawal";
import { buildProofFeed, type PayoutKind } from "@/lib/proofFeed";
import { localHandle } from "@/lib/liveDrops";
import { isLive, RESERVE_ADDRESS, RESERVE_NETWORK } from "@/lib/runtime";
import { api } from "@/lib/api";
import { useWalletStore } from "@/stores/walletStore";
import { useFairStore } from "@/stores/fairStore";
import { Money } from "@/components/ui/Money";

function useRelative(locale: string) {
  const rtf = useMemo(() => new Intl.RelativeTimeFormat(locale === "zh" ? "zh-CN" : locale, { numeric: "auto" }), [locale]);
  return (iso: string, now: number) => {
    const diffMin = Math.round((new Date(iso).getTime(), now) / 60_000);
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
/** Actual store transactions combined with validated server records. */
export function ProofFeed({ limit, showReserve = true, className }: ProofFeedProps) {
  const t = useTranslations("proof");
  const locale = useLocale();
  const { boxTitle } = useProductText();
  const rel = useRelative(locale);
  const hydrated = useWalletStore((s) => s.hydrated);
  const transactions = useWalletStore((s) => s.transactions);
  const clientSeed = useFairStore((s) => s.clientSeed);
  const [now, setNow] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [feedError, setFeedError] = useState(false);
  const [remote, setRemote] = useState<unknown>([]);
  const [reserve, setReserve] = useState<{ address: string; network: "TRC20" | "BEP20"; balanceUsdt?: number } | null>(RESERVE_ADDRESS ? { address: RESERVE_ADDRESS, network: RESERVE_NETWORK } : null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isLive()) return;
    let alive = true;
    const pull = () => api.proofFeed().then((d) => { if (alive) { setRemote(d.payouts); setFeedError(false); } }).catch(() => { if (alive) setFeedError(true); });
    pull();
    api.reserve().then((r) => alive && setReserve(r)).catch(() => {});
    const id = setInterval(pull, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const handle = localHandle(clientSeed);
  const payouts = useMemo(() => buildProofFeed(hydrated ? transactions : [], handle, remote, limit ?? 99), [remote, transactions, hydrated, handle, limit]);
  const ko = locale === "ko";
  const zh = locale === "zh";
  const label = (kind: PayoutKind) => ({
    deposit_usdt: ko ? "USDT 입금" : zh ? "USDT充值" : "USDT deposit",
    deposit_card: ko ? "카드 결제" : zh ? "银行卡支付" : "Card payment",
    open: ko ? "박스 개봉" : zh ? "开箱" : "Box opening",
    sellback: ko ? "페이백" : zh ? "返现" : "Sellback",
    withdraw: ko ? "출금" : zh ? "提现" : "Withdrawal",
    bonus: ko ? "보너스" : zh ? "奖励" : "Bonus",
    shipping_refund: ko ? "배송비 환불" : zh ? "运费退款" : "Shipping refund",
    order_refund: ko ? "주문 환불" : zh ? "订单退款" : "Order refund",
  })[kind];
  const statusLabel = (status?: string) => ({
    PENDING: ko ? "처리 대기" : zh ? "待处理" : "Pending",
    PENDING_ADMIN_REVIEW: ko ? "검토 대기" : zh ? "待审核" : "Awaiting review",
    PENDING_72H_HOLD: ko ? "72시간 대기" : zh ? "等待72小时" : "72-hour hold",
    BROADCASTING: ko ? "전송 중" : zh ? "发送中" : "Broadcasting",
    COMPLETED: ko ? "완료" : zh ? "已完成" : "Completed",
    CANCELLED: ko ? "취소됨" : zh ? "已取消" : "Cancelled",
    FAILED: ko ? "실패" : zh ? "失败" : "Failed",
  } as Record<string, string>)[status ?? ""] ?? (ko ? "거래 기록" : zh ? "交易记录" : "Recorded");

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
    <section className={cn("grid gap-4", className)} aria-label={ko ? "실제 거래 기록" : zh ? "真实交易记录" : "Actual transaction records"}>
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
            {typeof reserve.balanceUsdt === "number" && Number.isFinite(reserve.balanceUsdt) && (
              <div className="ml-auto text-right">
                <div className="caption-luxury">{t("reserveBalance")}</div>
                <Money value={reserve.balanceUsdt} size="lg" numberClassName="text-gold-gradient" className="mt-1" />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="border-metallic-subtle overflow-hidden rounded-xl bg-surface">
        <div className="flex items-center gap-2 border-b border-hairline p-4 text-sm font-semibold text-secondary">
          <Gem className="h-4 w-4 text-gold-champagne" aria-hidden />
          {ko ? "실제 거래 , 개봉 기록" : zh ? "真实交易与开箱记录" : "Actual transactions and openings"}
        </div>
        {feedError && <p role="status" className="px-4 pt-4 text-xs text-muted">{ko ? "서버 기록을 새로 불러오지 못했습니다. 마지막으로 확인된 기록을 표시합니다." : zh ? "无法刷新服务器记录，正在显示最近确认的记录。" : "Server records could not be refreshed. Showing the last available records."}</p>}
        {payouts.length === 0 ? <Empty text={ko ? "아직 실제 거래 기록이 없습니다." : zh ? "暂无真实交易记录。" : "No transactions have been recorded yet."} cta={t("emptyCta")} /> : (
          <ul className="divide-y divide-hairline">
            {payouts.map(p => {
              const box = p.boxSlug ? BOX_BY_SLUG[p.boxSlug] : undefined;
              return <li key={p.kind + ":" + p.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 px-4 py-4">
                <span className="font-mono text-xs text-secondary">{p.user}</span>
                <span className="min-w-0 text-xs text-muted">
                  <span className="mr-1.5 rounded-sm bg-white/10 px-1.5 py-0.5 text-xs font-bold text-secondary">{p.kind === "sellback" && p.ref === "auto_cashback_30d" ? (ko ? "30일 자동 캐시백" : zh ? "30天自动返现" : "30-day automatic cashback") : label(p.kind)}</span>
                  {box ? boxTitle(box) : p.network ? "USDT " + (p.network === "TRC20" ? "TRC-20" : "BEP-20") : ""}
                </span>
                <Money value={p.amountUsdt} size="sm" numberClassName="text-white" className="justify-self-end" />
                <div className="col-span-3 flex flex-wrap items-center justify-between gap-2">
                  <time dateTime={p.at} className="text-xs text-faint">{now === null ? "" : rel(p.at, now)}</time>
                  <span className="ml-auto text-xs text-secondary">{statusLabel(p.status)}</span>
                  {p.network && p.txHash && <a href={explorerTxUrl(p.network, p.txHash)} target="_blank" rel="noopener noreferrer" className={linkCls}>
                    {t("viewOnExplorer", { explorer: EXPLORERS[p.network].name })}<ExternalLink className="h-3 w-3" />
                  </a>}
                </div>
              </li>;
            })}
          </ul>
        )}
      </div>
    </section>
  );
}


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
