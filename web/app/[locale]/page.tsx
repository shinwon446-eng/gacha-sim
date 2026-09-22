"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/format";
import { BOXES, CATEGORY_FILTERS, SORTS, byCategory, heroBox, sortBoxes, type BoxCategory, type ProductBox, type SortKey } from "@/lib/products";
import { BillboardHero } from "@/components/home/BillboardHero";
import { OnboardingStrip } from "@/components/home/OnboardingStrip";
import { LiveCounters } from "@/components/home/LiveCounters";
import { LiveTicker } from "@/components/home/LiveTicker";
import { DailyFreeBoxModal, DailyFreeBoxPill, DailyFreeBoxStrip } from "@/components/home/DailyFreeBox";
import { QuickTabs, type CategoryTab } from "@/components/home/QuickTabs";
import { VipBadge } from "@/components/layout/VipBadge";
import { ProofFeed } from "@/components/fairness/ProofFeed";
import { BoxCard } from "@/components/box/BoxCard";
import { DetailModal } from "@/components/box/DetailModal";
import { CurrencySelector } from "@/components/layout/CurrencySelector";
import { useTranslations } from "next-intl";
import { useCurrency } from "@/lib/useCurrency";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { Link } from "@/i18n/navigation";
import { Wallet, ArrowUpRight } from "lucide-react";
import { useWalletStore, WELCOME_BONUS_USDT } from "@/stores/walletStore";
import { UnboxingRoulette, type UnboxResult } from "@/components/unboxing/UnboxingRoulette";
import { BulkOpenModal } from "@/components/unboxing/BulkOpenModal";
import { BULK_THRESHOLD, type AutoplayConfig } from "@/lib/autoplay";
import { DepositModal } from "@/components/wallet/DepositModal";
import { Money } from "@/components/ui/Money";
import { glow as glowOf } from "@/lib/tiers";
import { useUiStore } from "@/stores/uiStore";
import type { FundingRatio } from "@/lib/funding";
import { DEPOSIT_HASH } from "@/components/layout/MobileBottomNav";

const PAGE_SIZE = 12;
/** 해시 → 카테고리 탭 (하단 내비 [👑 1달러 잭팟] = #category-dollar) */
const HASH_CATEGORY = /^#category-(all|dollar|tech|luxury|jackpot)$/;

interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: string;
}

/** 2열(모바일) → 3 → 4 → 5열 고밀도 카드 그리드 */
function BoxGrid({ boxes, onPick }: { boxes: ProductBox[]; onPick: (b: ProductBox) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-x-3 sm:gap-y-5 md:grid-cols-4 xl:grid-cols-5">
      {boxes.map((box, i) => (
        <BoxCard key={box.id} box={box} edge={i % 4 === 0 ? "first" : i % 4 === 3 ? "last" : "middle"} onInspect={onPick} onOpen={onPick} />
      ))}
    </div>
  );
}

export default function BoxesPage() {
  const t = useTranslations();
  const { fmt } = useCurrency();
  const [detail, setDetail] = useState<ProductBox | null>(null);
  const [category, setCategory] = useState<CategoryTab>("all");
  const gridRef = useRef<HTMLElement>(null);
  const [sort, setSort] = useState<SortKey>("featured");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [unbox, setUnbox] = useState<{ box: ProductBox; count: number; demo?: { itemId: string }; auto?: AutoplayConfig; funding?: FundingRatio } | null>(null);
  const [bulk, setBulk] = useState<{ box: ProductBox; count: number; funding?: FundingRatio } | null>(null);
  const [walletTab, setWalletTab] = useState<"usdt" | "card" | "withdraw">("usdt");
  const depositOpen = useUiStore((s) => s.depositOpen);
  const setDepositOpen = useCallback((on: boolean) => useUiStore.getState()[on ? "openDeposit" : "closeDeposit"](), []);
  const [dailyOpen, setDailyOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const balance = useWalletStore((s) => s.balance);
  const cryptoBalance = useWalletStore((s) => s.cryptoBalance);
  const cardBalance = useWalletStore((s) => s.cardBalance);
  const debit = useWalletStore((s) => s.debit);
  const debitSplit = useWalletStore((s) => s.debitSplit);
  const credit = useWalletStore((s) => s.credit);
  const creditSplit = useWalletStore((s) => s.creditSplit);
  const addTransaction = useWalletStore((s) => s.addTransaction);
  const claimWelcome = useWalletStore((s) => s.claimWelcome);
  const welcomeClaimed = useWalletStore((s) => s.welcomeClaimed);

  const pushToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((ts) => [...ts, { ...toast, id }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 5200);
  }, []);

  // 탭 전환 — 그리드 즉시 교체 + 스티키 탭 아래로 그리드 스크롤 + 해시 동기화(하단 내비 활성 표시)
  const pickCategory = useCallback((key: CategoryTab, scroll = true) => {
    setCategory(key);
    setShown(PAGE_SIZE);
    const next = key === "dollar" ? "#category-dollar" : "";
    if (window.location.hash !== next) {
      window.history.replaceState(null, "", next || window.location.pathname + window.location.search);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
    if (scroll) gridRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, []);

  // 하단 내비 · 외부 링크: #category-x → 탭, #deposit → 충전 모달
  useEffect(() => {
    const apply = () => {
      const h = window.location.hash;
      const m = HASH_CATEGORY.exec(h);
      if (m) {
        setCategory(m[1] as CategoryTab);
        setShown(PAGE_SIZE);
        gridRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      } else if (h === DEPOSIT_HASH) {
        setWalletTab("usdt");
        useUiStore.getState().openDeposit();
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  // 이 페이지가 충전 모달 호스트 — 하단 내비 [💳 충전]이 바로 연다
  useEffect(() => {
    const ui = useUiStore.getState();
    ui.setDepositHost(true);
    return () => ui.setDepositHost(false);
  }, []);

  // 오픈: 가격 × 횟수 차감 → 룰렛. 부족하면 토스트만.
  const openBox = useCallback(
    (box: ProductBox, count = 1) => {
      const cost = box.price * count;
      const plan = debitSplit(cost);
      if (!plan) {
        pushToast({ title: t("unbox.insufficient", { price: fmt(cost) }), body: t("unbox.topUp"), tone: "#E50914" });
        return;
      }
      addTransaction({ type: "open", amountUsdt: -cost, ref: `${box.slug}x${count}` });
      setDetail(null);
      if (count >= BULK_THRESHOLD) setBulk({ box, count, funding: plan.ratio });
      else setUnbox({ box, count, funding: plan.ratio });
    },
    [debitSplit, addTransaction, pushToast, t, fmt],
  );

  const onSellBack = useCallback(
    (results: UnboxResult[], amount: number, split?: { toCrypto: number; toCard: number }) => {
      // 환급금은 아이템 족보대로 — 카드 출처는 카드 잔액으로만 (CLAUDE.md §7-B)
      if (split) creditSplit(split.toCrypto, split.toCard);
      else credit(amount);
      addTransaction({ type: "sellback", amountUsdt: amount, ref: results.map((r) => r.item.id).join(",") });
      pushToast({ title: t("unbox.sold", { amount: fmt(amount) }), tone: "#E6CA65" });
    },
    [credit, creditSplit, addTransaction, pushToast, t, fmt],
  );

  // 손맛 보기: 서브마리너 볼트를 잔액 없이 가상으로 돌린다. 결과는 서브마리너로 고정 — 잔액·보관함·nonce 무변화.
  const openDemo = useCallback((box: ProductBox) => {
    const rolex = BOXES.find((b) => b.slug === "vault-submariner") ?? box;
    const hero = rolex.items.find((i) => i.id === "rlx-sub") ?? rolex.items[0];
    setDetail(null);
    setUnbox({ box: rolex, count: 1, demo: { itemId: hero.id } });
  }, []);
  // 데모 → 실제 전환: 웰컴 보너스 1회 지급 후 해당 박스 상세로
  const convertDemo = useCallback(
    (box: ProductBox) => {
      if (claimWelcome()) pushToast({ title: t("header.welcomeToast", { amount: fmt(WELCOME_BONUS_USDT) }), tone: "#E6CA65" });
      setUnbox(null);
      setDetail(box);
    },
    [claimWelcome, pushToast, t, fmt],
  );

  const onShip = useCallback(() => {
    pushToast({ title: t("inventory.shipRequestedToast"), body: t("unbox.shippingBody"), tone: "#93C5FD" });
  }, [pushToast, t]);

  // 빌보드: 사이버트럭 / 롤렉스 / 하이엔드 테크 순환
  const billboard = useMemo(
    () => ["dollar-apple", "starter-macbook", "vault-gold"].map((slug) => BOXES.find((b) => b.slug === slug) ?? heroBox()),
    [],
  );
  const grid = useMemo(() => sortBoxes(byCategory(category), sort), [category, sort]);
  const visible = grid.slice(0, shown);

  return (
    <main className="min-h-screen bg-canvas pb-12 md:pb-24">
      {/* 상단 바 — h-14 고정(스티키 퀵 탭이 top-14 로 이어 붙는다) */}
      <header className="sticky top-0 z-[60] flex h-14 items-center gap-2 border-b border-hairline bg-obsidian/90 px-3 backdrop-blur-md sm:gap-5 sm:px-[4%]">
        <span className="flex-none whitespace-nowrap font-display text-lg font-bold uppercase leading-none tracking-tight text-crimson sm:text-[22px]">
          Gachaflix
        </span>
        {/* 데스크톱 텍스트 내비 — 모바일은 하단 고정 내비(MobileBottomNav)가 대신한다 */}
        <nav className="hidden min-w-0 flex-1 items-center gap-3 overflow-x-auto whitespace-nowrap text-[12px] text-muted [scrollbar-width:none] sm:gap-4 md:flex">
          <span className="font-semibold text-white">{t("nav.boxes")}</span>
          <span className="cursor-default opacity-60">{t("nav.battles")}</span>
          <Link href="/inventory" className="transition-colors hover:text-white">
            {t("nav.inventory")}
          </Link>
          <Link href="/fairness" className="transition-colors hover:text-white">
            {t("nav.fairness")}
          </Link>
          <Link href="/community" className="transition-colors hover:text-white">
            {t("nav.community")}
          </Link>
        </nav>
        <div className="ml-auto flex flex-none items-center gap-1.5 sm:gap-2">
          <DailyFreeBoxPill onOpen={() => setDailyOpen(true)} className="hidden lg:flex" />
          {/* 잔액 — 데모 고정값. 선택 통화로만 표기된다. */}
          {/* 잔액 — 카드 충전분이 있으면 출금 가능(USDT)/플레이 전용(카드)을 분리해 보여준다 (CLAUDE.md §7-B) */}
          <button
            type="button"
            onClick={() => {
              setWalletTab(cardBalance > 0 ? "withdraw" : "usdt");
              setDepositOpen(true);
            }}
            className="glass-dark flex h-9 flex-none flex-col items-end justify-center gap-0 whitespace-nowrap rounded-md px-2 text-left sm:px-3"
            aria-label={t("header.balance")}
          >
            <span className="flex items-center gap-2">
              <Wallet className="hidden h-3.5 w-3.5 text-muted sm:block" strokeWidth={2} />
              <span className="caption-luxury hidden sm:inline">{t("header.balance")}</span>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={balance} className="inline-flex" initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 6, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Money value={balance} size="sm" />
                </motion.span>
              </AnimatePresence>
            </span>
            {cardBalance > 0 && (
              <span className="flex items-center gap-1.5 text-[9px] leading-none tabular-nums text-faint">
                <span className="text-gold-champagne">↗ {fmt(cryptoBalance)}</span>
                <span>💳 {fmt(cardBalance)}</span>
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setWalletTab("usdt");
              setDepositOpen(true);
            }}
            className="hidden h-9 flex-none items-center gap-1.5 whitespace-nowrap rounded-md bg-crimson px-2.5 text-xs font-bold text-white shadow-[0_0_18px_rgba(229,9,20,0.35)] transition-colors hover:bg-red-600 sm:px-3 md:flex"
          >
            <Wallet className="h-3.5 w-3.5" strokeWidth={2.2} />
            <span className="hidden sm:inline">{t("header.deposit")}</span>
          </button>
          {/* 출금 — 모바일에서도 항상 보이는 콤팩트 골드 뱃지(지갑 모달 출금 탭) */}
          <button
            type="button"
            onClick={() => {
              setWalletTab("withdraw");
              setDepositOpen(true);
            }}
            className="flex h-7 flex-none items-center gap-1 whitespace-nowrap rounded border border-gold-champagne/40 px-2 text-[11px] font-bold text-gold-champagne transition-colors hover:bg-gold-champagne/10 lg:h-9 lg:gap-1.5 lg:px-3 lg:text-xs"
          >
            <ArrowUpRight className="h-3 w-3 lg:h-3.5 lg:w-3.5" strokeWidth={2.4} />
            {t("header.withdraw")}
          </button>
          <LanguageSelector />
          <CurrencySelector />
          <VipBadge className="hidden lg:inline-flex" />
        </div>
      </header>

      {/* 1. 라이브 드랍 티커 */}
      <LiveTicker />

      {/* 2. 히어로 — 다이어트판 */}
      <BillboardHero boxes={billboard} onOpen={setDetail} onInspect={setDetail} onDemo={openDemo} />

      {/* 3. 스티키 퀵 카테고리 탭 — 아래 그리드를 즉시 필터링 (TOP10·카테고리 캐러셀·전체 그리드 3중 나열을 하나로) */}
      <QuickTabs value={category} onChange={pickCategory} />

      {/* 4. 박스 그리드 — 모바일 2열 고밀도(한 화면 4~6개) → sm 3열 → md 4열 → xl 5열 */}
      <section ref={gridRef} id="boxes" className="scroll-mt-[118px] px-4 pt-4 sm:px-[4%] sm:pt-5">
        <div className="mb-3 flex items-center gap-3 border-b border-line pb-2.5">
          <h2 className="text-[15px] font-bold text-white sm:text-[17px]">
            {category === "all" ? t("grid.title") : t(`categories.${category}`)}
            <span className="ml-2 font-mono text-[12px] font-normal tabular-nums text-faint">
              {grid.length} / {BOXES.length}
            </span>
          </h2>

          <label className="ml-auto flex items-center gap-2 whitespace-nowrap text-[11px] text-faint">
            <span className="hidden sm:inline">{t("grid.sort")}</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label={t("grid.sort")}
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

        {/* [전체] 탭은 4대 카테고리 소제목으로 구역을 나눠 12박스를 하나도 빠짐없이 보여준다 (모바일 누락 인지 방지) */}
        {category === "all" ? (
          <div className="grid gap-7">
            {CATEGORY_FILTERS.filter((f) => f.key !== "all").map((f) => {
              const boxes = sortBoxes(byCategory(f.key as BoxCategory), sort);
              if (boxes.length === 0) return null;
              const min = Math.min(...boxes.map((b) => b.price));
              const max = Math.max(...boxes.map((b) => b.price));
              return (
                <section key={f.key} id={`category-${f.key}`} className="scroll-mt-[118px]">
                  <div className="mb-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <h3 className="break-keep text-[14px] font-bold text-white sm:text-[15px]">{t(`sections.${f.key}`)}</h3>
                    <span className="whitespace-nowrap font-mono text-[11px] tabular-nums text-faint">
                      {min === max ? fmt(min) : `${fmt(min)} ~ ${fmt(max)}`} · {boxes.length}
                    </span>
                  </div>
                  <BoxGrid boxes={boxes} onPick={setDetail} />
                </section>
              );
            })}
          </div>
        ) : (
          <>
            <BoxGrid boxes={visible} onPick={setDetail} />
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
          </>
        )}
      </section>

      {/* 5. 데일리 프리 박스 · 3초 안심 가이드 · 신뢰 지표 */}
      <DailyFreeBoxStrip onOpen={() => setDailyOpen(true)} className="pt-8" />
      <OnboardingStrip className="pt-6" />
      <LiveCounters className="pt-4" />

      {/* 6. 실지급/실배송 라이브 피드 — 요약 4행, 전체는 /fairness */}
      <section className="px-[4%] pt-12">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[17px] font-bold text-white">{t("proof.title")}</h2>
          <Link href="/fairness" className="text-xs font-semibold text-gold-champagne hover:underline">
            {t("nav.fairness")} →
          </Link>
        </div>
        <ProofFeed limit={4} showReserve={false} />
      </section>

      <DetailModal box={detail} onClose={() => setDetail(null)} onOpen={openBox} onAutoplay={(b, cfg) => { setDetail(null); setUnbox({ box: b, count: 1, auto: cfg }); }} />
      <BulkOpenModal box={bulk?.box ?? null} count={bulk?.count ?? 0} funding={bulk?.funding} onClose={() => setBulk(null)} onSellBack={(ids, amount, split) => { if (split) creditSplit(split.toCrypto, split.toCard); else credit(amount); addTransaction({ type: "sellback", amountUsdt: amount, ref: ids.join(",") }); pushToast({ title: t("unbox.sold", { amount: fmt(amount) }), tone: "#E6CA65" }); }} />

      <DepositModal
        open={depositOpen}
        onClose={() => setDepositOpen(false)}
        onCredited={(amount, source) =>
          pushToast({ title: t(source === "card" ? "cardPay.creditedToast" : "deposit.creditedToast", { amount: fmt(amount) }), tone: "#E6CA65" })
        }
        initialTab={walletTab}
        onWithdrawn={(amount) => pushToast({ title: t("withdraw.requestedToast", { amount: fmt(amount) }), tone: "#E6CA65" })}
        onWithdrawBlocked={(pct) => pushToast({ title: t("withdraw.amlBlocked", { pct }), tone: "#E50914" })}
      />

      <DailyFreeBoxModal open={dailyOpen} onClose={() => setDailyOpen(false)} onCredited={(amount) => pushToast({ title: t("daily.creditedToast", { amount: fmt(amount) }), tone: "#E6CA65" })} />


      <UnboxingRoulette box={unbox?.box ?? null} count={unbox?.count ?? 1} funding={unbox?.funding} demo={unbox?.demo} onDemoConvert={convertDemo} welcomeClaimed={welcomeClaimed} auto={unbox?.auto} onClose={() => setUnbox(null)} onSellBack={onSellBack} onShip={onShip} onRespin={(b) => { setUnbox(null); setTimeout(() => openBox(b, 1), 60); }} />

      {/* 토스트 */}
      <div className="pointer-events-none fixed bottom-20 right-4 z-[120] flex w-80 max-w-full flex-col gap-2 md:bottom-4">
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
