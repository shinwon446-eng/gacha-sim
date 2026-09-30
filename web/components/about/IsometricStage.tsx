"use client";

import { useMemo } from "react";
import { cn } from "@/lib/format";
import { BOX_BY_SLUG, dropTable, type ProductBox } from "@/lib/products";
import { useProductText } from "@/lib/useProductText";
import { ProductArt } from "@/components/box/ProductArt";

/**
 * /about 히어로 아래에 깔리는 **아이소메트릭 볼트 스테이지**.
 *
 * 구조는 세 겹이다.
 *   ① `.iso-plane` — `perspective(1100px) rotateX(58deg) rotateZ(-45deg)` 로 눕힌 5×5 다이아몬드 타일 그리드
 *   ② `.iso-sweep` — 평면 위를 천천히 지나가는 샴페인 광원(`prefers-reduced-motion` 이면 멈춘다)
 *   ③ 플로팅 글래스 플레이트 — 평면과 달리 **기울이지 않는다**. 눕히면 상품 사진이 읽히지 않는다.
 *
 * 스테이지 자체는 `.iso-stage` 의 4변 교차 마스크로 사라지므로 사각 테두리가 보이지 않는다.
 *
 * 배수는 카탈로그에서 그때그때 계산한다 — 화면의 `780x` 는 실제 `최고 상품가 ÷ 박스 가격`이다(지어내지 않는다).
 */

/** 스테이지에 세우는 대표 컬렉션. 순서가 곧 좌→우 배치다 */
const FEATURED = ["vault-submariner", "dollar-apple", "jackpot-supercar", "vault-gold"] as const;

/** 플레이트 위치 — 고정 좌표(랜덤 금지: SSR/CSR 이 갈리면 하이드레이션이 깨진다) */
const PLATE_LAYOUT = [
  { left: "8%", top: "24%", size: "w-[23%] max-w-[150px]", delay: "0s" },
  { left: "33%", top: "6%", size: "w-[26%] max-w-[172px]", delay: "1.6s" },
  { left: "62%", top: "20%", size: "w-[24%] max-w-[158px]", delay: "3.2s" },
  { left: "44%", top: "48%", size: "w-[21%] max-w-[136px]", delay: "4.8s" },
] as const;

interface Plate {
  box: ProductBox;
  multiple: number;
}

export function IsometricStage({ className }: { className?: string }) {
  const { boxTitle } = useProductText();

  const plates = useMemo<Plate[]>(
    () =>
      FEATURED.map((slug) => {
        const box = BOX_BY_SLUG[slug];
        if (!box) return null;
        const top = dropTable(box)[0];
        if (!top) return null;
        return { box, multiple: Math.round(top.value / box.price) };
      }).filter((x): x is Plate => x !== null),
    [],
  );

  // 5×5 다이아몬드 타일. 가운데로 갈수록 밝아져 광원이 모이는 것처럼 보인다.
  const tiles = useMemo(() => {
    const out: { key: string; r: number; c: number; lit: number }[] = [];
    for (let r = 0; r < 5; r += 1) {
      for (let c = 0; c < 5; c += 1) {
        const distance = Math.hypot(r - 2, c - 2);
        out.push({ key: `${r}-${c}`, r, c, lit: Math.max(0, 1 - distance / 3) });
      }
    }
    return out;
  }, []);

  return (
    <div className={cn("iso-stage relative -mt-8 h-[clamp(300px,38vw,520px)] w-full overflow-hidden", className)} aria-hidden="true">
      {/* ① 눕힌 타일 평면 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="iso-plane grid h-[min(78%,420px)] w-[min(78%,420px)] grid-cols-5 grid-rows-5 gap-[6px]">
          {tiles.map((tile) => (
            <span
              key={tile.key}
              className="rounded-[3px] border border-white/[0.07]"
              style={{
                background: `rgba(217,195,154,${(0.03 + tile.lit * 0.1).toFixed(3)})`,
                boxShadow: tile.lit > 0.55 ? "0 0 26px rgba(217,195,154,0.18)" : undefined,
              }}
            />
          ))}
        </div>
      </div>

      {/* ② 광원 파동 */}
      <span className="iso-sweep pointer-events-none absolute inset-0" />
      {/* 바닥 앰비언트 — 평면 중앙에 무게중심을 준다 */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(52% 40% at 50% 46%, rgba(217,195,154,0.14) 0%, transparent 72%)" }}
      />

      {/* ③ 부유 글래스 플레이트 — 기울이지 않는다 */}
      {plates.map((plate, i) => {
        const spot = PLATE_LAYOUT[i];
        if (!spot) return null;
        return (
          <figure
            key={plate.box.slug}
            className={cn("iso-plate absolute", spot.size)}
            style={{ left: spot.left, top: spot.top, animationDelay: spot.delay }}
          >
            <div
              className="overflow-hidden rounded-xl border border-white/12 bg-surface/80 backdrop-blur-sm"
              style={{ boxShadow: "0 22px 48px rgba(0,0,0,0.55)" }}
            >
              <div className="relative aspect-square">
                <ProductArt image={plate.box.image} alt={boxTitle(plate.box)} accent="#d9c39a" glowStrength={0.05} bordered={false} />
              </div>
              <figcaption className="flex items-center justify-between gap-2 border-t border-white/10 px-2.5 py-1.5">
                <span className="truncate text-[10px] leading-none text-muted">{boxTitle(plate.box)}</span>
                <span className="flex-none rounded bg-gold-champagne/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums text-gold-champagne">
                  {plate.multiple}x
                </span>
              </figcaption>
            </div>
          </figure>
        );
      })}
    </div>
  );
}

export default IsometricStage;
