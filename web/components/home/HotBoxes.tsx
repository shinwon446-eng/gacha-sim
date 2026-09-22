"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Flame } from "lucide-react";
import { cn } from "@/lib/format";
import { useProductText } from "@/lib/useProductText";
import { trending, floorRatio, type ProductBox } from "@/lib/products";
import { boxTopTier, formatMultiple, glow, topMultiple } from "@/lib/tiers";
import { ProductArt } from "@/components/box/ProductArt";
import { Money } from "@/components/ui/Money";

/**
 * 🔥 실시간 핫 잭팟 박스 TOP 3.
 *
 * 열기 지수(HOT °C)와 순위는 **상품 카탈로그의 실제 인기도 값**(`popularity`, `trendingRank`)에서 계산한다.
 * "오늘 N개 오픈" 처럼 우리가 알 수 없는 수치는 쓰지 않는다 — live 모드에서 API 가 실개봉 수를 주면 그 자리에 들어간다.
 */
export function HotBoxes({ onPick, className }: { onPick: (box: ProductBox) => void; className?: string }) {
  const t = useTranslations("hot");
  const { boxTitle, itemName } = useProductText();

  const top = useMemo(() => {
    const list = trending(3);
    const max = Math.max(...list.map((b) => b.popularity), 1);
    return list.map((box) => {
      const share = box.popularity / max; // 0~1
      return {
        box,
        heat: +(90 + share * 9.9).toFixed(1), // 90.0 ~ 99.9 °C
        share,
        tier: boxTopTier(box),
        mult: topMultiple(box),
        grail: box.items[0],
        floorPct: Math.round(floorRatio(box) * 100),
      };
    });
  }, []);

  return (
    <section className={cn("px-4 sm:px-[4%]", className)} aria-label={t("title")}>
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="break-keep text-[15px] font-extrabold tracking-tight text-white sm:text-[17px]">{t("title")}</h2>
        <span className="text-[11px] font-semibold text-faint">{t("subtitle")}</span>
      </div>

      <ul className="grid gap-2.5 sm:grid-cols-3">
        {top.map(({ box, heat, share, tier, mult, grail, floorPct }, i) => (
          <li key={box.id}>
            <button
              type="button"
              onClick={() => onPick(box)}
              className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-hairline bg-surface p-3 text-left transition-colors hover:border-gold-champagne/60"
              style={{ boxShadow: i === 0 ? `0 0 28px ${glow(tier.accent, 0.16)}` : undefined }}
            >
              <span className="relative h-16 w-16 flex-none overflow-hidden rounded-lg bg-obsidian">
                <ProductArt image={grail.image} alt={itemName(grail)} accent={tier.accent} glowStrength={0.28} fallbackSize="sm" kind={grail.kind} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="flex items-center gap-1 whitespace-nowrap rounded-sm border border-crimson/60 bg-crimson/15 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                    <Flame className="h-3 w-3 text-crimson" strokeWidth={2.6} />
                    {t("heat", { deg: heat.toFixed(1) })}
                  </span>
                  <span className="whitespace-nowrap text-[10px] font-bold text-faint">#{i + 1}</span>
                </span>
                <span className="mt-1 block truncate text-[13px] font-bold text-white">{boxTitle(box)}</span>
                <span className="mt-0.5 flex items-baseline gap-2">
                  <Money value={box.price} size="xs" />
                  <span className="whitespace-nowrap text-[11px] font-bold tabular-nums" style={{ color: tier.accent }}>
                    {t("upTo", { n: formatMultiple(mult) })}
                  </span>
                  <span className="whitespace-nowrap text-[10px] text-faint">{t("floor", { pct: floorPct })}</span>
                </span>
                {/* 인기 지수 게이지 — 카탈로그 popularity 상대값 */}
                <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.span
                    className="block h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${tier.accent}, #E50914)` }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${Math.round(share * 100)}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  />
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default HotBoxes;
