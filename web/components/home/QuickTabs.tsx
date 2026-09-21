"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/format";

const TABS = [
  { key: "dollar", anchor: "category-dollar" },
  { key: "tech", anchor: "category-tech" },
  { key: "luxury", anchor: "category-luxury" },
  { key: "jackpot", anchor: "category-jackpot" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/** 스티키 헤더 높이 — IntersectionObserver 상단 여백 (섹션 자체는 scroll-mt-24 로 맞춘다) */
const HEADER_OFFSET = 72;

/**
 * 퀵 카테고리 탭 (CLAUDE.md §4-3) — 각 탭은 #category-{key} 캐러셀 섹션 앵커.
 * 클릭: activeCategory 즉시 갱신 + scrollIntoView(smooth). 스크롤 중에는 IntersectionObserver 가 화면 상단의 캐러셀에 맞춰 활성 탭을 동기화한다.
 */
export function QuickTabs({ className }: { className?: string }) {
  const t = useTranslations("categories");
  const [activeCategory, setActiveCategory] = useState<TabKey | null>(null);

  const go = (e: MouseEvent<HTMLAnchorElement>, key: TabKey, targetId: string) => {
    e.preventDefault();
    setActiveCategory(key);
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const els = TABS.map((x) => document.getElementById(x.anchor)).filter((e): e is HTMLElement => !!e);
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!hit) return;
        const tab = TABS.find((x) => x.anchor === hit.target.id);
        if (tab) setActiveCategory(tab.key);
      },
      { rootMargin: `-${HEADER_OFFSET}px 0px -60% 0px`, threshold: 0 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  return (
    <nav className={cn("relative px-[4%]", className)} aria-label={t("all")}>
      <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {TABS.map(({ key, anchor }) => {
          const on = activeCategory === key;
          return (
            <li key={key} className="flex-none">
              <a
                href={`#${anchor}`}
                aria-current={on ? "true" : undefined}
                onClick={(e) => go(e, key, anchor)}
                className={cn(
                  "flex h-10 items-center whitespace-nowrap rounded-full border px-4 text-xs font-bold transition-all duration-200",
                  on
                    ? "border-gold-champagne bg-gold-champagne/15 text-gold-champagne shadow-[0_0_12px_rgba(230,202,101,0.25)]"
                    : "border-metallic-subtle bg-surface text-secondary hover:border-gold-champagne/60 hover:bg-elevation hover:text-white",
                )}
              >
                {t(key)}
              </a>
            </li>
          );
        })}
      </ul>
      {/* 모바일: 4번째 탭이 잘려 있다는 힌트 — 우측 페이드 */}
      <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-canvas to-transparent sm:hidden" />
    </nav>
  );
}

export default QuickTabs;
