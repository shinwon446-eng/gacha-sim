/**
 * USDT 출금 (CLAUDE.md §5-A). 네트워크별 고정 수수료, 최소 출금액, 주소 형식 검사, 실수령액 계산.
 * 상태는 PENDING(검토) → BROADCASTING(전송, TxID 발급) → COMPLETED. TxID 는 TronScan / BscScan 링크로 이어진다.
 * 정적 데모에는 핫월렛이 없다 — 상태 전이는 타이머로 흉내 내고 TxID 는 형식만 맞는 모의값이다. 화면에 명시한다.
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

export type WithdrawStatus = "PENDING" | "BROADCASTING" | "COMPLETED";

/** 온체인 익스플로러 (CLAUDE.md §6-B) */
export const EXPLORERS: Record<Network, { name: string; txUrl: (hash: string) => string }> = {
  TRC20: { name: "TronScan", txUrl: (h) => `https://tronscan.org/#/transaction/${h}` },
  BEP20: { name: "BscScan", txUrl: (h) => `https://bscscan.com/tx/${h}` },
};

export function explorerTxUrl(network: Network, txHash: string): string {
  return EXPLORERS[network].txUrl(txHash);
}

/** TxID 형식 — Tron 은 64 hex, BSC 는 0x + 64 hex */
export function isValidTxHash(network: Network, hash: string): boolean {
  return network === "TRC20" ? /^[0-9a-f]{64}$/i.test(hash) : /^0x[0-9a-f]{64}$/i.test(hash);
}

/** 모의 TxID — 형식만 맞는 난수. 실제 체인에 존재하지 않는다. */
export function mockTxHash(network: Network, seed = Date.now()): string {
  let x = seed >>> 0;
  let hex = "";
  while (hex.length < 64) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    hex += x.toString(16).padStart(8, "0");
  }
  hex = hex.slice(0, 64);
  return network === "TRC20" ? hex : `0x${hex}`;
}

/** 데모 상태 전이 지연(ms): 신청 → BROADCASTING → COMPLETED */
export const DEMO_BROADCAST_DELAY_MS = 1600;
export const DEMO_COMPLETE_DELAY_MS = 4800;

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
