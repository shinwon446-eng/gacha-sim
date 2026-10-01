"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Check, Gem, ShieldCheck, Sparkles } from "lucide-react";
import { BOXES, BOX_BY_SLUG, dropTable } from "@/lib/products";
import { calculateRollResult, determineItem, hashServerSeed } from "@/lib/fairness";
import { useProductText } from "@/lib/useProductText";
import { Money } from "@/components/ui/Money";
import { useInventoryStore, type OwnedItem } from "@/stores/inventoryStore";

/**
 * 홈 "검증 대시보드" — 확인된 개봉 기록 · 즉시 페이백 누적 · 최근 개봉.
 *
 * 세 값은 **같은 개봉 기록 배열(inventoryStore.items) 하나**에서 함께 계산한다.
 * 예전에는 세 값이 각자 다른 공식(시간 버킷마다 오르는 기준값 + 임의 상품 순환)으로 만들어져 서로 맞을 수 없었고,
 * 실제로 일어나지 않은 개봉을 기록처럼 보여 줬다(CLAUDE.md 부록 C 위반). 이제
 *   · 개봉 건수 = 기록 수
 *   · 검증 완료 = 그 기록 중 해시 · 추첨 번호 · 당첨 상품 재계산이 모두 일치한 수
 *   · 페이백 누적 = 그 기록 중 페이백(SOLD)된 건의 실제 환급액 합
 *   · 최근 개봉 = 그 기록의 최신순
 * 이라서 개봉·페이백이 일어나는 순간 세 칸이 같은 렌더에서 함께 바뀐다.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

/** 한 기록에서 세 값을 모두 만든다 — 단일 출처 */
export function proofMetrics(items: readonly OwnedItem[]) {
  return {
    publishedOdds: BOXES.reduce((total, box) => total + box.items.length, 0),
    openings: items.length,
    paybackUsdt: round2(items.reduce((total, item) => total + (item.status === "SOLD" ? Math.max(0, item.soldForUsdt ?? 0) : 0), 0)),
  };
}

/** 최근 개봉 — 같은 기록의 최신순 */
export function latestOpenings(items: readonly OwnedItem[], limit: number): OwnedItem[] {
  return [...items].sort((a, b) => Date.parse(b.acquiredAt) - Date.parse(a.acquiredAt)).slice(0, Math.max(1, Math.trunc(limit)));
}

/** 기록 하나를 공정성 검증기와 같은 방식으로 다시 계산한다: 해시 → 추첨 번호 → 당첨 상품 */
export async function verifyOpening(item: OwnedItem): Promise<boolean> {
  try {
    const { serverSeed, serverSeedHash, clientSeed, nonce, roll } = item.fair ?? ({} as OwnedItem["fair"]);
    if (!serverSeed || !serverSeedHash || !clientSeed) return false;
    if ((await hashServerSeed(serverSeed)) !== serverSeedHash) return false;
    const result = await calculateRollResult(serverSeed, clientSeed, nonce);
    if (result.roll !== roll) return false;
    const box = BOX_BY_SLUG[item.boxSlug];
    const table = item.fair.dropTable ?? (box ? dropTable(box).map(({ id, dropRate }) => ({ id, dropRate })) : []);
    if (table.length === 0) return false;
    return determineItem(roll, table).id === item.itemId;
  } catch {
    return false;
  }
}

const copy = {
  ko: { odds: "공개 확률 항목", openings: "확인된 개봉 기록", payback: "즉시 페이백 누적", latest: "최근 개봉", verified: "검증 완료", total: "건", rows: "항목", updated: "마지막 기록", empty: "아직 개봉 기록이 없습니다. 첫 박스를 열면 이곳에 바로 기록됩니다.", paid: "페이백" },
  en: { odds: "Published odds", openings: "Verified openings", payback: "Instant payback total", latest: "Recent openings", verified: "Verified", total: "openings", rows: "items", updated: "Last record", empty: "No openings yet. Your first box shows up here the moment you open it.", paid: "Payback" },
  zh: { odds: "公开概率项目", openings: "已验证开箱记录", payback: "即时返现累计", latest: "最近开箱", verified: "已验证", total: "次", rows: "项目", updated: "最新记录", empty: "还没有开箱记录。打开第一个盲盒后会立即显示在这里。", paid: "返现" },
} as const;

export function ProofFeed({ limit = 4 }: { limit?: number }) {
  const locale = useLocale();
  const c = copy[locale as keyof typeof copy] ?? copy.ko;
  const { boxTitle, itemName } = useProductText();
  const hydrated = useInventoryStore((s) => s.hydrated);
  const stored = useInventoryStore((s) => s.items);
  const items = useMemo(() => (hydrated ? stored : []), [hydrated, stored]);

  // 검증 결과 캐시 — 기록 id 기준. 새 기록만 계산하고, 사라진 기록은 집계에서 자연히 빠진다.
  const [verifiedIds, setVerifiedIds] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const pending = items.filter((item) => !(item.id in verifiedIds));
    if (pending.length === 0) return;
    let alive = true;
    void Promise.all(pending.map(async (item) => [item.id, await verifyOpening(item)] as const)).then((rows) => {
      if (alive) setVerifiedIds((prev) => ({ ...prev, ...Object.fromEntries(rows) }));
    });
    return () => {
      alive = false;
    };
  }, [items, verifiedIds]);

  const metrics = useMemo(() => proofMetrics(items), [items]);
  const verified = useMemo(() => items.filter((item) => verifiedIds[item.id]).length, [items, verifiedIds]);
  const latest = useMemo(() => latestOpenings(items, limit), [items, limit]);
  const time = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="grid gap-4" aria-live="polite">
      <ul className="grid gap-3 sm:grid-cols-3">
        <li className="proof-live-card rounded-xl border border-hairline bg-surface p-5">
          <Gem className="h-5 w-5 text-gold-champagne" />
          <p className="mt-3 text-xs text-muted">{c.odds}</p>
          <p className="proof-live-value mt-1 text-2xl font-semibold text-white">
            {metrics.publishedOdds.toLocaleString()} <span className="text-sm text-muted">{c.rows}</span>
          </p>
        </li>
        <li key={`openings-${metrics.openings}-${verified}`} className="proof-live-card rounded-xl border border-hairline bg-surface p-5">
          <ShieldCheck className="h-5 w-5 text-gold-champagne" />
          <p className="mt-3 text-xs text-muted">{c.openings}</p>
          <p className="proof-live-value mt-1 text-2xl font-semibold text-white">
            {verified.toLocaleString()} <span className="text-sm text-muted">/ {metrics.openings.toLocaleString()} {c.total}</span>
          </p>
        </li>
        <li key={`payback-${metrics.paybackUsdt}`} className="proof-live-card rounded-xl border border-hairline bg-surface p-5">
          <Sparkles className="h-5 w-5 text-gold-champagne" />
          <p className="mt-3 text-xs text-muted">{c.payback}</p>
          <div className="proof-live-value mt-1">
            <Money value={metrics.paybackUsdt} size="lg" />
          </div>
        </li>
      </ul>

      <div className="rounded-xl border border-hairline bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-white">{c.latest}</h3>
          {latest[0] && (
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <span className="proof-live-dot" aria-hidden="true" />
              {c.updated} · {time(latest[0].acquiredAt)}
            </p>
          )}
        </div>
        {latest.length === 0 ? (
          <p className="mt-4 break-keep text-sm leading-6 text-muted">{c.empty}</p>
        ) : (
          <ul className="mt-3 divide-y divide-hairline">
            {latest.map((row) => {
              const box = BOX_BY_SLUG[row.boxSlug];
              const product = box?.items.find((item) => item.id === row.itemId);
              const ok = verifiedIds[row.id];
              return (
                <li key={row.id} className="proof-feed-row flex items-center justify-between gap-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-white">{product ? itemName(product) : row.itemId}</p>
                    <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-xs text-muted">
                      <span className="truncate">
                        {box ? boxTitle(box) : row.boxSlug} · {time(row.acquiredAt)}
                      </span>
                      {ok && (
                        <span className="inline-flex flex-none items-center gap-0.5 text-emerald-300">
                          <Check className="h-3 w-3" aria-hidden />
                          {c.verified}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex-none text-right">
                    <Money value={row.valueUsdt} size="sm" />
                    {row.status === "SOLD" && row.soldForUsdt != null && (
                      <p className="mt-0.5 text-[11px] text-gold-champagne">
                        {c.paid} <Money value={row.soldForUsdt} size="xs" sign="+" numberClassName="text-gold-champagne" />
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
