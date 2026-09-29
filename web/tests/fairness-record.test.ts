import assert from "node:assert/strict";
import test from "node:test";
import { calculateRollResult, hashServerSeed } from "../lib/fairness";
import { verifyOpeningRecord } from "../components/fairness/verifyRecord";

async function fixture() {
  const serverSeed = "saved-source";
  const clientSeed = "saved-client";
  const nonce = 7;
  return { itemId: "historical-item", fair: { serverSeed, clientSeed, nonce, serverSeedHash: await hashServerSeed(serverSeed), roll: (await calculateRollResult(serverSeed, clientSeed, nonce)).roll, oddsVersion: "historical-v1", dropTable: [{ id: "historical-item", dropRate: 100 }] } };
}

test("saved odds table verifies an item independent of today's catalogue", async () => {
  const result = await verifyOpeningRecord(await fixture());
  assert.equal(result.hashMatch, true);
  assert.equal(result.rollMatch, true);
  assert.equal(result.itemMatch, true);
  assert.equal(result.expectedItemId, "historical-item");
});
test("a changed source fails the stored hash comparison", async () => {
  const record = await fixture();
  record.fair.serverSeed = "changed-source";
  assert.equal((await verifyOpeningRecord(record)).hashMatch, false);
});
test("a changed stored number fails independently of a matching hash", async () => {
  const record = await fixture();
  record.fair.roll = (record.fair.roll + 1) % 1_000_000;
  const result = await verifyOpeningRecord(record);
  assert.equal(result.hashMatch, true);
  assert.equal(result.rollMatch, false);
});
test("a wrong received item fails the saved table check", async () => {
  const record = await fixture();
  record.itemId = "different-item";
  assert.equal((await verifyOpeningRecord(record)).itemMatch, false);
});
test("legacy records without a snapshot are partial, never verified against current odds", async () => {
  const record = await fixture();
  const { dropTable: _removed, ...fair } = record.fair;
  const result = await verifyOpeningRecord({ itemId: record.itemId, fair });
  assert.equal(result.hashMatch, true);
  assert.equal(result.rollMatch, true);
  assert.equal(result.itemMatch, null);
  assert.equal(result.expectedItemId, null);
});
test("invalid saved probability totals fail instead of silently normalizing", async () => {
  const record = await fixture();
  record.fair.dropTable[0].dropRate = 99;
  await assert.rejects(() => verifyOpeningRecord(record));
});
