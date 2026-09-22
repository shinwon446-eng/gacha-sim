"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/format";
import { useTranslations } from "next-intl";
import { useProductText } from "@/lib/useProductText";
import { useCanHover } from "@/lib/useCanHover";
import { type ProductBox } from "@/lib/products";
import { boxTopTier, formatMultiple, glow, topMultiple } from "@/lib/tiers";
import { ProductArt } from "@/components/box/ProductArt";
import { Money } from "@/components/ui/Money";

/** 행 가장자리 — 확대 시 transform-origin 보정용. */
export type CardEdge = "first" | "last" | "middle";

export interface BoxCardProps {
  box: ProductBox;
  edge?: CardEdge;
  /** TRENDING 행에서만 전달. 카드 뒤 오버사이즈 순위 숫자 + 🔥 HOT 뱃지에 쓴다. */
  rank?: number;
  /** 호버 상태 통지 — 행이 z-index 를 올리는 데 쓴다. */
  onExpandChange?: (expanded: boolean) => void;
  onOpen?: (box: ProductBox) => void;
  onInspect?: (box: ProductBox) => void;
  className?: string;
}

/**
 * 럭셔리 박스 카드 — 클린 쇼케이스 (2026-09-23 운영자 지시 전면 개편).
 *
 * 사진이 상품이다. 사진 위에 얹는 것은 **우상단 미니 뱃지 단 하나**뿐이다.
 *   · 삭제: 상단 '100% 꽝 없음 · 최소 N USDT 보장' 배너, '최소 N% 환급' 뱃지,
 *           '⚡ 전 품목 95% 즉시 정산' 배너, 무지개 등급 바(GameTierBar),
 *           호버 시 카드 밖으로 튀어나오던 대표 아이템 3D 팝아웃, 바닥 플로팅 확장 패널.
 *     (보장·환급·정밀 확률은 전부 상세 모달과 /fairness 에 그대로 남아 있다 — 숨기는 게 아니라 옮긴 것)
 *   · 유지: 여백 + 다크 비네팅, 호버 시 사진 1.03x 줌과 은은한 골드 림라이트.
 *     시야를 가리는 팝업·돌출은 띄우지 않는다.
 *   · 메타: 박스명(화이트 볼드) / 1회 가격 / 최고 배수(샴페인 골드).
 *
 * 등급색은 데이터에서 오므로 인라인 style 로만 전달한다 — 그 외 레이아웃은 전부 유틸리티 클래스.
 */
export function BoxCard({ box, edge = "middle", rank, onExpandChange, onInspect, className }: BoxCardProps) {
  const tr = useTranslations();
  const { boxTitle } = useProductText();
  const canHover = useCanHover();
  const [hovered, setHovered] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const meta = useMemo(() => ({ topTier: boxTopTier(box), mult: topMultiple(box) }), [box]);

  const leave = useCallback(() => setHovered(false), []);

  useEffect(() => {
    onExpandChange?.(hovered);
  }, [hovered, onExpandChange]);

  useEffect(() => setImgFailed(false), [box.imageUrl]);

  const origin = edge === "first" ? "left center" : edge === "last" ? "right center" : "center center";
  const showImg = !!box.imageUrl && !imgFailed;
  const accent = meta.topTier.accent;
  const royal = meta.topTier.key === "royal";
  const hot = typeof rank === "number" && rank <= 3;

  return (
    <div className={cn("relative", className)} style={{ zIndex: hovered ? 20 : 10 }} onMouseEnter={() => canHover && setHovered(true)} onMouseLeave={leave}>
      {/* 넷플릭스 오버사이즈 순위 숫자 — 오른쪽 20% 가 카드 뒤로 들어간다(글리프 폭과 무관). 모바일은 여백·크기 축소 */}
      {typeof rank === "number" && (
        <span aria-hidden className="rank-numeral pointer-events-none absolute bottom-1 left-5 z-0 -translate-x-[80%] font-display sm:left-7">
          {rank}
        </span>
      )}

      <motion.div className={cn("relative", typeof rank === "number" && "ml-5 sm:ml-7")} style={{ transformOrigin: origin }}>
        <div
          className={cn(
            "relative cursor-pointer overflow-hidden rounded-xl bg-surface",
            royal ? "border-metallic-gold" : "border-metallic-subtle",
            hovered && "gold-rimlight",
          )}
          style={{
            // 호버 시 최고 등급 색으로 헤어라인 점화. 등급색은 데이터 값이라 인라인.
            boxShadow: hovered ? `0 18px 40px rgba(0,0,0,0.65), 0 0 0 1px ${glow(accent, 0.5)}, 0 0 26px ${glow(accent, 0.18)}` : undefined,
          }}
          onClick={() => onInspect?.(box)}
          role="button"
          tabIndex={0}
          aria-label={tr("card.details", { title: boxTitle(box) })}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onInspect?.(box);
            }
          }}
        >
          {/* ── 비주얼 — 피사체를 가리는 것은 아무것도 얹지 않는다 ── */}
          <div className="relative aspect-video w-full overflow-hidden bg-obsidian">
            {showImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={box.imageUrl!}
                alt={boxTitle(box)}
                draggable={false}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className={cn("h-full w-full object-cover transition-transform duration-500 ease-out", hovered && "scale-[1.03]")}
              />
            ) : (
              <ProductArt image={{ src: null }} alt={boxTitle(box)} accent={accent} fallbackSize="md" />
            )}
            {/* 다크 비네팅 — 가장자리만 눌러 피사체를 또렷하게. 중앙은 건드리지 않는다 */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(72% 64% at 50% 44%, transparent 0%, transparent 52%, rgba(0,0,0,0.42) 100%)" }}
            />
            <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-surface to-transparent" />

            {/* 사진 위의 유일한 요소 — 우상단 미니 뱃지 하나 */}
            <span className="absolute right-2 top-2 z-10">
              {hot ? (
                <span className="hot-pulse whitespace-nowrap rounded-sm border border-crimson/60 bg-crimson/25 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white backdrop-blur-sm">
                  🔥 HOT
                </span>
              ) : (
                <span className="whitespace-nowrap rounded-sm border border-gold-champagne/45 bg-obsidian/80 px-1.5 py-0.5 text-[9px] font-bold leading-none tabular-nums text-gold-champagne backdrop-blur-sm">
                  {tr("tiers.multiple", { n: formatMultiple(meta.mult) })}
                </span>
              )}
            </span>
          </div>

          {/* ── 메타 — 박스명 · 1회 가격 · 최고 배수 ── */}
          <div className="border-t border-hairline px-2 pb-1.5 pt-2 sm:px-3 sm:pb-2 sm:pt-3">
            <div className="truncate text-[13px] font-bold leading-tight text-white sm:text-sm">{boxTitle(box)}</div>
            <div className="mt-1 flex items-end justify-between gap-2 sm:mt-1.5">
              <div>
                <div className="caption-luxury">{tr("card.perOpen")}</div>
                <Money value={box.price} size="md" />
              </div>
              <div className="text-right">
                <div className="caption-luxury">{tr("card.top")}</div>
                <div
                  className={cn("whitespace-nowrap font-display text-lg font-bold leading-none tracking-tight tabular-nums sm:text-xl", royal && "text-gold-gradient")}
                  style={royal ? undefined : { color: accent }}
                >
                  {tr("tiers.multiple", { n: formatMultiple(meta.mult) })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default BoxCard;
