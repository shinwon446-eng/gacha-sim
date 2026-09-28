"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { cn } from "@/lib/format";
import { Link } from "@/i18n/navigation";

/**
 * 히어로 바로 아래 한 줄 배너 — `/about`(플랫폼 소개)으로 가는 길.
 *
 * 모바일 헤더에는 텍스트 내비가 없어(`hidden md:flex`, 하단 내비가 대신한다) 플랫폼 소개로 가는 경로가
 * 푸터 링크 하나뿐이었다. 스크롤 초반에 한 줄만 놓아 그 길을 열어 준다 — 높이를 최소로 가져가
 * 스티키 퀵 탭과 그리드가 밀리지 않게 한다.
 */
export function AboutBanner({ className }: { className?: string }) {
  const t = useTranslations("aboutBanner");
  return (
    <Link
      href="/about"
      className={cn(
        "group flex items-center gap-3 border-y border-hairline bg-obsidian/70 px-4 py-2.5 transition-colors hover:bg-obsidian sm:px-[4%]",
        className,
      )}
    >
      <ShieldCheck className="h-4 w-4 flex-none text-gold-champagne" strokeWidth={2.3} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-bold text-white sm:text-[13px]">{t("title")}</span>
        {/* 부제는 모바일에서 한 줄을 넘기면 잘라낸다 — 배너가 두 줄이 되면 그리드가 밀린다 */}
        <span className="block truncate text-[10px] leading-relaxed text-faint sm:text-[11px]">{t("body")}</span>
      </span>
      <span className="flex flex-none items-center gap-1 whitespace-nowrap text-[11px] font-bold text-gold-champagne sm:text-xs">
        {t("cta")}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.4} />
      </span>
    </Link>
  );
}

export default AboutBanner;
