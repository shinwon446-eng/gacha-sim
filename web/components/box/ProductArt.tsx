"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/format";
import { glow } from "@/lib/tiers";
import type { ProductImage } from "@/lib/productImages";

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
  priority?: boolean;
  className?: string;
}

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
      style={{ filter: `drop-shadow(0 0 10px ${glow(accent, 0.35)})` }}
    >
      {/* 몸통 — 아이소메트릭 상자, 면마다 명도 차이만 */}
      <polygon points="60,18 106,40 106,86 60,108 14,86 14,40" fill="#121212" />
      <polygon points="60,18 106,40 60,62 14,40" fill="#1E1E1E" />
      <polygon points="14,40 60,62 60,108 14,86" fill="#161616" />
      <polygon points="60,62 106,40 106,86 60,108" fill="#0E0E0E" />
      {/* 림 라이트 — 윗면 두 모서리 */}
      <polyline points="14,40 60,18 106,40" fill="none" stroke={accent} strokeWidth="1.2" strokeLinejoin="round" opacity="0.85" />
      <polyline points="14,40 60,62 106,40" fill="none" stroke={accent} strokeWidth="0.8" strokeLinejoin="round" opacity="0.45" />
      {/* 뚜껑 틈 */}
      <line x1="60" y1="62" x2="60" y2="108" stroke={glow(accent, 0.25)} strokeWidth="0.8" />
    </svg>
  );
}

/**
 * 실물 비주얼. 이미지 뒤에 백글로우를 깔고, 로딩 실패는 조용히 실루엣으로 떨어진다.
 * 어떤 경우에도 텍스트를 이미지 위에 합성하지 않는다.
 */
export function ProductArt({
  image,
  alt,
  accent = "#00D2FF",
  fit,
  glowStrength = 0.22,
  fallbackSize = "md",
  priority = false,
  className,
}: ProductArtProps) {
  // 상태를 src 에 묶는다. src 가 바뀌면 자동으로 "아직 안 됨"이 되므로 리셋 이펙트가 필요 없다.
  // (리셋 이펙트는 ref 콜백보다 늦게 실행돼 방금 세운 loaded 를 도로 지워버린다.)
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const loaded = loadedSrc === image.src;
  const failed = failedSrc === image.src;

  // 하이드레이션 전에 캐시에서 이미 완료된 이미지는 onLoad 가 다시 발화하지 않는다.
  // 마운트 시점에 complete 를 직접 확인해야 opacity 0 에 갇히지 않는다.
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
    <div className={cn("relative h-full w-full overflow-hidden bg-surface", className)}>
      {/* 무광 다크 매트 */}
      <span
        aria-hidden
        className="absolute inset-0"
        style={{ background: "radial-gradient(70% 60% at 50% 55%, #232323 0%, #1B1B1B 55%, #141414 100%)" }}
      />
      {/* 백글로우 — 상품 뒤에서 위로 번지는 선형 그라데이션 */}
      <span
        aria-hidden
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: showImage && !loaded ? 0.4 : 1,
          background: `linear-gradient(180deg, transparent 0%, ${glow(accent, glowStrength * 0.35)} 45%, ${glow(accent, glowStrength)} 75%, transparent 100%)`,
          maskImage: "radial-gradient(65% 70% at 50% 60%, #000 30%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(65% 70% at 50% 60%, #000 30%, transparent 100%)",
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
            "absolute inset-0 h-full w-full transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0",
            mode === "contain"
              ? "object-contain p-[8%] drop-shadow-[0_22px_30px_rgba(0,0,0,0.65)]"
              : "object-cover",
          )}
        />
      ) : (
        <BoxSilhouette accent={accent} size={fallbackSize} />
      )}

      {/* 사진(cover)은 배경이 밝을 수 있어 다크 톤으로 눌러준다 */}
      {showImage && mode === "cover" && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(20,20,20,0.15) 0%, rgba(20,20,20,0) 40%, rgba(20,20,20,0.35) 100%)",
          }}
        />
      )}

      {/* 비네트 — 가장자리를 눌러 피사체를 띄운다 */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(110% 95% at 50% 45%, transparent 55%, rgba(0,0,0,0.5) 100%)",
        }}
      />
      {/* 네온 림 — 프레임 안쪽 1px */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: `inset 0 0 0 1px ${glow(accent, 0.18)}, inset 0 0 18px ${glow(accent, 0.12)}` }}
      />
    </div>
  );
}

export default ProductArt;
