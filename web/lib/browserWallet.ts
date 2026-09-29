import { useWalletStore } from "@/stores/walletStore";
import { useInventoryStore } from "@/stores/inventoryStore";

// Switch namespaces without deleting another account's records or the legacy wallet.
export function restoreBrowserAssets(userId: string | null) {
  const suffix = userId ?? "guest";
  const walletName = `voila.browser-wallet.${suffix}`;
  if (useWalletStore.persist.getOptions().name === walletName) return;
  const restore = (name: string) => {
    try { return JSON.parse(localStorage.getItem(name) ?? "null")?.state ?? {}; }
    catch { return {}; }
  };
  const wallet = restore(walletName);
  useWalletStore.persist.setOptions({ name: walletName });
  useWalletStore.setState({ ...useWalletStore.getInitialState(), ...wallet, hydrated: true });
  const inventoryName = `voila.browser-inventory.${suffix}`;
  const inventory = restore(inventoryName);
  useInventoryStore.persist.setOptions({ name: inventoryName });
  useInventoryStore.setState({ ...useInventoryStore.getInitialState(), ...inventory, hydrated: true });
  const settled = useInventoryStore.getState().settleExpiredCashback();
  if (settled.ids.length) {
    const activeWallet = useWalletStore.getState();
    activeWallet.creditSplit(settled.toCrypto, settled.toCard);
    activeWallet.addTransaction({ type: "sellback", amountUsdt: settled.totalUsdt, ref: `auto-cashback-30d:${settled.ids.join(",")}` });
  }
}
