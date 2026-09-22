"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { BOXES, dropTable } from "@/lib/products";

/**
 * 잭팟 풀 = 지금 열려 있는 박스들의 **최고 상품 가치 합계**(USDT).
 * 상품 카탈로그에서 계산한 실제 수치다 — 올라가는 연출은 있어도 없는 돈을 지어내지 않는다.
 * live 모드에서 API 가 실제 상금 풀을 주면 이 자리에 그대로 들어간다.
 */
export function jackpotPoolUsdt(): number {
  return +BOXES.reduce((sum, b) => sum + (dropTable(b)[0]?.value ?? 0), 0).toFixed(2);
}

/**
 * 🏆 JACKPOT POOL 골드 뱃지 — 최상단 티커 바 좌측 1줄.
 *
 * 히어로 헤드라인 위에 있던 거대 박스와 부연 설명을 걷어내고 여기로 옮겼다(메인 카피 가독성 우선).
 * 숫자가 무엇의 합계인지는 `title`/`aria-label` 로 그대로 남긴다 — 화면에서 지웠다고 정의까지 없애지는 않는다.
 */
export function JackpotPoolBadge({ className }: { className?: string }) {
  const t = useTranslations("hero");
  const { fmt } = useCurrency();
  const value = useMemo(() => jackpotPoolUsdt(), []);
  const [shown, setShown] = useState(value);

  // 마운트 후에만 굴러 올라간다 — 서버 렌더는 최종값이라 하이드레이션이 어긋나지 않는다
  useEffect(() => {
    let raf = 0;
    const from = value * 0.92;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1400);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(+(from + (value - from) * eased).toFixed(2));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const note = t("poolNote", { n: BOXES.length });

  return (
    <span
      className={cn(
        "border-metallic-gold z-10 flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full bg-gold-champagne/[0.06] px-2.5 py-1",
        className,
      )}
      style={{ boxShadow: "0 0 14px rgba(230,202,101,0.22)" }}
      title={note}
      aria-label={`${t("poolLabel")} ${fmt(value)} — ${note}`}
    >
      <span aria-hidden>🏆</span>
      <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-gold-champagne/80">
        {/* 모바일에서는 티커 본문 자리를 남겨 두기 위해 짧은 라벨 */}
        <span className="sm:hidden">{t("poolLabelShort")}</span>
        <span className="hidden sm:inline">{t("poolLabel")}</span>
      </span>
      <span className="text-gold-gradient font-display text-[12px] font-black leading-none tabular-nums">{fmt(shown)}</span>
    </span>
  );
}

export default JackpotPoolBadge;
