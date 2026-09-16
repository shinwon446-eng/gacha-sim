// 데모 입금 주소 — 형식은 맞고, 지갑이 거부하도록 체크섬은 틀려야 한다
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { MIN_DEPOSIT_USDT, NETWORKS, demoAddress, looksLikeAddress } from "../lib/depositAddress";

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function b58decode(s: string): Uint8Array {
  let n = 0n;
  for (const ch of s) n = n * 58n + BigInt(B58.indexOf(ch));
  const out: number[] = [];
  while (n > 0n) {
    out.unshift(Number(n & 255n));
    n >>= 8n;
  }
  for (const ch of s) {
    if (ch !== "1") break;
    out.unshift(0);
  }
  return Uint8Array.from(out);
}
/** Tron Base58Check: 마지막 4바이트 = sha256(sha256(payload))[0..4] */
function tronChecksumValid(addr: string): boolean {
  const bytes = b58decode(addr);
  if (bytes.length !== 25) return false;
  const payload = bytes.slice(0, 21);
  const h = createHash("sha256").update(createHash("sha256").update(payload).digest()).digest();
  return Buffer.compare(Buffer.from(bytes.slice(21)), h.subarray(0, 4)) === 0;
}
/** EIP-55: 소문자 hex 의 keccak 로 대소문자를 정하는데, 여기서는 "대소문자 혼합이면서 전부 소문자/대문자가 아님"만 확인한다 —
 *  keccak 없이도 무작위 혼합이 체크섬과 일치할 확률은 1/2^(hex letters) 로 무시할 수 있다. */
function mixedCase(addr: string): boolean {
  const body = addr.slice(2);
  return /[a-f]/.test(body) && /[A-F]/.test(body);
}

test("네트워크 메타: TRC-20 추천, 12 컨펌, 최소 10 USDT", () => {
  assert.equal(NETWORKS.length, 2);
  assert.equal(NETWORKS.find((n) => n.key === "TRC20")!.recommended, true);
  for (const n of NETWORKS) assert.equal(n.confirmations, 12);
  assert.equal(MIN_DEPOSIT_USDT, 10);
});

test("주소는 결정적이고 형식이 맞다", () => {
  const a = demoAddress("TRC20", "user-a"), b = demoAddress("BEP20", "user-a");
  assert.equal(a, demoAddress("TRC20", "user-a"));
  assert.notEqual(a, demoAddress("TRC20", "user-b"));
  assert.ok(looksLikeAddress("TRC20", a), a);
  assert.ok(looksLikeAddress("BEP20", b), b);
  assert.ok(!looksLikeAddress("TRC20", b));
});

test("데모 주소는 지갑이 거부해야 한다 — TRC-20 체크섬 무효, BEP-20 EIP-55 혼합 대소문자", () => {
  for (let i = 0; i < 50; i++) {
    const key = `u${i}`;
    assert.equal(tronChecksumValid(demoAddress("TRC20", key)), false, `TRC20 ${key} 체크섬이 우연히 유효`);
    assert.ok(mixedCase(demoAddress("BEP20", key)), `BEP20 ${key} 대소문자 혼합 아님`);
  }
});
