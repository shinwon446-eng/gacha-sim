"use client";

import { cn } from "@/lib/format";
import { useLocalFiat } from "@/lib/localFiat";

/**
 * USDT 금액 옆/아래에 붙는 **현지 통화 환산 배지**, "≈ ₩628,885,320".
 *
 * `≈` 는 항상 붙는다(고정 표시 환율이므로 확정 금액이 아니다). 선택 통화가 이미 그 현지 통화면
 * 바로 위 `<Money>` 가 같은 기호를 찍고 있으므로 기본적으로 렌더하지 않는다, `always` 로 강제할 수 있다
 * (USDT 로 고정 표기하는 자리, 예: 임팩트 숫자 타일).
 */
export function Approx({
  usdt,
  compact = false,
  always = false,
  className,
}: {
  usdt: number;
  compact?: boolean;
  always?: boolean;
  className?: string;
}) {
  const { redundant, approx, approxCompact } = useLocalFiat();
  if (redundant && !always) return null;
  return (
    <span className={cn("whitespace-nowrap tabular-nums text-gold-champagne/80", className)}>
      ≈ {compact ? approxCompact(usdt) : approx(usdt)}
    </span>
  );
}

export default Approx;
