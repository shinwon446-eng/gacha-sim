import test from "node:test";
import assert from "node:assert/strict";
import { normalizeNickname, validNickname } from "../lib/account";
import { useWalletStore } from "../stores/walletStore";
import { useSecurityStore } from "../stores/securityStore";
import { useAuthStore } from "../stores/authStore";

const reset = () => useWalletStore.setState({ balance: 0, cryptoBalance: 0, cardBalance: 0, transactions: [], settledDepositRefs: [], totalDeposited: 0, totalDepositedCrypto: 0, totalDepositedCard: 0, totalWagered: 0 });
test("nicknames support Korean and normalize whitespace without allowing markup", () => {
  for (const value of ["보일라", "voila_01", "User-20", "사용자123"]) assert.equal(validNickname(value), true);
  for (const value of ["", "a", "a".repeat(21), "has space", "<script>", "\u200Bhidden", "emoji🎁"]) assert.equal(validNickname(value), false, value);
  assert.equal(normalizeNickname("  닉네임  "), "닉네임");
});
test("account security does not leak across logout, another login, or late responses", () => {
  const a = { id: "a", email: "a@example.com", emailVerified: true, createdAt: new Date().toISOString(), nickname: "Alpha" };
  useAuthStore.getState().acceptSession(a);
  useSecurityStore.getState().accept("a", { twoFactorEnabled: true, enabledAt: a.createdAt });
  assert.equal(useAuthStore.getState().user?.label, "Alpha");
  assert.equal(useAuthStore.getState().user?.email, "a@example.com");
  useAuthStore.getState().clearSession();
  assert.equal(useSecurityStore.getState().twoFactorEnabled, false);
  useAuthStore.getState().acceptSession({ ...a, id: "b", nickname: "Beta" });
  useSecurityStore.getState().accept("a", { twoFactorEnabled: true, enabledAt: a.createdAt });
  assert.equal(useSecurityStore.getState().twoFactorEnabled, false);
  assert.equal(useSecurityStore.getState().userId, "b");
  useAuthStore.getState().clearSession();
});
test("USDT settlement credits the confirmed amount exactly once, across duplicate requests", () => {
  reset();
  const w = useWalletStore.getState();
  const pending = w.addTransaction({ type: "deposit_usdt", amountUsdt: 50, status: "PENDING" });
  assert.equal(useWalletStore.getState().balance, 0);
  const input = { amountUsdt: 45, reference: "TRC20:unique-hash", txHash: "unique-hash" };
  assert.equal(w.settleDeposit(pending.id, input), true);
  assert.equal(w.settleDeposit(pending.id, input), false);
  const duplicate = w.addTransaction({ type: "deposit_usdt", amountUsdt: 50, status: "PENDING" });
  assert.equal(w.settleDeposit(duplicate.id, input), false);
  assert.equal(useWalletStore.getState().cryptoBalance, 45);
  assert.equal(useWalletStore.getState().totalDepositedCrypto, 45);
  assert.equal(useWalletStore.getState().transactions.find(x => x.id === duplicate.id)?.status, "CANCELLED");
});
test("card deposits stay in card funds; failed and invalid settlements do not credit", () => {
  reset();
  const w = useWalletStore.getState();
  const failed = w.addTransaction({ type: "deposit_card", amountUsdt: 50, status: "PENDING" });
  for (const amountUsdt of [0, -1, NaN, Infinity]) assert.equal(w.settleDeposit(failed.id, { amountUsdt, reference: "stripe:a" }), false);
  w.setTransactionStatus(failed.id, "FAILED");
  assert.equal(w.settleDeposit(failed.id, { amountUsdt: 50, reference: "stripe:a" }), false);
  const paid = w.addTransaction({ type: "deposit_card", amountUsdt: 50, status: "PENDING" });
  assert.equal(w.settleDeposit(paid.id, { amountUsdt: 50, reference: "stripe:b", receipt: "b" }), true);
  assert.equal(useWalletStore.getState().cardBalance, 50);
  assert.equal(useWalletStore.getState().cryptoBalance, 0);
  assert.equal(w.debitCrypto(20), false);
});
test("terminal deposit records cannot regress and double-count totals", () => {
  reset();
  const w = useWalletStore.getState();
  const tx = w.addTransaction({ type: "deposit_usdt", amountUsdt: 25, status: "COMPLETED" });
  w.setTransactionStatus(tx.id, "PENDING"); w.setTransactionStatus(tx.id, "COMPLETED");
  assert.equal(useWalletStore.getState().totalDepositedCrypto, 25);
  const legacy = w.addTransaction({ type: "deposit_usdt", amountUsdt: 10 });
  w.setTransactionStatus(legacy.id, "COMPLETED");
  assert.equal(useWalletStore.getState().totalDepositedCrypto, 35);
});
test("held requests survive countdown expiry and server cancellation refunds only once", () => {
  reset();
  const w = useWalletStore.getState();
  w.credit(100); w.debitCrypto(30);
  const tx = w.addTransaction({ type: "withdraw", amountUsdt: -30, status: "PENDING_72H_HOLD", unlockAt: Date.now() - 1, serverId: "held-1" });
  assert.equal(useWalletStore.getState().transactions[0].status, "PENDING_72H_HOLD");
  assert.equal(useWalletStore.getState().cryptoBalance, 70);
  w.syncWithdrawal(tx.id, "CANCELLED"); w.syncWithdrawal(tx.id, "CANCELLED");
  w.syncWithdrawal(tx.id, "PENDING_72H_HOLD");
  assert.equal(useWalletStore.getState().cryptoBalance, 100);
  assert.equal(useWalletStore.getState().transactions[0].status, "CANCELLED");
});
