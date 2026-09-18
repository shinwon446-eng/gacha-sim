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

export type PayoutKind = "withdraw" | "sellback";

export interface PayoutProof {
  id: string;
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
        network: t.type === "withdraw" ? (net === "BEP20" ? "BEP20" : "TRC20") : undefined,
        txHash: t.txHash,
        status: t.status,
        at: t.at,
      };
    })
    .slice(0, limit);
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
