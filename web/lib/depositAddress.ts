/**
 * USDT 입금 네트워크 메타 + 주소 형식 검사.
 * 입금 주소는 게이트웨이(API)가 유저별로 발급한 것만 화면에 올린다 — 클라이언트가 주소를 만들지 않는다.
 */

export type Network = "TRC20" | "BEP20";

export interface NetworkMeta {
  key: Network;
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
];

export const MIN_DEPOSIT_USDT = 10;

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const HEX = "0123456789abcdef";

/** 결정적 PRNG — 같은 시드면 같은 주소. 유저별 고정 주소 흉내. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}


/** 주소 형식 검사 — 화면 표기 전 자기 검증용 */
export function looksLikeAddress(network: Network, addr: string): boolean {
  return network === "TRC20" ? /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr) : /^0x[0-9a-fA-F]{40}$/.test(addr);
}
