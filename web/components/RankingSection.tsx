"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { useGachaStore } from "@/store/useGachaStore";
import { TIER_META } from "@/lib/types";
import { BOX_MAP } from "@/lib/data";
import { compactUsd, timeAgo } from "@/lib/format";
import { ProductImage } from "./ProductImage";

/** 넷플릭스 TOP 10 스타일 실시간 당첨 랭킹 */
export function RankingSection() {
  const openLog = useGachaStore((s) => s.openLog);
  const setDetail = useGachaStore((s) => s.setDetail);
  const [now, setNow] = useState(0);
  useEffect(() => setNow(Date.now()), [openLog]);

  const top = [...openLog].sort((a, b) => b.item.value - a.item.value).slice(0, 10);

  return (
    <section id="ranking" className="relative z-10 mb-14 scroll-mt-28 px-[4%]">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold md:text-xl">
        <Trophy className="h-5 w-5 text-gold" /> 실시간 당첨 랭킹 TOP 10
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {top.map((e, i) => {
          const meta = TIER_META[e.item.tier];
          return (
            <button
              key={e.id}
              onClick={() => setDetail(e.boxId)}
              className="group relative flex h-44 items-end overflow-hidden rounded bg-surface text-left transition hover:scale-[1.03]"
            >
              <ProductImage
                src={e.item.image}
                emoji={e.item.emoji}
                art={e.item.art}
                className="absolute inset-0 opacity-80 transition group-hover:opacity-100"
                emojiClassName="text-6xl"
              />
              <span
                className="absolute -bottom-6 -left-2 select-none text-[9rem] font-black leading-none text-transparent drop-shadow-[0_0_12px_rgba(0,0,0,0.9)]"
                style={{ WebkitTextStroke: "2px #ddd" }}
              >
                {i + 1}
              </span>
              <div className="relative z-10 w-full bg-gradient-to-t from-black/90 to-transparent p-3">
                <div className="truncate text-xs font-bold">{e.item.name}</div>
                <div className="text-[11px]" style={{ color: meta.color }}>
                  {compactUsd(e.item.value)} · {e.user}
                </div>
                <div className="truncate text-[10px] text-gray-500">
                  {BOX_MAP[e.boxId]?.title} · {now ? timeAgo(e.at, now) : ""}
                  {e.isDemo && " · demo"}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
