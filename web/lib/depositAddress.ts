/**
 * USDT 입금 네트워크 메타 + 주소 형식 검사.
 * 입금 주소는 게이트웨이(API)가 유저별로 발급한 것만 화면에 올린다 — 클라이언트가 주소를 만들지 않는다.
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

export const MIN_DEPOSIT_USDT = 10;

/** 주소 형식 검사 — 화면 표기 전 자기 검증용 */
export function looksLikeAddress(network: DepositNetwork, addr: string): boolean {
  return network === "TRC20" ? /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr) : /^0x[0-9a-fA-F]{40}$/.test(addr);
}
