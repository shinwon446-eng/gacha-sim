"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Truck, X, Check, Circle, Copy, ExternalLink } from "lucide-react";
import { cn } from "@/lib/format";
import { useProductText } from "@/lib/useProductText";
import { BOX_BY_SLUG } from "@/lib/products";
import type { OwnedItem } from "@/stores/inventoryStore";
import { Money } from "@/components/ui/Money";
import { trackingUrl } from "@/lib/carriers";

export interface TrackingModalProps {
  item: OwnedItem | null;
  onClose: () => void;
}

type Step = "requested" | "label" | "transit" | "delivered";
const STEPS: Step[] = ["requested", "label", "transit", "delivered"];

/** 상태 → 완료된 단계 수. SHIPPING_REQUESTED 는 신청만, SHIPPING 은 운송장 발급 + 운송 중 */
function doneCount(o: OwnedItem): number {
  if (o.status === "SHIPPING") return 3;
  if (o.status === "SHIPPING_REQUESTED") return o.shipping?.trackingNumber ? 2 : 1;
  return 0;
}

/**
 * 배송 추적 모달 — 운송장 번호 + 4단계 타임라인 + 수령지 요약.
 * 데모에는 캐리어 연동이 없어 SHIPPING_REQUESTED 에서 멈춘다. 그 사실을 하단에 명시한다.
 */
export function TrackingModal({ item, onClose }: TrackingModalProps) {
  const t = useTranslations("inventory");
  const locale = useLocale();
  const { itemName } = useProductText();
  const ref = useRef<HTMLDivElement>(null);
  const open = !!item;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const product = item ? BOX_BY_SLUG[item.boxSlug]?.items.find((i) => i.id === item.itemId) : undefined;
  const done = item ? doneCount(item) : 0;
  const tracking = item?.shipping?.trackingNumber;
  const carrier = item?.shipping?.carrier;
  const addr = item?.shipping?.address;

  return (
    <AnimatePresence>
      {item && (
        <motion.div className="fixed inset-0 z-[120] overflow-y-auto bg-obsidian/85 px-3 py-6 backdrop-blur-sm md:px-6 md:py-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div
            ref={ref}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={t("trackingTitle")}
            className="border-metallic-gold relative mx-auto w-full max-w-md rounded-xl bg-canvas p-5 outline-none md:p-6"
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
              <h2 className="font-display text-xl font-bold uppercase tracking-tight text-white">{t("trackingTitle")}</h2>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-semibold text-white">{product ? itemName(product) : item.itemId}</span>
              <Money value={item.valueUsdt} size="sm" numberClassName="text-gold-champagne" />
            </div>

            {/* 운송장 */}
            <div className="border-metallic-subtle mt-4 rounded-lg bg-obsidian p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="caption-luxury">{t("tracking")}</span>
                <span className="rounded-full bg-gold-champagne/15 px-2.5 py-1 text-[11px] font-bold text-gold-champagne">{t(`status.${item.status}`)}</span>
              </div>
              {carrier && <div className="mt-1.5 text-xs font-semibold text-white">{t(`carriers.${carrier}`)}</div>}
              <div className="mt-2 flex items-center gap-2">
                <code className={cn("min-w-0 flex-1 break-all font-mono text-sm", tracking ? "text-white" : "text-faint")}>{tracking ?? t("trackingPending")}</code>
                {tracking && (
                  <button type="button" onClick={() => navigator.clipboard?.writeText(tracking)} aria-label={t("copyTracking")} className="glass-dark flex h-8 w-8 flex-none items-center justify-center rounded-md text-gold-champagne hover:border-gold-champagne">
                    <Copy className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </button>
                )}
              </div>
              {tracking && carrier && (
                <a href={trackingUrl(carrier, tracking)} target="_blank" rel="noopener noreferrer" className="border-gold-gradient mt-2 flex h-9 items-center justify-center gap-1.5 rounded-md text-xs font-bold text-gold-champagne hover:bg-gold-champagne/10">
                  {t("trackOnCarrier", { carrier: t(`carriers.${carrier}`) })}
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.4} />
                </a>
              )}
            </div>

            {/* 타임라인 */}
            <ol className="mt-4 grid gap-0">
              {STEPS.map((s, i) => {
                const isDone = i < done;
                const isCurrent = i === done - 1;
                return (
                  <li key={s} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={cn("flex h-5 w-5 flex-none items-center justify-center rounded-full border", isDone ? "border-gold-champagne bg-gold-champagne text-obsidian" : "border-hairline bg-obsidian text-faint")}>
                        {isDone ? <Check className="h-3 w-3" strokeWidth={3} /> : <Circle className="h-2 w-2" strokeWidth={0} fill="currentColor" />}
                      </span>
                      {i < STEPS.length - 1 && <span className={cn("w-px flex-1", i < done - 1 ? "bg-gold-champagne/60" : "bg-hairline")} />}
                    </div>
                    <div className="pb-4">
                      <div className={cn("text-sm font-semibold", isDone ? "text-white" : "text-faint")}>{t(`steps.${s}`)}</div>
                      {s === "requested" && item.shipping?.requestedAt && <div className="text-[11px] text-faint">{new Date(item.shipping.requestedAt).toLocaleString(locale)}</div>}
                      {s === "label" && item.shipping?.shippedAt && <div className="text-[11px] text-faint">{new Date(item.shipping.shippedAt).toLocaleString(locale)}</div>}
                      {isCurrent && <div className="text-[11px] text-gold-champagne">{t("stepCurrent")}</div>}
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* 수령지 */}
            {addr && (
              <dl className="grid gap-1.5 border-t border-hairline pt-3 text-xs">
                {[
                  [t("recipient"), addr.recipient],
                  [t("country"), t(`countries.${addr.country}`)],
                  [t("address"), `${addr.address} (${addr.postalCode})`],
                  [t("fee"), null],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex items-baseline justify-between gap-4">
                    <dt className="flex-none text-faint">{k}</dt>
                    <dd className="min-w-0 truncate text-right text-secondary">{v === null ? <Money value={item.shipping?.feeUsdt ?? 0} size="xs" numberClassName="text-secondary" /> : v}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="mt-3 text-[10px] leading-relaxed text-faint">{t("trackingNote")}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default TrackingModal;
