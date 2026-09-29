"use client";
import { useState } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useProductText } from "@/lib/useProductText";
import { cn } from "@/lib/format";
import type { ProductBox } from "@/lib/products";
import { ProductArt } from "@/components/box/ProductArt";
import { Money } from "@/components/ui/Money";
import { Link } from "@/i18n/navigation";

export interface BillboardHeroProps {
  boxes: ProductBox[];
  onOpen?: (box: ProductBox) => void;
  onInspect?: (box: ProductBox) => void;
  intervalMs?: number;
  className?: string;
}

/** Manual selections keep reading and keyboard focus stable. */
export function BillboardHero({ boxes, onInspect, className }: BillboardHeroProps) {
  const t = useTranslations("design");
  const { boxTitle } = useProductText();
  const [index, setIndex] = useState(0);
  const box = boxes[Math.min(index, boxes.length - 1)];
  if (!box) return null;
  return (
    <section className={cn("editorial-hero page-shell", className)} aria-labelledby="hero-title">
      <div className="hero-copy min-w-0">
        <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-gold-champagne" /> THE ART OF DISCOVERY</span>
        <h1 id="hero-title">{t("heroLine1")}<br /><span>{t("heroLine2")}</span></h1>
        <p className="hero-description">{t("heroBody")}</p>
        <div className="hero-actions">
          <a href="#boxes" className="btn-primary">{t("explore")}<ArrowDown size={17} aria-hidden /></a>
          <Link href="/fairness" className="btn-secondary"><ArrowUpRight size={15} aria-hidden />{t("fairnessCta")}</Link>
        </div>
        <p className="hero-note">{t("purchaseNote")}</p>
        <div className="hero-signature"><span>VOILA / COLLECTION</span><span>You never know what’s next.</span></div>
      </div>
      <div className="hero-gallery min-w-0">
        <div className="hero-gallery-art" key={box.id}>
          <ProductArt image={box.image} alt={boxTitle(box)} accent="#d9c39a" glowStrength={0} bordered={false} priority />
        </div>
        <div className="hero-gallery-top"><span>VOILA SELECTION</span><span>{String(index + 1).padStart(2, "0")} / {String(boxes.length).padStart(2, "0")}</span></div>
        <button type="button" onClick={() => onInspect?.(box)} className="hero-feature" aria-label={boxTitle(box) + " · " + t("details")}>
          <span className="min-w-0"><span className="eyebrow mb-2 block">{t("featured")}</span><span className="block text-xl font-semibold tracking-tight sm:text-2xl">{boxTitle(box)}</span><span className="mt-2 inline-flex items-baseline gap-2 text-muted"><span className="text-xs">{t("perOpen")}</span><Money value={box.price} size="sm" /></span></span>
          <span className="hero-feature-arrow"><ArrowUpRight size={23} strokeWidth={1.5} aria-hidden /></span>
        </button>
        <div className="hero-picker" role="group" aria-label={t("selectFeature")}>
          {boxes.map((b, i) => <button key={b.id} type="button" aria-pressed={index === i} aria-label={boxTitle(b)} onClick={() => setIndex(i)} className={cn(index === i && "is-active")}><span>{String(i + 1).padStart(2, "0")}</span><span className="hero-picker-line" /></button>)}
        </div>
      </div>
    </section>
  );
}
export default BillboardHero;
