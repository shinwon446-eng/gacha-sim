// 실지급/실배송 피드 — 이 기기의 실제 기록에서만 만든다. TxID·운송장은 발급된 것만 링크한다.
import test from "node:test";
import assert from "node:assert/strict";
import { buildLocalPayouts, buildLocalShipments, maskRecipient } from "../lib/proofFeed";
import type { OwnedItem } from "../stores/inventoryStore";
import type { Transaction } from "../stores/walletStore";

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
