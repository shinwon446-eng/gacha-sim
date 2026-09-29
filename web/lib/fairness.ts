/**
 * Provably Fair 엔진 (CLAUDE.md §5-B, PROMPTS 3-1).
 *
 *   roll = HMAC-SHA256(serverSeed, `${clientSeed}:${nonce}`) 의 앞 8 hex → 정수 → mod ROLL_RANGE
 *
 * 해상도에 대하여 — 규범은 [0, 99999](0.001%)를 예시로 들지만, 이 데이터셋의 드롭 확률은
 * 0.0004% 같은 소수 4자리다. 0.001% 해상도로는 그 항목이 0 칸을 받아 영원히 나오지 않는다.
 * 그래서 ROLL_RANGE 를 1,000,000(0.0001%)으로 둔다. 항목 칸 수 = dropRate × 10,000 이 정확한 정수가 되고,
 * 박스마다 합계가 정확히 1,000,000 임을 빌더와 테스트가 강제한다. 같은 (서버시드, 클라이언트시드, nonce)는
 * 언제나 같은 roll 과 같은 항목을 낸다 — 검증 페이지가 그걸 재현한다.
 *
 * Web Crypto 만 쓴다. 브라우저(/fairness 검증기)와 Node(tests)에서 동일한 코드가 돈다.
 */

export const ROLL_RANGE = 1_000_000;
export const ROLL_MAX = ROLL_RANGE - 1;
/** 서버 시드 바이트 수 — 규범: 64바이트(128 hex) */
export const SERVER_SEED_BYTES = 64;
export const CLIENT_SEED_BYTES = 16;

const enc = new TextEncoder();

function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c?.subtle) throw new Error("Web Crypto(subtle) 를 쓸 수 없는 환경");
  return c.subtle;
}

export const toHex = (buf: ArrayBuffer | Uint8Array): string =>
  Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");

export function randomHex(bytes: number): string {
  const c = globalThis.crypto;
  if (!c?.getRandomValues) throw new Error("crypto.getRandomValues 를 쓸 수 없는 환경");
  const buf = new Uint8Array(bytes);
  c.getRandomValues(buf);
  return toHex(buf);
}

/** 암호학적으로 안전한 64바이트 서버 시드(128 hex). 오픈 전에는 해시만 공개한다. */
export const generateServerSeed = (): string => randomHex(SERVER_SEED_BYTES);
/** 유저가 직접 정하지 않을 때의 무작위 클라이언트 시드(32 hex). */
export const generateClientSeed = (): string => randomHex(CLIENT_SEED_BYTES);

export async function sha256Hex(message: string): Promise<string> {
  return toHex(await subtle().digest("SHA-256", enc.encode(message)));
}

/** 서버 시드 커밋 — 게임 시작 전 유저에게 미리 보여주는 값. */
export const hashServerSeed = (serverSeed: string): Promise<string> => sha256Hex(serverSeed);

export async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const k = await subtle().importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await subtle().sign("HMAC", k, enc.encode(message)));
}

export interface RollResult {
  /** HMAC-SHA256 전체 hex(64자) */
  hmac: string;
  /** 앞 8 hex 를 정수로 읽은 값 */
  raw: number;
  /** raw mod ROLL_RANGE — [0, ROLL_MAX] */
  roll: number;
}

/** 핵심 식. 순수 함수이며 같은 입력엔 언제나 같은 결과. */
export async function calculateRollResult(serverSeed: string, clientSeed: string, nonce: number): Promise<RollResult> {
  if (!Number.isInteger(nonce) || nonce < 0) throw new Error("nonce 는 0 이상의 정수");
  const hmac = await hmacSha256Hex(serverSeed, `${clientSeed}:${nonce}`);
  const raw = parseInt(hmac.slice(0, 8), 16);
  return { hmac, raw, roll: raw % ROLL_RANGE };
}

export interface WithProbability {
  dropRate: number;
}

export interface RollRange<T> {
  item: T;
  /** 포함 */
  from: number;
  /** 포함 */
  to: number;
  /** 칸 수 = dropRate × ROLL_RANGE / 100 */
  units: number;
}

/**
 * 확률표 → roll 구간표. 칸 수는 정수여야 하고 합은 정확히 ROLL_RANGE 여야 한다.
 * 어긋나면 던진다 — 조용히 보정해서 "표기 확률 ≠ 실제 확률"이 되는 것보다 낫다.
 */
export function rollRanges<T extends WithProbability>(items: T[]): RollRange<T>[] {
  if (items.length === 0) throw new Error("빈 확률표");
  let cursor = 0;
  const out: RollRange<T>[] = [];
  for (const item of items) {
    const exact = (item.dropRate * ROLL_RANGE) / 100;
    const units = Math.round(exact);
    if (Math.abs(exact - units) > 1e-6) throw new Error(`dropRate ${item.dropRate}% 는 ${100 / ROLL_RANGE}% 해상도로 표현되지 않는다`);
    if (units < 1) throw new Error(`dropRate ${item.dropRate}% 는 칸을 하나도 받지 못한다`);
    out.push({ item, from: cursor, to: cursor + units - 1, units });
    cursor += units;
  }
  if (cursor !== ROLL_RANGE) throw new Error(`칸 합계 ${cursor} ≠ ${ROLL_RANGE} (확률 합이 100 이 아니다)`);
  return out;
}

/** roll → 당첨 항목. 구간표는 정렬 불필요 — 주어진 순서대로 누적한다. */
export function determineItem<T extends WithProbability>(roll: number, items: T[]): T {
  if (!Number.isInteger(roll) || roll < 0 || roll > ROLL_MAX) throw new Error(`roll ${roll} 범위 밖`);
  for (const r of rollRanges(items)) if (roll <= r.to) return r.item;
  // rollRanges 가 합계를 보장하므로 여기 올 수 없다
  throw new Error("unreachable");
}

export interface VerifyInput<T extends WithProbability> {
  serverSeed: string;
  /** 오픈 전에 공개됐던 해시. 주면 일치 여부를 함께 돌려준다. */
  serverSeedHash?: string;
  clientSeed: string;
  nonce: number;
  items: T[];
}

export interface VerifyOutput<T> extends RollResult {
  serverSeedHash: string;
  /** serverSeedHash 입력이 있을 때만 의미 있음 */
  hashMatches: boolean | null;
  item: T;
}

/** 검증기 — 유저가 시드·nonce 를 넣으면 해시·롤·항목을 그대로 재현한다. */
export async function verifyRoll<T extends WithProbability>(input: VerifyInput<T>): Promise<VerifyOutput<T>> {
  const serverSeedHash = await hashServerSeed(input.serverSeed);
  const hashMatches = input.serverSeedHash ? serverSeedHash === input.serverSeedHash.trim().toLowerCase() : null;
  const r = await calculateRollResult(input.serverSeed, input.clientSeed, input.nonce);
  return { ...r, serverSeedHash, hashMatches, item: determineItem(r.roll, input.items) };
}

/** roll → 백분율 위치 표기용 */
export const rollToPercent = (roll: number): number => (roll / ROLL_RANGE) * 100;
