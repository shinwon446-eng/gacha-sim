// 커뮤니티 후기 — 실제 작성분만 게시. 운송장 인증은 발급된 것만
import test from "node:test";
import assert from "node:assert/strict";
import { REVIEW_BONUS_USDT, REVIEW_MIN_CHARS, MIN_REVIEW_ITEM_VALUE_USDT, canReview, meetsReviewValue, toReview } from "../lib/community";
import { useInventoryStore, type OwnedItem } from "../stores/inventoryStore";
import { useCommunityStore } from "../stores/communityStore";

test("review value boundary is inclusive at 100 USDT, and invalid values are refused by the store", () => {
  assert.equal(MIN_REVIEW_ITEM_VALUE_USDT, 100);
  const owned: OwnedItem = {
    id: "threshold", itemId: "item", boxSlug: "box", valueUsdt: 100, tier: "royal", status: "DELIVERED",
    acquiredAt: "2026-09-01T00:00:00Z", fair: { serverSeedHash: "h", serverSeed: "s", clientSeed: "c", nonce: 1, roll: 1 },
    shipping: { address: { recipient: "r", country: "KR", phone: "0", postalCode: "0", address: "a" }, feeUsdt: 0, requestedAt: "2026-09-01T00:00:00Z", deliveredAt: "2026-09-02T00:00:00Z" },
  };
  const input = { ownedId: owned.id, itemId: owned.itemId, boxSlug: owned.boxSlug, text: "상품 잘 받았습니다", rating: 5, bonusUsdt: 0 };
  useCommunityStore.setState({ mine: [] });
  for (const valueUsdt of [99.99, 0, -1, NaN, Infinity]) {
    const item = { ...owned, valueUsdt };
    useInventoryStore.setState({ items: [item] });
    assert.equal(meetsReviewValue(item), false);
    assert.equal(canReview(item, []), false);
    assert.throws(() => useCommunityStore.getState().add(input), /ineligible-review-item/);
  }
  useInventoryStore.setState({ items: [] });
  assert.throws(() => useCommunityStore.getState().add(input), /ineligible-review-item/);
  useInventoryStore.setState({ items: [owned] });
  assert.equal(canReview(owned, []), true);
  assert.equal(canReview({ ...owned, status: "SHIPPING" }, []), false);
  useCommunityStore.getState().add(input);
  assert.equal(canReview(owned, useCommunityStore.getState().mine), false);
  assert.throws(() => useCommunityStore.getState().add(input), /duplicate/);
  assert.equal(useCommunityStore.getState().mine.length, 1);
});

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
