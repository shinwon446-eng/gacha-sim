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

  return (
    // 호버 중인 행은 z-50 으로 다음 행 위로 부상 → 확장 카드가 파묻히지 않음
    <section id={id} className={cn("group relative mb-10 scroll-mt-28", expandedCount > 0 ? "z-50" : "z-10")}>
      <h2 className="mb-2 px-[4%] text-lg font-bold text-gray-100 md:text-xl">{title}</h2>

      <div className="relative">
        {/* 좌우 화살표 */}
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className={cn(
            "absolute bottom-0 left-0 top-0 z-30 flex w-[4%] items-center justify-center bg-black/50 opacity-0 transition hover:bg-black/70 group-hover:opacity-100",
            !canPrev && "pointer-events-none !opacity-0",
          )}
        >
          <ChevronLeft className="h-9 w-9" />
        </button>
        <button
          onClick={() => setPage((p) => p + 1)}
          className={cn(
            "absolute bottom-0 right-0 top-0 z-30 flex w-[4%] items-center justify-center bg-black/50 opacity-0 transition hover:bg-black/70 group-hover:opacity-100",
            !canNext && "pointer-events-none !opacity-0",
          )}
        >
          <ChevronRight className="h-9 w-9" />
        </button>

        {/* 트랙: overflow 를 숨기지 않고 translateX 로 이동 → 확장 카드가 위/아래로 자유롭게 돌출 */}
        <div className="px-[4%]">
          <div
            className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
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
