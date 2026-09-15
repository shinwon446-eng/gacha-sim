"use client";

import { useEffect, useState } from "react";
import { useGachaStore } from "@/store/useGachaStore";
import { LINE_META, itemLine } from "@/lib/types";
import { BOX_MAP } from "@/lib/data";
import { AssetPlate } from "@/components/AssetPlate";
import { cn, compactUsd, timeAgo } from "@/lib/format";

/**
 * TOP 10 차트. 거대한 아웃라인 숫자 + 애셋 플레이트 타일 + 헤어라인 구분선.
 * 크림슨은 1위 슬롯 마커에만 쓴다.
 */
export function RankingSection() {
  const openLog = useGachaStore((s) => s.openLog);
  const setDetail = useGachaStore((s) => s.setDetail);
  const [now, setNow] = useState(0);
  useEffect(() => setNow(Date.now()), [openLog]);

  const top = [...openLog].sort((a, b) => b.item.value - a.item.value).slice(0, 10);

  return (
    <section id="ranking" className="relative z-10 mb-14 scroll-mt-28 px-[4%]">
      <div className="mb-4 flex items-baseline justify-between border-b border-white/[0.08] pb-3">
        <h2 className="display text-2xl font-bold text-white md:text-3xl">오늘의 TOP 10</h2>
        <span className="label-caps">실시간 획득 기록</span>
      </div>

      <ol className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
        {top.map((e, i) => {
          const meta = LINE_META[itemLine(e.item)];
          const first = i === 0;
          return (
            <li key={e.id} className="border-b border-white/[0.08]">
              <button
                onClick={() => setDetail(e.boxId)}
                aria-label={`${i + 1}위 ${e.item.name}`}
                className="group flex w-full items-center gap-4 px-1 py-4 text-left transition duration-600 ease-cine hover:scale-[1.02] hover:bg-white/[0.02] hover:outline hover:outline-1 hover:outline-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-white"
              >
                {/* 순위 숫자 — 아웃라인 처리, 1위만 크림슨 */}
                <span
                  aria-hidden
                  className="display w-[74px] flex-none select-none text-right text-[64px] font-bold leading-none text-transparent md:w-[92px] md:text-[80px]"
                  style={{ WebkitTextStroke: first ? "1.5px #E50914" : "1.5px #404040" }}
                >
                  {i + 1}
                </span>

                <AssetPlate
                  code={e.item.code}
                  tone={e.item.art}
                  size="sm"
                  active={first}
                  className="transition duration-600 ease-cine group-hover:border-white/25"
                />

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold tracking-tight text-white">{e.item.name}</div>
                  <div className="mt-1 flex items-center gap-2 text-[11px]">
                    <span
                      className={cn("font-display font-bold uppercase tracking-tighter", first && "text-crimson")}
                      style={first ? undefined : { color: meta.color }}
                    >
                      {meta.grade}
                    </span>
                    <span className="font-mono text-neutral-300">{compactUsd(e.item.value)}</span>
                    <span className="text-neutral-500">{e.user}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[10px] uppercase tracking-[0.18em] text-neutral-600">
                    {BOX_MAP[e.boxId]?.title}
                    {now ? ` · ${timeAgo(e.at, now)}` : ""}
                    {e.isDemo && " · DEMO"}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
