"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, Gift, Menu, Music, Wallet, X } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { BrandLogo } from "./BrandLogo";
import { CurrencySelector } from "./CurrencySelector";
import { LanguageSelector } from "./LanguageSelector";
import { HeaderAuthControl } from "@/components/auth/HeaderAuthControl";
import { useAuthStore } from "@/stores/authStore";
import { useWalletStore } from "@/stores/walletStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { setBgmVolume, startBgm, stopBgm } from "@/lib/audio";
import { useCurrency } from "@/lib/useCurrency";
import { useModal } from "@/lib/useModal";
import { cn } from "@/lib/format";

type WalletTab = "usdt" | "withdraw";
const links = [{ href: "/", key: "boxes" }, { href: "/inventory", key: "inventory" }, { href: "/community", key: "community" }, { href: "/fairness", key: "fairness" }, { href: "/about", key: "about" }] as const;
const bgmLabels = {
  ko: { name: "음악", on: "배경 음악 켜기", off: "배경 음악 끄기" },
  en: { name: "Music", on: "Turn background music on", off: "Turn background music off" },
  zh: { name: "音乐", on: "开启背景音乐", off: "关闭背景音乐" },
} as const;

// 헤더가 라우트마다 다시 마운트돼도 재생 중인 싱글턴은 그대로 둔다(언마운트에서 stopBgm 을 부르지 않는다).
// 마지막 요청만 결과를 반영한다 — 켜는 중에 끄면 늦게 도착한 성공이 상태를 되돌리지 않는다.
let bgmRequest = 0;
function requestBgm() {
  const id = ++bgmRequest;
  const s = useSettingsStore.getState();
  setBgmVolume(s.bgmVolume);
  return startBgm().then((ok) => {
    if (id !== bgmRequest) return;
    const now = useSettingsStore.getState();
    now.setBgmPlaying(ok);
    if (ok) now.setBgmEnabled(true);
  });
}
function haltBgm() {
  bgmRequest++;
  stopBgm();
  const s = useSettingsStore.getState();
  s.setBgmPlaying(false);
  s.setBgmEnabled(false);
}

export function SiteHeader({ onWallet, onDaily }: { onWallet?: (tab: WalletTab) => void; onDaily?: () => void }) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const authOpen = useAuthStore((s) => s.isModalOpen);
  const balance = useWalletStore((s) => s.balance);
  const { fmt } = useCurrency();
  const locale = useLocale();
  const bgmText = bgmLabels[locale as keyof typeof bgmLabels] ?? bgmLabels.en;
  const bgmPlaying = useSettingsStore((s) => s.bgmPlaying);
  const [open, setOpen] = useState(false);
  // 저장된 선택이 켜짐이면 자동 재생하지 않고, 다음 사용자 제스처(클릭·키 입력)에서 이어 튼다
  useEffect(() => {
    let armed = false;
    const events = ["click", "keydown"] as const;
    const resume = () => { disarm(); const s = useSettingsStore.getState(); if (s.bgmEnabled && !s.bgmPlaying) void requestBgm(); };
    const disarm = () => { if (!armed) return; armed = false; events.forEach((e) => window.removeEventListener(e, resume, true)); };
    const arm = () => { const s = useSettingsStore.getState(); if (armed || !s.bgmEnabled || s.bgmPlaying) return; armed = true; events.forEach((e) => window.addEventListener(e, resume, true)); };
    if (useSettingsStore.persist.hasHydrated()) arm();
    const unsub = useSettingsStore.persist.onFinishHydration(arm);
    return () => { unsub(); disarm(); };
  }, []);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const authFromMenu = useRef(false);
  const headerRef = useRef<HTMLElement>(null);
  useModal(open, () => setOpen(false), headerRef);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (authOpen && open) { authFromMenu.current = true; setOpen(false); }
    if (!authOpen && authFromMenu.current) {
      authFromMenu.current = false;
      const frame = requestAnimationFrame(() => toggleRef.current?.focus({ preventScroll: true }));
      return () => cancelAnimationFrame(frame);
    }
  }, [authOpen, open]);
  useEffect(() => {
    if (!open) return;
    const handleResize = () => { if (window.innerWidth >= 1280) setOpen(false); };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [open]);
  const wallet = (tab: WalletTab) => { setOpen(false); if (onWallet) onWallet(tab); else router.push(tab === "withdraw" ? "/#withdraw" : "/#deposit"); };
  const navigation = (mobile = false) => links.map(({ href, key }) => <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={pathname === href ? "page" : undefined} className={cn("flex min-h-11 items-center whitespace-nowrap transition-colors hover:text-white", mobile ? "justify-between border-b border-hairline py-3 text-lg" : "text-[13px]", pathname === href ? "font-semibold text-white" : "text-secondary")}>{t(`nav.${key}`)}{mobile && <ArrowUpRight className="h-4 w-4 text-muted" aria-hidden="true" />}</Link>);
  return <header ref={headerRef} tabIndex={-1} role={open ? "dialog" : undefined} aria-modal={open ? true : undefined} aria-label={open ? t("mobileNav.aria") : undefined} className="outline-none sticky top-0 z-[70] border-b border-hairline bg-obsidian/95 backdrop-blur-xl">
    <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-2 px-3 min-[400px]:px-4 sm:px-8 md:h-[72px] xl:gap-8 xl:px-12">
      <BrandLogo className="site-header-logo" /><nav aria-label={t("mobileNav.aria")} className="hidden items-center gap-5 xl:flex">{navigation()}</nav>
      <div className="ml-auto flex min-w-0 items-center gap-2">
        <button type="button" onClick={() => wallet("usdt")} aria-label={`${t("header.balance")}: ${fmt(balance)}. ${t("mobileNav.wallet")}`} className="flex h-11 min-w-0 max-w-[132px] items-center justify-center gap-1.5 rounded-lg border border-hairline bg-surface px-2 text-xs font-semibold tabular-nums text-white hover:border-gold-champagne/50 min-[400px]:max-w-[160px] sm:gap-2 sm:px-3"><Wallet className="h-4 w-4 shrink-0 text-gold-champagne" aria-hidden="true" /><span className="min-w-0 truncate">{fmt(balance)}</span></button>
        <button type="button" onClick={() => { if (bgmPlaying) haltBgm(); else void requestBgm(); }} aria-pressed={bgmPlaying} aria-label={bgmPlaying ? bgmText.off : bgmText.on} title={bgmPlaying ? bgmText.off : bgmText.on} className={cn("flex h-11 min-w-[44px] shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold hover:bg-surface", bgmPlaying ? "border-gold-champagne/60 text-gold-champagne" : "border-hairline text-secondary")}><Music className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="hidden 2xl:inline" aria-hidden="true">{bgmText.name}</span></button>
        <div className="hidden items-center gap-1.5 xl:flex">{onDaily && <button type="button" onClick={onDaily} aria-label={t("daily.title")} title={t("daily.title")} className="flex h-11 w-11 items-center justify-center rounded-lg text-gold-champagne hover:bg-surface"><Gift className="h-4 w-4" aria-hidden="true" /></button>}<LanguageSelector /><CurrencySelector /><HeaderAuthControl /></div>
        <button ref={toggleRef} type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="site-menu" aria-label={open ? t("auth.close") : t("mobileNav.aria")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-hairline text-white hover:bg-surface xl:hidden">{open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}</button>
      </div>
    </div>
    {open && <div id="site-menu" className="absolute inset-x-0 top-full max-h-[calc(100dvh-64px)] overflow-y-auto border-b border-hairline bg-obsidian px-4 pb-8 pt-3 sm:px-8 md:max-h-[calc(100dvh-72px)] xl:hidden">
      <nav aria-label={t("mobileNav.aria")}>{navigation(true)}<Link href="/profile" onClick={() => setOpen(false)} aria-current={pathname.startsWith("/profile") ? "page" : undefined} className="flex min-h-11 items-center justify-between border-b border-hairline py-3 text-lg text-secondary">{t("nav.profile")}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link></nav>
      <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => wallet("usdt")} className="flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-lg bg-gold-champagne px-2 text-sm font-semibold text-obsidian"><Wallet className="h-4 w-4 shrink-0" aria-hidden="true" />{t("header.deposit")}</button><button type="button" onClick={() => wallet("withdraw")} className="flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-hairline px-2 text-sm font-semibold text-white"><ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />{t("header.withdraw")}</button></div>
      {onDaily && <button type="button" onClick={() => { setOpen(false); onDaily(); }} className="mt-3 flex min-h-11 items-center gap-2 text-sm text-gold-champagne"><Gift className="h-4 w-4" aria-hidden="true" />{t("daily.title")}</button>}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-5"><div className="flex gap-2"><LanguageSelector /><CurrencySelector /></div><HeaderAuthControl /></div>
    </div>}
  </header>;
}
