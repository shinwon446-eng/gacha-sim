// 라이브 드랍 티커 — 이 기기의 실제 기록에서만 만든다 (지어낸 활동 없음)
import test from "node:test";
import assert from "node:assert/strict";
import { buildLocalDrops, localHandle } from "../lib/liveDrops";
import type { OwnedItem } from "../stores/inventoryStore";
import type { Transaction } from "../stores/walletStore";

const own = (id: string, at: string, shipping = false): OwnedItem => ({
  id,
  itemId: "da-iphone16",
  boxSlug: "dollar-apple",
  valueUsdt: 1000,
  tier: "royal",
  status: shipping ? "SHIPPING_REQUESTED" : "IN_STORAGE",
  acquiredAt: at,
  fair: { serverSeedHash: "h", serverSeed: "s", clientSeed: "c", nonce: 1, roll: 1 },
  ...(shipping ? { shipping: { address: { recipient: "홍길동", country: "KR" as const, phone: "0", postalCode: "0", address: "a" }, feeUsdt: 15, requestedAt: at } } : {}),
});
const tx = (id: string, type: Transaction["type"], amount: number, at: string): Transaction => ({ id, type, amountUsdt: amount, at });

test("핸들 마스킹 — 클라이언트 시드 앞 4자 + ***", () => {
  assert.equal(localHandle("3f9c12ab"), "u_3f9c***");
  assert.equal(localHandle(""), "u_anon***");
});

test("기록이 없으면 비어 있고, 있으면 당첨·출고·환전만 최신순으로 나온다", () => {
  assert.deepEqual(buildLocalDrops([], [], "u_x***"), []);
  const drops = buildLocalDrops(
    [own("a", "2026-09-18T01:00:00Z"), own("b", "2026-09-18T03:00:00Z", true)],
    [
      tx("t1", "sellback", 26.6, "2026-09-18T02:00:00Z"),
      tx("t2", "open", -1, "2026-09-18T02:30:00Z"),
      tx("t3", "withdraw", -30, "2026-09-18T04:00:00Z"),
      tx("t4", "bonus", 5, "2026-09-18T05:00:00Z"),
    ],
    "u_x***",
  );
  assert.deepEqual(
    drops.map((d) => d.kind),
    ["cashout", "win", "ship", "cashout", "win"],
  );
  assert.ok(drops.every((d) => d.user === "u_x***"));
  assert.equal(drops[0].amountUsdt, 30);
});
