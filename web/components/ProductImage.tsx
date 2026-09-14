"use client";

import { cn } from "@/lib/format";

interface Props {
  src?: string;
  emoji: string;
  /** 이미지가 없을 때의 폴백 배경 (CSS background) */
  art: string;
  className?: string;
  emojiClassName?: string;
  priority?: boolean;
  /** 이미지 위 오버레이 (그라디언트 등) */
  children?: React.ReactNode;
}

/** 검증된 로컬 제품 사진을 렌더하고, 없으면 그라디언트 + 이모지로 폴백한다 */
export function ProductImage({ src, emoji, art, className, emojiClassName, priority, children }: Props) {
  return (
    // 호출부가 absolute 로 배치하면 relative 를 덧붙이지 않는다 (Tailwind 순서상 relative 가 이겨 높이가 0이 됨)
    <div className={cn(!/\babsolute\b/.test(className ?? "") && "relative", "overflow-hidden", className)} style={{ background: art }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          draggable={false}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="absolute inset-0 h-full w-full select-none object-cover"
        />
      ) : (
        <div className={cn("absolute inset-0 flex items-center justify-center", emojiClassName)}>{emoji}</div>
      )}
      {children}
    </div>
  );
}
