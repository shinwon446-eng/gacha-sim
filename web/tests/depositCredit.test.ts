import test from "node:test";
import assert from "node:assert/strict";
import { recordConfirmedUsdtDeposit } from "../lib/depositCredit";
import { useWalletStore } from "../stores/walletStore";

test("a confirmed 1 USDT deposit credits once; smaller or repeated transfers do not", () => {
  const before = useWalletStore.getState();
  useWalletStore.setState({ cryptoBalance: 0, cardBalance: 0, balance: 0, transactions: [], settledDepositRefs: [], totalDeposited: 0, totalDepositedCrypto: 0 });
  const deposit = { accountId: "user-1", address: "T" + "A".repeat(33), network: "TRC20" as const, amountUsdt: 1, txHash: "a".repeat(64) };
  try {
    assert.equal(recordConfirmedUsdtDeposit({ ...deposit, amountUsdt: 0.99 }), "invalid");
    assert.equal(useWalletStore.getState().transactions.length, 0);
    assert.equal(recordConfirmedUsdtDeposit(deposit), "credited");
    assert.equal(recordConfirmedUsdtDeposit(deposit), "existing");
    assert.equal(useWalletStore.getState().cryptoBalance, 1);
    assert.equal(useWalletStore.getState().cardBalance, 0);
    assert.equal(useWalletStore.getState().transactions.length, 1);
    assert.equal(recordConfirmedUsdtDeposit({ ...deposit, txHash: "b".repeat(64) }), "credited");
    assert.equal(useWalletStore.getState().cryptoBalance, 2);
    const legacyPending = useWalletStore.getState().addTransaction({ type: "deposit_usdt", accountId: deposit.accountId, address: deposit.address, amountUsdt: 50, ref: "TRC20:requested", network: deposit.network, status: "PENDING" });
    assert.equal(recordConfirmedUsdtDeposit({ ...deposit, txHash: "c".repeat(64) }), "credited");
    assert.equal(useWalletStore.getState().transactions.find(tx => tx.id === legacyPending.id)?.status, "COMPLETED");
    assert.equal(useWalletStore.getState().transactions.length, 3);
    assert.equal(useWalletStore.getState().cryptoBalance, 3);
  } finally {
    useWalletStore.setState(before);
  }
});
