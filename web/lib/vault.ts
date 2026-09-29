import { BOX_BY_SLUG, REFUND_RATE } from "./products";
import type { OwnedItem } from "../stores/inventoryStore";
export type VaultTab = "held" | "shipping" | "done";
export type RecordKind = "held" | "cash" | "sellback" | "requested" | "transit" | "delivered";
export const productOf = (item: OwnedItem) => BOX_BY_SLUG[item.boxSlug]?.items.find(p => p.id === item.itemId);
export function vaultTab(item: OwnedItem): VaultTab {
  if (item.status === "IN_STORAGE") return "held";
  return item.status === "SOLD" ? "done" : "shipping";
}
export function recordKind(item: OwnedItem): RecordKind {
  if (item.status === "SOLD") return productOf(item)?.kind === "cash" ? "cash" : "sellback";
  if (item.status === "DELIVERED") return "delivered";
  if (item.status === "SHIPPING") return "transit";
  return item.status === "SHIPPING_REQUESTED" ? "requested" : "held";
}
/** Missing processing dates stay unknown; acquisition is not settlement. */
export function processedAt(item: OwnedItem): string | undefined {
  if (item.status === "SOLD") return item.soldAt;
  if (item.status === "DELIVERED") return item.shipping?.deliveredAt;
  if (item.status === "SHIPPING") return item.shipping?.shippedAt;
  if (item.status === "SHIPPING_REQUESTED") return item.shipping?.requestedAt;
  return item.acquiredAt;
}
export const resaleEstimate = (items: OwnedItem[]) => +(items.filter(i => i.status === "IN_STORAGE").reduce((sum, i) => sum + Math.round(i.valueUsdt * REFUND_RATE * 100), 0) / 100).toFixed(2);
