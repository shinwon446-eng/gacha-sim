"use client";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

const LABELS = {
  ko: { nav: "커뮤니티 게시판", reviews: "상품 후기", board: "자유게시판", notice: "공지사항" },
  en: { nav: "Community boards", reviews: "Reviews", board: "Board", notice: "Notices" },
  zh: { nav: "社区版块", reviews: "商品评价", board: "自由讨论", notice: "公告" },
} as const;

export function CommunityNavigation({ active }: { active: "reviews" | "board" | "notice" }) {
  const locale = useLocale();
  const l = LABELS[(locale.startsWith("zh") ? "zh" : locale.startsWith("en") ? "en" : "ko") as keyof typeof LABELS];
  return <nav className="workspace-tabs mb-7" aria-label={l.nav}>
    {([["reviews", "/community", l.reviews], ["board", "/community/board", l.board], ["notice", "/community/board?category=notice", l.notice]] as const).map(([key, href, label]) => <Link key={key} href={href} aria-current={active === key ? "page" : undefined} className={`px-4 py-4 text-sm ${active === key ? "border-b-2 border-gold-champagne text-gold-champagne" : "text-secondary"}`}>{label}</Link>)}
  </nav>;
}
