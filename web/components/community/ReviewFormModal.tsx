"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Camera, X, Star, Gift, ImagePlus } from "lucide-react";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { useProductText } from "@/lib/useProductText";
import { BOX_BY_SLUG } from "@/lib/products";
import { REVIEW_BONUS_USDT } from "@/lib/community";
import { useInventoryStore, type OwnedItem } from "@/stores/inventoryStore";
import { useCommunityStore } from "@/stores/communityStore";
import { Money } from "@/components/ui/Money";

/** 사진 축소 — localStorage 에 넣을 수 있게 긴 변 640px, JPEG 0.8 */
async function shrinkImage(file: File, max = 640): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface ReviewFormModalProps {
  open: boolean;
  onClose: () => void;
  /** 저장 완료 — 호출측이 보너스 지급·토스트 */
  onSubmitted: (ownedId: string, bonusUsdt: number) => void;
}

/**
 * 포토 후기 작성 (CLAUDE.md §7-B). 배송받은(SHIPPING) 아이템만 대상. 한 아이템당 1회, 10 USDT 보너스.
 * 업로드 백엔드가 없어 브라우저에만 저장된다 — 데모 고지.
 */
export function ReviewFormModal({ open, onClose, onSubmitted }: ReviewFormModalProps) {
  const t = useTranslations("community");
  const { fmt } = useCurrency();
  const { boxTitle, itemName } = useProductText();
  const items = useInventoryStore((s) => s.items);
  const hasReviewed = useCommunityStore((s) => s.hasReviewed);
  const add = useCommunityStore((s) => s.add);

  const eligible: OwnedItem[] = useMemo(() => items.filter((o) => o.status === "SHIPPING" && !hasReviewed(o.id)), [items, hasReviewed]);
  const [ownedId, setOwnedId] = useState<string>("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [photo, setPhoto] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setOwnedId(eligible[0]?.id ?? "");
    setText("");
    setRating(5);
    setPhoto(undefined);
    setError(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onFile = useCallback(async (f: File | undefined) => {
    if (!f) return;
    try {
      setPhoto(await shrinkImage(f));
    } catch {
      setError("photo");
    }
  }, []);

  const submit = () => {
    const o = eligible.find((x) => x.id === ownedId);
    if (!o) return setError("item");
    if (text.trim().length < 5) return setError("text");
    add({ ownedId: o.id, boxSlug: o.boxSlug, itemId: o.itemId, text: text.trim(), rating, photo, bonusUsdt: REVIEW_BONUS_USDT });
    onSubmitted(o.id, REVIEW_BONUS_USDT);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[120] overflow-y-auto bg-obsidian/85 px-3 py-6 backdrop-blur-sm md:px-6 md:py-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div role="dialog" aria-modal="true" aria-label={t("writeTitle")} className="border-metallic-gold relative mx-auto w-full max-w-lg rounded-xl bg-canvas p-5 md:p-6" initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
            <button type="button" onClick={onClose} aria-label={t("close")} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-elevation hover:text-white">
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-gold-champagne" strokeWidth={2.2} />
              <h2 className="font-display text-xl font-bold uppercase tracking-tight text-white">{t("writeTitle")}</h2>
            </div>
            <p className="mt-1 flex flex-wrap items-baseline gap-1 text-xs text-muted">
              <Gift className="h-3.5 w-3.5 self-center text-gold-champagne" strokeWidth={2.2} />
              {t("writeBonus")} <Money value={REVIEW_BONUS_USDT} size="xs" numberClassName="text-gold-champagne" />
            </p>

            {eligible.length === 0 ? (
              <div className="border-metallic-subtle mt-5 rounded-lg bg-obsidian p-4 text-sm text-muted">{t("noEligible")}</div>
            ) : (
              <div className="mt-5 grid gap-4">
                <label className="block">
                  <span className="caption-luxury">{t("pickItem")}</span>
                  <select value={ownedId} onChange={(e) => setOwnedId(e.target.value)} className="mt-1.5 w-full rounded-md border border-hairline bg-obsidian px-3 py-2.5 text-sm text-white outline-none focus:border-gold-champagne">
                    {eligible.map((o) => {
                      const b = BOX_BY_SLUG[o.boxSlug];
                      const it = b?.items.find((i) => i.id === o.itemId);
                      return (
                        <option key={o.id} value={o.id} className="bg-obsidian">
                          {it ? itemName(it) : o.itemId} · {b ? boxTitle(b) : o.boxSlug}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <div>
                  <span className="caption-luxury">{t("photo")}</span>
                  <label className={cn("border-metallic-subtle mt-1.5 flex cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-obsidian", photo ? "aspect-video" : "h-28")}>
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex flex-col items-center gap-1 text-xs text-muted">
                        <ImagePlus className="h-6 w-6 text-faint" strokeWidth={1.6} />
                        {t("photoHint")}
                      </span>
                    )}
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
                  </label>
                </div>

                <div>
                  <span className="caption-luxury">{t("rating")}</span>
                  <div className="mt-1.5 flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n}`} className="p-0.5">
                        <Star className={cn("h-5 w-5", n <= rating ? "fill-gold-champagne text-gold-champagne" : "text-faint")} strokeWidth={1.8} />
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="caption-luxury">{t("text")}</span>
                  <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={160} placeholder={t("textHint")} className="mt-1.5 w-full resize-none rounded-md border border-hairline bg-obsidian px-3 py-2.5 text-sm text-white outline-none placeholder:text-faint focus:border-gold-champagne" />
                  <span className="mt-1 block text-right font-mono text-[10px] text-faint">{text.length}/160</span>
                </label>

                {error && <p className="text-xs text-crimson">{t(`errors.${error}`)}</p>}

                <button type="button" onClick={submit} className="flex h-12 items-center justify-center gap-2 rounded-md bg-gold-champagne text-sm font-bold text-obsidian hover:bg-gold-metallic">
                  <Camera className="h-4 w-4" strokeWidth={2.4} />
                  {t("submit", { bonus: fmt(REVIEW_BONUS_USDT) })}
                </button>
              </div>
            )}
            <p className="mt-3 text-[10px] leading-relaxed text-faint">{t("bonusNote", { bonus: fmt(REVIEW_BONUS_USDT) })}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ReviewFormModal;
