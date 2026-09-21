"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/format";
import type { ProductBox } from "@/lib/products";
import { BoxCard, type CardEdge } from "@/components/box/BoxCard";

export interface NetflixRowProps {
  title: string;
  boxes: ProductBox[];
  /** 앵커 id — 서브 내비게이션이 스크롤 타겟으로 쓴다. */
  id?: string;
  /** Top 10 행. 카드 뒤에 대형 순위 숫자를 렌더하고 슬롯을 넓게 잡는다. */
  variant?: "default" | "top10";
  onOpen?: (box: ProductBox) => void;
  onInspect?: (box: ProductBox) => void;
  className?: string;
}

/** 브레이크포인트별 한 화면 슬롯 수 */
function useSlots(variant: "default" | "top10") {
  const [slots, setSlots] = useState(variant === "top10" ? 3 : 4);

  // 16:9 콤팩트 카드 — 데스크톱에서 4~5개가 꽉 차게. TOP 10 은 순위 숫자 여백만큼 하나 덜.
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      if (variant === "top10") {
        setSlots(w >= 1536 ? 5 : w >= 1024 ? 4 : w >= 640 ? 3 : 2);
      } else {
        setSlots(w >= 1536 ? 6 : w >= 1280 ? 5 : w >= 1024 ? 4 : w >= 768 ? 3 : 2);
      }
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [variant]);

  return slots;
}

/**
 * 넷플릭스 가로 캐러셀.
 *
 * - 좌우 셰브론은 행 호버 시에만 노출되고, 더 넘길 곳이 없으면 숨는다.
 * - overflow-hidden 을 쓰지 않는다. 호버 확장 카드가 행 위아래로 자유롭게 돌출해야 하므로
 *   translateX 페이징으로 이동하고, 가로 클리핑은 페이지 레벨 overflow-x-hidden 에 맡긴다.
 * - 카드가 확장되면 행 전체를 z-50 으로 올려 다음 행 위로 부상시킨다.
 */
export function NetflixRow({
  title,
  boxes,
  id,
  variant = "default",
  onOpen,
  onInspect,
  className,
}: NetflixRowProps) {
  const t = useTranslations("rows");
  const slots = useSlots(variant);
  const [page, setPage] = useState(0);
  const [expandedCount, setExpandedCount] = useState(0);

  const maxStart = Math.max(0, boxes.length - slots);
  const start = Math.min(page * slots, maxStart);
  const canPrev = start > 0;
  const canNext = start < maxStart;
  const pageCount = Math.max(1, Math.ceil(boxes.length / slots));
  const activePage = Math.min(Math.floor(start / slots), pageCount - 1);

  // 슬롯 수가 바뀌면 페이지를 처음으로 되돌린다
  useEffect(() => setPage(0), [slots, boxes.length]);

  const onExpandChange = useCallback((expanded: boolean) => {
    setExpandedCount((c) => Math.max(0, c + (expanded ? 1 : -1)));
  }, []);

  const edgeFor = useCallback(
    (i: number): CardEdge => {
      const visible = i - start;
      if (visible <= 0) return "first";
      if (visible >= slots - 1 || i === boxes.length - 1) return "last";
      return "middle";
    },
    [start, slots, boxes.length],
  );

  const cardWidth = useMemo(() => ({ width: `${100 / slots}%` }), [slots]);

  if (boxes.length === 0) return null;

  return (
    <section
      id={id}
      className={cn(
        "group/row relative mb-12 scroll-mt-24",
        expandedCount > 0 ? "z-50" : "z-10",
        className,
      )}
    >
      {/* 행 헤더 */}
      <div className="mb-2 flex items-baseline justify-between gap-4 px-[4%]">
        <h2 className="text-[15px] font-bold tracking-tight text-white md:text-lg">{title}</h2>

        {pageCount > 1 && (
          <div className="flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover/row:opacity-100">
            {Array.from({ length: pageCount }, (_, i) => (
              <span
                key={i}
                aria-hidden
                className={cn("h-0.5 w-3 transition-colors", i === activePage ? "bg-muted" : "bg-line")}
              />
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        {/* 좌우 셰브론 */}
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          aria-label={t("prev")}
          className={cn(
            "absolute bottom-0 left-0 top-0 z-30 flex w-[4%] items-center justify-center bg-black/55 text-white opacity-0 transition duration-200 hover:bg-black/80 group-hover/row:opacity-100",
            !canPrev && "pointer-events-none !opacity-0",
          )}
        >
          <ChevronLeft className="h-8 w-8" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          aria-label={t("next")}
          className={cn(
            "absolute bottom-0 right-0 top-0 z-30 flex w-[4%] items-center justify-center bg-black/55 text-white opacity-0 transition duration-200 hover:bg-black/80 group-hover/row:opacity-100",
            !canNext && "pointer-events-none !opacity-0",
          )}
        >
          <ChevronRight className="h-8 w-8" strokeWidth={1.5} />
        </button>

        <div className="px-[4%]">
          <motion.div
            className="flex will-change-transform"
            animate={{ x: `-${(start / slots) * 100}%` }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {boxes.map((box, i) => (
              <div key={box.id} className="flex-none px-[0.35%]" style={cardWidth}>
                <BoxCard
                  box={box}
                  edge={edgeFor(i)}
                  rank={variant === "top10" ? (box.trendingRank ?? i + 1) : undefined}
                  onExpandChange={onExpandChange}
                  onOpen={onOpen}
                  onInspect={onInspect}
                />
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default NetflixRow;
