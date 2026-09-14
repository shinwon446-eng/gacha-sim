"use client";

import { useEffect, useState } from "react";
import { Bell, Search, Wallet, Package } from "lucide-react";
import { useGachaStore } from "@/store/useGachaStore";
import { usdt, cn } from "@/lib/format";
import { CATEGORY_META } from "@/lib/types";

const MENU: { label: string; anchor: string }[] = [
  { label: "홈", anchor: "top" },
  { label: CATEGORY_META.tech.label, anchor: CATEGORY_META.tech.anchor },
  { label: CATEGORY_META.tcg.label, anchor: CATEGORY_META.tcg.anchor },
  { label: CATEGORY_META.luxury.label, anchor: CATEGORY_META.luxury.anchor },
  { label: "실시간 당첨 랭킹", anchor: "ranking" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const balance = useGachaStore((s) => s.balance);
  const inventoryCount = useGachaStore((s) => s.inventory.filter((i) => i.status === "owned").length);
  const setDepositOpen = useGachaStore((s) => s.setDepositOpen);
  const setInventoryOpen = useGachaStore((s) => s.setInventoryOpen);
  const openLogCount = useGachaStore((s) => s.openLog.length);

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
        "fixed inset-x-0 top-7 z-[60] transition-all duration-500",
        scrolled ? "bg-[#141414]/95 shadow-[0_2px_24px_rgba(0,0,0,0.6)] backdrop-blur-md" : "bg-transparent",
      )}
    >
      {/* 스크롤 탑에서는 상단 그라디언트로 로고/메뉴 가독성 확보 */}
      {!scrolled && (
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/70 to-transparent" />
      )}
      <div className="flex h-[68px] items-center justify-between px-[4%]">
        <div className="flex items-center gap-8">
          <button onClick={() => go("top")} className="flex items-center gap-1 select-none">
            <span className="text-2xl font-black tracking-tighter text-accent drop-shadow-[0_0_12px_rgba(229,9,20,0.6)] md:text-3xl">
              GACHAFLIX
            </span>
          </button>
          <nav className="hidden items-center gap-5 lg:flex">
            {MENU.map((m) => (
              <button
                key={m.anchor}
                onClick={() => go(m.anchor)}
                className="text-sm text-gray-200 transition hover:text-gray-400"
              >
                {m.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 md:gap-5">
          <Search className="hidden h-5 w-5 cursor-pointer text-white md:block" />

          {/* 실시간 USDT 잔액 */}
          <div className="flex items-center gap-2 rounded border border-white/15 bg-black/40 px-3 py-1.5 font-mono text-sm tabular-nums">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="font-semibold">{usdt(balance)}</span>
          </div>

          <button
            onClick={() => setDepositOpen(true)}
            className="flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-sm font-bold transition hover:bg-[#f6121d]"
          >
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">입금/충전</span>
          </button>

          <button onClick={() => setInventoryOpen(true)} className="relative" title="내 보관함">
            <Package className="h-5 w-5" />
            {inventoryCount > 0 && (
              <span className="absolute -right-2 -top-2 rounded-full bg-accent px-1.5 text-[10px] font-bold">
                {inventoryCount}
              </span>
            )}
          </button>

          <button className="relative hidden md:block" title="온체인 알림">
            <Bell className="h-5 w-5" />
            {openLogCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-[#141414]" />
            )}
          </button>

          <div className="h-8 w-8 overflow-hidden rounded bg-gradient-to-br from-accent to-purple-600">
            <div className="flex h-full w-full items-center justify-center text-sm font-black">G</div>
          </div>
        </div>
      </div>
    </header>
  );
}
