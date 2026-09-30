"use client";

import { useMemo } from "react";
import { cn } from "@/lib/format";
import { BOX_BY_SLUG, dropTable, type ProductItem } from "@/lib/products";
import { ProductArt } from "@/components/box/ProductArt";

/**
 * /about 히어로 아래의 **시크릿 볼트 스테이지**.
 *
 * 어두운 암실 한가운데서 봉인이 풀린 보물상자가 반쯤 열리고, 그 틈에서 올라오는 황금빛 안에
 * 각 컬렉션의 **최고 당첨 상품**이 떠오른다. 카드에는 상품 사진과 배수 배지 두 가지만 있다 — 이름은 넣지 않는다.
 *
 * 레이어(뒤→앞): 비네팅 → 볼류메트릭 광선 → 보물상자 SVG → 골드 더스트 → 플로팅 플레이트.
 * 좌표·지연은 전부 고정 상수다(랜덤 금지 — SSR/CSR 이 갈리면 하이드레이션이 깨진다).
 * `prefers-reduced-motion` 이면 광선·먼지·부유가 멈춘 채 정지 상태로 그려진다(`design.css`).
 * 배수는 카탈로그에서 계산한다 — `최고 상품가 ÷ 박스 가격`.
 */

const FEATURED = ["vault-submariner", "dollar-apple", "jackpot-supercar", "vault-gold"] as const;

const PLATE_LAYOUT = [
  { left: "9%", top: "22%", size: "w-[22%] max-w-[148px]", delay: "0s" },
  { left: "34%", top: "4%", size: "w-[25%] max-w-[168px]", delay: "1.6s" },
  { left: "63%", top: "18%", size: "w-[23%] max-w-[154px]", delay: "3.2s" },
  { left: "43%", top: "44%", size: "w-[20%] max-w-[132px]", delay: "4.8s" },
] as const;

/** 금빛 입자 — 고정 좌표 12개 */
const DUST = [
  [12, 30, 1.2, 0], [22, 62, 1.6, 1.1], [30, 18, 1.1, 2.3], [41, 70, 1.8, 0.6], [52, 26, 1.3, 3.1], [58, 58, 1.5, 1.8],
  [67, 34, 1.2, 2.7], [74, 66, 1.7, 0.3], [82, 22, 1.1, 1.5], [88, 48, 1.4, 3.6], [36, 42, 1.0, 2.0], [61, 12, 1.2, 4.2],
] as const;

interface Plate {
  slug: string;
  item: ProductItem;
  multiple: number;
}

/** 반쯤 열린 옵시디언·샴페인 보물상자 — 레이어드 SVG */
function VaultChest() {
  return (
    <svg viewBox="0 0 420 240" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="vault-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3123" />
          <stop offset="0.5" stopColor="#d9c39a" />
          <stop offset="1" stopColor="#6b5a3a" />
        </linearGradient>
        <linearGradient id="vault-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c1d20" />
          <stop offset="1" stopColor="#0d0e10" />
        </linearGradient>
        <linearGradient id="vault-lid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#24262a" />
          <stop offset="1" stopColor="#121316" />
        </linearGradient>
        <radialGradient id="vault-glow" cx="50%" cy="100%" r="70%">
          <stop offset="0" stopColor="rgba(217,195,154,0.9)" />
          <stop offset="0.45" stopColor="rgba(217,195,154,0.35)" />
          <stop offset="1" stopColor="rgba(217,195,154,0)" />
        </radialGradient>
        <filter id="vault-blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      {/* 열린 틈의 빛 — 뚜껑 뒤에서 새어 나온다 */}
      <ellipse cx="210" cy="120" rx="150" ry="52" fill="url(#vault-glow)" filter="url(#vault-blur)" />

      {/* 뚜껑(뒤로 젖혀진 상태) — 원근을 위해 위가 좁은 사다리꼴 */}
      <g transform="translate(210 96)">
        <path d="M-132 0 L-104 -74 L104 -74 L132 0 Z" fill="url(#vault-lid)" stroke="url(#vault-metal)" strokeWidth="2.2" />
        <path d="M-104 -74 L-92 -62 L92 -62 L104 -74 Z" fill="rgba(217,195,154,0.12)" />
        {/* 뚜껑 안쪽 골드 라이닝 */}
        <path d="M-118 -6 L-96 -60 L96 -60 L118 -6 Z" fill="none" stroke="rgba(217,195,154,0.35)" strokeWidth="1" />
      </g>

      {/* 몸통 */}
      <g transform="translate(210 100)">
        <rect x="-140" y="0" width="280" height="112" rx="6" fill="url(#vault-body)" stroke="url(#vault-metal)" strokeWidth="2.4" />
        {/* 챔퍼 테두리 하이라이트 */}
        <rect x="-134" y="6" width="268" height="100" rx="4" fill="none" stroke="rgba(217,195,154,0.22)" strokeWidth="1" />
        {/* 금속 밴드 */}
        <rect x="-92" y="0" width="10" height="112" fill="url(#vault-metal)" opacity="0.85" />
        <rect x="82" y="0" width="10" height="112" fill="url(#vault-metal)" opacity="0.85" />
        {/* 잠금 해제된 시크릿 크레스트 */}
        <g transform="translate(0 52)">
          <circle r="24" fill="#111215" stroke="url(#vault-metal)" strokeWidth="2.2" />
          <circle r="17" fill="none" stroke="rgba(217,195,154,0.55)" strokeWidth="1" />
          <path d="M0 -10 L8 -2 L0 12 L-8 -2 Z" fill="#d9c39a" opacity="0.95" />
          {/* 열린 걸쇠 */}
          <path d="M-30 -30 a12 12 0 0 1 24 0 v10" fill="none" stroke="#d9c39a" strokeWidth="3" strokeLinecap="round" transform="rotate(-28 0 0)" />
        </g>
        {/* 몸통 위 열린 틈의 골드 글로우 라인 */}
        <rect x="-136" y="-2" width="272" height="3" fill="#d9c39a" opacity="0.9" />
      </g>
    </svg>
  );
}

export function IsometricStage({ className }: { className?: string }) {
  const plates = useMemo<Plate[]>(
    () =>
      FEATURED.map((slug): Plate | null => {
        const box = BOX_BY_SLUG[slug];
        const top = box ? dropTable(box)[0] : undefined;
        return box && top ? { slug, item: top, multiple: Math.round(top.value / box.price) } : null;
      }).filter((x): x is Plate => x !== null),
    [],
  );

  return (
    <div className={cn("vault-stage relative -mt-8 h-[clamp(300px,38vw,520px)] w-full overflow-hidden", className)} aria-hidden="true">
      {/* 볼류메트릭 골드 라이트 빔 — 상자 틈에서 위로 퍼진다 */}
      <span className="vault-rays pointer-events-none absolute inset-x-0 bottom-[8%] mx-auto h-[86%] w-[min(92%,760px)]" />
      {/* 보물상자 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-[62%] w-[min(70%,560px)]">
        <VaultChest />
      </div>
      {/* 골드 더스트 */}
      {DUST.map(([x, y, s, d], i) => (
        <span
          key={i}
          className="vault-dust pointer-events-none absolute rounded-full bg-gold-champagne"
          style={{ left: `${x}%`, top: `${y}%`, width: `${s * 2}px`, height: `${s * 2}px`, animationDelay: `${d}s`, opacity: 0 }}
        />
      ))}
      {/* 딥 비네팅 — 캔버스 #0b0b0b 로 녹아든다 */}
      <span className="vault-vignette pointer-events-none absolute inset-0" />

      {/* 플로팅 플레이트 — 최고 당첨 상품 사진 + 배수 배지 */}
      {plates.map((plate, i) => {
        const spot = PLATE_LAYOUT[i];
        if (!spot) return null;
        return (
          <figure key={plate.slug} className={cn("iso-plate absolute", spot.size)} style={{ left: spot.left, top: spot.top, animationDelay: spot.delay }}>
            <div className="relative overflow-hidden rounded-xl border border-white/12 bg-surface/80 backdrop-blur-sm" style={{ boxShadow: "0 22px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(217,195,154,0.12)" }}>
              <div className="relative aspect-square">
                <ProductArt image={plate.item.image} alt="" accent="#d9c39a" glowStrength={0.06} bordered={false} kind={plate.item.kind} />
              </div>
              <figcaption className="absolute right-2 top-2 rounded-full border border-gold-champagne/50 bg-obsidian/85 px-2 py-1 text-[11px] font-semibold leading-none tabular-nums text-gold-champagne shadow-[0_0_14px_rgba(217,195,154,0.35)] backdrop-blur-sm">
                {plate.multiple}x
              </figcaption>
            </div>
          </figure>
        );
      })}
    </div>
  );
}

export default IsometricStage;
