/**
 * 백엔드 계약 (live 모드). 전부 JSON, 실패는 throw. 호출측은 isLive() 로 분기한다.
 *
 *   GET  /feed/live            → LiveDrop[]            실시간 당첨·환전·출고 스트림
 *   GET  /feed/proof           → { payouts, shipments } 실지급·실배송 인증 피드
 *   GET  /stats/today          → { shipmentsToday, cashoutsTodayUsdt, verificationRate }
 *   GET  /reserve              → { address, network, balanceUsdt }
 *   POST /deposit/address      → { address, network }   유저별 입금 주소 발급
 *   POST /deposit/check        → { status: "pending"|"confirmed", confirmations, amountUsdt?, txHash? }  입금 확인(자동 잔고 반영)
 *   POST /withdraw             → { id, status, txHash? } 출금 신청 (서버가 서명·브로드캐스트)
 *   GET  /withdraw/:id         → { status, txHash? }
 *   GET  /shipping/:ownedId    → { carrier, trackingNumber } | 404 (출고 전)
 */
import { API_BASE } from "@/lib/runtime";
import type { DepositNetwork, Network } from "@/lib/depositAddress";
import type { LiveDrop } from "@/lib/liveDrops";
import type { PayoutProof, ShipmentProof } from "@/lib/proofFeed";
import type { CarrierKey } from "@/lib/carriers";
import type { TxStatus } from "@/stores/walletStore";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  liveFeed: () => call<LiveDrop[]>("/feed/live"),
  proofFeed: () => call<{ payouts: PayoutProof[]; shipments: ShipmentProof[] }>("/feed/proof"),
  statsToday: () => call<{ shipmentsToday: number; cashoutsTodayUsdt: number; verificationRate: number }>("/stats/today"),
  reserve: () => call<{ address: string; network: Network; balanceUsdt: number }>("/reserve"),
  depositAddress: (network: DepositNetwork, userKey: string) => call<{ address: string; network: DepositNetwork }>("/deposit/address", { method: "POST", body: JSON.stringify({ network, userKey }) }),
  depositCheck: (input: { network: DepositNetwork; address: string; userKey: string; expectedUsdt?: number }) => call<{ status: "pending" | "confirmed"; confirmations: number; amountUsdt?: number; txHash?: string }>("/deposit/check", { method: "POST", body: JSON.stringify(input) }),
  withdraw: (input: { network: Network; address: string; amountUsdt: number; userKey: string }) => call<{ id: string; status: TxStatus; txHash?: string }>("/withdraw", { method: "POST", body: JSON.stringify(input) }),
  withdrawStatus: (id: string) => call<{ status: TxStatus; txHash?: string }>(`/withdraw/${encodeURIComponent(id)}`),
  shipping: (ownedId: string) => call<{ carrier: CarrierKey; trackingNumber: string }>(`/shipping/${encodeURIComponent(ownedId)}`),
};
