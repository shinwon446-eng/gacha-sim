/**
 * 백엔드 계약 (live 모드). 전부 JSON, 실패는 throw. 호출측은 isLive() 로 분기한다.
 *
 *   GET  /feed/live            → LiveDrop[]            실시간 당첨, 환전, 출고 스트림
 *   GET  /feed/proof           → { payouts, shipments } 실지급, 실배송 인증 피드
 *   GET  /stats/today          → { shipmentsToday, cashoutsTodayUsdt, verificationRate }
 *   GET  /reserve              → { address, network, balanceUsdt }
 *   POST /deposit/address      → { address, network }   유저별 입금 주소 발급
 *   POST /deposit/check        → { status: "pending"|"confirmed", confirmations, amountUsdt?, txHash? }  입금 확인(자동 잔고 반영)
 *   POST /withdraw             → { id, status, txHash? } 출금 신청 (서버가 서명, 브로드캐스트)
 *   GET  /withdraw/:id         → { status, txHash? }
 *   GET  /shipping/:ownedId    → { carrier, trackingNumber } | 404 (출고 전)
 */
import { API_BASE } from "@/lib/runtime";
import type { DepositNetwork, Network } from "@/lib/depositAddress";
import type { LiveDrop } from "@/lib/liveDrops";
import type { PayoutProof, ShipmentProof } from "@/lib/proofFeed";
import type { CarrierKey } from "@/lib/carriers";
import type { TxStatus } from "@/stores/walletStore";
import { accountRequest, AccountError } from "@/lib/account";
import type { WithdrawalDraft, WithdrawalProof } from "@/lib/security";

export interface WithdrawalResult { id: string; status: TxStatus; txHash?: string; unlockAt?: number }
function withdrawalResult(data: Record<string, unknown>): WithdrawalResult {
  if (typeof data.id !== "string" || !data.id || !["PENDING", "PENDING_ADMIN_REVIEW", "PENDING_72H_HOLD", "BROADCASTING", "COMPLETED", "CANCELLED", "FAILED"].includes(data.status as string)) throw new AccountError("invalid");
  if (data.status === "PENDING_72H_HOLD" && (typeof data.unlockAt !== "number" || !Number.isFinite(data.unlockAt))) throw new AccountError("invalid");
  return data as unknown as WithdrawalResult;
}
import type { OwnedItem } from "@/stores/inventoryStore";

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
  depositAddress: async (network: DepositNetwork, userKey: string) => await accountRequest("/deposit/address", { network, userKey }, API_BASE) as unknown as { address: string; network: DepositNetwork },
  depositCheck: async (input: { network: DepositNetwork; address: string; userKey: string; expectedUsdt?: number }) => {
    const result = await accountRequest("/deposit/check", input, API_BASE);
    if (!["pending", "confirmed"].includes(result.status as string) || typeof result.confirmations !== "number" || !Number.isFinite(result.confirmations) || result.confirmations < 0) throw new AccountError("invalid");
    if (result.status === "confirmed" && (typeof result.amountUsdt !== "number" || !Number.isFinite(result.amountUsdt) || result.amountUsdt <= 0 || typeof result.txHash !== "string" || !result.txHash)) throw new AccountError("invalid");
    return result as unknown as { status: "pending" | "confirmed"; confirmations: number; amountUsdt?: number; txHash?: string };
  },
  withdraw: async (input: WithdrawalDraft & { requestId: string; authorization: string; authMethod: WithdrawalProof["method"] }) => {
    const result = withdrawalResult(await accountRequest("/withdraw", input, API_BASE));
    if (input.authMethod === "EMAIL_72H_HOLD" && result.status !== "PENDING_72H_HOLD" && !["CANCELLED", "FAILED"].includes(result.status)) throw new AccountError("invalid");
    return result;
  },
  withdrawStatus: async (id: string) => withdrawalResult(await accountRequest(`/withdraw/${encodeURIComponent(id)}`, undefined, API_BASE)),
  cancelWithdrawal: async (id: string) => withdrawalResult(await accountRequest(`/withdraw/${encodeURIComponent(id)}/cancel`, {}, API_BASE)),
  shipping: (ownedId: string) => call<{ carrier: CarrierKey; trackingNumber: string }>(`/shipping/${encodeURIComponent(ownedId)}`),
  cancelShipping: async (ownedId: string, requestId: string) => await accountRequest(`/shipping/${encodeURIComponent(ownedId)}/cancel`, { requestId, idempotencyKey: `cancel-shipping:${ownedId}:${requestId}` }, API_BASE) as unknown as { status: "CANCELLED"; item: OwnedItem; wallet: { balance: number; cryptoBalance: number; cardBalance: number } },
};
