"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Crown, Gem, Truck, Flame } from "lucide-react";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { useProductText } from "@/lib/useProductText";
import { BOX_BY_SLUG, formatRate } from "@/lib/products";
import { formatMultiple, tierOf } from "@/lib/tiers";
import { buildLineupDrops, buildLocalDrops, localHandle, type LiveDrop } from "@/lib/liveDrops";
import { isLive } from "@/lib/runtime";
import { api } from "@/lib/api";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useWalletStore } from "@/stores/walletStore";
import { useFairStore } from "@/stores/fairStore";

/** 상대 시간 — 초/분/시간 */
function useRelative(locale: string) {
  const rtf = useMemo(() => new Intl.RelativeTimeFormat(locale === "zh" ? "zh-CN" : locale, { numeric: "always" }), [locale]);
  return (iso: string, now: number) => {
    const s = Math.max(1, Math.round((now - new Date(iso).getTime()) / 1000));
    if (s < 60) return rtf.format(-s, "second");
    if (s < 3600) return rtf.format(-Math.round(s / 60), "minute");
    if (s < 86400) return rtf.format(-Math.round(s / 3600), "hour");
    return rtf.format(-Math.round(s / 86400), "day");
  };
}

/** 20px 썸네일 — 이미지가 없거나 깨지면 자리만 남긴다 */
function Thumb({ src, alt, accent }: { src: string | null; alt: string; accent?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <span className="relative h-5 w-5 flex-none overflow-hidden rounded-sm bg-elevation" style={accent ? { boxShadow: `inset 0 0 0 1px ${accent}66` } : undefined}>
      {src && !failed && <img src={src} alt={alt} loading="lazy" decoding="async" className="h-full w-full object-cover" onError={() => setFailed(true)} />}
    </span>
  );
}

/**
 * 최상단 라이브 드랍 티커 (CLAUDE.md §4-1) — 헤더 바로 아래, 히어로 위.
 * live 모드: API 스트림(30초 폴링). preview 모드: 이 기기의 실제 당첨·환전·출고 기록. 기록이 없으면 공개 잭팟 라인업(사실)을 흘린다 — 타인 활동을 지어내지 않는다.
 * 항목: [LIVE] 뱃지 · 마스킹 핸들 · 박스/상품 썸네일 · "박스 ➔ 상품 획득" · 경과 시간 뱃지. ROYAL 당첨은 골드 네온 테두리.
 * 목록을 두 번 렌더해 좌로 무한 루프(.ticker-track). 호버·터치 중에는 멈춘다. 시각은 마운트 후에만 렌더한다.
 */
export function LiveTicker({ className }: { className?: string }) {
  const t = useTranslations("ticker");
  const tr = useTranslations();
  const { boxTitle, itemName } = useProductText();
  const locale = useLocale();
  const { fmt } = useCurrency();
  const rel = useRelative(locale);
  const items = useInventoryStore((s) => s.items);
  const transactions = useWalletStore((s) => s.transactions);
  const clientSeed = useFairStore((s) => s.clientSeed);
  const [now, setNow] = useState<number | null>(null);
  const [remote, setRemote] = useState<LiveDrop[] | null>(null);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isLive()) return;
    let alive = true;
    const pull = () => api.liveFeed().then((d) => alive && setRemote(d)).catch(() => {});
    pull();
    const id = setInterval(pull, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const drops = useMemo(() => {
    const local = remote ?? buildLocalDrops(items, transactions, localHandle(clientSeed));
    return local.length > 0 ? local : buildLineupDrops();
  }, [remote, items, transactions, clientSeed]);
  if (now === null) return null;

  const render = (d: LiveDrop, dup: boolean) => {
    const box = d.boxSlug ? BOX_BY_SLUG[d.boxSlug] : undefined;
    const item = box?.items.find((i) => i.id === d.itemId);
    const tier = box && item ? tierOf(item.value, box.price) : undefined;
    const royal = tier?.key === "royal" && d.kind !== "cashout";
    const Icon = d.kind === "win" ? Crown : d.kind === "cashout" ? Gem : d.kind === "lineup" ? Flame : Truck;
    return (
      <li
        key={`${d.id}${dup ? "-b" : ""}`}
        aria-hidden={dup || undefined}
        className={cn(
          "mx-1.5 flex flex-none items-center gap-2 whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] leading-none",
          royal ? "border border-gold-champagne/60 bg-gold-champagne/[0.06] shadow-[0_0_10px_rgba(230,202,101,0.35)]" : "border border-transparent",
        )}
      >
        {d.kind !== "lineup" && (
          <span className="flex flex-none items-center gap-1 rounded-sm bg-crimson/15 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-crimson">
            <span aria-hidden className="h-1 w-1 animate-pulse rounded-full bg-crimson" />
            {t("live")}
          </span>
        )}
        <Icon className={cn("h-3 w-3 flex-none", royal ? "text-gold-champagne" : d.kind === "cashout" ? "text-tier-prestige" : "text-secondary")} strokeWidth={2.4} />
        {d.user && <span className="font-mono text-secondary">{d.user}</span>}
        {(d.kind === "win" || d.kind === "lineup" || d.kind === "ship") && item && box && (
          <span className="flex flex-none items-center gap-1">
            {d.kind !== "ship" && <Thumb src={box.imageUrl} alt={boxTitle(box)} />}
            <Thumb src={item.imageUrl} alt={itemName(item)} accent={tier?.accent} />
          </span>
        )}
        <span className={cn(royal ? "text-white" : "text-muted")}>
          {d.kind === "lineup" && item && box && t("lineup", { box: boxTitle(box), item: itemName(item), mult: tr("tiers.multiple", { n: formatMultiple(item.value / box.price) }), rate: formatRate(item.dropRate) })}
          {d.kind === "win" && item && box && t("win", { box: boxTitle(box), item: itemName(item) })}
          {d.kind === "cashout" && t("cashout", { amount: fmt(d.amountUsdt ?? 0) })}
          {d.kind === "ship" && item && t("ship", { item: itemName(item) })}
        </span>
        {tier && (d.kind === "win" || d.kind === "lineup") && (
          <span className="rounded-sm px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: tier.accent, background: `${tier.accent}1f` }}>
            {tier.label}
          </span>
        )}
        {d.kind !== "lineup" && <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] text-faint">{rel(d.at, now)}</span>}
      </li>
    );
  };

  // 항목이 적으면 루프가 비어 보인다 — 최소 8칸이 되도록 반복
  const list = drops.length >= 8 ? drops : Array.from({ length: Math.ceil(8 / drops.length) }, () => drops).flat().slice(0, 8);

  return (
    <div className={cn("relative flex items-center overflow-hidden border-b border-hairline bg-obsidian/90 px-[4%] py-2 backdrop-blur-md", className)} aria-label={t("label")}>
      <span className="z-10 flex flex-none items-center gap-1.5 pr-3 text-[10px] font-bold uppercase tracking-[0.18em] text-crimson">
        <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-crimson" />
        {t("live")}
      </span>
      <div
        className="ticker-viewport relative min-w-0 flex-1 touch-pan-y overflow-hidden"
        onTouchStart={() => setHeld(true)}
        onTouchEnd={() => setHeld(false)}
        onTouchCancel={() => setHeld(false)}
      >
        <ul className={cn("ticker-track flex w-max items-center", held && "[animation-play-state:paused]")}>
          {list.map((d, i) => render({ ...d, id: `${d.id}_${i}` }, false))}
          {list.map((d, i) => render({ ...d, id: `${d.id}_${i}` }, true))}
        </ul>
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-obsidian to-transparent" />
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-obsidian to-transparent" />
      </div>
    </div>
  );
}

export default LiveTicker;
