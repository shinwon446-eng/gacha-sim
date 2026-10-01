"use client";
import { useRef, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { X, Package, RotateCcw } from "lucide-react";
import { useModal } from "@/lib/useModal";
import { useInventoryStore, type OwnedItem } from "@/stores/inventoryStore";
import { useWalletStore } from "@/stores/walletStore";
import { Money } from "@/components/ui/Money";
import { Link } from "@/i18n/navigation";
import { isLive } from "@/lib/runtime";
import { api } from "@/lib/api";
export function CancelShipmentModal({ item, onClose, onCancelled }: { item: OwnedItem | null; onClose: () => void; onCancelled: () => void }) {
 const t = useTranslations("cancellation");
 const panel = useRef<HTMLDivElement>(null);
 const [error,setError] = useState("");
 const [busy,setBusy] = useState(false);
 useModal(!!item,()=>{if(!busy)onClose();},panel);
 useEffect(()=>{setError("");setBusy(false);},[item?.id]);
 const unknownFee=!!item?.shipping?.feeUsdt && (!item.shipping.requestId || !item.shipping.feeFundingRatio);
 const canCancel=item?.status==="SHIPPING_REQUESTED" && !item.shipping?.shippedAt && !unknownFee;
 const confirm=async()=>{
  if(!item || busy || !canCancel)return;
  setBusy(true);setError("");
  try{
   if(isLive()) {
    // The server must atomically recheck status and perform the refund. Never pre-credit locally.
    const result=await api.cancelShipping(item.id, item.shipping?.requestId ?? item.shipping?.requestedAt ?? "");
    if(result.status!=="CANCELLED" || result.item?.id!==item.id || result.item.status!=="IN_STORAGE" || !result.wallet || ![result.wallet.balance,result.wallet.cryptoBalance,result.wallet.cardBalance].every(n=>Number.isFinite(n)&&n>=0) || Math.abs(result.wallet.balance-result.wallet.cryptoBalance-result.wallet.cardBalance)>0.001)throw new Error("notPreparing");
    useInventoryStore.setState(s=>({items:s.items.map(o=>o.id===item.id?result.item:o)}));
    useWalletStore.setState({balance:result.wallet.balance,cryptoBalance:result.wallet.cryptoBalance,cardBalance:result.wallet.cardBalance});
   } else {
    const result=useInventoryStore.getState().cancelShipping(item.id);
    if(!result.ok)throw new Error(result.reason);
    if(result.refundedUsdt>0){
     const wallet=useWalletStore.getState();wallet.creditSplit(result.toCrypto,result.toCard);
     wallet.addTransaction({type:"shipping_refund",amountUsdt:result.refundedUsdt,ref:item.shipping?.requestId ?? item.id,status:"COMPLETED"});
    }
   }
   onCancelled();
  }catch(e){setError(e instanceof Error && e.message==="unknownFee"?"unknownFee":"changed");}
  finally{setBusy(false);}
 };
 if(!item)return null;
 return <div className="fixed inset-0 z-[120] overflow-y-auto bg-obsidian/85 px-4 py-12 backdrop-blur-sm" onMouseDown={e=>e.target===e.currentTarget&&!busy&&onClose()}>
  <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="cancel-shipment-title" className="relative mx-auto max-w-lg rounded-2xl border border-hairline bg-surface p-6 outline-none md:p-8">
   <button className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full hover:bg-elevation" onClick={onClose} disabled={busy} aria-label={t("close")}><X className="h-5 w-5"/></button>
   <RotateCcw className="mb-4 h-6 w-6 text-gold-champagne" aria-hidden="true"/><h2 id="cancel-shipment-title" className="pr-8 text-2xl font-medium">{t("title")}</h2>
   <p className="mt-4 text-sm leading-7 text-secondary">{t("body")}</p>
   <div className="mt-5 rounded-xl border border-hairline bg-obsidian p-4"><p className="flex items-center gap-2 text-sm"><Package className="h-4 w-4 text-gold-champagne"/>{t("keepItem")}</p><div className="mt-4 flex items-center justify-between gap-4 text-sm"><span className="text-muted">{t("feeReturn")}</span><Money value={item.shipping?.feeUsdt??0} size="sm"/></div><p className="mt-2 text-xs leading-6 text-muted">{t("fundingNote")}</p></div>
   {(!canCancel||error)&&<p role="alert" className="mt-4 text-sm leading-7 text-[#f3ad9e]">{t(error || (unknownFee?"unknownFee":"notPreparing"))}</p>}
   <p className="mt-4 text-xs leading-6 text-muted">{t("rights")}</p><Link href="/legal/refunds" className="workspace-text-link">{t("refundPolicy")}</Link>
   <div className="mt-5 grid grid-cols-2 gap-3"><button onClick={onClose} disabled={busy} className="workspace-button">{t("keepShipping")}</button><button onClick={()=>void confirm()} disabled={busy||!canCancel} className="workspace-button primary">{t(busy?"processing":"confirm")}</button></div>
  </div>
 </div>;
}
