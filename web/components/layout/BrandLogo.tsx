"use client";

import { cn } from "@/lib/format";
import { Link } from "@/i18n/navigation";

/**
 * VOILA 시그니처 로고 (2026-09-23 리브랜딩).
 *
 * 모든 페이지 헤더가 이 하나를 쓴다 — 다섯 군데에 같은 마크업을 복사해 두면 다음 변경 때 또 갈라진다.
 * 워드마크는 Pretendard Black + 넓은 자간, 우측에 콤팩트한 `.gg` 골드 뱃지.
 *
 * **브랜드 표기만 바뀐다** — `gachaflix.*` 로컬스토리지 키(지갑 잔액 · 보관함 · 시드 · 로케일)는
 * 기존 유저 데이터가 그대로 남도록 절대 건드리지 않는다.
 */
export function BrandLogo({
  size = "md",
  href = "/",
  asLink = true,
  className,
}: {
  /** sm = 모바일 헤더, md = 서브페이지 헤더, lg = 푸터 */
  size?: "sm" | "md" | "lg";
  href?: string;
  /** 이미 홈에 있는 헤더처럼 링크가 필요 없을 때 false */
  asLink?: boolean;
  className?: string;
}) {
  const word = size === "sm" ? "text-base" : size === "lg" ? "text-xl" : "text-xl";
  const badge = size === "sm" ? "text-[8px]" : "text-[9px]";

  const inner = (
    <>
      <span className={cn("font-display font-black uppercase leading-none tracking-wider", word)}>Voila</span>
      <span
        className={cn(
          "ml-1 rounded border border-gold-champagne/30 bg-gold-champagne/15 px-1 py-0.5 font-bold leading-none text-gold-champagne",
          badge,
        )}
      >
        .gg
      </span>
    </>
  );

  const shell = cn("inline-flex flex-none items-start whitespace-nowrap text-white transition-colors hover:text-gold-champagne", className);

  if (!asLink) return <span className={shell}>{inner}</span>;
  return (
    <Link href={href} className={shell} aria-label="VOILA">
      {inner}
    </Link>
  );
}

export default BrandLogo;
