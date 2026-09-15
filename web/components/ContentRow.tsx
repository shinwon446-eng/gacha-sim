"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Box } from "@/lib/types";
import { cn } from "@/lib/format";
import { BoxCard, type EdgePosition } from "./BoxCard";

interface Props {
  id?: string;
  title: string;
  boxes: Box[];
}

/** 브레이크포인트별 한 화면에 보이는 카드 수 (BoxCard 의 w-1/2 … lg:w-1/6 와 일치) */
function usePerPage() {
  const [perPage, setPerPage] = useState(6);
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      setPerPage(w >= 1024 ? 6 : w >= 768 ? 4 : w >= 640 ? 3 : 2);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);
  return perPage;
}

export function ContentRow({ id, title, boxes }: Props) {
  const perPage = usePerPage();
  const [page, setPage] = useState(0);
  const [expandedCount, setExpandedCount] = useState(0);

  const maxStart = Math.max(0, boxes.length - perPage);
  const start = Math.min(page * perPage, maxStart);
  const canPrev = start > 0;
  const canNext = start < maxStart;

  useEffect(() => setPage(0), [perPage]);

  const onExpandChange = useCallback((expanded: boolean) => {
    setExpandedCount((c) => Math.max(0, c + (expanded ? 1 : -1)));
  }, []);

  const edgeFor = (i: number): EdgePosition => {
    const visible = i - start;
    if (visible <= 0) return "first";
    if (visible >= perPage - 1 || i === boxes.length - 1) return "last";
    return "middle";
  };

  // 표시 전용 페이지 지시자 — 페이징 상태를 바꾸지 않는다
  const pageCount = Math.max(1, Math.ceil(boxes.length / perPage));
  const activePage = Math.min(Math.floor(start / perPage), pageCount - 1);

  return (
    // 호버 중인 행은 z-50 으로 다음 행 위로 부상 — 확장 카드가 파묻히지 않는다
    <section id={id} className={cn("group relative mb-10 scroll-mt-28", expandedCount > 0 ? "z-50" : "z-10")}>
      {/* 헤어라인 섹션 헤더 */}
      <div className="mb-3 px-[4%]">
        <div className="flex items-end justify-between gap-4 border-b border-hairline pb-2">
          <div className="min-w-0">
            <div className="label-caps">라인업</div>
            <h2 className="display mt-1 truncate text-xl font-bold text-white md:text-2xl">{title}</h2>
          </div>
          <div className="flex flex-none items-center gap-3 pb-0.5">
            <span className="label-caps hidden sm:block">{boxes.length} 시퀀스</span>
            {pageCount > 1 && (
              <div aria-hidden className="flex items-center gap-1">
                {Array.from({ length: pageCount }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-[2px] w-4 transition-colors duration-300 ease-cine",
                      i === activePage ? "bg-white" : "bg-white/20",
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative">
        {/* 좌우 페이징 — 블랙 스크림 위의 얇은 셰브론 */}
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          aria-label="이전 페이지"
          className={cn(
            "absolute bottom-0 left-0 top-0 z-30 flex w-[4%] items-center justify-center bg-gradient-to-r from-ink/90 via-ink/70 to-transparent text-neutral-400 opacity-0 transition duration-300 ease-cine hover:text-white group-hover:opacity-100",
            !canPrev && "pointer-events-none !opacity-0",
          )}
        >
          <ChevronLeft className="h-7 w-7" strokeWidth={1.25} />
        </button>
        <button
          onClick={() => setPage((p) => p + 1)}
          aria-label="다음 페이지"
          className={cn(
            "absolute bottom-0 right-0 top-0 z-30 flex w-[4%] items-center justify-center bg-gradient-to-l from-ink/90 via-ink/70 to-transparent text-neutral-400 opacity-0 transition duration-300 ease-cine hover:text-white group-hover:opacity-100",
            !canNext && "pointer-events-none !opacity-0",
          )}
        >
          <ChevronRight className="h-7 w-7" strokeWidth={1.25} />
        </button>

        {/* 트랙: overflow 를 숨기지 않고 translateX 로 이동 — 확장 카드가 위/아래로 자유롭게 돌출 */}
        <div className="px-[4%]">
          <div
            className="flex transition-transform duration-700 ease-cine will-change-transform"
            style={{ transform: `translateX(-${(start / perPage) * 100}%)` }}
          >
            {boxes.map((box, i) => (
              <BoxCard key={box.id} box={box} edge={edgeFor(i)} onExpandChange={onExpandChange} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
