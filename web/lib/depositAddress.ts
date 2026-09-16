/**
 * 데모 입금 주소 생성.
 *
 * 실서비스는 게이트웨이(NOWPayments/Cryptomus 등)가 유저별 주소를 발급한다. 정적 데모에는 그런 백엔드가 없다.
 * 그래서 "진짜처럼 보이지만 지갑이 송금을 거부하는" 주소를 만든다:
 *   · TRC-20: 'T' + base58 33자. Base58Check 체크섬이 맞을 확률은 1/2^32 — 사실상 항상 무효라 지갑이 거부한다.
 *   · BEP-20: 0x + 40 hex 를 대소문자 무작위 혼합. EIP-55 체크섬이 틀리므로 MetaMask/바이낸스 지갑이 거부한다.
 * 절대로 0x000…(소각) 같은 실제 도달 가능한 주소를 쓰지 않는다. 화면에는 항상 "데모 — 실제 송금 금지"를 붙인다.
 */

export type Network = "TRC20" | "BEP20";

export interface NetworkMeta {
  key: Network;
  chain: string;
  token: string;
  /** 자동 반영에 필요한 블록 컨펌 수 */
  confirmations: number;
  /** 대략적 평균 블록 시간(초) — 데모 시뮬레이션 속도 */
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

export function demoAddress(network: Network, userKey: string): string {
  const rand = mulberry32(seedFrom(`${network}:${userKey}`));
  if (network === "TRC20") {
    let out = "T";
    for (let i = 0; i < 33; i++) out += BASE58[Math.floor(rand() * BASE58.length)];
    return out;
  }
  let out = "0x";
  for (let i = 0; i < 40; i++) {
    const c = HEX[Math.floor(rand() * HEX.length)];
    // 대소문자 무작위 혼합 → EIP-55 체크섬 불일치
    out += /[a-f]/.test(c) && rand() < 0.5 ? c.toUpperCase() : c;
  }
  return out;
}

/** 주소 형식 검사 — 화면 표기 전 자기 검증용 */
export function looksLikeAddress(network: Network, addr: string): boolean {
  return network === "TRC20" ? /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr) : /^0x[0-9a-fA-F]{40}$/.test(addr);
}
