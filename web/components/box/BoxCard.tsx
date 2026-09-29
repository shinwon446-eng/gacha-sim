"use client";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/format";
import { useProductText } from "@/lib/useProductText";
import { type ProductBox } from "@/lib/products";
import { formatMultiple, topMultiple } from "@/lib/tiers";
import { ProductArt } from "@/components/box/ProductArt";
import { Money } from "@/components/ui/Money";

export type CardEdge = "first" | "last" | "middle";
export interface BoxCardProps {
  box: ProductBox; edge?: CardEdge; rank?: number;
  onExpandChange?: (expanded: boolean) => void;
  onOpen?: (box: ProductBox) => void;
  onInspect?: (box: ProductBox) => void;
  className?: string;
}
export function BoxCard({ box, rank, onInspect, onOpen, className }: BoxCardProps) {
  const t = useTranslations();
  const { boxTitle } = useProductText();
  return (
    <button type="button" className={cn("collection-card group", className)} onClick={() => (onInspect ?? onOpen)?.(box)}>
      <span className="collection-card-image">
        <ProductArt image={box.image} alt="" accent="#d9c39a" glowStrength={0} bordered={false} />
        <span className="collection-category">{t("categories." + box.category)}</span>
        {rank && <span className="collection-rank">{String(rank).padStart(2, "0")}</span>}
        <span className="collection-image-action"><ArrowUpRight size={20} aria-hidden /></span>
      </span>
      <span className="collection-card-body">
        <span className="collection-card-title" title={boxTitle(box)}>{boxTitle(box)}</span>
        <span className="collection-card-meta"><span className="collection-price"><Money value={box.price} size="md" /><span className="text-xs text-muted">/ {t("design.oneOpen")}</span></span><span className="collection-multiple">{t("design.upTo", { n: formatMultiple(topMultiple(box)) })}</span></span>
        <span className="collection-card-link">{t("design.details")}<ArrowUpRight size={14} aria-hidden /></span>
      </span>
    </button>
  );
}
export default BoxCard;
