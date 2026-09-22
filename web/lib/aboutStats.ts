/**
 * 플랫폼 소개(/about) 랜딩이 쓰는 수치.
 *
 * 전부 **상품 카탈로그에서 계산한 실측값**이거나 **운영자가 집행하는 정책 상수**다.
 * "총 누적 지급액", "조작 적발 0건", "평균 출고 24시간" 같은 운영 실적은 우리가 가진 적이 없으므로
 * 지어내지 않는다(부록 C) — live 모드에서 백엔드가 실적을 주면 그 값이 이 자리에 들어간다.
 */
import { BOXES, dropTable, floorRatio, retailReturn } from "@/lib/products";
import { REFUND_RATE } from "@/lib/types";

/** 즉시 회수 비율 — 실제로 지급되는 비율(95%). 정책이자 코드가 쓰는 값이다. */
export const INSTANT_SELLBACK_RATE = REFUND_RATE;

/** 정품이 아닐 경우 보상 배율 — 운영자 정책. 집행하지 않을 거면 이 상수를 내린다. */
export const AUTHENTICITY_COMPENSATION_MULTIPLE = 3;

/** 실물 출고 목표 시간(시간). 측정된 평균이 아니라 **운영 기준(SLA)** 이다 — 화면에도 그렇게 적는다. */
export const SHIPPING_SLA_HOURS = 24;

/** 지금 라인업에 걸려 있는 최고 상품 가치의 합계(USDT) — 카탈로그 실측 */
export function totalJackpotValueUsdt(): number {
  return +BOXES.reduce((sum, b) => sum + (dropTable(b)[0]?.value ?? 0), 0).toFixed(2);
}

/** 확률이 공개된 구성품 줄 수 — 모든 박스의 아이템 합계 */
export function publishedOddsRows(): number {
  return BOXES.reduce((sum, b) => sum + b.items.length, 0);
}

/**
 * 개봉 **후에** 운영자가 바꿀 수 있는 결과의 수.
 *
 * 서버 시드 해시를 스핀 전에 공개하고 결과를 `HMAC(serverSeed, clientSeed:nonce)` 로 확정하므로
 * 구조적으로 0 이다. "여태 적발 0건" 같은 실적 주장이 아니라 **구조의 성질**이며, 그래서 적을 수 있다.
 */
export const MUTABLE_RESULTS = 0;

/** 카탈로그 전체의 정가 환원율(RTP) 범위 — 퍼센트 */
export function rtpRangePct(): { min: number; max: number } {
  const rates = BOXES.map((b) => retailReturn(b) * 100);
  return { min: +Math.min(...rates).toFixed(1), max: +Math.max(...rates).toFixed(1) };
}

/**
 * 같은 예산으로 **실질적으로 몇 번 도전할 수 있는지** — 환급률 r 의 등비급수 합 `1 / (1 − r)`.
 *
 * 100 USDT 를 넣고 매번 r 만큼 돌려받아 다시 넣는다면 총 투입은 `100 / (1 − r)` 이 된다.
 * 계산식을 화면에 그대로 띄우므로 유저가 직접 검산할 수 있다. r ≥ 1 은 무한대이므로 막는다.
 */
export function effectiveAttempts(refundRate: number): number {
  if (!(refundRate >= 0) || refundRate >= 1) return 1;
  return +(1 / (1 - refundRate)).toFixed(1);
}

/** 우리 라인업의 최소 보장 환급률로 계산한 실질 도전 배수 범위 */
export function attemptsRange(): { minRate: number; maxRate: number; min: number; max: number } {
  const ratios = BOXES.map((b) => floorRatio(b));
  const lo = Math.min(...ratios);
  const hi = Math.max(...ratios);
  return {
    minRate: +(lo * 100).toFixed(1),
    maxRate: +(hi * 100).toFixed(1),
    min: effectiveAttempts(lo),
    max: effectiveAttempts(hi),
  };
}

/**
 * 비교 대상 — **환급이 없는 사은품형 랜덤박스**의 가정 환급률.
 * 특정 업체를 지목하지 않는 모델 값이며, 화면에도 "가정"이라고 적는다.
 */
export const GIFT_BOX_ASSUMED_REFUND_RATE = 0.005;

/** 박스·카테고리 수 */
export const BOX_COUNT = BOXES.length;
export const CATEGORY_COUNT = new Set(BOXES.map((b) => b.category)).size;
