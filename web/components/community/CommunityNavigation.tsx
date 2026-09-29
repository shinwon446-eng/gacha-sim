"use client";
import { Link } from "@/i18n/navigation";
export function CommunityNavigation({ active }: { active: "reviews" | "board" | "notice" }) {
  return <nav className="workspace-tabs mb-7" aria-label="커뮤니티 게시판">
    {([["reviews", "/community", "상품 후기"], ["board", "/community/board", "자유게시판"], ["notice", "/community/board?category=notice", "공지사항"]] as const).map(([key, href, label]) => <Link key={key} href={href} aria-current={active === key ? "page" : undefined} className={`px-4 py-4 text-sm ${active === key ? "border-b-2 border-gold-champagne text-gold-champagne" : "text-secondary"}`}>{label}</Link>)}
  </nav>;
}
