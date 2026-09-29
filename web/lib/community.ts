/**
 * 당첨 상품 후기. 실제 보관함 기록과 100 USDT 기준으로 작성 자격을 검증한다.
 */
import type { Network } from "@/lib/depositAddress";
import type { CarrierKey } from "@/lib/carriers";
import type { MyReview } from "@/stores/communityStore";
import type { OwnedItem } from "@/stores/inventoryStore";

export const REVIEW_BONUS_USDT = 10;
export const MIN_REVIEW_ITEM_VALUE_USDT = 100;
export const REVIEW_MIN_CHARS = 5;
export const REVIEW_MAX_CHARS = 1200;

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
