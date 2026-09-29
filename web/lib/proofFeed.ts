/**
 * 실지급 & 실배송 인증 피드 (CLAUDE.md §6).
 * live 모드는 API 집계(마스킹된 전체 유저), preview 모드는 이 기기의 실제 출금·환전·출고 기록만 보여준다.
 * 다른 사람의 지급·배송을 지어내지 않는다. TxID·운송장은 실제로 발급된 것만 링크한다.
 */
import type { Network } from "@/lib/depositAddress";
import type { CarrierKey } from "@/lib/carriers";
import type { CountryCode } from "@/lib/shipping";
import type { OwnedItem } from "@/stores/inventoryStore";
import type { Transaction, TxStatus } from "@/stores/walletStore";
import { isValidTxHash } from "@/lib/withdrawal";

export type PayoutKind = Transaction["type"];

export interface PayoutProof {
  id: string;
  serverId?: string;
  ref?: string;
  /** 마스킹된 유저 */
  user: string;
  kind: PayoutKind;
  amountUsdt: number;
  /** 출금은 박스가 없다 */
  boxSlug?: string;
  network?: Network;
  /** 브로드캐스트 후에만 존재 */
  txHash?: string;
  status?: TxStatus;
  at: string;
}

export interface ShipmentProof {
  id: string;
  /** 마스킹된 수령인 */
  recipient: string;
  /** 지역 — 국가 코드 (화면이 로케일로 번역) */
  country: CountryCode;
  boxSlug: string;
  itemId: string;
  carrier?: CarrierKey;
  trackingNumber?: string;
  at: string;
}

/** 수령인 마스킹 — "홍길동" → "홍*동", "John Smith" → "J*** S." */
export function maskRecipient(name: string): string {
  const n = name.trim();
  if (!n) return "***";
  if (/^[가-힣]+$/.test(n)) return n.length <= 2 ? `${n[0]}*` : `${n[0]}${"*".repeat(n.length - 2)}${n[n.length - 1]}`;
  const [first, ...rest] = n.split(/\s+/);
  const last = rest.length ? ` ${rest[rest.length - 1][0]}.` : "";
  return `${first[0]}***${last}`;
}

/** 이 기기의 실제 기록 → 지급 피드 */
export function buildLocalPayouts(transactions: Transaction[], user: string, limit = 20): PayoutProof[] {
  return transactions
    .filter((t) => t.type === "withdraw" || t.type === "sellback")
    .map<PayoutProof>((t) => {
      const [net] = (t.ref ?? "").split(":");
      return {
        id: t.id,
        user,
        kind: t.type === "withdraw" ? "withdraw" : "sellback",
        amountUsdt: Math.abs(t.amountUsdt),
        network: t.type === "withdraw" ? knownNetwork(t.network ?? net) : undefined,
        txHash: t.txHash,
        status: t.status,
        at: t.at,
      };
    })
    .slice(0, limit);
}

function knownNetwork(value: unknown): Network | undefined {
  return value === "TRC20" || value === "BEP20" ? value : undefined;
}
const ACTIVITY_KINDS = new Set<PayoutKind>(["deposit_usdt", "deposit_card", "open", "sellback", "withdraw", "bonus", "shipping_refund", "order_refund"]);
const TX_STATUSES = new Set<TxStatus>(["PENDING", "PENDING_ADMIN_REVIEW", "PENDING_72H_HOLD", "BROADCASTING", "COMPLETED", "CANCELLED", "FAILED"]);

/** Validate the API boundary. Missing hashes, networks and statuses are never invented. */
function validProof(value: unknown): PayoutProof | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Partial<PayoutProof>;
  if (typeof p.id !== "string" || !p.id || typeof p.user !== "string" || !p.user.trim()
    || !p.kind || !ACTIVITY_KINDS.has(p.kind) || typeof p.amountUsdt !== "number" || !Number.isFinite(p.amountUsdt)
    || typeof p.at !== "string" || !Number.isFinite(Date.parse(p.at))) return null;
  const network = knownNetwork(p.network);
  return {
    id: p.id, user: p.user, kind: p.kind, amountUsdt: Math.abs(p.amountUsdt), at: p.at,
    serverId: typeof p.serverId === "string" ? p.serverId : undefined,
    ref: typeof p.ref === "string" ? p.ref : undefined,
    boxSlug: typeof p.boxSlug === "string" ? p.boxSlug : undefined,
    status: p.status && TX_STATUSES.has(p.status) ? p.status : undefined,
    network, txHash: network && typeof p.txHash === "string" && isValidTxHash(network, p.txHash) ? p.txHash : undefined,
  };
}

/** One chronological feed of actual transactions, with authoritative API records taking precedence. */
export function buildProofFeed(transactions: Transaction[], user: string, remote: unknown = [], limit = 99): PayoutProof[] {
  const local = transactions.map(t => ({
    id: t.id, serverId: t.serverId, user, kind: t.type, amountUsdt: t.amountUsdt,
    at: t.at, ref: t.ref, boxSlug: t.type === "open" ? t.ref : undefined,
    network: knownNetwork(t.network ?? (t.type === "withdraw" ? t.ref?.split(":")[0] : undefined)),
    txHash: t.txHash, status: t.status,
  }));
  const seen = new Set<string>();
  const result: PayoutProof[] = [];
  for (const raw of [...(Array.isArray(remote) ? remote : []), ...local]) {
    const p = validProof(raw);
    if (!p) continue;
    const keys = [`${p.kind}:id:${p.id}`];
    if (p.serverId) keys.push(`${p.kind}:id:${p.serverId}`);
    if (p.network && p.txHash) keys.push(`${p.kind}:tx:${p.network}:${p.txHash.toLowerCase()}`);
    const duplicate = keys.some(key => seen.has(key));
    keys.forEach(key => seen.add(key));
    if (!duplicate) result.push(p);
  }
  return result.sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, Math.floor(limit)));
}

/** 이 기기의 실제 기록 → 출고 피드 (출고 신청 이후 항목) */
export function buildLocalShipments(items: OwnedItem[], limit = 20): ShipmentProof[] {
  return items
    .filter((o) => o.shipping && (o.status === "SHIPPING_REQUESTED" || o.status === "SHIPPING"))
    .map<ShipmentProof>((o) => ({
      id: o.id,
      recipient: maskRecipient(o.shipping!.address.recipient),
      country: o.shipping!.address.country,
      boxSlug: o.boxSlug,
      itemId: o.itemId,
      carrier: o.shipping!.carrier,
      trackingNumber: o.shipping!.trackingNumber,
      at: o.shipping!.shippedAt ?? o.shipping!.requestedAt,
    }))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}
