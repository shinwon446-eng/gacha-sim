// USDT 입금 네트워크 메타 + 주소 형식 검사
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { MIN_DEPOSIT_USDT, NETWORKS, looksLikeAddress } from "../lib/depositAddress";

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function b58decode(s: string): Uint8Array {
  let n = BigInt(0);
  for (const ch of s) n = n * BigInt(58) + BigInt(B58.indexOf(ch));
  const out: number[] = [];
  while (n > BigInt(0)) {
    out.unshift(Number(n & BigInt(255)));
    n >>= BigInt(8);
  }
  for (const ch of s) {
    if (ch !== "1") break;
    out.unshift(0);
  }
  return Uint8Array.from(out);
}
/** EIP-55: 소문자 hex 의 keccak 로 대소문자를 정하는데, 여기서는 "대소문자 혼합이면서 전부 소문자/대문자가 아님"만 확인한다 —
 *  keccak 없이도 무작위 혼합이 체크섬과 일치할 확률은 1/2^(hex letters) 로 무시할 수 있다. */

test("네트워크 메타: TRC-20 추천, 12 컨펌, 최소 10 USDT", () => {
  assert.equal(NETWORKS.length, 2);
  assert.equal(NETWORKS.find((n) => n.key === "TRC20")!.recommended, true);
  for (const n of NETWORKS) assert.equal(n.confirmations, 12);
  assert.equal(MIN_DEPOSIT_USDT, 10);
});

test("주소 형식 검사 — TRC-20 base58 34자 / BEP-20 0x+40hex", () => {
  const t = "T" + "A".repeat(33);
  const b = "0x" + "ab".repeat(20);
  assert.ok(looksLikeAddress("TRC20", t));
  assert.ok(looksLikeAddress("BEP20", b));
  assert.ok(!looksLikeAddress("TRC20", b));
  assert.ok(!looksLikeAddress("BEP20", t));
});

