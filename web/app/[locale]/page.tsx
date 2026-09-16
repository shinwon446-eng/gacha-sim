"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/format";
import {
  BOXES,
  CATEGORY_FILTERS,
  SORTS,
  byCategory,
  guaranteedValue,
  heroBox,
  luxuryAndWatch,
  sortBoxes,
  techAndMobility,
  trending,
  type BoxCategory,
  type ProductBox,
  type SortKey,
} from "@/lib/products";
import { BillboardHero } from "@/components/home/BillboardHero";
import { NetflixRow } from "@/components/home/NetflixRow";
import { BoxCard } from "@/components/box/BoxCard";
import { DetailModal } from "@/components/box/DetailModal";
import { TIERS, glow } from "@/lib/tiers";
import { CurrencySelector } from "@/components/layout/CurrencySelector";
import { useTranslations } from "next-intl";
import { useCurrency } from "@/lib/useCurrency";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { Link } from "@/i18n/navigation";
import { Wallet } from "lucide-react";
import { useWalletStore } from "@/stores/walletStore";
import { UnboxingRoulette, type UnboxResult } from "@/components/unboxing/UnboxingRoulette";
import { DepositModal } from "@/components/wallet/DepositModal";
import { glow as glowOf } from "@/lib/tiers";

const PAGE_SIZE = 12;

interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: string;
}

export default function BoxesPage() {
  const t = useTranslations();
  const { fmt } = useCurrency();
  const [detail, setDetail] = useState<ProductBox | null>(null);
  const [category, setCategory] = useState<BoxCategory | "all">("all");
  const [sort, setSort] = useState<SortKey>("featured");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [unbox, setUnbox] = useState<{ box: ProductBox; count: number } | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const balance = useWalletStore((s) => s.balance);
  const debit = useWalletStore((s) => s.debit);
  const credit = useWalletStore((s) => s.credit);

  const pushToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((ts) => [...ts, { ...toast, id }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 5200);
  }, []);

  // 오픈: 가격 × 횟수 차감 → 룰렛. 부족하면 토스트만.
  const openBox = useCallback(
    (box: ProductBox, count = 1) => {
      const cost = box.price * count;
      if (!debit(cost)) {
        pushToast({ title: t("unbox.insufficient", { price: fmt(cost) }), body: t("unbox.topUp"), tone: "#E50914" });
        return;
      }
      setDetail(null);
      setUnbox({ box, count });
    },
    [debit, pushToast, t, fmt],
  );

  const onSellBack = useCallback(
    (_results: UnboxResult[], amount: number) => {
      credit(amount);
      pushToast({ title: t("unbox.sold", { amount: fmt(amount) }), tone: "#E6CA65" });
    },
    [credit, pushToast, t, fmt],
  );

  const onShip = useCallback(() => {
    pushToast({ title: t("unbox.shippingNotice"), body: t("unbox.shippingBody"), tone: "#93C5FD" });
  }, [pushToast, t]);

  // 빌보드: 사이버트럭 / 롤렉스 / 하이엔드 테크 순환
  const billboard = useMemo(
    () => ["cybertruck-dream", "rolex-vault", "apex-workstation"].map((slug) => BOXES.find((b) => b.slug === slug) ?? heroBox()),
    [],
  );
  const grid = useMemo(() => sortBoxes(byCategory(category), sort), [category, sort]);
  const visible = grid.slice(0, shown);

  return (
    <main className="min-h-screen overflow-x-hidden bg-canvas pb-24">
      {/* 상단 바 */}
      <header className="absolute inset-x-0 top-0 z-[60] flex items-center gap-5 px-[4%] py-4">
        <span className="font-display text-[22px] font-bold uppercase leading-none tracking-tight text-crimson">
          Gachaflix
        </span>
        <nav className="flex items-center gap-4 text-[12px] text-muted">
          <span className="font-semibold text-white">{t("nav.boxes")}</span>
          <span className="cursor-default opacity-60">{t("nav.battles")}</span>
          <span className="cursor-default opacity-60">{t("nav.inventory")}</span>
          <Link href="/fairness" className="transition-colors hover:text-white">
            {t("nav.fairness")}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {/* 잔액 — 데모 고정값. 선택 통화로만 표기된다. */}
          <div className="glass-dark flex h-9 items-center gap-2 rounded-md px-3">
            <Wallet className="h-3.5 w-3.5 text-muted" strokeWidth={2} />
            <span className="caption-luxury hidden sm:inline">{t("header.balance")}</span>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={balance}
                className="font-display text-sm font-bold tabular-nums text-white"
                initial={{ y: -6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 6, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {fmt(balance)}
              </motion.span>
            </AnimatePresence>
          </div>
          <button
            type="button"
            onClick={() => setDepositOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-md bg-crimson px-3 text-xs font-bold text-white shadow-[0_0_18px_rgba(229,9,20,0.35)] transition-colors hover:bg-red-600"
          >
            <Wallet className="h-3.5 w-3.5" strokeWidth={2.2} />
            {t("header.deposit")}
          </button>
          <LanguageSelector />
          <CurrencySelector />
          <span className="caption-luxury hidden rounded-sm border border-hairline px-2 py-1 md:inline">{t("header.demo")}</span>
        </div>
      </header>

      <BillboardHero boxes={billboard} onOpen={(b) => openBox(b, 1)} onInspect={setDetail} />

      {/* 등급 범례 — 배수 기준을 한 번만 설명한다 */}
      <section className="border-y border-line bg-surface px-[4%] py-2.5">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <li className="text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
            {t("tiers.legendTitle")}
          </li>
          {TIERS.map((t2) => (
            <li key={t2.key} className="flex items-center gap-1.5 text-[10px] leading-none">
              <span
                aria-hidden
                className="h-2 w-2 rounded-[1px]"
                style={{ background: t2.accent, boxShadow: `0 0 6px ${glow(t2.accent, 0.55)}` }}
              />
              <span className="font-semibold uppercase tracking-[0.1em]" style={{ color: t2.accent }}>
                {t2.label}
              </span>
              <span className="tabular-nums text-faint">{t(`tiers.range.${t2.key}`)}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="pt-10">
        <NetflixRow title={t("rows.trending")} boxes={trending()} variant="top10" onOpen={(b) => openBox(b, 1)} onInspect={setDetail} />
        <NetflixRow title={t("rows.techMobility")} boxes={techAndMobility()} onOpen={(b) => openBox(b, 1)} onInspect={setDetail} />
        <NetflixRow title={t("rows.luxuryWatch")} boxes={luxuryAndWatch()} onOpen={(b) => openBox(b, 1)} onInspect={setDetail} />
        <NetflixRow title={t("rows.guaranteed")} boxes={guaranteedValue()} onOpen={(b) => openBox(b, 1)} onInspect={setDetail} />
      </div>

      {/* 전체 그리드 */}
      <section className="px-[4%] pt-6">
        <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-line pb-3">
          <h2 className="text-[17px] font-bold text-white">
            {t("grid.title")}
            <span className="ml-2 font-mono text-[12px] font-normal tabular-nums text-faint">
              {grid.length} / {BOXES.length}
            </span>
          </h2>

          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setCategory(f.key);
                  setShown(PAGE_SIZE);
                }}
                className={cn(
                  "rounded-sm border px-2.5 py-1 text-[11px] font-semibold transition-colors duration-200",
                  category === f.key
                    ? "border-white bg-white text-canvas"
                    : "border-line text-muted hover:border-white hover:text-white",
                )}
              >
                {t(`categories.${f.key}`)}
              </button>
            ))}
          </div>

          <label className="ml-auto flex items-center gap-2 text-[11px] text-faint">
            {t("grid.sort")}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-sm border border-line bg-surface px-2 py-1 text-[11px] text-white outline-none focus:border-white"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {t(`sorts.${s.key}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((box, i) => (
            <BoxCard
              key={box.id}
              box={box}
              edge={i % 5 === 0 ? "first" : i % 5 === 4 ? "last" : "middle"}
              onInspect={setDetail}
              onOpen={(b) => openBox(b, 1)}
            />
          ))}
        </div>

        {shown < grid.length && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE_SIZE)}
              className="rounded-sm border border-[#555555] px-6 py-2.5 text-[13px] font-semibold text-white transition-colors duration-200 hover:border-white hover:bg-elevation"
            >
              {t("grid.loadMore", { n: grid.length - shown })}
            </button>
          </div>
        )}
      </section>

      <DetailModal box={detail} onClose={() => setDetail(null)} onOpen={openBox} />

      <DepositModal
        open={depositOpen}
        onClose={() => setDepositOpen(false)}
        onCredited={(amount) => pushToast({ title: t("deposit.creditedToast", { amount: fmt(amount) }), tone: "#E6CA65" })}
      />

      <UnboxingRoulette box={unbox?.box ?? null} count={unbox?.count ?? 1} onClose={() => setUnbox(null)} onSellBack={onSellBack} onShip={onShip} />

      {/* 토스트 */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[120] flex w-80 max-w-full flex-col gap-2">
        <AnimatePresence>
          {toasts.map((x) => (
            <motion.div
              key={x.id}
              className="border-metallic-subtle pointer-events-auto rounded-lg bg-obsidian p-3 text-xs"
              style={{ boxShadow: `0 0 20px ${glowOf(x.tone, 0.2)}, 0 12px 30px rgba(0,0,0,0.6)` }}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.25 }}
            >
              <div className="font-bold" style={{ color: x.tone }}>{x.title}</div>
              {x.body && <div className="mt-1 leading-relaxed text-secondary">{x.body}</div>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </main>
  );
}
