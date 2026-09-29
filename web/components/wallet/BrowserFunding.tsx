"use client";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/authStore";
import { useWalletStore } from "@/stores/walletStore";
import { HistoryTab } from "./HistoryTab";

export function BrowserFunding({ onCredited }: { onCredited: (amount: number) => void }) {
  const t = useTranslations("browserWallet");
  const user = useAuthStore(s => s.user);
  const [amount, setAmount] = useState("50");
  const [network, setNetwork] = useState("TRC20");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const value = Number(amount);
  const valid = Number.isFinite(value) && value >= 10 && value <= 5000 && Math.round(value * 100) / 100 === value;
  const add = async () => {
    if (lock.current || !valid || !user) return;
    lock.current = true; setBusy(true); setNotice("");
    const wallet = useWalletStore.getState();
    const id = user.id;
    const tx = wallet.addTransaction({ type: "deposit_usdt", amountUsdt: value, accountId: id, status: "PENDING", network, ref: "browser:usdt" });
    await new Promise(resolve => setTimeout(resolve, 600));
    if (useAuthStore.getState().user?.id === id && wallet.settleDeposit(tx.id, { amountUsdt: value, reference: `browser:${tx.id}` })) {
      setNotice(t("added", { amount: value })); onCredited(value);
    }
    lock.current = false; setBusy(false);
  };
  return <div className="space-y-4">
    <p className="rounded-xl border border-gold-champagne/30 bg-obsidian p-4 text-sm leading-7 text-secondary">{t("notice")}</p>
    <label className="block text-sm text-secondary">{t("network")}<select value={network} onChange={e => setNetwork(e.target.value)} disabled={busy} className="mt-2 h-12 w-full rounded-lg border border-hairline bg-obsidian px-3 text-white"><option>TRC20</option><option>BEP20</option><option>ERC20</option></select></label>
    <div className="grid grid-cols-4 gap-2">{[50, 100, 500, 1000].map(n => <button key={n} type="button" disabled={busy} onClick={() => setAmount(String(n))} className="min-h-11 rounded-lg border border-hairline text-sm text-gold-champagne">{n}</button>)}</div>
    <label className="block text-sm text-secondary">{t("amount")}<input inputMode="decimal" value={amount} disabled={busy} onChange={e => setAmount(e.target.value)} className="mt-2 h-12 w-full rounded-lg border border-hairline bg-obsidian px-3 font-mono text-white" /></label>
    {!valid && <p role="alert" className="text-sm text-red-200">{t("invalid")}</p>}
    <button type="button" disabled={!valid || busy} onClick={() => void add()} className="min-h-12 w-full rounded-lg bg-gold-champagne px-4 text-sm font-semibold text-obsidian disabled:opacity-40">{t(busy ? "processing" : "addUsdt")}</button>
    {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
    <HistoryTab />
  </div>;
}
