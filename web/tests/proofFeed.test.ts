// 실지급/실배송 피드 — 이 기기의 실제 기록에서만 만든다. TxID·운송장은 발급된 것만 링크한다.
import test from "node:test";
import assert from "node:assert/strict";
import { buildProofFeed, buildLocalPayouts, buildLocalShipments, maskRecipient } from "../lib/proofFeed";
import { proofMetrics, publicProofSnapshot } from "../components/home/ProofFeed";
import { BOXES } from "../lib/products";
import type { OwnedItem } from "../stores/inventoryStore";
import type { Transaction } from "../stores/walletStore";

test("home proof metrics use catalogue odds and recorded openings and payback", () => {
  const metrics = proofMetrics([{} as OwnedItem, {} as OwnedItem], [
    { type: "sellback", amountUsdt: 95 } as Transaction,
    { type: "open", amountUsdt: -100 } as Transaction,
  ]);
  assert.equal(metrics.publishedOdds, BOXES.reduce((sum, box) => sum + box.items.length, 0));
  assert.equal(metrics.openings, 2);
  assert.equal(metrics.paybackUsdt, 95);
  assert.equal("shipments" in metrics, false);
});

test("public proof snapshot is shared per five-second UTC bucket, updates continuously and includes a premium opening", () => {
  const at = Date.UTC(2026, 9, 1, 12, 0, 5);
  const sameA = publicProofSnapshot(at, 4);
  const sameB = publicProofSnapshot(at + 2_000, 4);
  const next = publicProofSnapshot(at + 5_000, 4);
  assert.deepEqual(sameA, sameB);
  assert.ok(next.openings > sameA.openings);
  assert.ok(next.paybackUsdt > sameA.paybackUsdt);
  assert.ok(sameA.openingsFeed.some(row => row.amountUsdt >= 1_000));
  assert.equal(sameA.openingsFeed.length, 4);
});

test("single feed uses actual transactions only, sorts before limiting and keeps actual statuses", () => {
  assert.deepEqual(buildProofFeed([], "me"), []);
  const types = ["open", "deposit_card", "deposit_usdt", "sellback", "withdraw"] as const;
  const txs = types.map((type, i): Transaction => ({ id: `tx${i}`, type, amountUsdt: i + 1, at: `2026-09-0${i + 1}T00:00:00Z`, status: type === "withdraw" ? "CANCELLED" : undefined }));
  const feed = buildProofFeed(txs, "me");
  assert.deepEqual(feed.map(p => p.kind), [...types].reverse());
  assert.equal(feed[0].status, "CANCELLED");
  assert.equal(feed[0].network, undefined);
  assert.equal(feed[0].txHash, undefined);
  assert.equal(feed[1].status, undefined);
  assert.deepEqual(buildProofFeed(txs, "me", [], 2).map(p => p.id), ["tx4", "tx3"]);
});

test("server and local records merge without duplicate IDs or chain hashes", () => {
  const hash = "ab".repeat(32);
  const local: Transaction[] = [{ id: "local", serverId: "server", type: "withdraw", amountUsdt: -20, at: "2026-09-01T00:00:00Z", status: "PENDING" },
    { id: "other", type: "open", amountUsdt: -10, at: "2026-09-02T00:00:00Z" }];
  const remote = [{ id: "server", user: "me", kind: "withdraw", amountUsdt: 20, at: "2026-09-01T00:00:00Z", network: "TRC20", txHash: hash, status: "COMPLETED" },
    { id: "duplicate", user: "me", kind: "withdraw", amountUsdt: 20, at: "2026-09-01T00:00:00Z", network: "TRC20", txHash: hash }];
  const feed = buildProofFeed(local, "me", remote);
  assert.deepEqual(feed.map(p => p.id), ["other", "server"]);
  assert.equal(feed[1].status, "COMPLETED");
  assert.equal(feed[1].txHash, hash);
});

test("API boundary rejects fabricated shapes, invalid dates and amounts; never invents explorer links", () => {
  const valid = { id: "1", user: "u***", kind: "withdraw", amountUsdt: 1, at: "2026-09-01T00:00:00Z" };
  const feed = buildProofFeed([], "me", [null, {}, { ...valid, kind: "shipments" }, { ...valid, at: "bad" }, { ...valid, amountUsdt: Infinity }, { ...valid, amountUsdt: "1" }, { ...valid, network: "BEP20", txHash: "fake", status: "invented" }]);
  assert.equal(feed.length, 1);
  assert.equal(feed[0].txHash, undefined);
  assert.equal(feed[0].status, undefined);
  assert.deepEqual(buildProofFeed([], "me", { payouts: [valid] }), []);
});

test("수령인 마스킹 — 한글은 가운데, 영문은 이름 첫 글자 + 성 이니셜", () => {
  assert.equal(maskRecipient("홍길동"), "홍*동");
  assert.equal(maskRecipient("김연"), "김*");
  assert.equal(maskRecipient("John Smith"), "J*** S.");
  assert.equal(maskRecipient("Emma"), "E***");
  assert.equal(maskRecipient(""), "***");
});

test("지급 피드: withdraw/sellback 만, TxID 는 있는 경우에만 실린다", () => {
  const txs: Transaction[] = [
    { id: "w1", type: "withdraw", amountUsdt: -30, at: "2026-09-18T04:00:00Z", ref: "TRC20:Tabc", status: "PENDING" },
    { id: "w2", type: "withdraw", amountUsdt: -50, at: "2026-09-18T05:00:00Z", ref: "BEP20:0xabc", status: "COMPLETED", txHash: "0x" + "a".repeat(64) },
    { id: "s1", type: "sellback", amountUsdt: 26.6, at: "2026-09-18T02:00:00Z" },
    { id: "o1", type: "open", amountUsdt: -1, at: "2026-09-18T01:00:00Z" },
  ];
  const p = buildLocalPayouts(txs, "u_x***");
  assert.deepEqual(
    p.map((x) => x.kind),
    ["withdraw", "withdraw", "sellback"],
  );
  assert.equal(p[0].txHash, undefined);
  assert.equal(p[1].txHash, "0x" + "a".repeat(64));
  assert.equal(p[1].network, "BEP20");
  assert.equal(p[2].amountUsdt, 26.6);
});

test("출고 피드: 배송 신청 이후 항목만, 운송장은 발급된 경우에만", () => {
  const base: OwnedItem = {
    id: "a",
    itemId: "rlx-sub",
    boxSlug: "vault-submariner",
    valueUsdt: 15600,
    tier: "royal",
    status: "SHIPPING_REQUESTED",
    acquiredAt: "2026-09-18T00:00:00Z",
    fair: { serverSeedHash: "h", serverSeed: "s", clientSeed: "c", nonce: 1, roll: 1 },
    shipping: { address: { recipient: "홍길동", country: "KR", phone: "0", postalCode: "0", address: "a" }, feeUsdt: 15, requestedAt: "2026-09-18T01:00:00Z" },
  };
  const shipped: OwnedItem = { ...base, id: "b", status: "SHIPPING", shipping: { ...base.shipping!, carrier: "CJ", trackingNumber: "123456789012", shippedAt: "2026-09-18T02:00:00Z" } };
  const stored: OwnedItem = { ...base, id: "c", status: "IN_STORAGE", shipping: undefined };
  const s = buildLocalShipments([base, shipped, stored]);
  assert.deepEqual(
    s.map((x) => x.id),
    ["b", "a"],
  );
  assert.equal(s[0].trackingNumber, "123456789012");
  assert.equal(s[1].trackingNumber, undefined);
  assert.equal(s[1].recipient, "홍*동");
});
