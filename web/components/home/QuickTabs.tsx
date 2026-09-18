"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/format";

const TABS = [
  { key: "dollar", anchor: "row-dollar" },
  { key: "tech", anchor: "row-tech" },
  { key: "luxury", anchor: "row-luxury" },
  { key: "jackpot", anchor: "row-jackpot" },
] as const;

/** 퀵 카테고리 탭 (CLAUDE.md §4-3) — 히어로 직하, 해당 캐러셀로 스크롤 */
export function QuickTabs({ className }: { className?: string }) {
  const t = useTranslations("categories");
  const go = (anchor: string) => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <nav className={cn("px-[4%]", className)} aria-label={t("all")}>
      <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {TABS.map(({ key, anchor }) => (
          <li key={key} className="flex-none">
            <button type="button" onClick={() => go(anchor)} className="border-metallic-subtle flex h-10 items-center whitespace-nowrap rounded-full bg-surface px-4 text-xs font-bold text-secondary transition-colors hover:border-gold-champagne/60 hover:bg-elevation hover:text-white">
              {t(key)}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default QuickTabs;
