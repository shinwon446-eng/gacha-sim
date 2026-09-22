"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/format";
import { useUiStore } from "@/stores/uiStore";

/** 홈 그리드의 카테고리 앵커 — 홈은 hashchange 로 탭을 전환한다 */
export const DOLLAR_HASH = "#category-dollar";
export const DEPOSIT_HASH = "#deposit";

/**
 * 모바일 엄지 존 하단 고정 내비 (md 미만). [🔥 홈] [👑 1달러 잭팟] [📦 내 보관함] [💳 충전 (+)]
 * 라벨은 messages/mobileNav.* — 세 언어 사전과 1:1 연동.
 * 충전은 호스트 페이지(홈)에서는 즉시 모달, 그 외 페이지에서는 홈 #deposit 으로 이동해 연다.
 */
export function MobileBottomNav() {
  const t = useTranslations("mobileNav");
  const pathname = usePathname();
  const router = useRouter();
  const depositHost = useUiStore((s) => s.depositHost);
  const openDeposit = useUiStore((s) => s.openDeposit);
  const [hash, setHash] = useState("");

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);

  const isHome = pathname === "/";
  const onDollar = isHome && hash === DOLLAR_HASH;
  const onVault = pathname.startsWith("/inventory");

  const item = "flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-bold leading-none transition-colors";
  const on = "text-gold-champagne";
  const off = "text-secondary active:text-white";

  // 홈 안에서의 해시 이동은 Next Link 가 hashchange 를 내지 않으므로 직접 해시를 바꿔 홈의 리스너를 깨운다
  const goDollar = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!isHome) return;
    e.preventDefault();
    if (window.location.hash === DOLLAR_HASH) window.dispatchEvent(new HashChangeEvent("hashchange"));
    else window.location.hash = DOLLAR_HASH;
  };
  const goHome = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!isHome) return;
    e.preventDefault();
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deposit = () => {
    if (depositHost) openDeposit();
    else router.push(`/${DEPOSIT_HASH}`);
  };

  return (
    <nav
      aria-label={t("aria")}
      className="fixed inset-x-0 bottom-0 z-50 flex h-14 items-stretch border-t border-hairline bg-obsidian/95 backdrop-blur-lg md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <Link href="/" onClick={goHome} className={cn(item, isHome && !onDollar ? on : off)} aria-current={isHome && !onDollar ? "page" : undefined}>
        <span aria-hidden className="text-lg leading-none">🔥</span>
        <span className="truncate">{t("home")}</span>
      </Link>
      <Link href={`/${DOLLAR_HASH}`} onClick={goDollar} className={cn(item, onDollar ? on : off)} aria-current={onDollar ? "page" : undefined}>
        <span aria-hidden className="text-lg leading-none">👑</span>
        <span className="truncate">{t("dollar")}</span>
      </Link>
      <Link href="/inventory" className={cn(item, onVault ? on : off)} aria-current={onVault ? "page" : undefined}>
        <span aria-hidden className="text-lg leading-none">📦</span>
        <span className="truncate">{t("vault")}</span>
      </Link>
      <button type="button" onClick={deposit} className={cn(item, "text-gold-champagne active:text-gold-metallic")}>
        <span aria-hidden className="text-lg leading-none">💳</span>
        <span className="truncate">{t("wallet")}</span>
      </button>
    </nav>
  );
}

export default MobileBottomNav;
