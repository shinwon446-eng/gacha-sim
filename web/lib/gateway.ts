// 클라이언트 ↔ 서버 게이트웨이.
// 기본: API 라우트 호출(확률·난수는 서버에서만). 정적 데모(GitHub Pages, 서버 없음)에서는
// 동일한 엔진을 클라이언트에서 실행하는 폴백으로 전환된다 — 빌드 시 NEXT_PUBLIC_STATIC_DEMO 로 결정.
import { getBox } from "./data";
import { runPulls, DEMO_DURATION_MS, type PullState, type UserTier } from "./engine";
import type { Item } from "./types";

const IS_STATIC_DEMO = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";

/** 정적 데모가 아닌데 폴백으로 내려온 경우 = 서버 버그. 조용히 넘어가면 버그가 가려지므로 경고한다. */
function warnFallback(where: string, detail: unknown) {
  if (!IS_STATIC_DEMO) console.error(`[gateway] ${where} 서버 호출 실패 — 로컬 엔진으로 폴백합니다.`, detail);
}

export interface OpenResponse {
  items: Item[];
  pityCount: number;
  boosterTriggered: boolean;
  tier: UserTier;
  totalSpent: number;
  source: "server" | "local";
}

export async function apiOpenBox(
  boxId: string,
  count: 1 | 10,
  local: PullState & { cost: number },
): Promise<OpenResponse> {
  if (!IS_STATIC_DEMO) {
    try {
      const r = await fetch("/api/gacha/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boxId, count }),
      });
      if (r.ok) {
        const j = await r.json();
        const box = getBox(boxId);
        const items = (j.itemIds as string[])
          .map((id) => box.items.find((i) => i.id === id))
          .filter((i): i is Item => Boolean(i));
        return {
          items,
          pityCount: j.pityCount,
          boosterTriggered: j.boosterTriggered,
          tier: j.tier,
          totalSpent: j.totalSpent,
          source: "server",
        };
      }
      warnFallback("apiOpenBox", `HTTP ${r.status}`);
    } catch (e) {
      warnFallback("apiOpenBox", e);
    }
  }
  const box = getBox(boxId);
  const res = runPulls(box, count, local);
  return { ...res, totalSpent: local.totalSpent + local.cost, source: "local" };
}

/**
 * 비회원 모의 체험 세션 개시.
 * 결과 상품은 고정(데모 박스 1등)이라 서버가 추첨하지 않는다 — 서버는 중복 체험만 차단한다.
 * 어떤 경우에도 상품 지급 데이터를 반환하지 않는다.
 */
export type DemoResponse = { ok: true; deadline: number } | { ok: false; reason: "already_claimed" };

export async function apiGuestDemo(fingerprint: string, locallyDone: boolean): Promise<DemoResponse> {
  if (locallyDone) return { ok: false, reason: "already_claimed" };
  if (!IS_STATIC_DEMO) {
    try {
      const r = await fetch("/api/guest/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint }),
      });
      if (r.ok) {
        const j = await r.json();
        return { ok: true, deadline: j.deadline };
      }
      if (r.status === 429) return { ok: false, reason: "already_claimed" };
      warnFallback("apiGuestDemo", `HTTP ${r.status}`);
    } catch (e) {
      warnFallback("apiGuestDemo", e);
    }
  }
  return { ok: true, deadline: Date.now() + DEMO_DURATION_MS };
}
