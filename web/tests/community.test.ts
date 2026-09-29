// 커뮤니티 후기 — 실제 작성분만 게시. 운송장 인증은 발급된 것만
import test from "node:test";
import assert from "node:assert/strict";
import { REVIEW_BONUS_USDT, REVIEW_MIN_CHARS, MIN_REVIEW_ITEM_VALUE_USDT, canReview, meetsReviewValue, toReview } from "../lib/community";
import { useInventoryStore, type OwnedItem } from "../stores/inventoryStore";
import { useCommunityStore, subscribeCommunityReviews } from "../stores/communityStore";
import { reviewValueNotice } from "../components/community/reviewValueNotice";
import { createReviewExamples, publicReviewFeed, isExampleReview, relativeReviewTime, reviewWindow, communityFeedCopy } from "../lib/community";
import { applyBoardCommand, createBoardExamples, isExampleBoardContent, parseBoardPosts, selectBoardPosts } from "../lib/board";
import { BOARD_STORAGE_KEY, BOARD_EXAMPLES_KEY, loadBoard } from "../lib/boardApi";
import { BOX_BY_SLUG } from "../lib/products";

test("review value boundary is inclusive at 100 USDT, and invalid values are refused by the store", () => {
  assert.equal(MIN_REVIEW_ITEM_VALUE_USDT, 100);
  assert.equal(reviewValueNotice("ko"), "후기 작성은 100 USDT($100) 이상 가치의 당첨 상품만 가능합니다.");
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
  for (const status of ["IN_STORAGE", "SHIPPING_REQUESTED", "SHIPPING", "DELIVERED", "SOLD"] as const) assert.equal(canReview({ ...owned, status, shipping: undefined }, []), true);
  useCommunityStore.getState().add(input);
  assert.equal(canReview(owned, useCommunityStore.getState().mine), false);
  assert.throws(() => useCommunityStore.getState().add(input), /duplicate/);
  assert.equal(useCommunityStore.getState().mine.length, 1);
});

test("후기 보너스 10 USDT, 최소 5자", () => {
  assert.equal(REVIEW_BONUS_USDT, 10);
  assert.equal(REVIEW_MIN_CHARS, 5);
});

test("stored 100 USDT win can be reviewed without shipping; metadata cannot impersonate another item", () => {
  const item: OwnedItem = { id: "stored-win", itemId: "actual-item", boxSlug: "actual-box", valueUsdt: 100, status: "IN_STORAGE", acquiredAt: "2026-09-30T00:00:00Z", tier: "royal", fair: { serverSeedHash: "h", serverSeed: "s", clientSeed: "c", nonce: 1, roll: 1 } };
  useInventoryStore.setState({ items: [item] }); useCommunityStore.setState({ mine: [] });
  const review = useCommunityStore.getState().add({ ownedId: item.id, itemId: "forged", boxSlug: "forged", text: "  보관 중인 당첨 상품 후기입니다  ", rating: 5, bonusUsdt: 999 });
  assert.equal(review.itemId, item.itemId); assert.equal(review.boxSlug, item.boxSlug); assert.equal(review.bonusUsdt, 0);
  assert.equal(review.text, "보관 중인 당첨 상품 후기입니다");
  assert.equal(review.publishedAt, review.at);
  assert.equal(canReview(item, [review]), false);
  useInventoryStore.setState({ items: [] });
  assert.throws(() => useCommunityStore.getState().update(review.id, { text: "다른 계정의 수정 시도입니다", rating: 1 }), /forbidden/);
  assert.throws(() => useCommunityStore.getState().remove(review.id), /forbidden/);
  assert.equal(useCommunityStore.getState().mine.length, 1);
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

test("twenty board examples retain explicit provenance, two notices and two to six comments", () => {
  const examples = createBoardExamples();
  assert.equal(examples.length, 20); assert.equal(examples.filter(post => post.category === "notice").length, 2);
  assert.deepEqual(parseBoardPosts(JSON.parse(JSON.stringify(examples))), examples);
  assert.deepEqual(createBoardExamples(), examples, "reloads never generate more recent activity");
  assert.equal(new Set(examples.map(post => post.id)).size, 20);
  for (const post of examples) {
    assert.ok(isExampleBoardContent(post)); assert.ok(post.authorName.startsWith("예시 · "));
    assert.ok(post.comments.length >= 2 && post.comments.length <= 6);
    assert.ok(post.comments.every(comment => isExampleBoardContent(comment) && comment.authorName.startsWith("예시 · ")));
  }
  const actor = { id: "real-member", name: "실제 작성자", canPublishNotice: false };
  const withPost = applyBoardCommand(examples, { type: "create", draft: { title: "직접 작성한 게시글", body: "직접 작성한 내용입니다.", category: "general", pinned: false } }, actor, "2026-09-01T00:00:00Z", () => "member-post");
  const sorted = selectBoardPosts(withPost, { category: "all", query: "", mine: false, sort: "newest" });
  assert.equal(sorted[0].id, "member-post", "member activity precedes pinned examples even with an older timestamp");
  const commented = applyBoardCommand(withPost, { type: "comment", id: examples[2].id, body: "직접 남긴 댓글입니다." }, actor);
  const comments = commented.find(post => post.id === examples[2].id)!.comments;
  assert.ok(!isExampleBoardContent(comments[comments.length - 1]));
  assert.equal(comments.length, examples[2].comments.length + 1);
});

test("example initialization is serialized, non-destructive, and does not resurrect deleted history", async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
  try {
    const results = await Promise.all([loadBoard({ includeExamples: true }), loadBoard({ includeExamples: true })]);
    assert.equal(results[0].posts.length, 20); assert.deepEqual(results[0], results[1]);
    assert.equal(values.get(BOARD_EXAMPLES_KEY), "1");
    values.set(BOARD_STORAGE_KEY, "[]");
    assert.deepEqual((await loadBoard({ includeExamples: true })).posts, [], "deleted examples stay deleted");
    values.delete(BOARD_EXAMPLES_KEY);
    const member = applyBoardCommand([], { type: "create", draft: { title: "보존할 회원 글", body: "기존 작성 내용 보존", category: "tips", pinned: false } }, { id: "member", name: "Member", canPublishNotice: false });
    values.set(BOARD_STORAGE_KEY, JSON.stringify(member));
    assert.deepEqual((await loadBoard({ includeExamples: true })).posts, member, "never replace existing member records");
    values.set(BOARD_STORAGE_KEY, "not-json");
    await assert.rejects(loadBoard({ includeExamples: true })); assert.equal(values.get(BOARD_STORAGE_KEY), "not-json");
  } finally { if (original) Object.defineProperty(globalThis, "localStorage", original); else Reflect.deleteProperty(globalThis, "localStorage"); }
});

test("twenty review examples match real catalogue products worth at least 100 USDT without implying a real win", () => {
  const reviews = createReviewExamples(); assert.equal(reviews.length, 20);
  assert.equal(new Set(reviews.map(review => review.id)).size, 20);
  assert.deepEqual(createReviewExamples(), reviews);
  assert.deepEqual(Array.from(new Set(reviews.map(review => review.rating))).sort(), [4, 5]);
  for (const review of reviews) {
    const product = BOX_BY_SLUG[review.boxSlug]?.items.find(item => item.id === review.itemId);
    assert.ok(product && product.value >= 100 && product.kind !== "cash");
    assert.ok(isExampleReview(review)); assert.equal(review.publishedAt, undefined); assert.equal(review.bonusUsdt, 0);
    assert.equal(review.photo, undefined, "catalogue art must not masquerade as a customer photo");
  }
});

test("public feed keeps members ahead of examples, excludes private records, and never modifies mine", () => {
  const record = { id: "member-review", ownedId: "own", itemId: "da-iphone16", boxSlug: "dollar-apple", text: "직접 남긴 상품 후기입니다.", rating: 4, bonusUsdt: 0, at: "2026-09-01T00:00:00Z", publishedAt: "2026-09-01T00:00:00Z" };
  const mine = [record, { ...record, id: "private", publishedAt: undefined }, record];
  const before = JSON.stringify(mine);
  const feed = publicReviewFeed(mine);
  assert.equal(feed.length, 21); assert.equal(feed[0].id, record.id);
  assert.equal(feed.filter(isExampleReview).length, 20);
  assert.deepEqual(publicReviewFeed(mine, false), [record]);
  assert.equal(JSON.stringify(mine), before);
  assert.ok(!useCommunityStore.getState().mine.some(isExampleReview), "examples never become owned reviews");
});

test("rotation wraps without duplication or timestamp rewriting; relative time reflects elapsed time", () => {
  const reviews = createReviewExamples();
  assert.deepEqual(reviewWindow(reviews, 19).map(review => review.id), [reviews[19].id, reviews[0].id, reviews[1].id]);
  assert.deepEqual(reviewWindow(reviews, -1), reviewWindow(reviews, 19));
  assert.equal(reviewWindow(reviews.slice(0, 1), 8).length, 1);
  assert.deepEqual(reviewWindow([], 2), []); assert.deepEqual(reviewWindow(reviews, NaN), []);
  const at = "2026-09-30T00:00:00Z"; const now = Date.parse(at);
  assert.equal(relativeReviewTime(at, now + 1000, "ko"), "방금 전");
  assert.match(relativeReviewTime(at, now + 5 * 60000, "ko"), /5분 전/);
  assert.match(relativeReviewTime(at, now + 3600000, "en"), /1 hour ago/);
  assert.equal(relativeReviewTime("bad", now, "ko"), communityFeedCopy("ko").unknownTime);
  assert.equal(relativeReviewTime(at, now - 120000, "ko"), communityFeedCopy("ko").unknownTime);
  for (const locale of ["ko", "en", "zh"]) assert.ok(communityFeedCopy(locale).exampleNote.length > 10);
});

test("cross-tab clearing removes stale member reviews and unsubscribes cleanly", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  let listener: ((event: { key: string | null; newValue: string | null }) => void) | undefined;
  let removed = false;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { addEventListener: (_: string, callback: typeof listener) => { listener = callback; }, removeEventListener: (_: string, callback: typeof listener) => { removed = callback === listener; } } });
  const before = useCommunityStore.getState().mine;
  try {
    useCommunityStore.setState({ hydrated: true });
    const cleanup = subscribeCommunityReviews();
    listener!({ key: "another-store", newValue: null }); assert.equal(useCommunityStore.getState().mine, before);
    listener!({ key: "gachaflix.community", newValue: null }); assert.deepEqual(useCommunityStore.getState().mine, []);
    cleanup(); assert.equal(removed, true);
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original); else Reflect.deleteProperty(globalThis, "window");
    useCommunityStore.setState({ mine: before });
  }
});
