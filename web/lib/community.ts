/**
 * 실물 언박싱 포토 후기 (CLAUDE.md §7-B 계승).
 * 후기는 실제 수령 유저가 올린 것만 게시한다 — 예시 후기를 지어내지 않는다.
 * live 모드는 API 가 전체 후기를 주고, preview 모드는 이 기기에서 작성한 후기만 보인다.
 */
import type { Network } from "@/lib/depositAddress";
import type { CarrierKey } from "@/lib/carriers";
import type { MyReview } from "@/stores/communityStore";
import type { OwnedItem } from "@/stores/inventoryStore";

export const REVIEW_BONUS_USDT = 10;
export const REVIEW_MIN_CHARS = 5;
export const REVIEW_MAX_CHARS = 160;

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
