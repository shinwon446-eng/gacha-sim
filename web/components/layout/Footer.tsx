"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck, Lock, CreditCard, Coins } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SUPPORT } from "@/lib/runtime";

const BADGES = [
  { key: "trc20", Icon: Coins, label: "USDT TRC-20" },
  { key: "bep20", Icon: Coins, label: "USDT BEP-20" },
  { key: "card", Icon: CreditCard, label: "Visa / Mastercard" },
  { key: "fair", Icon: ShieldCheck, label: "Provably Fair SHA-256" },
  { key: "ssl", Icon: Lock, label: "256-Bit SSL" },
] as const;

/**
 * 넷플릭스 럭셔리 푸터 (CLAUDE.md §5).
 *   1열 브랜드 + 슬로건 + 지원/보안 뱃지 · 2열 3단 링크(서비스 / 이용 안내 / 고객지원) · 3열 면책 + 카피라이트.
 */
export function Footer() {
  const t = useTranslations("footer");
  const year = 2026;
  return (
    <footer className="border-metallic-subtle mt-10 border-x-0 border-b-0 bg-obsidian px-[4%] pb-8 pt-8 text-xs text-muted md:mt-16 md:pt-10">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.3fr_2fr]">
        <div>
          <div className="font-display text-xl font-black uppercase leading-none tracking-wider text-white">Voila.gg</div>
          {/* 2대 공식 슬로건 — 메인(영문) + 액션. 브랜드 슬로건이라 세 로케일 모두 원문 그대로다 */}
          <div className="mt-1 text-xs font-semibold text-secondary">{t("tagline")}</div>
          <div className="mt-0.5 text-[11px] font-bold tracking-widest text-gold-champagne">{t("actionSlogan")}</div>
          <p className="mt-2.5 max-w-sm leading-relaxed text-secondary">{t("slogan")}</p>
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {BADGES.map(({ key, Icon, label }) => (
              <li key={key} className="border-metallic-subtle flex h-7 items-center gap-1.5 rounded-sm bg-canvas px-2 text-[10px] font-semibold text-secondary">
                <Icon className="h-3 w-3 text-gold-champagne" strokeWidth={2.2} />
                {label}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          <div>
            <div className="caption-luxury !text-gold-champagne">{t("service")}</div>
            <ul className="mt-2.5 space-y-1.5">
              <li><Link href="/#category-dollar" className="hover:text-white">{t("links.dollar")}</Link></li>
              <li><Link href="/#category-luxury" className="hover:text-white">{t("links.vault")}</Link></li>
              <li><Link href="/fairness" className="hover:text-white">{t("links.feed")}</Link></li>
              <li><Link href="/fairness" className="hover:text-white">{t("links.verifier")}</Link></li>
            </ul>
          </div>
          <div>
            <div className="caption-luxury !text-gold-champagne">{t("guide")}</div>
            <ul className="mt-2.5 space-y-1.5">
              <li><Link href="/legal/terms" className="hover:text-white">{t("links.terms")}</Link></li>
              <li><Link href="/legal/privacy" className="hover:text-white">{t("links.privacy")}</Link></li>
              <li><Link href="/legal/policy" className="hover:text-white">{t("links.policy")}</Link></li>
              <li><Link href="/legal/faq" className="hover:text-white">{t("links.faq")}</Link></li>
            </ul>
          </div>
          <div>
            <div className="caption-luxury !text-gold-champagne">{t("support")}</div>
            <ul className="mt-2.5 space-y-1.5">
              <li><a href={SUPPORT.telegram} target="_blank" rel="noopener noreferrer" className="hover:text-white">{t("links.telegram")}</a></li>
              <li><a href={SUPPORT.discord} target="_blank" rel="noopener noreferrer" className="hover:text-white">{t("links.discord")}</a></li>
              <li><a href={SUPPORT.notice} target="_blank" rel="noopener noreferrer" className="hover:text-white">{t("links.notice")}</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-7xl border-t border-hairline pt-5">
        <p className="max-w-4xl break-keep text-[11px] leading-relaxed text-faint">{t("disclaimer")}</p>
        <div className="mt-3 text-[11px] text-faint">© {year} VOILA (voila.gg). All rights reserved.</div>
      </div>
    </footer>
  );
}

export default Footer;
