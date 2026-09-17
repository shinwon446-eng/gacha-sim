/**
 * 최상단 라이브 드랍 티커 데이터 (CLAUDE.md §2-1, PROMPTS 1-1).
 * 정적 데모 — 집계 백엔드가 없으므로 상품 데이터에서 결정적으로 뽑은 모의 이벤트다. 30초 주기(seed)로 구성이 바뀌어 살아있는 느낌을 낸다.
 * 실서비스에서는 buildLiveDrops 를 WebSocket/SSE 스트림으로 교체한다 — LiveDrop 타입이 계약이다.
 */
import { BOXES, type ProductItem } from "@/lib/products";

export type LiveDropKind = "win" | "cashout" | "ship";

export interface LiveDrop {
  id: string;
  kind: LiveDropKind;
  /** 마스킹 핸들 — "user***21" */
  user: string;
  /** win / ship */
  itemId?: string;
  boxSlug?: string;
  /** cashout — USDT */
  amountUsdt?: number;
  /** 이벤트 발생 기준 몇 초 전 */
  secondsAgo: number;
}

const HANDLES = ["user***21", "crypto***", "lee***", "kim***7", "m***chen", "sato***", "jane***k", "won***88", "alex***", "park***3", "liu***", "nova***9"];

/** 티커 재생성 주기(ms) — 이 주기마다 seed 가 바뀌어 다른 조합이 흐른다 */
export const LIVE_DROPS_CYCLE_MS = 30_000;

function lcg(seed: number) {
  let x = (seed * 2654435761 + 1013904223) >>> 0;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

/** 상위 가치 항목 가중 — 티커는 "명품 획득"이 자주 보여야 FOMO 가 생긴다 (단, 확률표는 건드리지 않는다: 표시용) */
function pickShowcaseItem(rand: () => number): { item: ProductItem; boxSlug: string } {
  const box = BOXES[Math.floor(rand() * BOXES.length)];
  const sorted = [...box.items].sort((a, b) => b.value - a.value);
  // 상위 4개 중 하나 — 티커는 하이라이트 릴이다
  const item = sorted[Math.floor(rand() * Math.min(4, sorted.length))];
  return { item, boxSlug: box.slug };
}

export function buildLiveDrops(seed: number, count = 14): LiveDrop[] {
  const rand = lcg(seed);
  const out: LiveDrop[] = [];
  let sec = 3;
  for (let i = 0; i < count; i++) {
    const r = rand();
    const user = HANDLES[Math.floor(rand() * HANDLES.length)];
    const id = `ld_${seed}_${i}`;
    if (r < 0.55) {
      const { item, boxSlug } = pickShowcaseItem(rand);
      out.push({ id, kind: "win", user, itemId: item.id, boxSlug, secondsAgo: sec });
    } else if (r < 0.85) {
      const amount = [59, 88.35, 150, 266, 412.3, 1240, 2850][Math.floor(rand() * 7)];
      out.push({ id, kind: "cashout", user, amountUsdt: amount, secondsAgo: sec });
    } else {
      const { item, boxSlug } = pickShowcaseItem(rand);
      out.push({ id, kind: "ship", user, itemId: item.id, boxSlug, secondsAgo: sec });
    }
    sec += 3 + Math.floor(rand() * 9);
  }
  return out;
}

/** 현재 시각 → seed 와 주기 내 경과 초 */
export function liveDropsClock(now: number): { seed: number; elapsedSec: number } {
  return { seed: Math.floor(now / LIVE_DROPS_CYCLE_MS), elapsedSec: Math.floor((now % LIVE_DROPS_CYCLE_MS) / 1000) };
}
