"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/format";

const TABS = [
  { key: "dollar", anchor: "row-dollar" },
  { key: "tech", anchor: "row-tech" },
  { key: "luxury", anchor: "row-luxury" },
  { key: "jackpot", anchor: "row-jackpot" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/** 스티키 헤더 높이만큼 위로 여유를 두고 스크롤 */
const HEADER_OFFSET = 72;

/**
 * 퀵 카테고리 탭 (CLAUDE.md §4-3) — 클릭하면 골드 보더로 활성화되고 해당 캐러셀로 부드럽게 스크롤한다.
 * 스크롤 중에는 IntersectionObserver 가 화면 상단에 들어온 캐러셀에 맞춰 활성 탭을 동기화한다.
 */
export function QuickTabs({ className }: { className?: string }) {
  const t = useTranslations("categories");
  const [active, setActive] = useState<TabKey | null>(null);

  const go = (key: TabKey, anchor: string) => {
    setActive(key);
    const el = document.getElementById(anchor);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top, behavior: "smooth" });
  };

  useEffect(() => {
    const els = TABS.map((x) => document.getElementById(x.anchor)).filter((e): e is HTMLElement => !!e);
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!hit) return;
        const tab = TABS.find((x) => x.anchor === hit.target.id);
        if (tab) setActive(tab.key);
      },
      { rootMargin: `-${HEADER_OFFSET}px 0px -60% 0px`, threshold: 0 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  return (
    <nav className={cn("px-[4%]", className)} aria-label={t("all")}>
      <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="tablist">
        {TABS.map(({ key, anchor }) => {
          const on = active === key;
          return (
            <li key={key} className="flex-none">
              <button
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => go(key, anchor)}
                className={cn(
                  "flex h-10 items-center whitespace-nowrap rounded-full px-4 text-xs font-bold transition-colors",
                  on ? "border-metallic-gold bg-gold-champagne/10 text-gold-champagne" : "border-metallic-subtle bg-surface text-secondary hover:border-gold-champagne/60 hover:bg-elevation hover:text-white",
                )}
              >
                {t(key)}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default QuickTabs;
