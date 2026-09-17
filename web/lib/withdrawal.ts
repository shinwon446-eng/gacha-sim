/**
 * USDT 출금 (CLAUDE.md §5-A). 네트워크별 고정 수수료, 최소 출금액, 주소 형식 검사, 실수령액 계산.
 * 정적 데모에는 송금 백엔드가 없다 — 화면은 PENDING → PROCESSING 까지만 재현하고 그 사실을 명시한다.
 */
import { looksLikeAddress, type Network } from "@/lib/depositAddress";

export interface WithdrawNetworkMeta {
  key: Network;
  chain: string;
  token: string;
  /** 네트워크 수수료(USDT) — 신청액에서 차감 */
  feeUsdt: number;
  /** 주소 형식 힌트 */
  addressHint: string;
  recommended: boolean;
}

export const WITHDRAW_NETWORKS: WithdrawNetworkMeta[] = [
  { key: "TRC20", chain: "Tron Network", token: "USDT (TRC-20)", feeUsdt: 1.0, addressHint: "T…", recommended: true },
  { key: "BEP20", chain: "BNB Smart Chain (BSC)", token: "USDT (BEP-20)", feeUsdt: 0.8, addressHint: "0x…", recommended: false },
];

export const WITHDRAW_NETWORK_BY_KEY: Record<Network, WithdrawNetworkMeta> = Object.fromEntries(WITHDRAW_NETWORKS.map((n) => [n.key, n])) as Record<Network, WithdrawNetworkMeta>;

export const MIN_WITHDRAW_USDT = 20;

export type WithdrawStatus = "PENDING" | "PROCESSING" | "COMPLETED";

export type WithdrawError = "address" | "min" | "insufficient" | "nan";

/** 출금 주소 — TRC-20 은 T + base58 33자, BEP-20 은 0x + hex 40자 */
export function isValidWithdrawAddress(network: Network, address: string): boolean {
  return looksLikeAddress(network, address.trim());
}

export function netReceive(amountUsdt: number, network: Network): number {
  return +Math.max(0, amountUsdt - WITHDRAW_NETWORK_BY_KEY[network].feeUsdt).toFixed(2);
}

export function validateWithdrawal(input: { network: Network; address: string; amountUsdt: number; balanceUsdt: number }): WithdrawError[] {
  const errs: WithdrawError[] = [];
  if (!isValidWithdrawAddress(input.network, input.address)) errs.push("address");
  if (!Number.isFinite(input.amountUsdt) || input.amountUsdt <= 0) errs.push("nan");
  else {
    if (input.amountUsdt < MIN_WITHDRAW_USDT) errs.push("min");
    if (input.amountUsdt > input.balanceUsdt + 1e-9) errs.push("insufficient");
  }
  return errs;
}

/** 전액 출금 — 잔액 그대로 (수수료는 신청액 안에서 차감되므로 별도 여유가 필요 없다) */
export function maxWithdrawable(balanceUsdt: number): number {
  return +Math.max(0, balanceUsdt).toFixed(2);
}
