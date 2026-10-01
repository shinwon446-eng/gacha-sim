// USDT 입금 네트워크 메타 + 주소 형식 검사
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { MIN_DEPOSIT_USDT, NETWORKS, looksLikeAddress, resolveDepositAddress, validDepositReceipt } from "../lib/depositAddress";
import { DEPOSIT_ADDRESSES } from "../lib/runtime";
import { browserAccountRequest } from "../lib/browserAccount";
import { recordConfirmedUsdtDeposit } from "../lib/depositCredit";
import { useWalletStore } from "../stores/walletStore";

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

test("네트워크 메타: TRC-20 · BEP-20 · ERC-20, TRC-20 추천, 12 컨펌, 최소 1 USDT", () => {
  assert.deepEqual(NETWORKS.map((n) => n.key), ["TRC20", "BEP20", "ERC20"]);
  assert.equal(NETWORKS.find((n) => n.key === "TRC20")!.recommended, true);
  for (const n of NETWORKS) assert.equal(n.confirmations, 12);
  assert.equal(MIN_DEPOSIT_USDT, 1);
});

test("주소 형식 검사 — TRC-20 base58 34자 / BEP-20 0x+40hex", () => {
  const t = "T" + "A".repeat(33);
  const b = "0x" + "ab".repeat(20);
  assert.ok(looksLikeAddress("TRC20", t));
  assert.ok(looksLikeAddress("BEP20", b));
  assert.ok(!looksLikeAddress("TRC20", b));
  assert.ok(!looksLikeAddress("BEP20", t));
  assert.ok(looksLikeAddress("ERC20", b) && !looksLikeAddress("ERC20", t));
});

test("address precedence and receipt validation are independent of API configuration", () => {
  const configured = "0x" + "ab".repeat(20), issued = "0x" + "cd".repeat(20);
  assert.equal(resolveDepositAddress("BEP20", ` ${configured} `, issued), configured);
  assert.equal(resolveDepositAddress("BEP20", "", issued), issued);
  assert.equal(resolveDepositAddress("TRC20", configured), null);
  const receipt = { network: "BEP20" as const, address: configured, txHash: "0x" + "ab".repeat(32), amountUsdt: 1, confirmations: 12 };
  assert.equal(validDepositReceipt(receipt), true);
  for (const amountUsdt of [0, 0.99, -1, NaN, Infinity]) assert.equal(validDepositReceipt({ ...receipt, amountUsdt }), false);
  assert.equal(validDepositReceipt({ ...receipt, confirmations: -1 }), false);
  assert.equal(validDepositReceipt({ ...receipt, confirmations: 0.5 }), false);
  assert.equal(validDepositReceipt({ ...receipt, txHash: "invented-reference" }), false);
});

test("three networks: receipt confirmations credit once without an API origin or deposit request button", async () => {
  const saved = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const addresses = { ...DEPOSIT_ADDRESSES };
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) } });
  try {
    // Fixtures stay in the test; they are not deployment recipient addresses.
    Object.assign(DEPOSIT_ADDRESSES, { TRC20: "T" + "A".repeat(33), BEP20: "0x" + "ab".repeat(20), ERC20: "0x" + "cd".repeat(20) });
    const login = await browserAccountRequest("/auth/login", { email: "deposit-owner@example.test", password: "original-password" });
    const accountId = (login.user as { id: string }).id;
    useWalletStore.setState({ balance: 0, cryptoBalance: 0, cardBalance: 0, transactions: [], settledDepositRefs: [], totalDeposited: 0, totalDepositedCrypto: 0, totalDepositedCard: 0 });
    for (const { key: network } of NETWORKS) {
      const issued = await browserAccountRequest("/deposit/address", { network, userKey: accountId });
      assert.equal(issued.address, DEPOSIT_ADDRESSES[network]);
      const request = { network, address: String(issued.address), userKey: accountId };
      assert.deepEqual(await browserAccountRequest("/deposit/check", request), { status: "pending", confirmations: 0 });
      const receipt = { ...request, amountUsdt: 1, txHash: (network === "TRC20" ? "" : "0x") + "ab".repeat(32), confirmations: 11 };
      await assert.rejects(browserAccountRequest("/deposit/receipt", { ...receipt, amountUsdt: 0.99 }));
      await assert.rejects(browserAccountRequest("/deposit/receipt", { ...receipt, userKey: "another-user" }));
      await browserAccountRequest("/deposit/receipt", receipt);
      assert.equal((await browserAccountRequest("/deposit/check", request)).status, "pending");
      await browserAccountRequest("/deposit/receipt", { ...receipt, confirmations: 12 });
      const confirmed = await browserAccountRequest("/deposit/check", request);
      assert.equal(confirmed.status, "confirmed");
      assert.equal(recordConfirmedUsdtDeposit({ ...receipt, accountId }), "credited");
      assert.equal(recordConfirmedUsdtDeposit({ ...receipt, accountId }), "existing");
      await assert.rejects(browserAccountRequest("/deposit/receipt", { ...receipt, amountUsdt: 99 }));
      values.set(`voila.browser-wallet.${accountId}`, JSON.stringify({ state: { settledDepositRefs: useWalletStore.getState().settledDepositRefs } }));
    }
    assert.equal(useWalletStore.getState().balance, 3);
    assert.equal(useWalletStore.getState().transactions.length, 3);
    assert.ok(useWalletStore.getState().transactions.every(t => t.status === "COMPLETED"));
  } finally {
    Object.assign(DEPOSIT_ADDRESSES, addresses);
    if (saved) Object.defineProperty(globalThis, "localStorage", saved); else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
