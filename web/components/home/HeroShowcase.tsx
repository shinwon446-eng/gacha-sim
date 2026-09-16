"use client";

import { motion } from "framer-motion";
import { Play, Info } from "lucide-react";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import {
  dropTable,
  isValueGuaranteed,
  REFUND_RATE,
  type ProductBox,
} from "@/lib/products";
import { boxTopTier, formatMultiple, glow, tierOf, topMultiple } from "@/lib/tiers";
import { TierBadge } from "@/components/box/TierStrip";
import { ProductArt } from "@/components/box/ProductArt";

export interface HeroShowcaseProps {
  box: ProductBox;
  onOpen?: (box: ProductBox) => void;
  onInspect?: (box: ProductBox) => void;
  className?: string;
}

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * 메인 히어로 쇼케이스.
 *
 * 레이아웃 원칙 — 이미지와 메타를 물리적으로 분리한다.
 *   · 비주얼은 우측 2/3 에만 존재하고, 텍스트가 놓이는 좌측으로는
 *     to-right 그라디언트가 캔버스 색까지 완전히 덮는다.
 *     이미지 위에 텍스트를 얹지 않으므로 어떤 상품 사진이 와도 가독성이 무너지지 않는다.
 *   · 하단은 to-top 페이드로 다음 행에 이어 붙는다.
 *
 * 문구 원칙 — 보장 표기는 데이터가 참일 때만 나간다.
 *   isValueGuaranteed(박스 최저 실판매가 >= 오픈 가격)가 false 인 박스에
 *   "본전 보장" 류의 문구를 붙이지 않는다. 최소 보장가는 언제나 실측값으로만 적는다.
 */
export function HeroShowcase({ box, onOpen, onInspect, className }: HeroShowcaseProps) {
  const { fmt } = useCurrency();
  const top = boxTopTier(box);
  const guaranteed = isValueGuaranteed(box);
  const highlights = dropTable(box).slice(0, 3);

  return (
    <section
      // 높이를 고정하지 않는다. 고정하면 카피가 길어질 때 조용히 잘리거나
      // 상단 내비 아래로 밀려 들어간다. 최소 높이만 주고 콘텐츠가 높이를 정한다.
      className={cn("relative w-full overflow-hidden bg-canvas min-h-[80vh]", className)}
      aria-label={`${box.title} 쇼케이스`}
    >
      {/* ── 배경 비주얼 — 우측에만 존재한다 ── */}
      <div className="absolute inset-y-0 right-0 w-full md:w-[68%]">
        <ProductArt
          image={box.image}
          alt={box.title}
          accent={top.accent}
          glowStrength={0.18}
          fallbackSize="lg"
          priority
        />
      </div>

      {/* 비네트 + 좌/하단 페이드. 텍스트 영역은 캔버스 색으로 완전히 덮인다. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, #141414 0%, #141414 26%, rgba(20,20,20,0.82) 44%, rgba(20,20,20,0.25) 68%, transparent 100%)",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, #141414 0%, #141414 6%, rgba(20,20,20,0.7) 24%, transparent 62%)",
        }}
      />

      {/* ── 좌측 메타 ── */}
      <motion.div
        className="relative flex min-h-[80vh] max-w-2xl flex-col justify-end px-[4%] pb-14 pt-24 md:pb-20 md:pt-28"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <div className="flex flex-wrap items-center gap-2">
          {typeof box.trendingRank === "number" && (
            <span className="rounded-sm bg-crimson px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
              인기 {box.trendingRank}위
            </span>
          )}
          <TierBadge tier={top} size="md" />
          <span className="rounded-sm border border-line bg-black/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            {box.badge}
          </span>
        </div>

        <h1 className="mt-3 font-display text-[40px] font-bold uppercase leading-[0.92] tracking-tight text-white sm:text-[58px] lg:text-[70px]">
          {box.title}
        </h1>

        <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-muted md:text-[15px]">
          {box.tagline}
        </p>

        {/* 가격 · 최고 배수 */}
        <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
              1회 오픈
            </div>
            <div className="mt-1 font-display text-[34px] font-bold leading-none tracking-tight text-white md:text-[42px]">
              {fmt(box.price)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
              최고 구성
            </div>
            <div
              className="mt-1 font-display text-[34px] font-bold leading-none tracking-tight md:text-[42px]"
              style={{ color: top.accent, textShadow: `0 0 22px ${glow(top.accent, 0.45)}` }}
            >
              {formatMultiple(topMultiple(box))}
            </div>
          </div>
        </div>

        {/* 보장 표기 — 데이터가 참인 문장만 나간다 */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-sm border border-white/15 bg-white/[0.06] px-2.5 py-1.5 text-[11px] font-semibold text-white">
            100% 실물 지급 · 꽝 없음
          </span>
          <span
            className={cn(
              "rounded-sm px-2.5 py-1.5 text-[11px] font-semibold",
              guaranteed ? "text-[#141414]" : "border border-line bg-black/40 text-muted",
            )}
            style={guaranteed ? { backgroundColor: top.accent } : undefined}
          >
            {guaranteed
              ? `최소 ${fmt(box.guaranteedMin)} 상당 보장 — 오픈가 이상`
              : `최소 ${fmt(box.guaranteedMin)} 상당 보장`}
          </span>
        </div>

        {/* CTA */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onOpen?.(box)}
            className="flex h-12 items-center gap-2 rounded-sm bg-crimson px-7 text-[15px] font-bold text-white transition-colors duration-200 hover:bg-[#f6121d]"
          >
            <Play className="h-5 w-5 fill-current" strokeWidth={0} />
            지금 오픈하기
          </button>
          <button
            type="button"
            onClick={() => onInspect?.(box)}
            className="flex h-12 items-center gap-2 rounded-sm bg-white/20 px-6 text-[15px] font-semibold text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/30"
          >
            <Info className="h-5 w-5" strokeWidth={2} />
            구성품 확인
          </button>
        </div>

        {/* 상위 구성 3종 — 이미지 없이 텍스트로만 */}
        <ul className="mt-6 hidden flex-wrap items-center gap-x-5 gap-y-2 sm:flex">
          {highlights.map((item) => {
            const t = tierOf(item.value, box.price);
            return (
              <li key={item.id} className="flex items-center gap-2 text-[11px] leading-none">
                <span
                  aria-hidden
                  className="h-3 w-[2px] flex-none rounded-full"
                  style={{ background: t.accent, boxShadow: `0 0 8px ${glow(t.accent, 0.6)}` }}
                />
                <span className="text-white">{item.name}</span>
                <span className="font-mono tabular-nums text-muted">{fmt(item.value)}</span>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 max-w-2xl text-[10px] leading-relaxed text-faint">
          표기 금액은 실판매가 기준입니다. 받은 실물을 즉시 환급하면 실판매가의{" "}
          {Math.round(REFUND_RATE * 100)}%를 돌려받으므로 회수액은 오픈 가격보다 낮습니다. 확률은
          구성품 확인에서 전량 공개됩니다. 현재 화면은 프로토타입이며 상품 데이터는 모의값입니다.
        </p>
      </motion.div>
    </section>
  );
}

export default HeroShowcase;
