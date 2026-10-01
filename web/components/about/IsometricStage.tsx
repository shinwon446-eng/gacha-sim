"use client";

import { useMemo, useRef, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/format";
import { BOX_BY_SLUG, dropTable, type ProductBox } from "@/lib/products";
import { useProductText } from "@/lib/useProductText";
import { ProductArt } from "@/components/box/ProductArt";

/**
 * /about 히어로 아래 **아이소메트릭 쇼룸 스테이지**.
 *
 * 핵심은 카드가 바닥 위에 "서 있다"는 것이다. 예전 버전은 타일 평면과 카드가 서로 다른 좌표계에 떠 있어
 * 따로 놀았다. 지금은 카드를 **평면 그리드의 칸 안에** 넣고, 평면의 변환(`rotateX(58) rotateZ(-45)`)을
 * 카드 안에서 역으로 되돌려(`rotateZ(45) rotateX(-58)`) 화면과 평행하게 세운다. 그래서
 *   · 카드 밑변이 정확히 그 타일 위에 놓이고(받침 타일 + 바닥 그림자가 같은 칸에 붙는다)
 *   · 원근 때문에 뒤쪽 카드는 작고 앞쪽 카드는 크며, 겹침 순서도 3D 깊이로 자동 정렬된다
 *   · 상품 사진은 기울지 않아 그대로 읽힌다.
 *
 * 평면은 7×7 다이아몬드. 그리드 (r, c) 의 화면 x 는 (c + r), 깊이는 (r − c) 에 비례한다 —
 * (0,6) 이 가장 뒤 꼭짓점, (6,0) 이 가장 앞 꼭짓점이다.
 *
 * 배수는 카탈로그에서 계산한다 — `780x` 는 실제 `최고 상품가 ÷ 박스 가격`이다(지어내지 않는다).
 */

const GRID = 7;

/** 스테이지에 세우는 대표 컬렉션과 그 카드가 서는 타일 좌표(고정 — 랜덤은 하이드레이션을 깨뜨린다) */
const FEATURED: { slug: string; r: number; c: number; width: string; delay: string }[] = [
  // 앞줄 두 장(x = 3 · 9)이 주인공, 뒷줄 두 장(x = 4 · 8)이 그 어깨 너머로 보인다 — 좌우 대칭(중심 x = 6)
  { slug: "vault-submariner", r: 3, c: 0, width: "clamp(120px, 16vw, 210px)", delay: "0s" }, // 앞·왼쪽
  { slug: "dollar-apple", r: 1, c: 3, width: "clamp(84px, 11vw, 150px)", delay: "1.8s" }, // 뒤·왼쪽
  { slug: "jackpot-supercar", r: 3, c: 5, width: "clamp(92px, 12vw, 164px)", delay: "3.6s" }, // 뒤·오른쪽
  { slug: "vault-gold", r: 6, c: 3, width: "clamp(112px, 15vw, 200px)", delay: "5.4s" }, // 앞·오른쪽
];

/** 골드 더스트 — 고정 좌표(랜덤 금지: SSR/CSR 하이드레이션) */
const DUST = [
  { l: "18%", t: "70%", d: "0s", s: 3 }, { l: "26%", t: "58%", d: "1.4s", s: 2 }, { l: "34%", t: "76%", d: "2.6s", s: 2 },
  { l: "41%", t: "52%", d: "0.8s", s: 3 }, { l: "47%", t: "68%", d: "3.4s", s: 2 }, { l: "53%", t: "48%", d: "1.9s", s: 2 },
  { l: "58%", t: "74%", d: "4.2s", s: 3 }, { l: "64%", t: "56%", d: "0.4s", s: 2 }, { l: "71%", t: "66%", d: "2.2s", s: 2 },
  { l: "78%", t: "54%", d: "3.8s", s: 3 }, { l: "84%", t: "72%", d: "1.1s", s: 2 }, { l: "30%", t: "44%", d: "4.8s", s: 2 },
  { l: "68%", t: "40%", d: "5.4s", s: 2 }, { l: "50%", t: "36%", d: "2.9s", s: 3 },
] as const;

/** 포인터를 따라 기우는 카드. 리렌더 없이 style 만 바꾼다 */
function TiltCard({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateX(${(-y * 16).toFixed(2)}deg) rotateY(${(x * 18).toFixed(2)}deg) translateZ(18px)`;
    el.style.setProperty("--glare-x", `${((x + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty("--glare-y", `${((y + 0.5) * 100).toFixed(1)}%`);
  };
  const leave = () => {
    const el = ref.current;
    if (el) el.style.transform = "";
  };
  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={leave} className="iso-tilt relative">
      {children}
      <span aria-hidden className="iso-glare pointer-events-none absolute inset-0 rounded-xl" />
    </div>
  );
}

interface Plate {
  box: ProductBox;
  multiple: number;
  r: number;
  c: number;
  width: string;
  delay: string;
}

export function IsometricStage({ className }: { className?: string }) {
  const { boxTitle } = useProductText();

  const plates = useMemo<Plate[]>(
    () =>
      FEATURED.map((spot): Plate | null => {
        const box = BOX_BY_SLUG[spot.slug];
        if (!box) return null;
        const top = dropTable(box)[0];
        if (!top) return null;
        return { box, multiple: Math.round(top.value / box.price), ...spot };
      }).filter((x): x is Plate => x !== null),
    [],
  );

  const plateAt = useMemo(() => {
    const map = new Map<string, Plate>();
    plates.forEach((p) => map.set(`${p.r}-${p.c}`, p));
    return map;
  }, [plates]);

  // 7×7 타일. 카드가 선 칸은 받침대(밝은 타일)가 되고, 그 주변 칸도 은은히 밝아진다.
  const tiles = useMemo(() => {
    const out: { key: string; r: number; c: number; lit: number }[] = [];
    for (let r = 0; r < GRID; r += 1) {
      for (let c = 0; c < GRID; c += 1) {
        let lit = Math.max(0, 0.35 - Math.hypot(r - 3, c - 3) / 9);
        FEATURED.forEach((f) => {
          const d = Math.hypot(r - f.r, c - f.c);
          lit = Math.max(lit, d === 0 ? 1 : Math.max(0, 0.55 - d * 0.22));
        });
        out.push({ key: `${r}-${c}`, r, c, lit });
      }
    }
    return out;
  }, []);

  return (
    <div
      className={cn("iso-stage relative -mt-4 h-[clamp(360px,41vw,580px)] w-full overflow-hidden md:-mt-6", className)}
      aria-hidden="true"
    >
      {/* 바닥에서 피어오르는 골드 라이트 레이 */}
      <span className="iso-rays pointer-events-none absolute inset-x-[10%] bottom-[8%] top-[-10%]" />
      {/* 바닥 앰비언트 — 평면 중앙에 무게중심 */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(48% 34% at 50% 58%, rgba(217,195,154,0.16) 0%, transparent 72%)" }}
      />

      {/* 눕힌 타일 평면. 카드는 이 평면의 칸 안에서 세워진다 */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ transform: "translateY(6%)" }}>
        <div
          className="iso-plane grid gap-[5px]"
          style={{
            width: "clamp(340px, 64vw, 820px)",
            height: "clamp(340px, 64vw, 820px)",
            gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${GRID}, minmax(0, 1fr))`,
          }}
        >
          {tiles.map((tile) => {
            const plate = plateAt.get(tile.key);
            return (
              <div
                key={tile.key}
                className="iso-cell relative rounded-[3px] border border-white/[0.07]"
                style={{
                  background: `rgba(217,195,154,${(0.025 + tile.lit * 0.16).toFixed(3)})`,
                  boxShadow: tile.lit > 0.5 ? `0 0 ${Math.round(14 + tile.lit * 30)}px rgba(217,195,154,${(tile.lit * 0.28).toFixed(2)})` : undefined,
                }}
              >
                {plate ? (
                  <>
                    {/* 받침 타일 — 바닥에 눕는 골드 링 + 바닥 그림자 */}
                    <span className="pointer-events-none absolute inset-[-6%] rounded-[4px] border border-gold-champagne/50" />
                    <span
                      className="pointer-events-none absolute inset-[-70%] rounded-full"
                      style={{ background: "radial-gradient(closest-side, rgba(0,0,0,0.55), transparent 70%)" }}
                    />
                    <span
                      className="pointer-events-none absolute inset-[-120%] rounded-full"
                      style={{ background: "radial-gradient(closest-side, rgba(217,195,154,0.22), transparent 72%)" }}
                    />
                    {/* 세워진 카드 — 평면 변환을 역으로 되돌려 화면과 평행하게 세운다 */}
                    <div className="iso-stand absolute left-1/2 top-1/2" style={{ width: plate.width }}>
                      {/* 카드 뒤 세로 스포트라이트 */}
                      <span
                        className="pointer-events-none absolute inset-x-[-40%] bottom-[-10%] top-[-50%]"
                        style={{ background: "radial-gradient(60% 70% at 50% 100%, rgba(217,195,154,0.22) 0%, transparent 70%)" }}
                      />
                      <figure className="iso-plate relative" style={{ animationDelay: plate.delay }}>
                        <TiltCard>
                        <div
                          className="overflow-hidden rounded-xl border border-white/15 bg-surface/90 backdrop-blur-sm"
                          style={{ boxShadow: "0 30px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(217,195,154,0.12)" }}
                        >
                          <div className="relative aspect-square">
                            <ProductArt image={plate.box.image} alt={boxTitle(plate.box)} accent="#d9c39a" glowStrength={0.06} bordered={false} />
                          </div>
                          <figcaption className="flex items-center justify-between gap-2 border-t border-white/10 px-2.5 py-1.5">
                            <span className="truncate text-[10px] leading-none text-muted">{boxTitle(plate.box)}</span>
                            <span className="flex-none rounded bg-gold-champagne/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums text-gold-champagne">
                              {plate.multiple}x
                            </span>
                          </figcaption>
                        </div>
                        </TiltCard>
                        {/* 바닥 반사 */}
                        <span
                          className="pointer-events-none absolute inset-x-[10%] top-full h-[38%] rounded-b-xl opacity-40"
                          style={{
                            background: "linear-gradient(to bottom, rgba(217,195,154,0.28), transparent 85%)",
                            maskImage: "linear-gradient(to bottom, #000, transparent)",
                            WebkitMaskImage: "linear-gradient(to bottom, #000, transparent)",
                          }}
                        />
                      </figure>
                    </div>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* 평면 위를 지나가는 샴페인 광원 */}
      <span className="iso-sweep pointer-events-none absolute inset-0" />

      {/* 골드 더스트 */}
      {DUST.map((p, i) => (
        <span
          key={i}
          className="iso-dust pointer-events-none absolute rounded-full bg-[#f1dcae]"
          style={{ left: p.l, top: p.t, width: p.s, height: p.s, animationDelay: p.d }}
        />
      ))}

      {/* 비네팅 — 가장자리를 눌러 시선을 가운데로 */}
      <span className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(70% 80% at 50% 55%, transparent 55%, rgba(11,11,11,0.75) 100%)" }} />
    </div>
  );
}

export default IsometricStage;
