import assert from "node:assert/strict";
import test from "node:test";
import { createLocalClosureCode, evaluateClosureGate, matchesLocalClosureCode, validClosureCode } from "../components/auth/AccountClosureFlow";

const empty = () => ({ balance: 0, cryptoBalance: 0, cardBalance: 0, transactions: [], items: [] });

test("wallet funds take priority over inventory and show the current amount", () => {
  const gate = evaluateClosureGate({ ...empty(), balance: 20, cryptoBalance: 20, items: [{ status: "IN_STORAGE" }] });
  assert.deepEqual(gate, { stage: "balance", balance: 20, pendingCount: 0 });
  assert.equal(evaluateClosureGate({ ...empty(), cardBalance: 4 }).stage, "balance");
  assert.equal(evaluateClosureGate({ ...empty(), balance: Number.NaN }).stage, "balance");
});

test("unfinished deposits or withdrawals block closure before inventory", () => {
  for (const type of ["deposit_usdt", "deposit_card", "withdraw"]) {
    const gate = evaluateClosureGate({ ...empty(), transactions: [{ type, status: "PENDING" }], items: [{ status: "SHIPPING" }] });
    assert.deepEqual(gate, { stage: "balance", balance: 0, pendingCount: 1 });
  }
  assert.equal(evaluateClosureGate({ ...empty(), transactions: [{ type: "withdraw", status: "COMPLETED" }] }).stage, "verify");
});

test("held and in-transit products block closure; settled products do not", () => {
  const gate = evaluateClosureGate({ ...empty(), items: [
    { status: "IN_STORAGE" }, { status: "SHIPPING_REQUESTED" }, { status: "SHIPPING" },
    { status: "DELIVERED" }, { status: "SOLD" },
  ] });
  assert.deepEqual(gate, { stage: "inventory", count: 3 });
  assert.deepEqual(evaluateClosureGate(empty()), { stage: "verify" });
});

test("local verification requires the issued six-digit code before expiry", () => {
  const code = createLocalClosureCode();
  assert.match(code, /^\d{6}$/);
  assert.equal(validClosureCode("12345"), false);
  assert.equal(validClosureCode("123456"), true);
  assert.equal(matchesLocalClosureCode(code, code, 101, 100), true);
  assert.equal(matchesLocalClosureCode(code, code, 100, 100), false);
  assert.equal(matchesLocalClosureCode(code === "000000" ? "000001" : "000000", code, 101, 100), false);
});
