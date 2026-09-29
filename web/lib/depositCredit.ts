import { MIN_DEPOSIT_USDT, type DepositNetwork } from "@/lib/depositAddress";
import { useWalletStore } from "@/stores/walletStore";

export interface ConfirmedUsdtDeposit {
  accountId: string;
  address: string;
  network: DepositNetwork;
  amountUsdt: number;
  txHash: string;
}

/** Only a verified chain response may create a wallet entry. Repeated polling is idempotent. */
export function recordConfirmedUsdtDeposit(input: ConfirmedUsdtDeposit): "credited" | "existing" | "invalid" {
  if (!input.accountId || !input.address || !input.txHash || !Number.isFinite(input.amountUsdt) || input.amountUsdt < MIN_DEPOSIT_USDT) return "invalid";
  const reference = `${input.network}:${input.txHash}`;
  const wallet = useWalletStore.getState();
  if (wallet.settledDepositRefs.includes(`deposit_usdt:${reference}`) || wallet.transactions.some(tx => tx.type === "deposit_usdt" && tx.accountId === input.accountId && tx.ref === reference && tx.status === "COMPLETED")) return "existing";
  const pending = wallet.transactions.find(tx => tx.type === "deposit_usdt" && tx.accountId === input.accountId && tx.address === input.address && tx.network === input.network && tx.status === "PENDING") ?? wallet.addTransaction({ type: "deposit_usdt", accountId: input.accountId, address: input.address, amountUsdt: input.amountUsdt, ref: reference, network: input.network, status: "PENDING" });
  return wallet.settleDeposit(pending.id, { amountUsdt: input.amountUsdt, reference, txHash: input.txHash }) ? "credited" : "invalid";
}
