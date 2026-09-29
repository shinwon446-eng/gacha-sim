import { calculateRollResult, hashServerSeed, rollRanges } from "@/lib/fairness";
import type { OwnedItem } from "@/stores/inventoryStore";

export interface RecordVerification {
  hash: string;
  hashMatch: boolean;
  roll: number;
  rollMatch: boolean;
  itemMatch: boolean | null;
  expectedItemId: string | null;
  range: { from: number; to: number; dropRate: number } | null;
}

/** Historical results must use the exact ordered table saved at purchase time. */
export async function verifyOpeningRecord(record: Pick<OwnedItem, "fair" | "itemId">): Promise<RecordVerification> {
  const { fair } = record;
  const hash = await hashServerSeed(fair.serverSeed);
  const calculated = await calculateRollResult(fair.serverSeed, fair.clientSeed, fair.nonce);
  const range = fair.dropTable?.length ? rollRanges(fair.dropTable).find((entry) => calculated.roll >= entry.from && calculated.roll <= entry.to) : undefined;
  return {
    hash,
    hashMatch: hash === fair.serverSeedHash.trim().toLowerCase(),
    roll: calculated.roll,
    rollMatch: calculated.roll === fair.roll,
    itemMatch: range ? range.item.id === record.itemId : null,
    expectedItemId: range?.item.id ?? null,
    range: range ? { from: range.from, to: range.to, dropRate: range.item.dropRate } : null,
  };
}
