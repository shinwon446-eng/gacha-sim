"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, Camera, Check, ChevronDown, Globe2, MessageSquare, Package, Pencil, Search, Star, Trash2, X } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ProductArt } from "@/components/box/ProductArt";
import { ReviewFormModal } from "@/components/community/ReviewFormModal";
import { CommunityNavigation } from "@/components/community/CommunityNavigation";
import { reviewValueNotice } from "@/components/community/reviewValueNotice";

import { useCommunityStore, subscribeCommunityReviews, type MyReview } from "@/stores/communityStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { BOX_BY_SLUG } from "@/lib/products";
import { canReview, meetsReviewValue, publicReviewFeed, communityFeedCopy } from "@/lib/community";
import { productOf } from "@/lib/vault";
import { useProductText } from "@/lib/useProductText";
import { cn } from "@/lib/format";
import { Link } from "@/i18n/navigation";

type Tab = "public" | "mine" | "eligible";
export default function CommunityPage() {
  const r = useTranslations("refinement");
  const t = useTranslations("community");
  const locale = useLocale();
  const { itemName, boxTitle } = useProductText();
  const allReviews = useCommunityStore(s => s.mine);
  const copy = communityFeedCopy(locale);
  const publicReviews = useMemo(() => publicReviewFeed(allReviews), [allReviews]);
  useEffect(() => subscribeCommunityReviews(), []);
  const hydrated = useCommunityStore(s => s.hydrated);
  const items = useInventoryStore(s => s.items);
  const mine = useMemo(() => allReviews.filter(review => items.some(item => item.id === review.ownedId)), [allReviews, items]);
  const [tab, setTab] = useState<Tab>("public");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [shown, setShown] = useState(12);
  const [writeOpen, setWriteOpen] = useState(false);
  const [editing, setEditing] = useState<MyReview | null>(null);
  const [initialOwnedId, setInitialOwnedId] = useState<string>();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const eligible = useMemo(() => items.filter(item => canReview(item, mine)), [items, mine]);
  const hasMinValueItem = items.some(meetsReviewValue);
  const openedLinkedItem = useRef(false);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("item");
    if (!id || !hydrated || openedLinkedItem.current || !eligible.some(item => item.id === id)) return;
    openedLinkedItem.current = true; setInitialOwnedId(id); setWriteOpen(true);
  }, [hydrated, eligible]);
  useEffect(() => { const tab = new URLSearchParams(window.location.search).get("tab"); if (tab === "eligible" || tab === "mine" || tab === "public") setTab(tab); }, []);
  useEffect(() => { setShown(12); setDeleting(null); }, [tab, query, filter, sort]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 5000); return () => clearTimeout(timer); }, [toast]);
  const reviews = useMemo(() => (tab === "public" ? publicReviews : mine).filter(review => {
    const product = BOX_BY_SLUG[review.boxSlug]?.items.find(i => i.id === review.itemId);
    const text = [review.text, review.authorName ?? "", product ? itemName(product) : review.itemId].join(" ").toLocaleLowerCase(locale);
    return text.includes(query.trim().toLocaleLowerCase(locale)) && (filter === "all" || (filter === "photo" ? !!review.photo : review.rating === Number(filter)));
  }).sort((a, b) => (sort === "newest" ? 1 : -1) * (Date.parse(b.at) - Date.parse(a.at))), [tab, publicReviews, mine, query, filter, sort, locale, itemName]);
  const focusedLinkedReview = useRef(false);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("review");
    if (!id || tab !== "public" || focusedLinkedReview.current) return;
    const position = reviews.findIndex(review => review.id === id);
    if (position < 0) return;
    if (shown <= position) { setShown(position + 1); return; }
    const frame = requestAnimationFrame(() => {
      const card = document.getElementById(`review-${id}`);
      if (card) { card.scrollIntoView({ block: "center" }); card.focus({ preventScroll: true }); focusedLinkedReview.current = true; }
    });
    return () => cancelAnimationFrame(frame);
  }, [reviews, shown, tab]);
  const write = (ownedId?: string) => { setEditing(null); setInitialOwnedId(ownedId); setWriteOpen(true); };
  const remove = (id: string) => {
    try { useCommunityStore.getState().remove(id); setDeleting(null); setToast(r("reviewDeleted")); }
    catch { setToast(r("storageError")); }
  };
  return <main className="min-h-screen bg-canvas">
    <SiteHeader />
    <section className="page-shell workspace-shell">
      <header className="workspace-heading">
        <div><p className="workspace-eyebrow">VOILA JOURNAL</p><h1>{r("journalTitle")}</h1><p className="workspace-description">{r("journalIntro")}</p></div>
        <button className="workspace-button primary" onClick={() => eligible.length ? write() : setTab("eligible")}><Pencil className="h-4 w-4" aria-hidden="true" />{t("write")}</button>
      </header>
      <CommunityNavigation active="reviews" />
      {!hasMinValueItem && <p className="mb-5 rounded-xl border border-hairline p-4 text-sm leading-7 text-secondary">{r("minReviewItemValueNotice")}</p>}
      <nav className="workspace-tabs" aria-label={r("journalTitle")}>
        {(["public", "mine", "eligible"] as const).map(key => <button key={key} aria-current={key === tab ? "page" : undefined} onClick={() => setTab(key)}>{r(`reviewTabs.${key}`)}{key !== "public" && <span>{key === "mine" ? mine.length : eligible.length}</span>}</button>)}
      </nav>
      <div className="journal-layout">
        <div className="min-w-0">
          {tab !== "eligible" && (tab === "public" ? publicReviews : mine).length > 0 && <div className="workspace-toolbar">
            <label className="workspace-search"><Search className="h-4 w-4 shrink-0" aria-hidden="true" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={r("searchReviews")} aria-label={r("searchReviews")} />{query && <button onClick={() => setQuery("")} aria-label={r("clearSearch")}><X className="h-4 w-4" /></button>}</label>
            <select className="workspace-select" aria-label={r("reviewFilter")} value={filter} onChange={e => setFilter(e.target.value)}><option value="all">{r("allReviews")}</option><option value="photo">{r("photoReviews")}</option>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{r("ratingLabel", { n })}</option>)}</select>
            <select className="workspace-select" aria-label={r("sortLabel")} value={sort} onChange={e => setSort(e.target.value)}><option value="newest">{r("sorts.newest")}</option><option value="oldest">{r("sorts.oldest")}</option></select>
          </div>}
          {!hydrated ? <div className="workspace-empty" role="status">{r("loading")}</div> : tab === "public" && publicReviews.length === 0 ? <div className="workspace-empty journal-empty"><Globe2 aria-hidden="true" /><p className="workspace-eyebrow">COMMUNITY</p><h2>{r("publicEmptyTitle")}</h2><p>{locale === "ko" ? "아직 공개된 후기가 없습니다." : locale === "zh" ? "暂无公开评价。" : "No public reviews yet."}</p><button className="workspace-button" onClick={() => setTab("mine")}>{r("reviewTabs.mine")}<ArrowUpRight className="h-4 w-4" /></button></div> : tab === "eligible" ? eligible.length === 0 ? <div className="workspace-empty journal-empty"><Package aria-hidden="true" /><h2>{r("eligibleEmptyTitle")}</h2><p>{hasMinValueItem ? r("eligibleEmptyBody") : reviewValueNotice(locale)}</p><Link href="/inventory" className="workspace-button">{r("checkShipments")}<ArrowUpRight className="h-4 w-4" /></Link></div> : <ul className="grid gap-4">{eligible.map(item => {

            const product = productOf(item);
            return <li key={item.id} className="eligible-item"><div className="record-thumbnail">{product && <ProductArt image={product.image} alt="" fallbackSize="sm" />}</div><div className="min-w-0 flex-1"><p className="text-sm font-medium text-white">{product ? itemName(product) : item.itemId}</p><p className="mt-2 text-xs text-muted">{r("acquiredOn", { date: new Date(item.acquiredAt).toLocaleDateString(locale) })}</p></div><button className="workspace-button" onClick={() => write(item.id)}>{t("write")}</button></li>;
          })}</ul> : reviews.length === 0 ? <div className="workspace-empty journal-empty"><MessageSquare aria-hidden="true" /><h2>{r((tab === "public" ? publicReviews : mine).length ? "noResults" : "myEmptyTitle")}</h2><p>{r((tab === "public" ? publicReviews : mine).length ? "changeFilters" : "myEmptyBody")}</p><button className="workspace-button" onClick={() => (tab === "public" ? publicReviews : mine).length ? (setQuery(""), setFilter("all")) : setTab("eligible")}>{r((tab === "public" ? publicReviews : mine).length ? "resetFilters" : "reviewTabs.eligible")}</button></div> : <>
            <div className="mb-4 text-xs text-muted" aria-live="polite">{r("results", { n: reviews.length })}</div>
            <ul className="grid gap-5">{reviews.slice(0, shown).map(review => {
              const box = BOX_BY_SLUG[review.boxSlug]; const product = box?.items.find(i => i.id === review.itemId);
              const isMine = mine.some(own => own.id === review.id);
              return <li key={review.id} id={`review-${review.id}`} tabIndex={-1} className="journal-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-champagne">
                <div className="journal-card-heading"><div className="journal-avatar" aria-hidden="true">V</div><div><p className="text-sm font-medium text-white">{isMine ? r("yourReview") : review.authorName || copy.member}</p><time dateTime={review.at} className="text-xs text-muted">{new Date(review.at).toLocaleDateString(locale)}{review.updatedAt && <span> &middot; {r("edited")}</span>}</time></div><span className="ml-auto flex items-center gap-1 text-sm text-gold-champagne" aria-label={`${copy.rating} ${review.rating} / 5`}><Star className="h-4 w-4 fill-current" aria-hidden="true" />{review.rating}<span className="ml-1 text-xs text-muted">/ 5</span></span></div>
                <div className="journal-copy">{review.text.length > 240 ? <details><summary><span>{review.text.slice(0, 240)}&hellip;</span><span className="read-more">{r("readFullReview")}<ChevronDown className="h-4 w-4" /></span></summary><p>{review.text}</p></details> : <p>{review.text}</p>}</div>
                {review.photo && <figure className="mt-4"><img src={review.photo} alt={r("reviewPhoto", { name: product ? itemName(product) : review.itemId })} className="max-h-80 w-full rounded-lg bg-obsidian object-contain" loading="lazy" /><figcaption className="mt-2 text-xs text-muted">{r("userPhoto")}</figcaption></figure>}
                <div className="journal-product"><div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-obsidian">{product && <ProductArt image={product.image} alt="" fallbackSize="sm" />}</div><div className="min-w-0"><p className="text-sm font-medium text-secondary">{product ? itemName(product) : review.itemId}</p><p className="mt-1 text-xs leading-5 text-muted">{box ? boxTitle(box) : review.boxSlug} &middot; {r("catalogueImage")}</p></div></div>
                {review.bonusUsdt > 0 && <p className="mt-3 text-xs leading-5 text-muted">{r("legacyIncentive")}</p>}
                {isMine && <div className="journal-actions"><Link href="/inventory" className="workspace-text-link">{r("viewOwnedItem")}<ArrowUpRight className="h-3.5 w-3.5" /></Link><div className="flex gap-2"><button className="workspace-text-link px-2" onClick={() => { setEditing(review); setWriteOpen(true); }}><Pencil className="h-3.5 w-3.5" />{r("edit")}</button><button className="workspace-text-link px-2" onClick={() => setDeleting(deleting === review.id ? null : review.id)} aria-expanded={deleting === review.id}><Trash2 className="h-3.5 w-3.5" />{r("delete")}</button></div></div>}
                {isMine && deleting === review.id && <div className="mt-3 rounded-lg border border-hairline bg-obsidian p-4"><p className="text-sm leading-6 text-secondary">{r("deleteConfirmation")}</p><div className="mt-3 flex gap-2"><button className="workspace-button" onClick={() => setDeleting(null)}>{r("cancel")}</button><button className="workspace-button primary" onClick={() => remove(review.id)}>{r("delete")}</button></div></div>}
              </li>;
            })}</ul>
            {shown < reviews.length && <button className="workspace-button mx-auto mt-6 flex" onClick={() => setShown(n => n + 12)}>{r("loadMore", { n: reviews.length - shown })}</button>}
          </>}
        </div>
        <aside className="journal-guide">
          <p className="workspace-eyebrow">THE JOURNAL GUIDE</p><h2>{r("guideTitle")}</h2>
          {[["01", "guideReceived"], ["02", "guideHonest"], ["03", "guidePrivacy"]].map(([n, key]) => <div key={key} className="journal-guide-step"><span>{n}</span><div><h3>{r(`${key}Title`)}</h3><p>{r(`${key}Body`)}</p></div></div>)}
          <div className="mt-5 border-t border-hairline pt-3"><Link href="/legal/community" className="workspace-text-link">{r("reviewPolicy")}<ArrowUpRight className="h-4 w-4" /></Link><Link href="/legal/privacy" className="workspace-text-link">{r("privacyPolicy")}<ArrowUpRight className="h-4 w-4" /></Link></div>
        </aside>
      </div>
    </section>
    <ReviewFormModal open={writeOpen} editing={editing} initialOwnedId={initialOwnedId} onClose={() => setWriteOpen(false)} onSubmitted={() => { setWriteOpen(false); setTab("mine"); const url = new URL(window.location.href); url.searchParams.delete("item"); url.searchParams.set("tab", "mine"); window.history.replaceState(null, "", url); setToast(r("reviewSaved")); }} />
    {toast && <div className="workspace-toast" role="status">{toast}</div>}
  </main>;
}
