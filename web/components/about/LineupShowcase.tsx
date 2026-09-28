"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/format";
import { Link } from "@/i18n/navigation";
import { useProductText } from "@/lib/useProductText";
import { BOX_BY_SLUG, dropTable, type ProductBox, type ProductItem } from "@/lib/products";
import { boxTopTier, glow } from "@/lib/tiers";
import { imageFor } from "@/lib/productImages";
import { BOX_COUNT, CATEGORY_COUNT } from "@/lib/aboutStats";
import { Money } from "@/components/ui/Money";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Section 2 — 4대 럭셔리 라인업 쇼케이스.
 *
 * 메인의 작은 카드를 복사하지 않는다. 카테고리마다 **대표 박스 하나를 큼직한 배너 카드**로 세우고,
 * 숫자는 단위가 잘리지 않는 두 가지만 보여 준다 — **1회 오픈 가격**과 **최고 당첨 상품의 시중 정가**.
 * ('최고 780' 처럼 단위 없는 배수가 찍히던 것을 걷어냈다 — 2026-09-28)
 *
 * 값은 전부 카탈로그 실측이고 이미지는 `lib/productImages.ts` 의 실제 자산이다.
 */
const SHOWCASE = [
  { key: "catWatch", slug: "vault-submariner" },
  { key: "catTech", slug: "starter-macbook" },
  { key: "catFashion", slug: "vault-handbag" },
  { key: "catSuper", slug: "jackpot-cybertruck" },
] as const;

interface Card {
  key: string;
  box: ProductBox;
  grail: ProductItem;
  accent: string;
}

export function LineupShowcase({ className }: { className?: string }) {
  const t = useTranslations("about");
  const { boxTitle, itemName } = useProductText();

  const cards = useMemo(
    () =>
      SHOWCASE.map(({ key, slug }): Card | null => {
        const box = BOX_BY_SLUG[slug];
        const grail = box ? dropTable(box)[0] : undefined;
        return box && grail ? { key, box, grail, accent: boxTopTier(box).accent } : null;
      }).filter((x): x is Card => !!x),
    [],
  );

  return (
    <section className={cn("mx-auto w-full max-w-6xl px-6 py-20 md:py-28", className)}>
      <h2 className="break-keep font-display text-2xl font-black tracking-[-0.02em] text-white md:text-4xl">{t("lineupTitle")}</h2>
      <p className="mt-2 break-keep text-sm text-secondary">{t("lineupSub", { boxes: BOX_COUNT, categories: CATEGORY_COUNT })}</p>

      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {cards.map((c, i) => {
          const img = imageFor(c.grail.id).src ? imageFor(c.grail.id) : imageFor(c.box.slug);
          return (
            <motion.li
              key={c.key}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, ease: EASE, delay: Math.min(i, 3) * 0.08 }}
            >
              <Link
                href={`/#category-${c.box.category}`}
                className="group block overflow-hidden rounded-2xl border border-hairline bg-surface transition-colors hover:border-gold-champagne/60"
                style={{ boxShadow: `0 0 40px ${glow(c.accent, 0.1)}` }}
              >
                {/* 큼직한 비주얼 — 3D 스포트라이트 */}
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-obsidian">
                  {img.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img.src}
                      alt={itemName(c.grail)}
                      draggable={false}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                    />
                  ) : (
                    <div className="h-full w-full bg-surface" />
                  )}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{ background: `radial-gradient(68% 56% at 50% 24%, ${glow(c.accent, 0.24)} 0%, transparent 60%, rgba(0,0,0,0.72) 100%)` }}
                  />
                  {/* 카테고리 라벨 */}
                  <span className="border-metallic-gold absolute left-4 top-4 rounded-full bg-obsidian/80 px-2.5 py-1 text-[10px] font-bold text-gold-champagne backdrop-blur-sm">
                    {t(c.key as "catWatch")}
                  </span>
                  {/* 대표 상품명 */}
                  <span className="absolute inset-x-4 bottom-3 truncate text-[15px] font-extrabold text-white md:text-lg" style={{ textShadow: "0 2px 14px rgba(0,0,0,0.9)" }}>
                    {itemName(c.grail)}
                  </span>
                </div>

                {/* 숫자 두 줄 — 단위가 반드시 붙는다 */}
                <div className="flex items-end justify-between gap-3 px-4 py-3.5">
                  <span className="min-w-0">
                    <span className="caption-luxury block">{t("lineupPrice")}</span>
                    <Money value={c.box.price} size="md" />
                    <span className="mt-0.5 block truncate text-[11px] text-faint">{boxTitle(c.box)}</span>
                  </span>
                  <span className="flex-none text-right">
                    <span className="caption-luxury block">{t("lineupTop")}</span>
                    <Money value={c.grail.value} size="md" numberClassName="text-gold-gradient" />
                  </span>
                </div>

                <span className="flex items-center justify-end gap-1 border-t border-hairline px-4 py-2 text-[11px] font-bold text-gold-champagne">
                  {t("ctaButton")}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.4} />
                </span>
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

export default LineupShowcase;
