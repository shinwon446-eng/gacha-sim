"use client";
import { useEffect, useMemo, useState } from "react";
import { browserAccountsEnabled } from "@/lib/account";
import { loadCommunityReviews } from "@/lib/communityReviewApi";
import { publicReviewFeed } from "@/lib/community";
import { PUBLISHED_REVIEW_EXAMPLES } from "@/lib/publishedReviewExamples";
import { useCommunityStore, type MyReview } from "@/stores/communityStore";

const UPDATE_EVENT = "gachaflix:community-reviews-updated";
export function announcePublishedReviews(reviews: MyReview[]) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: reviews }));
}

export function usePublishedReviews() {
  const mine = useCommunityStore(state => state.mine);
  const [remote, setRemote] = useState<MyReview[]>([]);
  useEffect(() => {
    if (browserAccountsEnabled()) return;
    let active = true;
    const refresh = () => { void loadCommunityReviews().then(records => { if (active) setRemote(records); }).catch(() => undefined); };
    const updated = (event: Event) => { const records = (event as CustomEvent<MyReview[]>).detail; if (Array.isArray(records)) setRemote(records); };
    refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    window.addEventListener(UPDATE_EVENT, updated);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener(UPDATE_EVENT, updated); };
  }, []);
  return useMemo(() => publicReviewFeed([...(browserAccountsEnabled() ? mine : [...remote, ...mine]), ...PUBLISHED_REVIEW_EXAMPLES]), [mine, remote]);
}
