"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/format";
import { glow } from "@/lib/tiers";
import type { ProductImage } from "@/lib/productImages";
import type { ItemKind } from "@/lib/products";

export interface ProductArtProps {
  image: ProductImage;
  alt: string;
  /** 림 라이트 / 백글로우 색. 보통 등급 액센트. */
  accent?: string;
  /**
   * cover  — 사진을 프레임에 꽉 채운다 (배경 있는 일반 사진)
   * contain — 누끼를 다크 매트 위에 띄운다 (투명 PNG). image.cutout 이 true 면 자동으로 이쪽.
   */
  fit?: "cover" | "contain";
  /** 백글로우 세기. 썸네일은 낮게, 히어로는 높게. */
  glowStrength?: number;
  /** 폴백 실루엣 크기 */
  fallbackSize?: "sm" | "md" | "lg";
  /** 이미지가 없을 때 — cash 는 USDT 토큰, digital 은 기프트카드 글리프로 그린다 */
  kind?: ItemKind;
  /** 쇼케이스 1px 헤어라인 — 타일에는 켜고, 히어로처럼 프레임이 따로 있는 곳은 끈다 */
  bordered?: boolean;
  priority?: boolean;
  className?: string;
}

/**
 * 소더비 다크 쇼케이스 매트 — 중앙 샴페인 골드 방사형 핀조명 위에 상품이 떠 있게 한다.
 * 컨테이너: radial-gradient(circle, rgba(230,202,101,0.12) 0%, rgba(15,15,20,0.95) 75%) + 1px 헤어라인.
 */
export const SHOWCASE_BG = "radial-gradient(circle, rgba(230, 202, 101, 0.12) 0%, rgba(15, 15, 20, 0.95) 75%)";
export const SHOWCASE_BORDER = "1px solid rgba(255, 255, 255, 0.08)";

/**
 * 폴백 — 어두운 미니멀 박스 실루엣.
 * 코드 텍스트 대신 "열리지 않은 상자"를 그린다. 얇은 림 라이트 한 줄로 형태만 잡는다.
 */
function BoxSilhouette({ accent, size }: { accent: string; size: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "w-[46%]" : size === "md" ? "w-[52%]" : "w-[58%]";
  return (
    <svg
      viewBox="0 0 120 110"
      aria-hidden
      className={cn("absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2", dim)}
      style={{ filter: `drop-shadow(0 12px 16px rgba(0,0,0,0.6)) drop-shadow(0 0 10px ${glow(accent, 0.35)})` }}
    >
      <polygon points="60,18 106,40 106,86 60,108 14,86 14,40" fill="#121212" />
      <polygon points="60,18 106,40 60,62 14,40" fill="#1E1E1E" />
      <polygon points="14,40 60,62 60,108 14,86" fill="#161616" />
      <polygon points="60,62 106,40 106,86 60,108" fill="#0E0E0E" />
      <polyline points="14,40 60,18 106,40" fill="none" stroke={accent} strokeWidth="1.2" strokeLinejoin="round" opacity="0.85" />
      <polyline points="14,40 60,62 106,40" fill="none" stroke={accent} strokeWidth="0.8" strokeLinejoin="round" opacity="0.45" />
      <line x1="60" y1="62" x2="60" y2="108" stroke={glow(accent, 0.25)} strokeWidth="0.8" />
    </svg>
  );
}

/** USDT 즉시 캐시백 / 인스턴트 드롭 — 샴페인 골드 토큰 */
function CashToken({ size }: { size: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "w-[40%]" : size === "md" ? "w-[46%]" : "w-[54%]";
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={cn("absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2", dim)} style={{ filter: "drop-shadow(0 12px 16px rgba(0,0,0,0.6)) drop-shadow(0 0 14px rgba(230,202,101,0.35))" }}>
      <defs>
        <linearGradient id="cash-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F3E3A3" />
          <stop offset="0.5" stopColor="#D4AF37" />
          <stop offset="1" stopColor="#8A6D1F" />
        </linearGradient>
        <radialGradient id="cash-face" cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#2A2417" />
          <stop offset="1" stopColor="#0E0C08" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#cash-rim)" />
      <circle cx="50" cy="50" r="39" fill="url(#cash-face)" stroke="rgba(243,227,163,0.35)" strokeWidth="1" />
      <text x="50" y="64" textAnchor="middle" fontSize="40" fontWeight="700" fill="#E6CA65" fontFamily="Pretendard Variable, Pretendard, sans-serif">₮</text>
    </svg>
  );
}

/** 글로벌 디지털 자산(기프트카드 · 월렛 코드) — 블랙 카드 */
function GiftCard({ accent, size }: { accent: string; size: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "w-[54%]" : size === "md" ? "w-[60%]" : "w-[68%]";
  return (
    <svg viewBox="0 0 160 100" aria-hidden className={cn("absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2", dim)} style={{ filter: "drop-shadow(0 12px 16px rgba(0,0,0,0.6))" }}>
      <defs>
        <linearGradient id="gc-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#262626" />
          <stop offset="1" stopColor="#0C0C0C" />
        </linearGradient>
      </defs>
      <rect x="4" y="8" width="152" height="86" rx="10" fill="url(#gc-body)" stroke={glow(accent, 0.55)} strokeWidth="1.2" />
      <rect x="4" y="30" width="152" height="12" fill="rgba(255,255,255,0.06)" />
      <rect x="18" y="58" width="34" height="22" rx="4" fill="#E6CA65" opacity="0.9" />
      <rect x="62" y="64" width="70" height="4" rx="2" fill="rgba(255,255,255,0.35)" />
      <rect x="62" y="74" width="46" height="4" rx="2" fill="rgba(255,255,255,0.2)" />
      <circle cx="136" cy="20" r="6" fill={accent} opacity="0.9" />
    </svg>
  );
}

/**
 * 실물 비주얼 — 소더비 경매장 다크 쇼케이스.
 * 이미지 뒤에 샴페인 골드 방사형 핀조명을 깔고, 상품은 drop-shadow 로 공중에 띄운다. 어두운 딤 오버레이는 두지 않는다.
 * 로딩 실패는 조용히 실루엣(또는 kind 별 글리프)으로 떨어진다. 어떤 경우에도 텍스트를 이미지 위에 합성하지 않는다.
 */
export function ProductArt({
  image,
  alt,
  accent = "#E6CA65",
  fit,
  glowStrength = 0.22,
  fallbackSize = "md",
  kind,
  bordered = true,
  priority = false,
  className,
}: ProductArtProps) {
  // 상태를 src 에 묶는다. src 가 바뀌면 자동으로 "아직 안 됨"이 되므로 리셋 이펙트가 필요 없다.
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const loaded = loadedSrc === image.src;
  const failed = failedSrc === image.src;

  // 하이드레이션 전에 캐시에서 이미 완료된 이미지는 onLoad 가 다시 발화하지 않는다.
  const attach = useCallback(
    (el: HTMLImageElement | null) => {
      if (el && el.complete && image.src) {
        if (el.naturalWidth > 0) setLoadedSrc(image.src);
        else setFailedSrc(image.src);
      }
    },
    [image.src],
  );

  const mode = fit ?? (image.cutout ? "contain" : "cover");
  const showImage = !!image.src && !failed;

  return (
    <div className={cn("group/art relative h-full w-full overflow-hidden", className)} style={{ background: SHOWCASE_BG, border: bordered ? SHOWCASE_BORDER : undefined }}>
      {/* 등급 액센트 백글로우 — 핀조명 아래에서 살짝 번진다 */}
      <span
        aria-hidden
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: showImage && !loaded ? 0.4 : 1,
          background: `radial-gradient(60% 55% at 50% 58%, ${glow(accent, glowStrength)} 0%, ${glow(accent, glowStrength * 0.35)} 45%, transparent 100%)`,
        }}
      />

      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={attach}
          src={image.src!}
          alt={alt}
          draggable={false}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoadedSrc(image.src)}
          onError={() => setFailedSrc(image.src)}
          className={cn(
            "absolute inset-0 h-full w-full transition-transform duration-500 ease-out group-hover/art:scale-[1.04]",
            mode === "contain" ? "object-contain p-[8%] drop-shadow-[0_12px_16px_rgba(0,0,0,0.6)]" : "object-cover",
          )}
        />
      ) : kind === "cash" ? (
        <CashToken size={fallbackSize} />
      ) : kind === "digital" ? (
        <GiftCard accent={accent} size={fallbackSize} />
      ) : (
        <BoxSilhouette accent={accent} size={fallbackSize} />
      )}
      {/* 로딩 매트 — 이미지 위에 덮였다가 로드되면 걷힌다 */}
      {showImage && (
        <span aria-hidden className={cn("pointer-events-none absolute inset-0 transition-opacity duration-500", loaded ? "opacity-0" : "opacity-100")} style={{ background: SHOWCASE_BG }} />
      )}

      {/* 중앙 핀조명 — 사진(cover)은 딤 대신 가운데를 밝히고 가장자리만 살짝 누른다 */}
      {showImage && mode === "cover" && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(70% 60% at 50% 45%, rgba(230,202,101,0.08) 0%, transparent 55%, rgba(0,0,0,0.35) 100%)" }}
        />
      )}
      {/* 네온 림 — 프레임 안쪽 1px */}
      <span aria-hidden className="pointer-events-none absolute inset-0" style={{ boxShadow: `inset 0 0 0 1px ${glow(accent, 0.18)}, inset 0 0 18px ${glow(accent, 0.12)}` }} />
    </div>
  );
}

export default ProductArt;
