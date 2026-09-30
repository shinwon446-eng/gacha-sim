"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Camera, ImagePlus, Star, X } from "lucide-react";
import { useModal } from "@/lib/useModal";
import { useProductText } from "@/lib/useProductText";
import { productOf } from "@/lib/vault";
import { canReview, meetsReviewValue, REVIEW_MAX_CHARS, REVIEW_MIN_CHARS } from "@/lib/community";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useCommunityStore, type MyReview } from "@/stores/communityStore";
import { cn } from "@/lib/format";
import { Link } from "@/i18n/navigation";
import { reviewValueNotice } from "./reviewValueNotice";
import { browserAccountsEnabled } from "@/lib/account";
import { submitCommunityReview } from "@/lib/communityReviewApi";
import { announcePublishedReviews } from "@/stores/usePublishedReviews";

async function shrinkImage(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) throw new Error("photo");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = url; });
    if (img.width * img.height > 40000000) throw new Error("photo");
    const scale = Math.min(1, 960 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(img.width * scale)); canvas.height = Math.max(1, Math.round(img.height * scale));
    const context = canvas.getContext("2d"); if (!context) throw new Error("photo");
    context.drawImage(img, 0, 0, canvas.width, canvas.height); return canvas.toDataURL("image/jpeg", 0.8);
  } finally { URL.revokeObjectURL(url); }
}
export interface ReviewFormModalProps { open: boolean; onClose: () => void; onSubmitted: () => void; initialOwnedId?: string; editing?: MyReview | null; }
export function ReviewFormModal({ open, onClose, onSubmitted, initialOwnedId, editing }: ReviewFormModalProps) {
  const t = useTranslations("community");
  const locale = useLocale();
  const r = useTranslations("refinement");
  const { itemName } = useProductText();
  const items = useInventoryStore(s => s.items);
  const mine = useCommunityStore(s => s.mine);
  const eligible = items.filter(item => canReview(item, mine));
  const hasMinValueItem = items.some(meetsReviewValue);
  const [ownedId, setOwnedId] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(0);
  const [photo, setPhoto] = useState<string>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const imageTask = useRef(0);
  const panel = useRef<HTMLDivElement>(null);
  useModal(open, onClose, panel);
  useEffect(() => {
    if (!open) { imageTask.current++; return; }
    const eligibleItems = useInventoryStore.getState().items.filter(item => canReview(item, useCommunityStore.getState().mine));
    const selected = eligibleItems.find(item => item.id === initialOwnedId) ?? eligibleItems[0];
    setOwnedId(editing?.ownedId ?? selected?.id ?? "");
    setText(editing?.text ?? ""); setRating(editing?.rating ?? 0); setPhoto(editing?.photo); setError(""); setBusy(false);
  }, [open, initialOwnedId, editing]);
  const onFile = async (file?: File) => {
    if (!file) return;
    const task = ++imageTask.current;
    setBusy(true); setError("");
    try { const result = await shrinkImage(file); if (task === imageTask.current) setPhoto(result); }
    catch { if (task === imageTask.current) setError("photoError"); }
    finally { if (task === imageTask.current) setBusy(false); }
  };
  const submit = async () => {
    if (busy) return;
    if (text.trim().length < REVIEW_MIN_CHARS || text.trim().length > REVIEW_MAX_CHARS) return setError("textError");
    if (rating < 1 || rating > 5) return setError("ratingError");
    setBusy(true);
    let createdId: string | undefined;
    try {
      if (editing) {
        if (!browserAccountsEnabled()) announcePublishedReviews(await submitCommunityReview({ type: "update", id: editing.id, text: text.trim(), rating, photo }));
        useCommunityStore.getState().update(editing.id, { text: text.trim(), rating, photo });
      }
      else {
        const item = useInventoryStore.getState().items.find(i => i.id === ownedId);
        if (!item || !canReview(item, useCommunityStore.getState().mine)) return setError("eligibilityError");
        const review = useCommunityStore.getState().add({ ownedId, boxSlug: item.boxSlug, itemId: item.itemId, text: text.trim(), rating, photo, bonusUsdt: 0 });
        createdId = review.id;
        if (!browserAccountsEnabled()) announcePublishedReviews(await submitCommunityReview({ type: "create", clientReviewId: review.id, ownedId, text: text.trim(), rating, photo }));
      }
      onSubmitted();
    } catch { if (createdId) { try { useCommunityStore.getState().remove(createdId); } catch {} } setError("storageError"); }
    finally { setBusy(false); }
  };
  if (!open) return null;
  return <div className="fixed inset-0 z-[120] overflow-y-auto bg-obsidian/85 px-3 py-6 backdrop-blur-sm md:py-12" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="review-heading" className="relative mx-auto max-w-xl rounded-2xl border border-hairline bg-surface p-6 outline-none md:p-8">
      <button onClick={onClose} aria-label={t("close")} className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full hover:bg-elevation"><X className="h-5 w-5" /></button>
      <p className="workspace-eyebrow">VOILA JOURNAL</p><h2 id="review-heading" className="mt-3 pr-8 text-2xl font-medium text-white">{editing ? r("editReview") : t("writeTitle")}</h2>
      {!editing && <p className="mt-3 text-sm leading-6 text-muted">{locale === "ko" ? "등록한 후기는 상품 후기 게시판에 공개됩니다. 사진에 개인정보가 포함되지 않았는지 확인해 주세요." : locale === "zh" ? "提交的评价会显示在商品评价版块。请勿在照片中包含个人信息。" : "Your review will appear on the product review board. Please remove personal information from photos."}</p>}
      {eligible.length === 0 && !editing ? <p className="mt-6 rounded-xl border border-hairline p-5 text-sm leading-7 text-secondary">{hasMinValueItem ? r("eligibleEmptyBody") : reviewValueNotice(locale)}</p> : <form className="mt-6 grid gap-5" onSubmit={e => { e.preventDefault(); submit(); }}>
        {!editing && <label className="text-sm text-secondary">{t("pickItem")}<select className="workspace-select mt-2 w-full" value={ownedId} onChange={e => setOwnedId(e.target.value)}>{eligible.map(item => <option key={item.id} value={item.id}>{productOf(item) ? itemName(productOf(item)!) : item.itemId}</option>)}</select></label>}
        <fieldset><legend className="mb-2 text-sm text-secondary">{t("rating")}</legend><div className="flex gap-1">{[1, 2, 3, 4, 5].map(n => <label key={n} className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg hover:bg-elevation"><input type="radio" className="peer sr-only" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} aria-label={r("ratingLabel", { n })} /><Star aria-hidden="true" className={cn("h-6 w-6 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-gold-champagne", n <= rating ? "fill-gold-champagne text-gold-champagne" : "text-muted")} /></label>)}</div></fieldset>
        <label className="text-sm text-secondary">{t("text")}<textarea value={text} onChange={e => setText(e.target.value)} rows={5} maxLength={REVIEW_MAX_CHARS} placeholder={t("textHint")} className="mt-2 w-full rounded-xl border border-hairline bg-obsidian p-4 text-sm leading-7 text-white placeholder:text-muted" /><span className="mt-1 block text-right text-xs text-muted">{text.length} / {REVIEW_MAX_CHARS}</span></label>
        <div><p className="mb-2 text-sm text-secondary">{t("photo")}</p>{photo && <div className="mb-3 flex items-center gap-3"><img src={photo} alt={r("attachedPhoto")} className="h-24 w-24 rounded-lg object-cover" /><button type="button" className="workspace-text-link" onClick={() => { imageTask.current++; setPhoto(undefined); setBusy(false); }}>{r("removePhoto")}</button></div>}
          <label className="workspace-button relative cursor-pointer"><ImagePlus className="h-4 w-4" aria-hidden="true" />{r(busy ? "processingPhoto" : "attachPhoto")}<input aria-label={r("attachPhoto")} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { void onFile(e.target.files?.[0]); e.target.value = ""; }} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" /></label><p className="mt-2 text-xs text-muted">{r("photoHint")}</p>
        </div>
        {error && <p role="alert" className="text-sm text-[#f3ad9e]">{r(error)}</p>}
        <button type="submit" disabled={busy} className="workspace-button primary w-full"><Camera className="h-4 w-4" />{r(busy ? "processingPhoto" : editing ? "saveChanges" : "saveReview")}</button>
      </form>}
      <Link href="/legal/community" target="_blank" rel="noopener noreferrer" className="workspace-text-link mt-4">{r("reviewPolicy")}</Link>
    </div>
  </div>;
}
