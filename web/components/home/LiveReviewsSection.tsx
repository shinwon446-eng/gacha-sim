"use client";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play, Star } from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ProductArt } from "@/components/box/ProductArt";
import { BOX_BY_SLUG } from "@/lib/products";
import { communityFeedCopy, isExampleReview, publicReviewFeed, relativeReviewTime, reviewWindow } from "@/lib/community";
import { useProductText } from "@/lib/useProductText";
import { useCommunityStore, subscribeCommunityReviews } from "@/stores/communityStore";

export function LiveReviewsSection() {
  const locale = useLocale(); const copy = communityFeedCopy(locale);
  const { itemName, boxTitle } = useProductText();
  const records = useCommunityStore(s => s.mine);
  const [showExamples, setShowExamples] = useState(true);
  const reviews = useMemo(() => publicReviewFeed(records, showExamples), [records, showExamples]);
  const members = useMemo(() => publicReviewFeed(records, false), [records]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const reducedMotion = useReducedMotion();
  const stopped = paused || hovered || focused || hidden || reducedMotion === true;
  const firstId = reviews[0]?.id;
  useEffect(() => subscribeCommunityReviews(), []);
  useEffect(() => { setIndex(0); }, [firstId, showExamples]);
  useEffect(() => {
    const visibility = () => { setHidden(document.hidden); setNow(Date.now()); };
    visibility(); document.addEventListener("visibilitychange", visibility);
    const timer = window.setInterval(() => { if (!document.hidden) setNow(Date.now()); }, 60000);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  useEffect(() => {
    if (stopped || reviews.length <= 3) return;
    const timer = window.setInterval(() => setIndex(value => (value + 1) % reviews.length), 4500);
    return () => window.clearInterval(timer);
  }, [stopped, reviews.length]);
  const cards = reviewWindow(reviews, index);
  const move = (delta: number) => { setPaused(true); setIndex(value => (value + delta + reviews.length) % reviews.length); };
  return <section className="page-shell py-14 md:py-20" aria-labelledby="live-reviews-heading" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">{members.length ? "LIVE UNBOXING REVIEWS" : "PRODUCT REVIEW EXAMPLES"}</p><h2 id="live-reviews-heading" className="mt-3 text-2xl font-medium tracking-tight text-white md:text-3xl">{members.length ? copy.title : locale === "ko" ? "상품 후기, 이렇게 남겨보세요" : locale === "zh" ? "商品评价写作示例" : "Ideas for your product review"}</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-muted">{copy.description}</p></div><Link href="/community?tab=public" className="workspace-text-link">{copy.all}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link></div>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="flex items-center gap-2 text-xs text-secondary"><span aria-hidden="true" className={`h-2 w-2 rounded-full ${stopped ? "bg-muted" : "bg-gold-champagne motion-safe:animate-pulse"}`} />{stopped ? copy.paused : copy.auto}<span className="text-muted">· {members.length ? copy.newReviews : copy.examplesOnly}</span></p><button className="workspace-text-link text-xs" aria-pressed={showExamples} onClick={() => setShowExamples(value => !value)}>{showExamples ? copy.hideExamples : copy.showExamples}</button></div>
    {showExamples && <p className="mb-5 rounded-xl border border-hairline px-4 py-3 text-xs leading-6 text-muted">{copy.exampleNote}</p>}
    <div aria-live="off" className="grid gap-4 md:grid-cols-3" data-testid="live-review-cards">
        {cards.map(review => {
          const box = BOX_BY_SLUG[review.boxSlug]; const product = box?.items.find(item => item.id === review.itemId);
          const example = isExampleReview(review);
          return <motion.article layout={!reducedMotion && !focused} key={review.id} data-review-id={review.id} data-source={example ? "example" : "member"} initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.25 }} className="min-w-0 overflow-hidden rounded-2xl border border-hairline bg-surface">
            <Link href={`/community?tab=public&review=${encodeURIComponent(review.id)}#review-${encodeURIComponent(review.id)}`} className="block h-full p-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-champagne">
              <div className="flex items-center gap-4"><div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-obsidian">{product && <ProductArt image={product.image} alt={itemName(product)} fallbackSize="sm" kind={product.kind} />}</div><div className="min-w-0"><h3 className="break-words text-sm font-medium text-white">{product ? itemName(product) : review.itemId}</h3><p className="mt-1 text-xs leading-5 text-muted">{box ? boxTitle(box) : review.boxSlug}</p>{product && <p className="mt-2 text-xs text-secondary">{copy.price} <span className="font-medium text-gold-champagne">{product.value.toLocaleString(locale)} USDT</span></p>}</div></div>
              {example && <p className="mt-4 rounded-lg border border-gold-champagne/30 px-3 py-2 text-xs leading-5 text-gold-champagne">{copy.exampleNote}</p>}
              <div className="mt-5 flex items-center justify-between gap-2"><span className="flex items-center gap-1 text-gold-champagne" aria-label={`${example ? copy.exampleRating : copy.rating} ${review.rating}/5`}>{[1, 2, 3, 4, 5].map(n => <Star key={n} className={`h-3.5 w-3.5 ${n <= review.rating ? "fill-current" : "text-muted"}`} aria-hidden="true" />)}<span className="ml-1 text-xs">{review.rating}/5</span></span><span className="text-xs text-muted">{example ? copy.example : now === null ? new Date(review.at).toLocaleDateString(locale) : relativeReviewTime(review.at, now, locale)}</span></div>
              <p className="mt-4 line-clamp-4 break-words text-sm leading-7 text-secondary">{review.text}</p>
              <p className="mt-5 truncate border-t border-hairline pt-4 text-xs text-muted">{example ? `${copy.exampleAuthor} · ` : ""}{review.authorName || copy.member}</p>
            </Link>
          </motion.article>;
        })}
    </div>
    {!reviews.length && <p className="rounded-xl border border-hairline p-8 text-center text-sm text-muted">{copy.empty}</p>}
    {reviews.length > 3 && <div className="mt-6 flex items-center justify-center gap-3"><button type="button" className="workspace-button" aria-label={copy.previous} onClick={() => move(-1)}><ArrowLeft className="h-4 w-4" /></button><button type="button" className="workspace-button" aria-label={paused ? copy.play : copy.pause} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}{paused ? copy.play : copy.pause}</button><button type="button" className="workspace-button" aria-label={copy.next} onClick={() => move(1)}><ArrowRight className="h-4 w-4" /></button><span className="min-w-12 text-right text-xs tabular-nums text-muted">{(index % reviews.length) + 1} / {reviews.length}</span></div>}
  </section>;
}
