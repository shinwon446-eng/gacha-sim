/**
 * 당첨 상품 후기. 실제 보관함 기록과 100 USDT 기준으로 작성 자격을 검증한다.
 */
import type { Network } from "@/lib/depositAddress";
import type { CarrierKey } from "@/lib/carriers";
import type { MyReview } from "@/stores/communityStore";
import type { OwnedItem } from "@/stores/inventoryStore";
import { BOX_BY_SLUG } from "./products";

export const REVIEW_BONUS_USDT = 10;
export const MIN_REVIEW_ITEM_VALUE_USDT = 100;
export const REVIEW_MIN_CHARS = 5;
export const REVIEW_MAX_CHARS = 1200;
export const isExampleReview = (review: { id: string; source?: string }) => review.source === "example" || review.id.startsWith("review_example_v1_");

/** UI copy stays local to this feature so parallel locale-catalogue work is untouched. */
export function communityFeedCopy(locale: string) {
  const copy = {
    ko: { eyebrow: "회원 공개 후기", title: "\uB300\uCCB4 \uBB50\uAC00 \uB098\uC654\uAE38\uB798, \uD6C4\uAE30\uAE4C\uC9C0 \uB0A8\uACBC\uC744\uAE4C\uC694?", all: "\uBAA8\uB4E0 \uD6C4\uAE30 \uBCF4\uAE30", member: "\uD68C\uC6D0", rating: "\uBCC4\uC810", price: "\uCE74\uD0C8\uB85C\uADF8 \uAE30\uC900\uAC00", pause: "\uC790\uB3D9 \uB118\uAE40 \uC77C\uC2DC\uC815\uC9C0", play: "\uC790\uB3D9 \uB118\uAE40 \uC7AC\uC0DD", previous: "\uC774\uC804 \uD6C4\uAE30", next: "\uB2E4\uC74C \uD6C4\uAE30", auto: "\uC0C1\uD488 \uD6C4\uAE30 \uBAA8\uC544\uBCF4\uAE30", paused: "\uC77C\uC2DC\uC815\uC9C0", description: "\uD68C\uC6D0\uB4E4\uC774 \uC9C1\uC811 \uACF5\uAC1C\uD55C \uC0C1\uD488 \uD6C4\uAE30. \uAC00\uBCD1\uAC8C \uAD6C\uACBD\uD558\uB7EC \uC654\uB2E4\uAC00, \uAC16\uACE0 \uC2F6\uC740 \uAC8C \uB298\uC5B4\uB0A0\uC9C0\uB3C4 \uBAA8\uB985\uB2C8\uB2E4.", example: "\uC608\uC2DC", exampleNote: "\uC6B4\uC601\uD300 \uC548\uB0B4", hideExamples: "\uC608\uC2DC \uC228\uAE30\uAE30", showExamples: "\uC608\uC2DC \uBCF4\uAE30", now: "\uBC29\uAE08 \uC804", unknownTime: "\uC791\uC131 \uC2DC\uAC01 \uBBF8\uC0C1", product: "\uC0C1\uD488", empty: "\uC544\uC9C1 \uACF5\uAC1C\uB41C \uD6C4\uAE30\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." },
    en: { eyebrow: "MEMBER REVIEWS", title: "What could they have unboxed to leave a review?", all: "View all reviews", member: "Member", rating: "Rating", price: "Catalogue value", pause: "Pause rotation", play: "Resume rotation", previous: "Previous review", next: "Next review", auto: "Browse product reviews", paused: "Paused", description: "Member-shared product reviews. Come for a quick look; you may leave with a longer wishlist.", example: "Example", exampleNote: "Editorial notice", hideExamples: "Hide examples", showExamples: "Show examples", now: "Just now", unknownTime: "Time unavailable", product: "Product", empty: "No published reviews yet." },
    zh: { eyebrow: "会员公开评价", title: "???????????????", all: "??????", member: "??", rating: "??", price: "????", pause: "????", play: "????", previous: "?????", next: "?????", auto: "??????", paused: "???", description: "???????????????????????????", example: "Example", exampleNote: "Editorial notice", hideExamples: "Hide examples", showExamples: "Show examples", now: "Just now", unknownTime: "Time unavailable", product: "Product", empty: "No published reviews yet." },
  };
  return copy[locale === "en" || locale === "zh" ? locale : "ko"];
}

export function publicReviewFeed(reviews: MyReview[]): MyReview[] {
  const seen = new Set<string>();
  const members = reviews.filter(review => {
    if (isExampleReview(review) || !review.publishedAt || !Number.isFinite(Date.parse(review.at)) || seen.has(review.id)) return false;
    seen.add(review.id); return true;
  }).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return members;
}

export function relativeReviewTime(at: string, now: number, locale: string): string {
  const copy = communityFeedCopy(locale);
  const value = Date.parse(at);
  if (!Number.isFinite(value) || !Number.isFinite(now) || value > now + 60000) return copy.unknownTime;
  const seconds = Math.max(0, Math.floor((now - value) / 1000));
  if (seconds < 60) return copy.now;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]];
  const [unit, size] = units.find(([, size]) => seconds >= size)!;
  return new Intl.RelativeTimeFormat(locale, { numeric: "always" }).format(-Math.floor(seconds / size), unit);
}

export function reviewWindow<T>(records: T[], start: number, size = 3): T[] {
  if (!records.length || !Number.isFinite(start) || !Number.isFinite(size)) return [];
  const offset = ((Math.trunc(start) % records.length) + records.length) % records.length;
  return Array.from({ length: Math.min(records.length, Math.max(0, Math.trunc(size))) }, (_, n) => records[(offset + n) % records.length]);
}

export function meetsReviewValue(item: Pick<OwnedItem, "valueUsdt">): boolean {
  return Number.isFinite(item.valueUsdt) && item.valueUsdt >= MIN_REVIEW_ITEM_VALUE_USDT;
}

/** Reviews describe a won item; delivery is not a prerequisite. One review per win. */
export function canReview(item: OwnedItem, reviews: Pick<MyReview, "ownedId">[]): boolean {
  return meetsReviewValue(item) && ["IN_STORAGE", "SHIPPING_REQUESTED", "SHIPPING", "DELIVERED", "SOLD"].includes(item.status) && !reviews.some(r => r.ownedId === item.id);
}

export interface Review {
  id: string;
  /** 마스킹 핸들 */
  user: string;
  boxSlug: string;
  itemId: string;
  text: string;
  /** 별점 1~5 */
  rating: number;
  likes: number;
  at: string;
  /** 업로드 사진(URL 또는 data URL). 없으면 카탈로그 이미지 */
  photo?: string;
  proof: {
    carrier?: CarrierKey;
    trackingNumber?: string;
    network?: Network;
    txHash?: string;
  };
  mine?: boolean;
}

/** 내 후기 + 해당 보관함 레코드 → 게시용 Review (운송장 인증은 실제 발급된 것만) */
export function toReview(m: MyReview, owned: OwnedItem | undefined, user: string): Review {
  return {
    id: m.id,
    user,
    boxSlug: m.boxSlug,
    itemId: m.itemId,
    text: m.text,
    rating: m.rating,
    likes: 0,
    at: m.at,
    photo: m.photo,
    proof: { carrier: owned?.shipping?.carrier, trackingNumber: owned?.shipping?.trackingNumber },
    mine: true,
  };
}
