import { CATALOG_ODDS_VERSION, dropTable, floorRatio, type ProductBox, type ProductItem } from "./products";
import { calculateRollResult, determineItem } from "./fairness";
import { tierOf, type Tier } from "./tiers";
import { rolloverContribution } from "./rollover";
import { useFairStore } from "../stores/fairStore";
import { useInventoryStore } from "../stores/inventoryStore";
import { useWalletStore } from "../stores/walletStore";

export interface OpeningResult {
  ownedId: string;
  settled: boolean;
  item: ProductItem;
  tier: Tier;
  roll: number;
  hmac: string;
  nonce: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
}

export class InsufficientOpeningBalance extends Error {}

/** One purchase, independent of animation. Repeated calls share one operation.
 * Calculate the full batch before charging. After the last await, debit,
 * allocation and cashback run together without any animation or user-event gap.
 * This is a browser ledger; an authoritative service must replace it for real funds.
 */
export function createOpeningPurchase(box: ProductBox, count: number) {
  let operation: Promise<OpeningResult[]> | undefined;
  return () => operation ??= executeOpening(box, count);
}

async function executeOpening(box: ProductBox, count: number): Promise<OpeningResult[]> {
  if (!Number.isSafeInteger(count) || count < 1 || count > 100) throw new RangeError("Invalid opening quantity");
  const cost = +(box.price * count).toFixed(2);

  // Seed creation is asynchronous.  Do not keep a wallet snapshot across it:
  // a balance update in that gap used to let an opening continue with stale
  // state and surface as a generic opening failure.
  if (useWalletStore.getState().balance < cost) throw new InsufficientOpeningBalance();
  await useFairStore.getState().ensureSeeds();
  const fair = useFairStore.getState();
  const { serverSeed, serverSeedHash, clientSeed } = fair;
  const table = dropTable(box);
  const nonces = Array.from({ length: count }, () => fair.takeNonce());
  const rolls = await Promise.all(nonces.map((nonce) => calculateRollResult(serverSeed, clientSeed, nonce)));
  const picked = rolls.map((r, i) => {
    const item = determineItem(r.roll, table);
    return { ...r, item, tier: tierOf(item.value, box.price), nonce: nonces[i], serverSeed, serverSeedHash, clientSeed };
  });
  const wallet = useWalletStore.getState();
  const funding = wallet.debitSplit(cost);
  if (!funding) throw new InsufficientOpeningBalance();
  let allocatedIds: string[] = [];
  try {
    const inventory = useInventoryStore.getState();
    const owned = inventory.add(picked.map((r) => ({
      itemId: r.item.id, boxSlug: box.slug, valueUsdt: r.item.value, tier: r.tier.key,
      fair: { serverSeed, serverSeedHash, clientSeed, nonce: r.nonce, roll: r.roll, oddsVersion: CATALOG_ODDS_VERSION, dropTable: table.map(({ id, dropRate }) => ({ id, dropRate })) },
      fundingRatio: funding.ratio,
    })));
    if (owned.length !== picked.length) throw new Error("Opening inventory allocation failed");
    allocatedIds = owned.map(({ id }) => id);
    const results = picked.map((r, i) => ({ ...r, ownedId: owned[i].id, settled: r.item.kind === "cash" }));
    const cash = results.filter((r) => r.settled).map((r) => r.ownedId);
    if (cash.length) {
      const settlement = inventory.sell(cash, 1);
      if (settlement.ids.length !== cash.length || settlement.totalUsdt <= 0) throw new Error("Opening cash settlement failed");
      wallet.creditSplit(settlement.toCrypto, settlement.toCard);
      wallet.addTransaction({ type: "sellback", amountUsdt: settlement.totalUsdt, ref: `${box.slug}:cashback x${cash.length}` });
    }
    wallet.addTransaction({ type: "open", amountUsdt: -cost, ref: `${box.slug}x${count}`, rolloverUsdt: rolloverContribution(cost, floorRatio(box)) });
    return results;
  } catch (error) {
    // Never leave a customer charged when allocation or settlement fails.
    if (allocatedIds.length) {
      const allocated = new Set(allocatedIds);
      useInventoryStore.setState((state) => ({ items: state.items.filter((item) => !allocated.has(item.id)) }));
    }
    wallet.creditSplit(funding.fromCrypto, funding.fromCard);
    throw error;
  }
}
