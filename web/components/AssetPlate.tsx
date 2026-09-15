import { cn } from "@/lib/format";

export type AssetPlateSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface AssetPlateProps {
  /** 애셋 코드 — 예: 'CT-01' */
  code: string;
  /** CSS background 문자열. item.art / box.art 를 그대로 전달한다. */
  tone: string;
  size?: AssetPlateSize;
  /** 코드 아래 표기되는 소형 캡션 */
  label?: string;
  /** true 면 크림슨 엣지 처리 */
  active?: boolean;
  className?: string;
}

/**
 * 3:2 가로 비율의 애셋 플레이트. 필름 캐니스터 라벨 / 증거 태그 질감.
 * 톤 그라디언트를 블랙 스크림 아래로 눌러 깔고, 스캔라인 텍스처와 헤어라인 보더를 얹은 뒤
 * 코드를 디스플레이 서체로 중앙 배치한다.
 */
const SIZES: Record<
  AssetPlateSize,
  { box: string; code: string; label: string; pad: string; scrim: number }
> = {
  xs: { box: "h-9 w-[54px]", code: "text-[10px]", label: "text-[6px] tracking-[0.12em]", pad: "px-1", scrim: 0.5 },
  sm: { box: "h-14 w-[84px]", code: "text-[13px]", label: "text-[7px] tracking-[0.14em]", pad: "px-1.5", scrim: 0.52 },
  md: { box: "h-24 w-36", code: "text-[22px]", label: "text-[8px] tracking-[0.18em]", pad: "px-2", scrim: 0.55 },
  lg: { box: "h-40 w-60", code: "text-[36px]", label: "text-[9px] tracking-[0.18em]", pad: "px-3", scrim: 0.58 },
  xl: { box: "h-[280px] w-[420px]", code: "text-[62px]", label: "text-[10px] tracking-[0.18em]", pad: "px-4", scrim: 0.6 },
};

export function AssetPlate({
  code,
  tone,
  size = "md",
  label,
  active = false,
  className,
}: AssetPlateProps): JSX.Element {
  const s = SIZES[size];

  return (
    <div
      className={cn(
        "scanlines relative flex flex-none select-none flex-col items-center justify-center overflow-hidden",
        "border border-white/[0.08] bg-ink",
        active && "border-crimson/70 outline outline-1 outline-crimson",
        s.box,
        s.pad,
        className,
      )}
      data-code={code}
    >
      {/* 톤 램프 */}
      <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: tone }} />
      {/* 블랙 스크림 — 톤을 눌러 코드 가독성을 확보한다 */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor: `rgba(8,8,8,${s.scrim})` }}
      />
      {/* 상단 좌우 크롭 마크 */}
      <span aria-hidden className="pointer-events-none absolute left-0 top-0 h-2 w-2 border-l border-t border-white/20" />
      <span aria-hidden className="pointer-events-none absolute bottom-0 right-0 h-2 w-2 border-b border-r border-white/20" />

      <span
        className={cn(
          "relative z-10 font-display font-bold uppercase leading-none tracking-tighter text-white",
          active && "text-white",
          s.code,
        )}
      >
        {code}
      </span>

      {label ? (
        <span
          className={cn(
            "relative z-10 mt-1 max-w-full truncate font-semibold uppercase",
            active ? "text-crimson" : "text-neutral-400",
            s.label,
          )}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}

export default AssetPlate;
