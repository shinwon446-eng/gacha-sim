"use client";

import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";

export type MoneySize = "xs" | "sm" | "md" | "lg";

/**
 * 금액 타이포 — 숫자와 통화 단위를 분리해 황금비율로 배치한다.
 *   숫자: font-display bold tabular-nums tracking-tight   단위: 작은 semibold, 숫자 우측(또는 기호는 좌측) 베이스라인 정렬
 * 문자열은 formatCurrency 와 동일한 규칙(단일 통화)에서 나온다. `nowrap` 로 KRW 큰 값도 줄바꿈되지 않는다.
 */
const SIZES: Record<MoneySize, { number: string; unit: string; gap: string }> = {
  lg: { number: "text-2xl md:text-3xl", unit: "text-xs md:text-sm", gap: "gap-1.5" },
  md: { number: "text-lg md:text-xl", unit: "text-[11px] md:text-xs", gap: "gap-1" },
  sm: { number: "text-sm md:text-base", unit: "text-[10px] md:text-[11px]", gap: "gap-1" },
  xs: { number: "text-xs", unit: "text-[9px]", gap: "gap-0.5" },
};

export interface MoneyProps {
  /** USDT 기준 금액 (native 가 true 면 선택 통화 단위) */
  value: number;
  native?: boolean;
  size?: MoneySize;
  /** 숫자 색 클래스 — 기본 흰색. 등급색은 style 로 */
  className?: string;
  numberClassName?: string;
  unitClassName?: string;
  style?: React.CSSProperties;
  /** 부호 접두 — "+", "-" */
  sign?: string;
}

export function Money({ value, native = false, size = "md", className, numberClassName, unitClassName, style, sign }: MoneyProps) {
  const { split, splitNative } = useCurrency();
  const parts = native ? splitNative(value) : split(value);
  const sz = SIZES[size];
  const unitCls = cn("font-sans font-semibold leading-none text-neutral-400", sz.unit, unitClassName);
  return (
    <span className={cn("inline-flex items-baseline whitespace-nowrap", sz.gap, className)} style={style}>
      {sign && <span className={cn("font-display font-bold leading-none tabular-nums tracking-tight", sz.number, numberClassName)}>{sign}</span>}
      {parts.prefix && <span className={unitCls}>{parts.prefix}</span>}
      <span className={cn("font-display font-bold leading-none tabular-nums tracking-tight", sz.number, numberClassName)}>{parts.number}</span>
      {parts.suffix && <span className={unitCls}>{parts.suffix}</span>}
    </span>
  );
}

export default Money;
