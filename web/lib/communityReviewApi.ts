import { accountRequest, browserAccountsEnabled, AccountError } from "./account";
import type { MyReview } from "@/stores/communityStore";
import { validAvatarUrl } from "./profilePolicy";

export type CommunityReviewCommand =
  | { type: "create"; clientReviewId: string; ownedId: string; text: string; rating: number; photo?: string; }
  | { type: "update"; id: string; text: string; rating: number; photo?: string; }
  | { type: "delete"; id: string };

function parseReviews(value: unknown): MyReview[] {
  if (!Array.isArray(value)) throw new AccountError("invalid");
  const reviews = value.filter((review): review is MyReview => {
    if (!review || typeof review !== "object") return false;
    const item = review as Record<string, unknown>;
    return typeof item.id === "string" && typeof item.ownedId === "string" && typeof item.boxSlug === "string"
      && typeof item.itemId === "string" && typeof item.text === "string" && Number.isInteger(item.rating)
      && typeof item.at === "string" && Number.isFinite(Date.parse(item.at))
      && typeof item.publishedAt === "string" && Number.isFinite(Date.parse(item.publishedAt))
      && typeof item.bonusUsdt === "number" && Number.isFinite(item.bonusUsdt)
      && (item.authorName === undefined || typeof item.authorName === "string")
      && (item.authorAvatarUrl == null || validAvatarUrl(item.authorAvatarUrl))
      && (item.photo === undefined || typeof item.photo === "string");
  });
  if (reviews.length !== value.length) throw new AccountError("invalid");
  return reviews;
}

/** Public reviews are fetched from the account API so every visitor sees the same published feed. */
export async function loadCommunityReviews(): Promise<MyReview[]> {
  if (browserAccountsEnabled()) return [];
  const response = await accountRequest("/community/reviews");
  return parseReviews(response.reviews);
}

/** The server derives author identity/avatar from the session and verifies ownership/value of the won item. */
export async function submitCommunityReview(command: CommunityReviewCommand): Promise<MyReview[]> {
  if (browserAccountsEnabled()) throw new AccountError("unavailable");
  const response = await accountRequest("/community/reviews/commands", command);
  return parseReviews(response.reviews);
}
