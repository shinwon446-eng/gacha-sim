"use client";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play, Star } from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ProductArt } from "@/components/box/ProductArt";
import { BOXES, BOX_BY_SLUG } from "@/lib/products";
import { communityFeedCopy, relativeReviewTime, reviewWindow } from "@/lib/community";
import { useProductText } from "@/lib/useProductText";
import { usePublishedReviews } from "@/stores/usePublishedReviews";
import { ProfileAvatar } from "@/components/auth/ProfileAvatar";
import type { MyReview } from "@/stores/communityStore";

const REVIEW_ROTATION_INTERVAL_MS = 7_500;
const demoAuthors = ["시계수집가", "민트초코", "픽셀러", "블루문", "도시여우", "오후다섯", "노을빛", "은하수"];
const demoTexts = [
  "사진으로 보던 것보다 실물이 더 만족스러웠어요. 구성과 안내가 깔끔해서 확인하기 편했습니다.",
  "원하던 제품이 나와서 바로 후기 남겨요. 상품 상태와 패키지 모두 좋았습니다.",
  "개봉 과정도 확인했고, 제품 정보가 카드에 잘 정리되어 있어 좋았어요.",
  "선물용으로 골랐는데 반응이 좋았습니다. 다음 컬렉션도 기대하고 있어요.",
  "가격대가 있는 상품이라 망설였는데 상품 안내가 자세해서 선택하는 데 도움이 됐습니다.",
  "배송을 선택하기 전 보관함에서 상품 정보를 다시 볼 수 있어 편했습니다.",
  "디테일한 사진과 상품 설명이 일치해서 신뢰가 갔어요. 만족합니다.",
  "후기를 보고 골랐는데 기대 이상이었어요. 다른 박스도 천천히 둘러보려 합니다.",
];
const demoProducts = BOXES.flatMap(box => box.items
  .filter(item => item.kind !== "cash" && item.value >= 100)
  .map(item => ({ boxSlug: box.slug, itemId: item.id })))
  .slice(0, demoAuthors.length);
const demoAvatar = (seed: string) => "https://api.dicebear.com/9.x/notionists-neutral/svg?seed=" + encodeURIComponent(seed) + "&backgroundColor=1b1d20";
const HOME_DEMO_REVIEWS: MyReview[] = demoProducts.map((product, index) => {
  const at = new Date(Date.UTC(2026, 8, 22 - index, 10, index * 7)).toISOString();
  return {
    id: "home-demo-review-" + (index + 1), ownedId: "home-demo-owned-" + (index + 1), ...product,
    text: demoTexts[index], rating: index === 2 || index === 5 ? 4 : 5, bonusUsdt: 0, at, publishedAt: at,
    source: "example", authorName: demoAuthors[index], authorAvatarUrl: demoAvatar(demoAuthors[index]),
  };
});
function reviewAuthor(review: MyReview, fallback: string) {
  if (review.authorName?.trim()) return review.authorName.trim();
  const suffix = review.id.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase() || "VOILA";
  return fallback + " #" + suffix;
}

export function LiveReviewsSection() {
  const locale = useLocale(); const copy = communityFeedCopy(locale);
  const { itemName, boxTitle } = useProductText();
  const reviews = usePublishedReviews();
  const reviewFeed = reviews.length >= 8 ? reviews : [...reviews, ...HOME_DEMO_REVIEWS.slice(0, 8 - reviews.length)];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const motionPreference = useReducedMotion();
  const [motionReady, setMotionReady] = useState(false);
  const reducedMotion = motionReady && motionPreference === true;
  const stopped = paused || hovered || focused || hidden || reducedMotion === true;
  const firstId = reviewFeed[0]?.id;
  useEffect(() => { setMotionReady(true); }, []);
  useEffect(() => { setIndex(0); }, [firstId]);
  useEffect(() => {
    const visibility = () => { setHidden(document.hidden); setNow(Date.now()); };
    visibility(); document.addEventListener("visibilitychange", visibility);
    const timer = window.setInterval(() => { if (!document.hidden) setNow(Date.now()); }, 60000);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  useEffect(() => {
    if (stopped || reviewFeed.length <= 3) return;
    const timer = window.setInterval(() => setIndex(value => (value + 1) % reviewFeed.length), REVIEW_ROTATION_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [stopped, reviewFeed.length]);
  const cards = reviewWindow(reviewFeed, index);
  const move = (delta: number) => { setPaused(true); setIndex(value => (value + delta + reviewFeed.length) % reviewFeed.length); };
  return <section className="home-reviews page-shell" aria-labelledby="live-reviews-heading" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">PRODUCT REVIEWS</p><h2 id="live-reviews-heading" className="mt-3 text-2xl font-medium tracking-tight text-white md:text-3xl">{copy.title}</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-muted">{copy.description}</p></div><Link href="/community?tab=public" className="workspace-text-link">{copy.all}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link></div>
    {reviewFeed.length > 0 && <div className="mb-5 flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-xs text-secondary"><span aria-hidden="true" className={`h-2 w-2 rounded-full ${stopped ? "bg-muted" : "bg-gold-champagne motion-safe:animate-pulse"}`} />{stopped ? copy.paused : copy.auto}</p></div>}
    <div aria-live="off" className="grid gap-4 md:grid-cols-3" data-testid="live-review-cards">
      {cards.map(review => {
        const box = BOX_BY_SLUG[review.boxSlug]; const product = box?.items.find(item => item.id === review.itemId);
        const author = reviewAuthor(review, copy.member); const isDemo = review.source === "example";
        return <motion.article layout={!reducedMotion && !focused} key={review.id} data-review-id={review.id} data-source={isDemo ? "demo" : "member"} initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.25 }} className="min-w-0 overflow-hidden rounded-2xl border border-hairline bg-surface">
          <Link href={`/community?tab=public&review=${encodeURIComponent(review.id)}#review-${encodeURIComponent(review.id)}`} className="block h-full p-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-champagne">
            <div className="flex items-center gap-4"><div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-obsidian">{product && <ProductArt image={product.image} alt={itemName(product)} fallbackSize="sm" kind={product.kind} />}</div><div className="min-w-0"><h3 className="break-words text-sm font-medium text-white">{product ? itemName(product) : review.itemId}</h3><p className="mt-1 text-xs leading-5 text-muted">{box ? boxTitle(box) : review.boxSlug}</p>{product && <p className="mt-2 text-xs text-secondary">{copy.price} <span className="font-medium text-gold-champagne">{product.value.toLocaleString(locale)} USDT</span></p>}</div></div>
            <div className="mt-5 flex items-center justify-between gap-2"><span className="flex items-center gap-1 text-gold-champagne" aria-label={`${copy.rating} ${review.rating}/5`}>{[1, 2, 3, 4, 5].map(n => <Star key={n} className={`h-3.5 w-3.5 ${n <= review.rating ? "fill-current" : "text-muted"}`} aria-hidden="true" />)}<span className="ml-1 text-xs">{review.rating}/5</span></span><span className="text-xs text-muted">{now === null ? new Date(review.at).toLocaleDateString(locale) : relativeReviewTime(review.at, now, locale)}</span></div>
            <p className="mt-4 line-clamp-4 break-words text-sm leading-7 text-secondary">{review.text}</p>
            <div className="mt-5 flex items-center gap-3 border-t border-hairline pt-4"><ProfileAvatar src={review.authorAvatarUrl || demoAvatar(review.id)} name={author} className="h-9 w-9" /><div className="min-w-0"><p className="truncate text-xs font-medium text-white">{author}</p>{isDemo && <span className="mt-1 inline-flex rounded border border-gold-champagne/35 px-1.5 py-0.5 text-[10px] font-medium text-gold-champagne">{copy.example}</span>}</div></div>
          </Link>
        </motion.article>;
      })}
    </div>
    {reviewFeed.length > 3 && <div className="mt-6 flex items-center justify-center gap-3"><button type="button" className="workspace-button" aria-label={copy.previous} onClick={() => move(-1)}><ArrowLeft className="h-4 w-4" /></button><button type="button" className="workspace-button" aria-label={paused ? copy.play : copy.pause} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}{paused ? copy.play : copy.pause}</button><button type="button" className="workspace-button" aria-label={copy.next} onClick={() => move(1)}><ArrowRight className="h-4 w-4" /></button><span className="min-w-12 text-right text-xs tabular-nums text-muted">{(index % reviewFeed.length) + 1} / {reviewFeed.length}</span></div>}
  </section>;
}
