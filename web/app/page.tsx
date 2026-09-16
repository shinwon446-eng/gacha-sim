"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/format";
import {
  BOXES,
  CATEGORY_FILTERS,
  SORTS,
  byCategory,
  guaranteedValue,
  heroBox,
  luxuryAndWatch,
  sortBoxes,
  techAndMobility,
  trending,
  type BoxCategory,
  type ProductBox,
  type SortKey,
} from "@/lib/products";
import { HeroShowcase } from "@/components/home/HeroShowcase";
import { NetflixRow } from "@/components/home/NetflixRow";
import { BoxCard } from "@/components/box/BoxCard";
import { DetailModal } from "@/components/box/DetailModal";
import { TIERS, glow } from "@/lib/tiers";

const PAGE_SIZE = 12;

export default function BoxesPage() {
  const [detail, setDetail] = useState<ProductBox | null>(null);
  const [category, setCategory] = useState<BoxCategory | "all">("all");
  const [sort, setSort] = useState<SortKey>("featured");
  const [shown, setShown] = useState(PAGE_SIZE);

  const hero = useMemo(() => heroBox(), []);
  const grid = useMemo(() => sortBoxes(byCategory(category), sort), [category, sort]);
  const visible = grid.slice(0, shown);

  return (
    <main className="min-h-screen overflow-x-hidden bg-canvas pb-24">
      {/* 상단 바 */}
      <header className="absolute inset-x-0 top-0 z-[60] flex items-center gap-5 px-[4%] py-4">
        <span className="font-display text-[22px] font-bold uppercase leading-none tracking-tight text-crimson">
          Gachaflix
        </span>
        <nav className="flex items-center gap-4 text-[12px] text-muted">
          <span className="font-semibold text-white">박스</span>
          <span className="cursor-default opacity-60">배틀</span>
          <span className="cursor-default opacity-60">보관함</span>
        </nav>
        <span className="ml-auto rounded-sm border border-line bg-black/40 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-faint">
          Demo Data
        </span>
      </header>

      <HeroShowcase box={hero} onOpen={setDetail} onInspect={setDetail} />

      {/* 등급 범례 — 배수 기준을 한 번만 설명한다 */}
      <section className="border-y border-line bg-surface px-[4%] py-2.5">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <li className="text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
            등급 = 실판매가 ÷ 오픈가
          </li>
          {TIERS.map((t) => (
            <li key={t.key} className="flex items-center gap-1.5 text-[10px] leading-none">
              <span
                aria-hidden
                className="h-2 w-2 rounded-[1px]"
                style={{ background: t.accent, boxShadow: `0 0 6px ${glow(t.accent, 0.55)}` }}
              />
              <span className="font-semibold uppercase tracking-[0.1em]" style={{ color: t.accent }}>
                {t.label}
              </span>
              <span className="tabular-nums text-faint">{t.range}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="pt-10">
        <NetflixRow title="지금 가장 많이 열리는 박스" boxes={trending()} variant="top10" onOpen={setDetail} onInspect={setDetail} />
        <NetflixRow title="테크 & 모빌리티" boxes={techAndMobility()} onOpen={setDetail} onInspect={setDetail} />
        <NetflixRow title="럭셔리 & 워치" boxes={luxuryAndWatch()} onOpen={setDetail} onInspect={setDetail} />
        <NetflixRow title="최소 가치 보장" boxes={guaranteedValue()} onOpen={setDetail} onInspect={setDetail} />
      </div>

      {/* 전체 그리드 */}
      <section className="px-[4%] pt-6">
        <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-line pb-3">
          <h2 className="text-[17px] font-bold text-white">
            전체 박스
            <span className="ml-2 font-mono text-[12px] font-normal tabular-nums text-faint">
              {grid.length} / {BOXES.length}
            </span>
          </h2>

          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setCategory(f.key);
                  setShown(PAGE_SIZE);
                }}
                className={cn(
                  "rounded-sm border px-2.5 py-1 text-[11px] font-semibold transition-colors duration-200",
                  category === f.key
                    ? "border-white bg-white text-canvas"
                    : "border-line text-muted hover:border-white hover:text-white",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <label className="ml-auto flex items-center gap-2 text-[11px] text-faint">
            정렬
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-sm border border-line bg-surface px-2 py-1 text-[11px] text-white outline-none focus:border-white"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-4 xl:grid-cols-5">
          {visible.map((box, i) => (
            <BoxCard
              key={box.id}
              box={box}
              edge={i % 5 === 0 ? "first" : i % 5 === 4 ? "last" : "middle"}
              onInspect={setDetail}
              onOpen={setDetail}
            />
          ))}
        </div>

        {shown < grid.length && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE_SIZE)}
              className="rounded-sm border border-[#555555] px-6 py-2.5 text-[13px] font-semibold text-white transition-colors duration-200 hover:border-white hover:bg-elevation"
            >
              더 보기 ({grid.length - shown}개)
            </button>
          </div>
        )}
      </section>

      <DetailModal box={detail} onClose={() => setDetail(null)} onOpen={setDetail} />
    </main>
  );
}
