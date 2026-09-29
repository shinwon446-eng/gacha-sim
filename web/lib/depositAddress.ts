/**
 * USDT 입금 네트워크 메타 + 주소 형식 검사.
 * 주소와 입금 영수증은 환경에 관계없이 동일한 형식과 최소 금액 규칙을 사용한다.
 */

export type Network = "TRC20" | "BEP20";
/** 입금은 ERC-20 도 받는다 (출금 네트워크는 TRC-20 / BEP-20 만) */
export type DepositNetwork = Network | "ERC20";

export interface NetworkMeta {
  key: DepositNetwork;
  chain: string;
  token: string;
  /** 자동 반영에 필요한 블록 컨펌 수 */
  confirmations: number;
  /** 대략적 평균 블록 시간(초) — 안내 문구의 예상 소요 시간 계산용 */
  blockSeconds: number;
  /** 권장 표기 여부 */
  recommended: boolean;
}

export const NETWORKS: NetworkMeta[] = [
  { key: "TRC20", chain: "Tron", token: "USDT (TRC-20)", confirmations: 12, blockSeconds: 3, recommended: true },
  { key: "BEP20", chain: "BNB Smart Chain", token: "USDT (BEP-20)", confirmations: 12, blockSeconds: 3, recommended: false },
  { key: "ERC20", chain: "Ethereum", token: "USDT (ERC-20)", confirmations: 12, blockSeconds: 12, recommended: false },
];

export const MIN_DEPOSIT_USDT = 1;

/** 주소 형식 검사 — 화면 표기 전 자기 검증용 */
export function looksLikeAddress(network: DepositNetwork, addr: string): boolean {
  return network === "TRC20" ? /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr) : /^0x[0-9a-fA-F]{40}$/.test(addr);
}

/** Deployment addresses take precedence over account-issued addresses. */
export function resolveDepositAddress(network: DepositNetwork, configured: string, issued?: string | null): string | null {
  for (const raw of [configured, issued]) {
    const address = raw?.trim();
    if (address && looksLikeAddress(network, address)) return address;
  }
  return null;
}

export interface DepositReceipt {
  network: DepositNetwork; address: string; txHash: string; amountUsdt: number; confirmations: number;
}
export function validDepositReceipt(receipt: DepositReceipt): boolean {
  const meta = NETWORKS.find(n => n.key === receipt.network);
  return !!meta && typeof receipt.address === "string" && looksLikeAddress(receipt.network, receipt.address)
    && typeof receipt.txHash === "string" && (receipt.network === "TRC20" ? /^[a-f\d]{64}$/i : /^0x[a-f\d]{64}$/i).test(receipt.txHash)
    && Number.isFinite(receipt.amountUsdt) && receipt.amountUsdt >= MIN_DEPOSIT_USDT
    && Number.isInteger(receipt.confirmations) && receipt.confirmations >= 0;
}
