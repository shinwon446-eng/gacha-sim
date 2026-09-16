"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Truck, X } from "lucide-react";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { COUNTRIES, FREE_SHIPPING_EVENT, customsKindFor, shippingFee, validateAddress, type AddressError, type CountryCode, type ShippingAddress } from "@/lib/shipping";

export interface ShippingModalProps {
  open: boolean;
  itemCount: number;
  balanceUsdt: number;
  onClose: () => void;
  /** 검증 통과 + 배송비 확인 후 — 호출측이 잔액 차감과 상태 전환을 한다 */
  onSubmit: (address: ShippingAddress, feeUsdt: number) => void;
}

const inputCls = "mt-1.5 w-full rounded-md border border-hairline bg-obsidian px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-faint focus:border-gold-champagne";

/**
 * 글로벌 배송 신청 폼 (PROMPTS 5-2-2).
 * 수령인·국가·연락처·우편번호·상세주소 + 국가별 통관 식별자(KR PCCC / CN 居民身份证). 배송비는 잔액에서 차감.
 */
export function ShippingModal({ open, itemCount, balanceUsdt, onClose, onSubmit }: ShippingModalProps) {
  const t = useTranslations("inventory");
  const { fmt } = useCurrency();
  const panelRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<ShippingAddress>({ recipient: "", country: "KR", phone: "", postalCode: "", address: "", customsId: "" });
  const [errors, setErrors] = useState<AddressError[]>([]);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const fee = useMemo(() => shippingFee(form.country), [form.country]);
  const customs = customsKindFor(form.country);
  const insufficient = balanceUsdt < fee;

  const set = <K extends keyof ShippingAddress>(k: K, v: ShippingAddress[K]) => {
    const next = { ...form, [k]: v };
    setForm(next);
    if (touched) setErrors(validateAddress(next));
  };

  const submit = () => {
    const errs = validateAddress(form);
    setTouched(true);
    setErrors(errs);
    if (errs.length || insufficient) return;
    onSubmit({ ...form, customsId: customs === "none" ? undefined : form.customsId?.trim().toUpperCase() }, fee);
  };

  const has = (k: AddressError) => touched && errors.includes(k);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[120] overflow-y-auto bg-obsidian/85 px-3 py-6 backdrop-blur-sm md:px-6 md:py-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={t("shipTitle")}
            className="border-metallic-gold relative mx-auto w-full max-w-lg rounded-xl bg-canvas p-5 outline-none md:p-6"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <button type="button" onClick={onClose} aria-label={t("cancel")} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-elevation hover:text-white">
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-gold-champagne" strokeWidth={2.2} />
              <h2 className="font-display text-xl font-bold uppercase tracking-tight text-white">{t("shipTitle")}</h2>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">{t("shipBody")}</p>
            <div className="caption-luxury mt-3">{t("itemsToShip", { n: itemCount })}</div>

            <div className="mt-4 grid gap-3">
              <label className="block">
                <span className="caption-luxury">{t("recipient")}</span>
                <input value={form.recipient} onChange={(e) => set("recipient", e.target.value)} className={cn(inputCls, has("recipient") && "border-crimson")} />
                {has("recipient") && <span className="mt-1 block text-[11px] text-crimson">{t("errors.recipient")}</span>}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="caption-luxury">{t("country")}</span>
                  <select value={form.country} onChange={(e) => set("country", e.target.value as CountryCode)} className={inputCls}>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {t(`countries.${c}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="caption-luxury">{t("phone")}</span>
                  <input value={form.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" placeholder="+82 10-0000-0000" className={cn(inputCls, has("phone") && "border-crimson")} />
                  {has("phone") && <span className="mt-1 block text-[11px] text-crimson">{t("errors.phone")}</span>}
                </label>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className="caption-luxury">{t("postalCode")}</span>
                  <input value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} className={cn(inputCls, has("postalCode") && "border-crimson")} />
                </label>
                <label className="col-span-2 block">
                  <span className="caption-luxury">{t("address")}</span>
                  <input value={form.address} onChange={(e) => set("address", e.target.value)} className={cn(inputCls, has("address") && "border-crimson")} />
                  {has("address") && <span className="mt-1 block text-[11px] text-crimson">{t("errors.address")}</span>}
                </label>
              </div>
              {customs !== "none" && (
                <label className="block">
                  <span className="caption-luxury">{customs === "pccc" ? t("pccc") : t("residentId")}</span>
                  <input value={form.customsId ?? ""} onChange={(e) => set("customsId", e.target.value)} placeholder={customs === "pccc" ? t("pcccHint") : t("residentIdHint")} className={cn(inputCls, "font-mono", has("customsId") && "border-crimson")} />
                  {has("customsId") && <span className="mt-1 block text-[11px] text-crimson">{t("errors.customsId")}</span>}
                </label>
              )}
            </div>

            <div className="border-metallic-subtle mt-4 flex items-center justify-between rounded-md bg-obsidian px-3 py-2.5 text-sm">
              <span className="text-muted">{t("fee")}</span>
              <span className={cn("font-mono font-bold tabular-nums", FREE_SHIPPING_EVENT ? "text-gold-champagne" : "text-white")}>{FREE_SHIPPING_EVENT ? t("feeFree") : fmt(fee)}</span>
            </div>
            {insufficient && <p className="mt-2 text-[11px] text-crimson">{t("shipInsufficient", { fee: fmt(fee) })}</p>}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={onClose} className="glass-dark h-11 rounded-md text-sm font-semibold text-secondary hover:text-white">
                {t("cancel")}
              </button>
              <button type="button" onClick={submit} disabled={insufficient} className="h-11 rounded-md bg-crimson text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50">
                {t("submitShip", { fee: FREE_SHIPPING_EVENT ? fmt(0) : fmt(fee) })}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ShippingModal;
