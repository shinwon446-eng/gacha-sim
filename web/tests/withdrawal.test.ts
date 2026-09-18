// USDT 출금 — 네트워크 수수료·최소 수량·주소 형식·실수령액
//   npm test
import test from "node:test";
import assert from "node:assert/strict";
import { MIN_WITHDRAW_USDT, WITHDRAW_NETWORKS, WITHDRAW_NETWORK_BY_KEY, isValidWithdrawAddress, maxWithdrawable, netReceive, validateWithdrawal } from "../lib/withdrawal";

const TRON = "T" + "9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb".slice(0, 33);
const BSC = "0x" + "a".repeat(40);

test("네트워크 수수료: TRC-20 1.00 / BEP-20 0.80 USDT, 최소 20 USDT", () => {
  assert.equal(WITHDRAW_NETWORK_BY_KEY.TRC20.feeUsdt, 1.0);
  assert.equal(WITHDRAW_NETWORK_BY_KEY.BEP20.feeUsdt, 0.8);
  assert.equal(MIN_WITHDRAW_USDT, 20);
  assert.equal(WITHDRAW_NETWORKS.length, 2);
});

test("주소 형식: TRC-20 은 T + base58 33자, BEP-20 은 0x + hex 40자", () => {
  assert.ok(isValidWithdrawAddress("TRC20", TRON));
  assert.ok(isValidWithdrawAddress("TRC20", `  ${TRON}  `), "공백 트림");
  assert.ok(!isValidWithdrawAddress("TRC20", BSC));
  assert.ok(!isValidWithdrawAddress("TRC20", "T0OIl" + "a".repeat(29)), "base58 금지 문자");
  assert.ok(isValidWithdrawAddress("BEP20", BSC));
  assert.ok(isValidWithdrawAddress("BEP20", "0x" + "AbCdEf0123456789".repeat(2) + "abcdef01"));
  assert.ok(!isValidWithdrawAddress("BEP20", TRON));
  assert.ok(!isValidWithdrawAddress("BEP20", "0x" + "g".repeat(40)));
});

test("실수령액 = 신청액 − 네트워크 수수료, 음수 없음", () => {
  assert.equal(netReceive(100, "TRC20"), 99);
  assert.equal(netReceive(100, "BEP20"), 99.2);
  assert.equal(netReceive(0.5, "TRC20"), 0);
});

test("검증: 최소 미만·잔액 초과·주소 오류·NaN 을 각각 잡는다", () => {
  assert.deepEqual(validateWithdrawal({ network: "TRC20", address: TRON, amountUsdt: 50, balanceUsdt: 100 }), []);
  assert.deepEqual(validateWithdrawal({ network: "TRC20", address: TRON, amountUsdt: 19.99, balanceUsdt: 100 }), ["min"]);
  assert.deepEqual(validateWithdrawal({ network: "TRC20", address: TRON, amountUsdt: 100.01, balanceUsdt: 100 }), ["insufficient"]);
  assert.deepEqual(validateWithdrawal({ network: "BEP20", address: TRON, amountUsdt: 50, balanceUsdt: 100 }), ["address"]);
  assert.deepEqual(validateWithdrawal({ network: "BEP20", address: BSC, amountUsdt: NaN, balanceUsdt: 100 }), ["nan"]);
  assert.deepEqual(validateWithdrawal({ network: "BEP20", address: "", amountUsdt: 0, balanceUsdt: 100 }), ["address", "nan"]);
});

test("전액(MAX) 은 잔액 그대로 — 수수료는 신청액 안에서 차감된다", () => {
  assert.equal(maxWithdrawable(986.12), 986.12);
  assert.equal(maxWithdrawable(-3), 0);
  assert.equal(netReceive(maxWithdrawable(986.12), "TRC20"), 985.12);
});

test("온체인 링크: TronScan / BscScan 형식, TxID 형식 검사", async () => {
  const { EXPLORERS, explorerTxUrl, explorerAddressUrl, isValidTxHash } = await import("../lib/withdrawal");
  const t = "ab".repeat(32);
  const b = "0x" + "cd".repeat(32);
  assert.ok(isValidTxHash("TRC20", t));
  assert.ok(isValidTxHash("BEP20", b));
  assert.ok(!isValidTxHash("TRC20", b) && !isValidTxHash("BEP20", t));
  assert.equal(explorerTxUrl("TRC20", t), `https://tronscan.org/#/transaction/${t}`);
  assert.equal(explorerTxUrl("BEP20", b), `https://bscscan.com/tx/${b}`);
  assert.equal(explorerAddressUrl("TRC20", "Tabc"), "https://tronscan.org/#/address/Tabc");
  assert.equal(EXPLORERS.TRC20.name, "TronScan");
  assert.equal(EXPLORERS.BEP20.name, "BscScan");
});
