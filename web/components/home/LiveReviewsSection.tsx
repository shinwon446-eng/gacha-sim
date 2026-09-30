"use client";

import { ArrowUpRight, Star } from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ProductArt } from "@/components/box/ProductArt";
import { BOX_BY_SLUG } from "@/lib/products";
import { communityFeedCopy } from "@/lib/community";
import { useProductText } from "@/lib/useProductText";
import { usePublishedReviews } from "@/stores/usePublishedReviews";
import { ProfileAvatar } from "@/components/auth/ProfileAvatar";
import { reviewAvatar } from "@/lib/publishedReviewExamples";

const HOME_REVIEW_COUNT = 20;

function reviewAuthor(review: MyReview, fallback: string) {
  if (review.authorName?.trim()) return review.authorName.trim();
  const suffix = review.id.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase() || "VOILA";
  return fallback + " #" + suffix;
}

export function LiveReviewsSection() {
  const locale = useLocale();
  const copy = communityFeedCopy(locale);
  const { itemName, boxTitle } = useProductText();
  const reviews = usePublishedReviews();
  const reviewFeed = reviews.slice(0, HOME_REVIEW_COUNT);

  return <section className="home-reviews page-shell" aria-labelledby="live-reviews-heading">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
      <div><p className="eyebrow">PRODUCT REVIEWS</p><h2 id="live-reviews-heading" className="mt-3 text-2xl font-medium tracking-tight text-white md:text-3xl">{copy.title}</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-muted">{copy.description}</p></div>
      <Link href="/community?tab=public" className="workspace-text-link">{copy.all}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
    </div>
    <div className="mb-5 flex items-center gap-2 text-xs text-secondary"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-gold-champagne motion-safe:animate-pulse" />{copy.auto}</div>
    <div className="home-review-viewport" data-testid="live-review-cards">
      <div className="home-review-track">
        {[0, 1].map(loop => <div key={loop} className="home-review-loop" aria-hidden={loop === 1}>
          {reviewFeed.map((review, index) => {
            const box = BOX_BY_SLUG[review.boxSlug];
            const product = box?.items.find(item => item.id === review.itemId);
            const author = reviewAuthor(review, copy.member);
            const isDemo = review.source === "example";
            const href = "/community?tab=public&review=" + encodeURIComponent(review.id) + "#review-" + encodeURIComponent(review.id);
            return <article key={loop + "-" + review.id} data-review-id={review.id} data-source={isDemo ? "demo" : "member"} className="home-review-card rounded-2xl border border-hairline bg-surface">
              <Link href={href} tabIndex={loop === 1 ? -1 : undefined} className="block h-full p-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-champagne">
                <div className="flex items-center gap-4"><div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-obsidian">{product && <ProductArt image={product.image} alt={itemName(product)} fallbackSize="sm" kind={product.kind} />}</div><div className="min-w-0"><h3 className="break-words text-sm font-medium text-white">{product ? itemName(product) : review.itemId}</h3><p className="mt-1 text-xs leading-5 text-muted">{box ? boxTitle(box) : review.boxSlug}</p>{product && <p className="mt-2 text-xs text-secondary">{copy.price} <span className="font-medium text-gold-champagne">{product.value.toLocaleString(locale)} USDT</span></p>}</div></div>
                <div className="mt-5 flex items-center justify-between gap-2"><span className="flex items-center gap-1 text-gold-champagne" aria-label={copy.rating + " " + review.rating + "/5"}>{[1, 2, 3, 4, 5].map(n => <Star key={n} className={"h-3.5 w-3.5 " + (n <= review.rating ? "fill-current" : "text-muted")} aria-hidden="true" />)}<span className="ml-1 text-xs">{review.rating}/5</span></span><time dateTime={review.at} className="text-xs text-muted">{new Date(review.at).toLocaleDateString(locale)}</time></div>
                <p className="mt-4 line-clamp-4 break-words text-sm leading-7 text-secondary">{review.text}</p>
                <div className="mt-5 flex items-center gap-3 border-t border-hairline pt-4"><ProfileAvatar src={review.authorAvatarUrl || reviewAvatar(review.id, index)} name={author} className="h-10 w-10" /><p className="min-w-0 truncate text-xs font-medium text-white">{author}</p></div>
              </Link>
            </article>;
          })}
        </div>)}
      </div>
    </div>
  </section>;
}
