// 클라이언트 ↔ 서버 게이트웨이.
// 기본: API 라우트 호출(확률·난수는 서버에서만). 정적 데모(GitHub Pages, 서버 없음)에서는
// 동일한 엔진을 클라이언트에서 실행하는 폴백으로 전환된다 — 빌드 시 NEXT_PUBLIC_STATIC_DEMO 로 결정.
import { getBox } from "./data";
import {
  runPulls,
  pickWeightedAdjusted,
  TRIAL_POOL,
  TRIAL_MAP,
  TRIAL_DURATION_MS,
  type PullState,
  type UserTier,
} from "./engine";
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

export type TrialResponse =
  | { ok: true; prize: Item; deadline: number; source: "server" | "local" }
  | { ok: false; reason: "already_claimed"; message: string };

export async function apiGuestTrial(fingerprint: string, locallyClaimed: boolean): Promise<TrialResponse> {
  if (!IS_STATIC_DEMO) {
    try {
      const r = await fetch("/api/guest/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint }),
      });
      const j = await r.json().catch(() => null);
      if (r.ok && j?.prizeId && TRIAL_MAP[j.prizeId]) {
        return { ok: true, prize: TRIAL_MAP[j.prizeId], deadline: j.deadline, source: "server" };
      }
      if (r.status === 429) {
        return { ok: false, reason: "already_claimed", message: j?.message ?? "이미 체험을 완료하셨습니다" };
      }
      warnFallback("apiGuestTrial", `HTTP ${r.status}`);
    } catch (e) {
      warnFallback("apiGuestTrial", e);
    }
  }
  // 정적 데모 폴백: localStorage 플래그만으로 차단 (서버 방어 없음 — README 명시)
  if (locallyClaimed) {
    return { ok: false, reason: "already_claimed", message: "이미 체험을 완료하셨습니다" };
  }
  const prize = pickWeightedAdjusted(TRIAL_POOL, { boost: false, tierMult: 1 });
  return { ok: true, prize, deadline: Date.now() + TRIAL_DURATION_MS, source: "local" };
}
