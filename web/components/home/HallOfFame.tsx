"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Trophy, Rocket } from "lucide-react";
import { cn } from "@/lib/format";
import { useProductText } from "@/lib/useProductText";
import { BOXES, BOX_BY_SLUG, dropTable, type ProductBox, type ProductItem } from "@/lib/products";
import { formatMultiple, glow, tierOf } from "@/lib/tiers";
import { ProductArt } from "@/components/box/ProductArt";
import { Money } from "@/components/ui/Money";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useFairStore } from "@/stores/fairStore";
import { localHandle } from "@/lib/liveDrops";
import {
  MIN_RANK_MULTIPLE,
  WEEKLY_PRIZE_POOL_USDT,
  formatCountdown,
  multipleOf,
  myRank,
  openSlots,
  rankRows,
  seasonWindow,
  withinSeason,
  type RankEntry,
} from "@/lib/ranking";

const MEDALS = ["👑", "🥈", "🥉", "🏅", "🏅"];

/** 순위별 최고 배수 도전 목표 — 공석 줄에 보여 줄 실제 라인업 수치 */
function challengeMultiple(): number {
  return Math.max(...BOXES.map((b) => (dropTable(b)[0]?.value ?? 0) / b.price));
}

/**
 * 🏆 주간 명예의 전당 랭킹전 (2026-09-23 운영자 지시).
 *
 * 매주 UTC 월요일 00:00 에 초기화되는 잭팟 **배수** 랭킹전. 상위 5위에 상금 풀을 순차 지급한다.
 * 상금·마감·진입 조건은 운영자가 실제로 집행하는 규칙이라 그대로 적는다.
 *
 * 랭킹에 오르는 줄은 **실제 기록만** 쓴다 — live 모드는 API 가 준 마스킹 랭킹, 백엔드가 없으면 이 기기의 실제 당첨.
 * 비어 있는 순위는 지어낸 당첨자로 메우지 않고 **공석**으로 열어 두고, 그 자리에 걸린 상금과 도전 목표 배수를 보여 준다.
 * 바닥 캐시백이 상위권을 도배하지 않도록 10배 하한을 둔다.
 */
export function HallOfFame({ onPick, className }: { onPick: (box: ProductBox) => void; className?: string }) {
  const t = useTranslations("hall");
  const { boxTitle, itemName } = useProductText();
  const items = useInventoryStore((s) => s.items);
  const clientSeed = useFairStore((s) => s.clientSeed);

  // 카운트다운은 마운트 후에만 흐른다 — 서버 렌더와 값이 달라지지 않게(하이드레이션 안전)
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { rows, slots, best, rank } = useMemo(() => {
    const season = seasonWindow(now ?? Date.now());
    const handle = localHandle(clientSeed);
    const entries: RankEntry[] = items
      .filter((o) => BOX_BY_SLUG[o.boxSlug])
      .map((o) => ({
        key: o.id,
        who: handle,
        boxSlug: o.boxSlug,
        itemId: o.itemId,
        valueUsdt: o.valueUsdt,
        price: BOX_BY_SLUG[o.boxSlug].price,
        at: o.acquiredAt,
        mine: true,
      }));
    const seasonal = withinSeason(entries, season);
    const ranked = rankRows(seasonal);
    const myBest = seasonal.reduce((m, e) => Math.max(m, multipleOf(e)), 0);
    return { rows: ranked, slots: openSlots(ranked.length), best: myBest, rank: myRank(ranked, myBest) };
  }, [items, clientSeed, now]);

  const remaining = now === null ? null : seasonWindow(now).endsAt - now;
  const goal = useMemo(() => challengeMultiple(), []);

  const pick = (slug: string) => {
    const box = BOX_BY_SLUG[slug];
    if (box) onPick(box);
  };
  const pickTopJackpot = () => {
    const box = [...BOXES].sort((a, b) => (dropTable(b)[0]?.value ?? 0) / b.price - (dropTable(a)[0]?.value ?? 0) / a.price)[0];
    if (box) onPick(box);
  };

  return (
    <section className={cn("px-4 sm:px-[4%]", className)} aria-label={t("title")}>
      {/* 헤더 — 타이틀 · 총상금 · 시즌 타이머 */}
      <div className="mb-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h2 className="flex items-center gap-1.5 break-keep text-[15px] font-extrabold tracking-tight text-white sm:text-[17px]">
            <Trophy className="h-4 w-4 text-gold-champagne" strokeWidth={2.4} />
            {t("title")}
          </h2>
          <span className="border-metallic-gold whitespace-nowrap rounded-full bg-obsidian/70 px-2 py-0.5 text-[10px] font-bold text-gold-champagne">
            {t("pool", { amount: WEEKLY_PRIZE_POOL_USDT.toLocaleString("en-US") })}
          </span>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 break-keep text-[11px] font-semibold text-faint">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-crimson" />
          {t("deadline")}
          <span className="whitespace-nowrap font-bold tabular-nums text-crimson">{remaining === null ? "—" : formatCountdown(remaining)}</span>
          <span className="text-faint">· {t("payout")}</span>
        </p>
      </div>

      <ol className="grid gap-1.5">
        {rows.map((r) => {
          const box = BOX_BY_SLUG[r.boxSlug];
          const item: ProductItem | undefined = box?.items.find((i) => i.id === r.itemId);
          const accent = tierOf(r.valueUsdt, r.price).accent;
          return (
            <li key={r.key}>
              <button
                type="button"
                onClick={() => pick(r.boxSlug)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border bg-surface px-3 py-2 text-left transition-colors hover:border-gold-champagne/60",
                  r.rank === 1 ? "border-gold-champagne/50" : "border-hairline",
                )}
                style={r.rank === 1 ? { boxShadow: `0 0 26px ${glow("#E6CA65", 0.14)}` } : undefined}
              >
                <span className="flex w-6 flex-none flex-col items-center leading-none">
                  <span className="text-[13px]">{MEDALS[r.rank - 1]}</span>
                  <span className="mt-0.5 text-[9px] font-extrabold tabular-nums text-faint">{r.rank}</span>
                </span>
                <span className="relative h-10 w-10 flex-none overflow-hidden rounded-md bg-obsidian" style={{ boxShadow: `inset 0 0 0 1px ${glow(accent, 0.45)}` }}>
                  {item && <ProductArt image={item.image} alt={itemName(item)} accent={accent} glowStrength={0.22} fallbackSize="sm" kind={item.kind} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-bold text-white">{item ? itemName(item) : r.itemId}</span>
                  <span className="block truncate text-[10px] text-faint">
                    {r.who} · {box ? boxTitle(box) : r.boxSlug}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] font-bold text-gold-champagne">{t("prize", { amount: r.prizeUsdt.toLocaleString("en-US") })}</span>
                </span>
                <span className="flex flex-none flex-col items-end">
                  <Money value={r.valueUsdt} size="xs" numberClassName="text-gold-gradient" />
                  <span className="whitespace-nowrap text-[10px] font-bold tabular-nums" style={{ color: accent }}>
                    ×{formatMultiple(multipleOf(r))}
                  </span>
                </span>
              </button>
            </li>
          );
        })}

        {/* 공석 — 가짜 당첨자로 채우지 않는다 */}
        {slots.map((s) => (
          <li key={`slot-${s.rank}`}>
            <button
              type="button"
              onClick={pickTopJackpot}
              className="flex w-full items-center gap-3 rounded-lg border border-dashed border-white/15 bg-surface/50 px-3 py-2 text-left transition-colors hover:border-gold-champagne/50"
            >
              <span className="flex w-6 flex-none flex-col items-center leading-none opacity-40">
                <span className="text-[13px] grayscale">{MEDALS[s.rank - 1]}</span>
                <span className="mt-0.5 text-[9px] font-extrabold tabular-nums text-faint">{s.rank}</span>
              </span>
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-md border border-dashed border-white/15 bg-obsidian text-[15px] text-faint">?</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-bold text-secondary">{t("openSlot")}</span>
                <span className="block truncate text-[10px] text-faint">{t("entryRule", { n: MIN_RANK_MULTIPLE })}</span>
                <span className="mt-0.5 block truncate text-[10px] font-bold text-gold-champagne/80">{t("prize", { amount: s.prizeUsdt.toLocaleString("en-US") })}</span>
              </span>
              <span className="whitespace-nowrap text-[10px] font-bold tabular-nums text-faint">{t("goal", { n: formatMultiple(goal) })}</span>
            </button>
          </li>
        ))}
      </ol>

      {/* 내 순위 고정 바 */}
      <div className="border-metallic-gold mt-2.5 flex flex-wrap items-center gap-2 rounded-lg bg-obsidian/70 px-3 py-2">
        <span className="min-w-0 flex-1 break-keep text-[11px] font-semibold text-secondary">
          {rank === null ? (
            t("myNone")
          ) : (
            <>
              <span className="text-gold-champagne">{rank <= rows.length ? t("myRank", { rank }) : t("myOutside")}</span>{" "}
              <span className="tabular-nums text-faint">{t("myBest", { n: formatMultiple(best) })}</span>
            </>
          )}
        </span>
        <button
          type="button"
          onClick={pickTopJackpot}
          className="flex h-9 flex-none items-center gap-1.5 whitespace-nowrap rounded-sm bg-gradient-to-r from-gold-metallic to-gold-champagne px-3 text-[12px] font-bold text-obsidian transition-transform hover:scale-[1.03]"
        >
          <Rocket className="h-3.5 w-3.5" strokeWidth={2.4} />
          {t("cta")}
        </button>
      </div>

      {/* 집계 범위를 숨기지 않는다 */}
      <p className="mt-1.5 break-keep text-[10px] leading-relaxed text-faint">{t("scopeNote")}</p>
    </section>
  );
}

export default HallOfFame;
