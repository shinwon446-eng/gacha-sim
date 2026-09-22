"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/format";
import { CATEGORY_FILTERS, type BoxCategory } from "@/lib/products";

export type CategoryTab = BoxCategory | "all";

/** 헤더(h-14) 아래에 붙는다 — `top-14`. 그리드 앵커의 scroll-margin 도 이 합(56 + 탭 바 ≈ 62)에 맞춘다 */
export const TABS_STICKY_TOP = 56;

export interface QuickTabsProps {
  value: CategoryTab;
  onChange: (key: CategoryTab) => void;
  className?: string;
}

/**
 * 퀵 카테고리 탭 (CLAUDE.md §4-3) — 스티키 탭 필터.
 *   · 헤더 바로 아래 `sticky top-14` 로 붙어 스크롤 중에도 1탭으로 카테고리 전환.
 *   · 탭을 누르면 아래 그리드가 해당 카테고리로 즉시 교체된다(캐러셀 중복 나열 없음).
 *   · 누른 탭은 가로 중앙으로 부드럽게 스크롤(scrollIntoView inline:center).
 *   · 양끝 딤 페이드는 그 방향으로 더 스와이프할 수 있을 때만 켜진다(가로 스와이프 힌트).
 */
export function QuickTabs({ value, onChange, className }: QuickTabsProps) {
  const t = useTranslations("categories");
  const listRef = useRef<HTMLUListElement>(null);
  const [fade, setFade] = useState({ left: false, right: false });

  const syncFade = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setFade({ left: el.scrollLeft > 4, right: el.scrollLeft < max - 4 });
  }, []);

  useEffect(() => {
    syncFade();
    const el = listRef.current;
    if (!el) return;
    el.addEventListener("scroll", syncFade, { passive: true });
    window.addEventListener("resize", syncFade);
    return () => {
      el.removeEventListener("scroll", syncFade);
      window.removeEventListener("resize", syncFade);
    };
  }, [syncFade]);

  // 외부(하단 내비 · 해시)에서 바뀐 값도 중앙으로 맞춘다
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-tab="${value}"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [value]);

  return (
    <nav className={cn("sticky z-40 border-b border-hairline bg-obsidian/95 py-3 backdrop-blur-md", className)} style={{ top: TABS_STICKY_TOP }} aria-label={t("all")}>
      <div className="relative">
        <ul ref={listRef} className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:px-[4%] [&::-webkit-scrollbar]:hidden" role="tablist">
          {CATEGORY_FILTERS.map(({ key }) => {
            const on = value === key;
            return (
              <li key={key} className="flex-none">
                <button
                  type="button"
                  role="tab"
                  data-tab={key}
                  aria-selected={on}
                  onClick={(e) => {
                    onChange(key);
                    e.currentTarget.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
                  }}
                  className={cn(
                    "flex h-9 items-center whitespace-nowrap rounded-full border px-3.5 text-xs font-bold transition-all duration-200 sm:h-10 sm:px-4",
                    on
                      ? "border-gold-champagne bg-gold-champagne/15 text-gold-champagne shadow-[0_0_12px_rgba(230,202,101,0.25)]"
                      : "border-metallic-subtle bg-surface text-secondary hover:border-gold-champagne/60 hover:bg-elevation hover:text-white",
                  )}
                >
                  {t(key)}
                </button>
              </li>
            );
          })}
        </ul>
        {/* 스와이프 힌트 — 그 방향으로 더 있을 때만 딤 페이드 */}
        <span aria-hidden className={cn("pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-obsidian to-transparent transition-opacity duration-200", fade.left ? "opacity-100" : "opacity-0")} />
        <span aria-hidden className={cn("pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-obsidian to-transparent transition-opacity duration-200", fade.right ? "opacity-100" : "opacity-0")} />
      </div>
    </nav>
  );
}

export default QuickTabs;
