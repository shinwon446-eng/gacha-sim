"use client";
import { useTranslations } from "next-intl";
import { Grid2X2, Sparkles, Headphones, Watch, Gem } from "lucide-react";
import { cn } from "@/lib/format";
import { CATEGORY_FILTERS, type BoxCategory } from "@/lib/products";
export type CategoryTab = BoxCategory | "all";
export const TABS_STICKY_TOP = 72;
const icons = { all: Grid2X2, dollar: Sparkles, tech: Headphones, luxury: Watch, jackpot: Gem };
export interface QuickTabsProps { value: CategoryTab; onChange: (key: CategoryTab) => void; className?: string; }
export function QuickTabs({ value, onChange, className }: QuickTabsProps) {
  const t = useTranslations("categories");
  return <nav className={cn("collection-filters", className)} aria-label={t("all")}>
    {CATEGORY_FILTERS.map(({ key }) => {
      const Icon = icons[key];
      return <button key={key} type="button" aria-pressed={value === key} className={cn("collection-filter", value === key && "is-active")} onClick={(e) => { onChange(key); e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" }); }}><Icon size={16} strokeWidth={1.7} aria-hidden /><span>{t(key)}</span></button>;
    })}
  </nav>;
}
export default QuickTabs;
