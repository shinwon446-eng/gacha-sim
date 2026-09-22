"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/format";
import { Link } from "@/i18n/navigation";
import { useProductText } from "@/lib/useProductText";
import { BOXES, BOX_BY_SLUG, dropTable, type ProductBox, type ProductItem } from "@/lib/products";
import { boxTopTier, formatMultiple, glow, tierOf, topMultiple } from "@/lib/tiers";
import { imageFor } from "@/lib/productImages";
import { BOX_COUNT, CATEGORY_COUNT } from "@/lib/aboutStats";
import { Money } from "@/components/ui/Money";

/**
 * Section 1-b — 4대 럭셔리 라인업 쇼케이스.
 *
 * 스톡 그래픽이 아니라 `lib/productImages.ts` 의 **실제 자산 키**를 그대로 바인딩한다.
 * 키가 박스 슬러그면 박스로, 상품 id 면 그 상품이 든 박스를 찾아 함께 보여 준다 — 값(가격 · 최고 배수)은 전부 카탈로그 실측.
 */

const GROUPS = [
  { key: "catWatch", icon: "👑", assets: ["vault-submariner", "vault-omega"] },
  { key: "catTech", icon: "⚡", assets: ["starter-macbook", "flg-iphone", "sp-ps5pro"] },
  { key: "catFashion", icon: "👜", assets: ["vault-handbag"] },
  { key: "catSuper", icon: "🚗", assets: ["jackpot-cybertruck", "vault-gold"] },
] as const;

interface Tile {
  assetId: string;
  box: ProductBox;
  item?: ProductItem;
  accent: string;
}

/** 자산 키 → 박스(또는 상품 + 그 상품이 든 박스). 어느 쪽도 못 찾으면 버린다. */
function resolve(assetId: string): Tile | null {
  const asBox = BOX_BY_SLUG[assetId];
  if (asBox) return { assetId, box: asBox, accent: boxTopTier(asBox).accent };
  for (const box of BOXES) {
    const item = box.items.find((i) => i.id === assetId);
    if (item) return { assetId, box, item, accent: tierOf(item.value, box.price).accent };
  }
  return null;
}

function ShowcaseCard({ tile, index }: { tile: Tile; index: number }) {
  const { boxTitle, itemName } = useProductText();
  const t = useTranslations("card");
  const img = imageFor(tile.assetId);
  const label = tile.item ? itemName(tile.item) : boxTitle(tile.box);
  const top = tile.item ? tile.item.value / tile.box.price : topMultiple(tile.box);

  return (
    <motion.li
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: Math.min(index, 3) * 0.07 }}
      className="group relative"
    >
      <Link
        href={`/#category-${tile.box.category}`}
        className="border-metallic-subtle block overflow-hidden rounded-2xl bg-surface transition-colors hover:border-gold-champagne/60"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-obsidian">
          {img.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img.src}
              alt={label}
              draggable={false}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-surface" />
          )}
          {/* 3D 스포트라이트 — 위에서 떨어지는 핀조명 + 바닥 그림자 */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: `radial-gradient(64% 52% at 50% 26%, ${glow(tile.accent, 0.26)} 0%, transparent 62%, rgba(0,0,0,0.6) 100%)` }}
          />
          <span aria-hidden className="pedestal-shadow pointer-events-none absolute inset-x-[20%] bottom-[6%] h-6" />
        </div>
        <div className="px-3 py-2.5">
          <div className="truncate text-[13px] font-bold text-white">{label}</div>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="flex items-baseline gap-1.5">
              <span className="caption-luxury">{t("perOpen")}</span>
              <Money value={tile.box.price} size="xs" />
            </span>
            <span className="whitespace-nowrap font-display text-sm font-bold tabular-nums" style={{ color: tile.accent }}>
              {t("upTo", { n: formatMultiple(top) })}
            </span>
          </div>
        </div>
      </Link>
    </motion.li>
  );
}

export function LineupShowcase({ className }: { className?: string }) {
  const t = useTranslations("about");
  const groups = useMemo(
    () => GROUPS.map((g) => ({ ...g, tiles: g.assets.map(resolve).filter((x): x is Tile => !!x) })).filter((g) => g.tiles.length > 0),
    [],
  );

  return (
    <section className={cn("mx-auto w-full max-w-6xl px-6 py-20 md:py-28", className)}>
      <h2 className="break-keep font-display text-2xl font-black tracking-[-0.02em] text-white md:text-4xl">{t("lineupTitle")}</h2>
      <p className="mt-2 break-keep text-sm text-secondary">{t("lineupSub", { boxes: BOX_COUNT, categories: CATEGORY_COUNT })}</p>

      <div className="mt-8 grid gap-8">
        {groups.map((g) => (
          <div key={g.key}>
            <div className="mb-3 flex items-center gap-2">
              <span aria-hidden className="text-base">
                {g.icon}
              </span>
              <h3 className="break-keep text-[13px] font-extrabold tracking-tight text-gold-champagne md:text-sm">{t(g.key)}</h3>
              <span className="h-px flex-1 bg-gradient-to-r from-gold-champagne/30 to-transparent" />
            </div>
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {g.tiles.map((tile, i) => (
                <ShowcaseCard key={tile.assetId} tile={tile} index={i} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export default LineupShowcase;
