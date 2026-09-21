"use client";

import { useEffect, useRef } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/format";

/**
 * 법적 문서 상단 탭 — 한 줄 가로 스크롤(줄바꿈 금지). 모바일에서 현재 문서가 화면 밖에 있으면 마운트 시 가로로만 끌어온다(페이지 스크롤 없음).
 */
export function LegalNav({ items, current }: { items: { key: string; title: string }[]; current: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = ref.current;
    const el = nav?.querySelector<HTMLElement>("[data-current]");
    if (!nav || !el) return;
    const target = el.offsetLeft - (nav.clientWidth - el.offsetWidth) / 2;
    nav.scrollTo({ left: Math.max(0, target) });
  }, [current]);
  return (
    <nav ref={ref} className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto pr-[4%] text-xs text-muted [scrollbar-width:none]">
      {items.map((d) => (
        <Link key={d.key} href={`/legal/${d.key}`} data-current={d.key === current ? "" : undefined} className={cn("flex-none whitespace-nowrap", d.key === current ? "font-semibold text-white" : "hover:text-white")}>
          {d.title}
        </Link>
      ))}
    </nav>
  );
}
