"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Flame, Package } from "lucide-react";
import { cn } from "@/lib/format";
import { useProductText } from "@/lib/useProductText";
import { trending, type ProductBox } from "@/lib/products";
import { boxTopTier, formatMultiple, glow, topMultiple } from "@/lib/tiers";
import { ProductArt } from "@/components/box/ProductArt";
import { Money } from "@/components/ui/Money";

export interface HotBoxesProps {
  onOpen: (box: ProductBox) => void;
  onInspect: (box: ProductBox) => void;
  className?: string;
}

/**
 * 빈 보관함용 "지금 가장 핫한 박스 TOP 3" 미니 캐러셀 — 밋밋한 빈 화면 대신 바로 참여로 잇는다.
 * 순위 숫자·상단 등급·최고 배수만 보여주고, 클릭은 상세 모달·오픈으로 넘긴다.
 */
export function HotBoxes({ onOpen, onInspect, className }: HotBoxesProps) {
  const t = useTranslations();
  const { boxTitle } = useProductText();
  const top3 = useMemo(() => trending(3), []);

  return (
    <div className={cn("border-metallic-subtle rounded-xl bg-surface p-5 md:p-6", className)}>
      <div className="flex flex-col items-center text-center">
        <Package className="h-7 w-7 text-faint" strokeWidth={1.5} />
        <p className="mt-2 text-sm text-muted">{t("inventory.empty")}</p>
      </div>
      <div className="mt-6 flex items-center gap-2">
        <Flame className="h-4 w-4 text-crimson" strokeWidth={2.2} />
        <span className="caption-luxury !text-white">{t("inventory.hotTitle")}</span>
      </div>
      <ul className="mt-3 flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:none] md:grid md:grid-cols-3 md:overflow-visible">
        {top3.map((box, i) => {
          const top = boxTopTier(box);
          const accent = top.accent;
          return (
            <motion.li
              key={box.slug}
              className="border-metallic-subtle relative w-[72%] flex-none snap-start overflow-hidden rounded-lg bg-obsidian sm:w-[46%] md:w-auto"
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
            >
              <button type="button" onClick={() => onInspect(box)} className="block w-full text-left">
                <div className="relative h-32 w-full overflow-hidden">
                  <ProductArt image={box.image} alt={boxTitle(box)} accent={accent} glowStrength={0.2} fallbackSize="md" />
                  <span aria-hidden className="rank-numeral-sm absolute -left-1 top-1">
                    {i + 1}
                  </span>
                  <span className="absolute right-2 top-2 rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: accent, backgroundColor: glow(accent, 0.12), border: `1px solid ${glow(accent, 0.45)}` }}>
                    {top.label}
                  </span>
                </div>
                <div className="p-3">
                  <div className="truncate text-sm font-bold text-white">{boxTitle(box)}</div>
                  <div className="mt-1 flex items-baseline justify-between gap-2">
                    <Money value={box.price} size="sm" />
                    <span className="text-[11px] text-muted">
                      {t("tiers.multiple", { n: formatMultiple(topMultiple(box)) })} <span className="text-faint">{t("inventory.hotTop")}</span>
                    </span>
                  </div>
                </div>
              </button>
              <div className="px-3 pb-3">
                <button type="button" onClick={() => onOpen(box)} className="h-9 w-full rounded-md bg-crimson text-xs font-bold text-white transition-colors hover:bg-red-600">
                  {t("hero.openNow")}
                </button>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

export default HotBoxes;
