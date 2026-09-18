// 커뮤니티 후기 — 실제 작성분만 게시. 운송장 인증은 발급된 것만
import test from "node:test";
import assert from "node:assert/strict";
import { REVIEW_BONUS_USDT, REVIEW_MIN_CHARS, toReview } from "../lib/community";
import type { OwnedItem } from "../stores/inventoryStore";

test("후기 보너스 10 USDT, 최소 5자", () => {
  assert.equal(REVIEW_BONUS_USDT, 10);
  assert.equal(REVIEW_MIN_CHARS, 5);
});

test("toReview: 내 후기 + 보관함 레코드 → 운송장 인증은 발급된 경우에만", () => {
  const m = { id: "my1", ownedId: "o1", boxSlug: "vault-submariner", itemId: "rlx-tudor", text: "정품 잘 받았습니다", rating: 5, at: "2026-09-18T00:00:00Z", bonusUsdt: 10 };
  const owned: OwnedItem = {
    id: "o1",
    itemId: "rlx-tudor",
    boxSlug: "vault-submariner",
    valueUsdt: 3830,
    tier: "royal",
    status: "SHIPPING",
    acquiredAt: "2026-09-17T00:00:00Z",
    fair: { serverSeedHash: "h", serverSeed: "s", clientSeed: "c", nonce: 1, roll: 1 },
    shipping: { address: { recipient: "홍길동", country: "KR", phone: "0", postalCode: "0", address: "a" }, feeUsdt: 15, requestedAt: "2026-09-17T01:00:00Z", carrier: "CJ", trackingNumber: "123456789012" },
  };
  const r = toReview(m, owned, "u_x***");
  assert.equal(r.mine, true);
  assert.equal(r.proof.carrier, "CJ");
  assert.equal(r.proof.trackingNumber, "123456789012");
  const r2 = toReview(m, undefined, "u_x***");
  assert.equal(r2.proof.trackingNumber, undefined);
});
