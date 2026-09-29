import test from "node:test";
import assert from "node:assert/strict";
import { createOpeningPurchase, InsufficientOpeningBalance } from "../lib/opening";
import { BOXES, CATALOG_ODDS_VERSION, type ProductBox } from "../lib/products";
import { useFairStore } from "../stores/fairStore";
import { useInventoryStore } from "../stores/inventoryStore";
import { useWalletStore } from "../stores/walletStore";

function reset(crypto = 50, card = 50) {
  useWalletStore.setState({ cryptoBalance: crypto, cardBalance: card, balance: crypto + card, transactions: [], totalWagered: 0 });
  useInventoryStore.setState({ items: [] });
  useFairStore.setState({ serverSeed: "a".repeat(128), serverSeedHash: "hash", clientSeed: "batch-test", nonce: 0 });
}

function box(cash: boolean): ProductBox {
  const item = BOXES.flatMap((b) => b.items).find((i) => cash ? i.kind === "cash" : i.kind === "physical")!;
  return { ...BOXES[0], price: 10, guaranteedMin: 2, items: [{ ...item, value: 2, dropRate: 100 }] };
}

test("10 purchased results are all allocated before presentation; repeated Skip/X cannot debit or credit again", async () => {
  reset();
  const purchase = createOpeningPurchase(box(true), 10);
  const [first, repeated] = await Promise.all([purchase(), purchase()]);
  assert.strictEqual(first, repeated);
  assert.equal(first.length, 10);
  assert.equal(new Set(first.map((r) => r.ownedId)).size, 10);
  assert.equal(useInventoryStore.getState().items.length, 10);
  assert.ok(useInventoryStore.getState().items.every((i) => i.status === "SOLD"));
  assert.equal(useWalletStore.getState().cryptoBalance, 10);
  assert.equal(useWalletStore.getState().cardBalance, 10);
  assert.equal(useWalletStore.getState().transactions.filter((t) => t.type === "open").length, 1);
  await purchase();
  assert.equal(useWalletStore.getState().balance, 20);
  assert.equal(useFairStore.getState().nonce, 10);
});

test("physical rewards and the purchase-time probability table survive closing presentation", async () => {
  reset(100, 0);
  const results = await createOpeningPurchase(box(false), 10)();
  assert.equal(results.length, 10);
  assert.equal(useWalletStore.getState().balance, 0);
  const held = useInventoryStore.getState().items;
  assert.ok(held.every((i) => i.status === "IN_STORAGE"));
  assert.ok(held.every((i) => i.fair.oddsVersion === CATALOG_ODDS_VERSION));
  assert.deepEqual(held[0].fair.dropTable, [{ id: results[0].item.id, dropRate: 100 }]);
});

test("cancel before purchase confirmation changes neither funds, results nor nonce", () => {
  reset();
  createOpeningPurchase(box(true), 10); // User cancels; execution is never invoked.
  assert.equal(useWalletStore.getState().balance, 100);
  assert.equal(useWalletStore.getState().transactions.length, 0);
  assert.equal(useInventoryStore.getState().items.length, 0);
  assert.equal(useFairStore.getState().nonce, 0);
});

test("insufficient funds and invalid counts never debit or allocate", async () => {
  reset(5, 0);
  await assert.rejects(createOpeningPurchase(box(true), 1)(), InsufficientOpeningBalance);
  await assert.rejects(createOpeningPurchase(box(true), 0)(), RangeError);
  await assert.rejects(createOpeningPurchase(box(true), 1.5)(), RangeError);
  assert.equal(useWalletStore.getState().balance, 5);
  assert.equal(useInventoryStore.getState().items.length, 0);
  assert.equal(useWalletStore.getState().transactions.length, 0);
  assert.equal(useFairStore.getState().nonce, 0);
});

test("concurrent purchases recheck funds at commit and do not overspend", async () => {
  reset(10, 0);
  const settled = await Promise.allSettled([createOpeningPurchase(box(true), 1)(), createOpeningPurchase(box(true), 1)()]);
  assert.equal(settled.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(settled.filter((r) => r.status === "rejected").length, 1);
  assert.equal(useWalletStore.getState().balance, 2);
  assert.equal(useInventoryStore.getState().items.length, 1);
});
