/**
 * 룰렛 스트립 수학 — 순수 함수. 컴포넌트는 그리기만 한다.
 *
 * 원칙: 결과는 스핀 전에 Provably Fair 엔진이 확정한다. 릴은 그 결과를 target 칸에 심고
 * 그 칸이 중앙 인디케이터 아래에 서도록 이동 거리만 계산한다. 연출이 결과를 바꿀 수 없다.
 */

import { determineItem, ROLL_RANGE, type WithProbability } from "./fairness";

export interface ReelLayout {
  tileWidth: number;
  gap: number;
  viewportWidth: number;
}

/** 스펙: 80~100개 카드가 지나간다 */
export const REEL_LENGTH = 88;
/** 결과 칸. 끝에서 몇 칸 앞이면 정지 후 오른쪽에도 타일이 남는다. */
export const REEL_TARGET_INDEX = REEL_LENGTH - 9;
/** 감속 — 정밀 cubic-bezier ease-out */
export const REEL_DURATION_S = 4.2;
export const REEL_DURATION_MULTI_S = 2.4;
export const REEL_EASE: [number, number, number, number] = [0.12, 0.8, 0.33, 1];

/**
 * 감속 구간(진행 55~92%)에 쇼케이스 타일을 심는 위치 — target 기준 뒤쪽 칸 수.
 * 안티시페이션 텐션(0.3배속·스파크)이 걸리는 자리다. 결과 칸(target) 자체는 건드리지 않는다.
 */
export const SHOWCASE_OFFSETS = [20, 9];

/**
 * 스트립 생성. target 에 result, 나머지는 확률표 가중으로 채운다.
 * showcase 를 주면 감속 구간에 고등급 타일을 SHOWCASE_OFFSETS 자리에 심는다 — 릴은 연출이고
 * 확률은 확률표·Provably Fair 섹션에 그대로 공개돼 있으므로 결과의 정직성과 무관하다.
 * rand 는 [0,1) 균등 난수 (연출용이라 crypto 가 아니어도 되지만 secureUnit 을 쓴다).
 */
export function buildStrip<T extends WithProbability>(result: T, items: T[], rand: () => number, length = REEL_LENGTH, targetIndex = REEL_TARGET_INDEX, showcase: T[] = []): T[] {
  if (targetIndex < 0 || targetIndex >= length) throw new Error("targetIndex 범위 밖");
  const strip: T[] = [];
  for (let i = 0; i < length; i++) {
    if (i === targetIndex) strip.push(result);
    else strip.push(determineItem(Math.floor(rand() * ROLL_RANGE), items));
  }
  if (showcase.length > 0) {
    SHOWCASE_OFFSETS.forEach((off, k) => {
      const i = targetIndex - off;
      if (i > 0 && i !== targetIndex) strip[i] = showcase[Math.floor(rand() * showcase.length) % showcase.length] ?? showcase[k % showcase.length];
    });
  }
  return strip;
}

/** 지터 한계 — 타일 폭의 ±0.49 (경계 안쪽 ~1.5px). 인디케이터는 언제나 target 칸 위에 선다. */
export const JITTER_MAX = 0.49;

/** target 칸 중심이 뷰포트 중앙에 오는 translateX(px, 음수). jitter 는 ±JITTER_MAX 타일 안의 미세 오프셋. */
export function offsetForTarget(layout: ReelLayout, targetIndex = REEL_TARGET_INDEX, jitter = 0): number {
  const step = layout.tileWidth + layout.gap;
  const center = targetIndex * step + layout.tileWidth / 2;
  const j = Math.max(-JITTER_MAX, Math.min(JITTER_MAX, jitter)) * layout.tileWidth;
  return -(center - layout.viewportWidth / 2 + j);
}

/** 니어미스 빈도 — 2번에 1번 */
export const NEAR_MISS_RATE = 0.5;
/** 니어미스 정지 지터 — 경계선 1~3px 안쪽 (타일 148px 기준 ≈ 1.5px) */
export const NEAR_MISS_JITTER = JITTER_MAX;

export type NearMissSide = "left" | "right";

/**
 * 니어미스 — 결과(저등급)의 바로 앞/뒤 칸에 최상위 잭팟을 심는다. 결과 칸은 그대로다.
 * side 가 left 면 잭팟이 왼쪽(targetIndex-1)에 서고, 릴은 왼쪽 경계 쪽으로 치우쳐 멈춘다(음수 지터).
 * 반환: 정지 지터. 연출일 뿐 확률·결과와 무관하다.
 */
export function applyNearMiss<T>(strip: T[], jackpot: T, side: NearMissSide, targetIndex = REEL_TARGET_INDEX): number {
  const i = side === "left" ? targetIndex - 1 : targetIndex + 1;
  if (i < 0 || i >= strip.length) throw new Error("니어미스 칸이 스트립 밖");
  strip[i] = jackpot;
  return side === "left" ? -NEAR_MISS_JITTER : NEAR_MISS_JITTER;
}

/** 정지 위치에서 인디케이터 아래 칸 — 반드시 target. 테스트용 역산. */
export function indexUnderMarker(layout: ReelLayout, translateX: number): number {
  const step = layout.tileWidth + layout.gap;
  return Math.floor((-translateX + layout.viewportWidth / 2) / step);
}

/** [0,1) 균등 난수 — 연출 전용 */
export function unitRandom(): number {
  const c = globalThis.crypto;
  if (!c?.getRandomValues) throw new Error("crypto 없음");
  const b = new Uint32Array(1);
  c.getRandomValues(b);
  return b[0] / 2 ** 32;
}
