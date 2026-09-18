"use client";

import { useEffect, useState } from "react";
import { Bell, Search, Wallet, Package } from "lucide-react";
import { useGachaStore } from "@/store/useGachaStore";
import { tierFor } from "@/lib/engine";
import { usdt, cn } from "@/lib/format";
import { CATEGORY_META } from "@/lib/types";
import { LOCALES, LOCALE_LABEL, useLocale } from "@/lib/i18n";

const MENU: { label: string; anchor: string }[] = [
  { label: "홈", anchor: "top" },
  { label: CATEGORY_META.apex.label, anchor: CATEGORY_META.apex.anchor },
  { label: CATEGORY_META.battle.label, anchor: CATEGORY_META.battle.anchor },
  { label: CATEGORY_META.sound.label, anchor: CATEGORY_META.sound.anchor },
  { label: "실시간 획득 랭킹", anchor: "ranking" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);
  const balance = useGachaStore((s) => s.balance);
  const inventoryCount = useGachaStore((s) => s.inventory.filter((i) => i.status === "owned").length);
  const setDepositOpen = useGachaStore((s) => s.setDepositOpen);
  const setInventoryOpen = useGachaStore((s) => s.setInventoryOpen);
  const openLogCount = useGachaStore((s) => s.openLog.length);
  const points = useGachaStore((s) => s.points);
  const totalSpent = useGachaStore((s) => s.totalSpent);
  const tierName = tierFor(totalSpent).name;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (anchor: string) => {
    if (anchor === "top") return window.scrollTo({ top: 0, behavior: "smooth" });
    document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-7 z-[60] transition-all duration-600 ease-cine",
        scrolled ? "border-b border-white/[0.08] bg-canvas/95 backdrop-blur-md" : "border-b border-transparent bg-transparent",
      )}
    >
      {/* 스크롤 탑에서는 상단 그라디언트로 로고/메뉴 가독성 확보 */}
      {!scrolled && (
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/70 to-transparent" />
      )}
      <div className="flex h-[64px] items-center justify-between px-[4%]">
        <div className="flex items-center gap-8">
          <button onClick={() => go("top")} className="select-none">
            <span className="display text-2xl font-bold text-white md:text-3xl">GACHAFLIX</span>
          </button>
          <nav className="hidden items-center gap-6 lg:flex">
            {MENU.map((m) => (
              <button
                key={m.anchor}
                onClick={() => go(m.anchor)}
                className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400 transition duration-600 ease-cine hover:text-white"
              >
                {m.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <Search className="hidden h-5 w-5 cursor-pointer text-neutral-300 transition hover:text-white md:block" />

          {/* 로케일 — 표시 계층 전용 */}
          <div className="hidden items-center border border-white/[0.08] sm:flex">
            {LOCALES.map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                aria-pressed={locale === l}
                className={cn(
                  "px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors duration-300 ease-cine",
                  locale === l ? "bg-white text-black" : "text-neutral-400 hover:text-white",
                )}
              >
                {LOCALE_LABEL[l]}
              </button>
            ))}
          </div>

          {/* 실시간 USDT 잔액 + 등급/포인트 */}
          <div className="flex items-center gap-2 border border-white/[0.08] bg-ink/70 px-3 py-1.5 font-mono text-sm tabular-nums">
            <span className="h-1.5 w-1.5 flex-none animate-flicker bg-neutral-400" />
            <span className="font-semibold text-white">{usdt(balance)}</span>
            <span className="hidden border border-white/[0.08] px-1 text-[10px] uppercase tracking-[0.18em] text-neutral-400 md:inline">
              {tierName}
            </span>
            {points > 0 && (
              <span className="hidden text-[11px] font-semibold text-neutral-300 md:inline">
                {points.toLocaleString()} P
              </span>
            )}
          </div>

          <button
            onClick={() => setDepositOpen(true)}
            className="flex items-center gap-1.5 bg-crimson px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white outline outline-1 outline-transparent transition duration-600 ease-cine hover:scale-[1.02] hover:outline-white"
          >
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">입금 / 충전</span>
          </button>

          <button
            onClick={() => setInventoryOpen(true)}
            className="relative text-neutral-300 transition hover:text-white"
            title="획득 목록"
          >
            <Package className="h-5 w-5" />
            {inventoryCount > 0 && (
              <span className="absolute -right-2 -top-2 bg-white px-1.5 font-mono text-[10px] font-bold tabular-nums text-black">
                {inventoryCount}
              </span>
            )}
          </button>

          <button className="relative hidden text-neutral-300 transition hover:text-white md:block" title="온체인 알림">
            <Bell className="h-5 w-5" />
            {openLogCount > 0 && <span className="absolute -right-1 -top-1 h-1.5 w-1.5 bg-white" />}
          </button>

          <div className="h-8 w-8 overflow-hidden border border-white/[0.08] bg-surface">
            <div className="display flex h-full w-full items-center justify-center text-base font-bold text-neutral-300">
              G
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
