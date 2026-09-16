/**
 * 수평 릴 수학 — 순수 함수. 컴포넌트는 그리기만 한다.
 *
 * 원칙: 결과는 스핀 전에 확정되고(pickGachaItem), 릴은 그 결과를 target 칸에 심은 뒤
 * 그 칸이 마커 아래에 서도록 이동 거리만 계산한다. 연출이 결과를 바꿀 수 없다.
 */

import { GACHA_ITEMS, type GachaItem } from "./gachaItems";
import { oddsTable, pickGachaItem } from "./gachaRules";

export interface ReelLayout {
  /** 타일 폭(px) */
  tileWidth: number;
  /** 타일 간격(px) */
  gap: number;
  /** 뷰포트 폭(px) */
  viewportWidth: number;
}

/** 릴 길이. 감속 5.5초 동안 충분히 지나가되 DOM 이 무겁지 않은 선. */
export const REEL_LENGTH = 64;
/** 결과 칸 위치. 끝에서 몇 칸 앞에 두면 정지 후에도 오른쪽에 타일이 남는다. */
export const REEL_TARGET_INDEX = REEL_LENGTH - 8;

/** 스펙: 5.5초, cubic-bezier(0.12, 0.8, 0.33, 1) */
export const REEL_DURATION_S = 5.5;
export const REEL_EASE: [number, number, number, number] = [0.12, 0.8, 0.33, 1];

/**
 * 릴 스트립을 만든다. target 칸에는 result, 나머지는 확률표 가중으로 채운다
 * (실제 분포처럼 보이게 — 희귀 등급이 자꾸 스쳐 지나가는 가짜 연출을 하지 않는다).
 */
export function buildStrip(
  result: GachaItem,
  rand: () => number,
  length = REEL_LENGTH,
  targetIndex = REEL_TARGET_INDEX,
  items: GachaItem[] = GACHA_ITEMS,
): GachaItem[] {
  if (targetIndex < 0 || targetIndex >= length) throw new Error("targetIndex 범위 밖");
  const strip: GachaItem[] = [];
  for (let i = 0; i < length; i++) strip.push(i === targetIndex ? result : pickGachaItem(rand, items));
  return strip;
}

/**
 * target 칸의 중심이 뷰포트 중앙 마커에 오도록 하는 translateX(px, 음수).
 * jitter 는 칸 안에서의 미세 오프셋(-0.5~0.5 타일) — 매번 정확히 중앙에 서는 기계적 느낌을 피한다.
 */
export function offsetForTarget(layout: ReelLayout, targetIndex = REEL_TARGET_INDEX, jitter = 0): number {
  const step = layout.tileWidth + layout.gap;
  const center = targetIndex * step + layout.tileWidth / 2;
  const j = Math.max(-0.45, Math.min(0.45, jitter)) * layout.tileWidth;
  return -(center - layout.viewportWidth / 2 + j);
}

/** 정지 위치에서 마커 아래 있는 칸 — 반드시 target 이어야 한다. 테스트용 역산. */
export function indexUnderMarker(layout: ReelLayout, translateX: number): number {
  const step = layout.tileWidth + layout.gap;
  const x = -translateX + layout.viewportWidth / 2;
  return Math.floor(x / step);
}

/** 최고 배수 — 헤더 뱃지용. */
export function maxJackpot(price: number, items: GachaItem[] = GACHA_ITEMS): { item: GachaItem; multiple: number } {
  const item = oddsTable(items)[0].item;
  return { item, multiple: Math.round(item.usdtValue / price) };
}
