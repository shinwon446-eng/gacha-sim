"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { X, Truck, ShieldCheck, PackageCheck, Lock, ExternalLink, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/format";
import { Money } from "@/components/ui/Money";
import { useCurrency } from "@/lib/useCurrency";
import {
  COUNTRIES,
  UNIPASS_URL,
  customsKindFor,
  formatPhoneKR,
  shippingFee,
  validateAddress,
  type AddressError,
  type CountryCode,
  type ShippingAddress,
} from "@/lib/shipping";

/** 명품 정밀 검수 접수 연출 길이(ms) */
const INSPECT_MS = 1500;

export interface DeliveryModalProps {
  open: boolean;
  /** 배송 신청할 아이템 수 */
  itemCount: number;
  balanceUsdt: number;
  onClose: () => void;
  /** 신청 확정 — 호출측이 배송비 차감·상태 전환을 한다 */
  onSubmit: (address: ShippingAddress, feeUsdt: number) => void;
}

const inputCls =
  "mt-1.5 w-full rounded-md border border-hairline bg-obsidian px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-faint focus:border-gold-champagne";

/** 3대 안심 배송 보증 — 운영자가 내건 약속(법적 문서 §배송/환전 정책과 같은 내용) */
function GuaranteeCards({ t, fee }: { t: ReturnType<typeof useTranslations<"delivery">>; fee: number }) {
  const cards = [
    { Icon: ShieldCheck, tone: "gold" as const, title: t("guaranteeAuthTitle"), body: t("guaranteeAuthBody") },
    { Icon: PackageCheck, tone: "emerald" as const, title: t("guaranteeCarrierTitle"), body: fee === 0 ? t("guaranteeCarrierBodyFree") : t("guaranteeCarrierBody") },
    { Icon: Lock, tone: "emerald" as const, title: t("guaranteeInsuranceTitle"), body: t("guaranteeInsuranceBody") },
  ];
  return (
    <ul className="mt-4 grid gap-2">
      {cards.map(({ Icon, tone, title, body }) => (
        <li
          key={title}
          className={cn(
            "flex items-start gap-2.5 rounded-lg p-3",
            tone === "gold" ? "border-metallic-gold bg-gold-champagne/[0.06]" : "border border-emerald-500/35 bg-emerald-500/[0.06]",
          )}
        >
          <Icon className={cn("mt-0.5 h-4 w-4 flex-none", tone === "gold" ? "text-gold-champagne" : "text-emerald-300")} strokeWidth={2.2} />
          <div className="min-w-0">
            <div className={cn("break-keep text-[12px] font-bold leading-snug", tone === "gold" ? "text-gold-champagne" : "text-emerald-300")}>{title}</div>
            <div className="mt-0.5 break-keep text-[11px] leading-relaxed text-secondary">{body}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * 실물 배송 신청 모달 (CLAUDE.md §8).
 * 수령인·휴대폰(자동 하이픈)·우편번호/주소/상세주소·개인통관고유부호(+유니패스 발급 링크) → 3대 보증 →
 * [🚚 무료 배송 신청 완료하기] → 1.5초 정밀 검수 접수 연출 → 접수 완료 화면.
 *
 * 송장 번호는 여기서 만들지 않는다 — 물류에서 실제로 발급된 번호만 보관함에 들어오고(관리자/API),
 * 그전까지는 "출고 준비 · 24시간 내 송장 발급"으로 남는다. 지어낸 번호로 조회 링크를 띄우면 유저가 없는 배송을 추적하게 된다.
 */
export function DeliveryModal({ open, itemCount, balanceUsdt, onClose, onSubmit }: DeliveryModalProps) {
  const { fmt } = useCurrency();
  const t = useTranslations("delivery");
  const ti = useTranslations("inventory");
  const panelRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState<ShippingAddress>({ recipient: "", country: "KR", phone: "", postalCode: "", address: "", customsId: "" });
  const [detail, setDetail] = useState("");
  const [errors, setErrors] = useState<AddressError[]>([]);
  const [touched, setTouched] = useState(false);
  const [stage, setStage] = useState<"form" | "inspecting" | "done">("form");

  useEffect(() => {
    if (!open) return;
    setStage("form");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [open, onClose]);

  const fee = shippingFee(form.country);
  const customs = customsKindFor(form.country);
  const insufficient = balanceUsdt < fee;
  /** 도로명 + 상세 주소를 한 줄로 합쳐 저장한다 */
  const fullAddress = `${form.address.trim()} ${detail.trim()}`.trim();

  const set = <K extends keyof ShippingAddress>(k: K, v: ShippingAddress[K]) => {
    const next = { ...form, [k]: v };
    setForm(next);
    if (touched) setErrors(validateAddress({ ...next, address: k === "address" ? String(v) : next.address }));
  };

  const has = (k: AddressError) => touched && errors.includes(k);

  const submit = useCallback(() => {
    const payload: ShippingAddress = { ...form, address: fullAddress, customsId: customs === "none" ? undefined : form.customsId?.trim().toUpperCase() };
    const errs = validateAddress(payload);
    setTouched(true);
    setErrors(errs);
    if (errs.length || insufficient || stage !== "form") return;
    setStage("inspecting");
    timer.current = setTimeout(() => {
      onSubmit(payload, fee);
      setStage("done");
    }, INSPECT_MS);
  }, [form, fullAddress, customs, insufficient, stage, onSubmit, fee]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] overflow-y-auto bg-obsidian/85 px-3 py-6 backdrop-blur-sm md:px-6 md:py-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            className="border-metallic-gold relative mx-auto w-full max-w-lg rounded-xl bg-canvas p-5 outline-none md:p-6"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <button type="button" onClick={onClose} aria-label={t("close")} className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-elevation hover:text-white">
              <X className="h-5 w-5" strokeWidth={2} />
            </button>

            <div className="flex items-center gap-2 pr-10">
              <Truck className="h-5 w-5 text-gold-champagne" strokeWidth={2.2} />
              <h2 className="break-keep font-display text-xl font-bold uppercase tracking-tight text-white">{t("title")}</h2>
            </div>

            {stage === "done" ? (
              <div className="mt-4">
                <div className="border-metallic-gold rounded-lg bg-obsidian p-4">
                  <div className="flex items-center gap-2 text-gold-champagne">
                    <Check className="h-5 w-5" strokeWidth={2.6} />
                    <span className="text-sm font-bold">{t("doneTitle")}</span>
                  </div>
                  <p className="mt-2 break-keep text-[12px] leading-relaxed text-secondary">{t("doneBody")}</p>
                  <div className="border-metallic-subtle mt-3 rounded-md bg-canvas p-3">
                    <div className="caption-luxury">{t("waybill")}</div>
                    <div className="mt-1 text-[12px] font-semibold text-white">{t("waybillPending")}</div>
                    <p className="mt-1 break-keep text-[10px] leading-relaxed text-faint">{t("waybillNote")}</p>
                  </div>
                  <dl className="mt-3 grid gap-1.5 text-[11px]">
                    <div className="flex items-baseline justify-between gap-3 border-b border-hairline pb-1">
                      <dt className="text-faint">{t("recipient")}</dt>
                      <dd className="text-right text-secondary">{form.recipient}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3 border-b border-hairline pb-1">
                      <dt className="flex-none text-faint">{t("address")}</dt>
                      <dd className="min-w-0 break-keep text-right text-secondary">
                        ({form.postalCode}) {fullAddress}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-faint">{t("fee")}</dt>
                      <dd className="text-right">
                        <Money value={fee} size="xs" numberClassName={fee === 0 ? "text-emerald-300" : "text-secondary"} />
                      </dd>
                    </div>
                  </dl>
                </div>
                <button type="button" onClick={onClose} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-gold-champagne text-sm font-bold text-obsidian hover:bg-gold-metallic">
                  {t("doneCta")}
                </button>
              </div>
            ) : (
              <>
                <p className="mt-2 break-keep text-xs leading-relaxed text-muted">{t("body")}</p>
                <div className="caption-luxury mt-3">{ti("itemsToShip", { n: itemCount })}</div>

                <div className="mt-4 grid gap-3">
                  <label className="block">
                    <span className="caption-luxury">{t("recipient")}</span>
                    <input value={form.recipient} onChange={(e) => set("recipient", e.target.value)} placeholder={t("recipientHint")} className={cn(inputCls, has("recipient") && "border-crimson")} />
                    {has("recipient") && <span className="mt-1 block text-[11px] text-crimson">{ti("errors.recipient")}</span>}
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="caption-luxury">{t("country")}</span>
                      <select value={form.country} onChange={(e) => set("country", e.target.value as CountryCode)} className={inputCls}>
                        {COUNTRIES.map((c) => (
                          <option key={c} value={c}>
                            {ti(`countries.${c}`)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="caption-luxury">{t("phone")}</span>
                      <input
                        value={form.phone}
                        onChange={(e) => set("phone", form.country === "KR" ? formatPhoneKR(e.target.value) : e.target.value)}
                        inputMode="tel"
                        placeholder={form.country === "KR" ? "010-0000-0000" : "+00 000 0000"}
                        className={cn(inputCls, "font-mono", has("phone") && "border-crimson")}
                      />
                      {has("phone") && <span className="mt-1 block text-[11px] text-crimson">{ti("errors.phone")}</span>}
                    </label>
                  </div>

                  <div className="grid grid-cols-[7rem_1fr] gap-3">
                    <label className="block">
                      <span className="caption-luxury">{t("postal")}</span>
                      <input value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} inputMode="numeric" placeholder="06236" className={cn(inputCls, "font-mono", has("postalCode") && "border-crimson")} />
                    </label>
                    <label className="block">
                      <span className="caption-luxury">{t("road")}</span>
                      <input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder={t("roadHint")} className={cn(inputCls, has("address") && "border-crimson")} />
                    </label>
                  </div>
                  <label className="block">
                    <span className="caption-luxury">{t("detail")}</span>
                    <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder={t("detailHint")} className={inputCls} />
                    {has("address") && <span className="mt-1 block text-[11px] text-crimson">{ti("errors.address")}</span>}
                  </label>

                  {customs !== "none" && (
                    <label className="block">
                      <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                        <span className="caption-luxury">{customs === "pccc" ? ti("pccc") : ti("residentId")}</span>
                        {customs === "pccc" && (
                          <a href={UNIPASS_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 whitespace-nowrap text-[10px] font-bold text-gold-champagne hover:underline">
                            {t("unipass")}
                            <ExternalLink className="h-3 w-3" strokeWidth={2.4} />
                          </a>
                        )}
                      </span>
                      <input value={form.customsId ?? ""} onChange={(e) => set("customsId", e.target.value.toUpperCase())} placeholder={customs === "pccc" ? "P000000000000" : "000000000000000000"} className={cn(inputCls, "font-mono", has("customsId") && "border-crimson")} />
                      <span className="mt-1 block break-keep text-[10px] leading-relaxed text-faint">{customs === "pccc" ? t("pcccHint") : ti("residentIdHint")}</span>
                      {has("customsId") && <span className="mt-1 block text-[11px] text-crimson">{ti("errors.customsId")}</span>}
                    </label>
                  )}
                </div>

                {/* 3대 안심 배송 보증 */}
                <GuaranteeCards t={t} fee={fee} />

                {/* 배송비 */}
                <div className="border-metallic-subtle mt-4 flex items-center justify-between rounded-lg bg-obsidian p-3">
                  <span className="text-xs text-muted">{t("fee")}</span>
                  <span className="flex items-center gap-2">
                    {fee === 0 && <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">{t("freeEvent")}</span>}
                    <Money value={fee} size="sm" numberClassName={fee === 0 ? "text-emerald-300" : "text-white"} />
                  </span>
                </div>
                {insufficient && <p className="mt-2 text-[11px] text-crimson">{ti("shipInsufficient", { fee: String(fee) })}</p>}

                <button
                  type="button"
                  onClick={submit}
                  disabled={insufficient || stage !== "form"}
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md bg-gold-champagne px-3 text-sm font-bold text-obsidian shadow-[0_0_24px_rgba(230,202,101,0.35)] transition-colors hover:bg-gold-metallic disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {stage === "inspecting" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />
                      {t("inspecting")}
                    </>
                  ) : (
                    t("submit", { fee: fee === 0 ? "0.00 USDT" : fmt(fee) })
                  )}
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default DeliveryModal;
