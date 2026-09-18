"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { useTranslations } from "next-intl";
import { Wallet, Truck, ShieldCheck, X, Volume2, VolumeX, Play } from "lucide-react";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { useProductText } from "@/lib/useProductText";
import { dropTable, REFUND_RATE, type ProductBox, type ProductItem } from "@/lib/products";
import { formatMultiple, glow, tierOf, type Tier } from "@/lib/tiers";
import { calculateRollResult, determineItem } from "@/lib/fairness";
import { REEL_DURATION_MULTI_S, REEL_DURATION_S, REEL_EASE, REEL_TARGET_INDEX, buildStrip, offsetForTarget, unitRandom } from "@/lib/reel";
import { useFairStore } from "@/stores/fairStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { playTick, playWin, playTaDum } from "@/lib/audio";
import { ProductArt } from "@/components/box/ProductArt";
import { Money } from "@/components/ui/Money";
import { VisualVerifyModal } from "@/components/fairness/VisualVerifyModal";
import { ShippingModal } from "@/components/inventory/ShippingModal";
import { useInventoryStore, type OwnedItem } from "@/stores/inventoryStore";
import { useWalletStore, WELCOME_BONUS_USDT } from "@/stores/walletStore";
import type { ShippingAddress } from "@/lib/shipping";
import { Link } from "@/i18n/navigation";

export interface UnboxResult {
  /** 보관함 레코드 id — 결과 확정 시 부여 */
  ownedId?: string;
  item: ProductItem;
  tier: Tier;
  roll: number;
  hmac: string;
  nonce: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
}

export interface UnboxingRouletteProps {
  box: ProductBox | null;
  /** 1 또는 5 */
  count: number;
  onClose: () => void;
  /** 즉시 판매 — 호출측이 잔액에 반영한다 */
  onSellBack: (results: UnboxResult[], amountUsdt: number) => void;
  /** 배송 신청 완료 — 호출측이 토스트를 띄운다 (배송비 차감·상태 전환은 여기서) */
  onShip: (results: UnboxResult[]) => void;
  /**
   * 무료 체험 모드 (CLAUDE.md §4-A). 지정 항목으로 결과를 고정하고 잔액·보관함·공정성 nonce 를 건드리지 않는다.
   * 결과 팝업은 전환 CTA(웰컴 보너스) 하나만 보여준다.
   */
  demo?: { itemId: string };
  /** 데모 팝업의 전환 CTA — 호출측이 보너스 지급·실제 박스 열기를 처리한다 */
  onDemoConvert?: (box: ProductBox) => void;
  /** 웰컴 보너스 수령 여부 — CTA 문구 분기 */
  welcomeClaimed?: boolean;
}

type Phase = "idle" | "spinning" | "landed" | "results";

const TILE_W = 148;
const GAP = 10;

/**
 * 시네마틱 룰렛 언박싱 (PROMPTS 3-2-2).
 *
 * 순서 — 이 순서가 공정성의 전부다:
 *   1. 결과 확정: Provably Fair 엔진이 (serverSeed, clientSeed, nonce) 로 롤과 항목을 낸다
 *   2. 스트립: 결과를 target 칸에 심고 나머지는 확률표 가중으로 채운다
 *   3. 연출: 88칸이 초고속으로 흐르다 cubic-bezier(0.12,0.8,0.33,1) 로 감속해 중앙 인디케이터에 정지
 *   4. 정지: 등급색 플래시 + 승리 징글 → 결과 팝업(사진·등급·가치·시드·nonce)
 * 연출(3)은 결과(1)를 바꿀 수 없다. 5연속은 1~3 을 짧게 반복하고 마지막에 목록으로 보여준다.
 */
export function UnboxingRoulette({ box, count, onClose, onSellBack, onShip, demo, onDemoConvert, welcomeClaimed }: UnboxingRouletteProps) {
  const t = useTranslations("unbox");
  const tr = useTranslations();
  const { fmt } = useCurrency();
  const { boxTitle, itemName } = useProductText();
  const fair = useFairStore();
  const muted = useSettingsStore((s) => s.muted);
  const toggleMuted = useSettingsStore((s) => s.toggleMuted);

  const controls = useAnimationControls();
  const viewportRef = useRef<HTMLDivElement>(null);
  const viewportW = useRef(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [strip, setStrip] = useState<ProductItem[]>([]);
  const [current, setCurrent] = useState<UnboxResult | null>(null);
  const [results, setResults] = useState<UnboxResult[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const ownedItems = useInventoryStore((s) => s.items);
  const verifyRecord = verifyId ? ownedItems.find((o) => o.id === verifyId) ?? null : null;
  const [sold, setSold] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [shipped, setShipped] = useState(false);
  const addOwned = useInventoryStore((s) => s.add);
  const sellOwned = useInventoryStore((s) => s.sell);
  const requestShipping = useInventoryStore((s) => s.requestShipping);
  const balance = useWalletStore((s) => s.balance);
  const debit = useWalletStore((s) => s.debit);
  const tickIndex = useRef(-1);
  const rafRef = useRef<number | null>(null);
  const cancelled = useRef(false);

  const items = useMemo(() => (box ? dropTable(box) : []), [box]);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const sync = () => {
      viewportW.current = el.clientWidth;
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [box]);

  // 틱 사운드 — 릴 x 를 rAF 로 읽어 칸이 바뀔 때마다 한 번
  const startTicks = useCallback(
    (el: HTMLElement) => {
      const step = TILE_W + GAP;
      const loop = () => {
        const m = /translateX\(([-\d.]+)px\)/.exec(el.style.transform ?? "");
        const x = m ? parseFloat(m[1]) : 0;
        const idx = Math.floor((-x + viewportW.current / 2) / step);
        if (idx !== tickIndex.current) {
          tickIndex.current = idx;
          if (!useSettingsStore.getState().muted) playTick();
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    },
    [],
  );
  const stopTicks = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const spinOnce = useCallback(
    async (duration: number): Promise<UnboxResult> => {
      if (!box) throw new Error("box 없음");
      let res: UnboxResult;
      let item: ProductItem;
      if (demo) {
        // 무료 체험: 결과 고정, 시드·nonce·보관함 모두 건드리지 않는다
        item = items.find((i) => i.id === demo.itemId) ?? items[0];
        res = { item, tier: tierOf(item.value, box.price), roll: 0, hmac: "", nonce: 0, serverSeed: "", serverSeedHash: "", clientSeed: "" };
      } else {
        // 1. 결과 확정 — 연출 전에
        const nonce = fair.takeNonce();
        const { serverSeed, serverSeedHash, clientSeed } = useFairStore.getState();
        const r = await calculateRollResult(serverSeed, clientSeed, nonce);
        item = determineItem(r.roll, items);
        res = { item, tier: tierOf(item.value, box.price), roll: r.roll, hmac: r.hmac, nonce, serverSeed, serverSeedHash, clientSeed };
        // 확정 즉시 보관함에 IN_STORAGE 로 넣는다 — 팝업을 닫아도 사라지지 않는다
        const rec: Omit<OwnedItem, "id" | "status" | "acquiredAt"> = {
          itemId: item.id,
          boxSlug: box.slug,
          valueUsdt: item.value,
          tier: res.tier.key,
          fair: { serverSeedHash, serverSeed, clientSeed, nonce, roll: r.roll },
        };
        res.ownedId = addOwned([rec])[0].id;
      }

      // 2. 스트립
      setStrip(buildStrip(item, items, unitRandom));
      setCurrent(null);
      setPhase("spinning");
      controls.set({ x: 0 });
      await new Promise((r) => requestAnimationFrame(() => r(null)));

      // 3. 감속
      const target = offsetForTarget({ tileWidth: TILE_W, gap: GAP, viewportWidth: viewportW.current }, REEL_TARGET_INDEX, unitRandom() - 0.5);
      const track = viewportRef.current?.querySelector<HTMLElement>("[data-reel]");
      if (track) startTicks(track);
      await controls.start({ x: target, transition: { duration, ease: REEL_EASE } });
      stopTicks();

      // 4. 정지
      setCurrent(res);
      setPhase("landed");
      setFlash(res.tier.key === "royal" || res.tier.key === "prestige" ? res.tier.accent : "#E50914");
      if (!useSettingsStore.getState().muted) playWin(res.tier.key === "royal" || res.tier.key === "prestige" ? "jackpot" : res.tier.key === "executive" ? "value" : "start");
      setTimeout(() => setFlash(null), 600);
      return res;
    },
    [box, items, fair, controls, startTicks, addOwned, demo],
  );

  // 오픈 시작 — box 가 들어오면 한 번. 리사이즈는 스핀을 취소하지 않는다.
  useEffect(() => {
    if (!box || phase !== "idle") return;
    cancelled.current = false;
    (async () => {
      // 뷰포트 폭이 측정될 때까지 한두 프레임 기다린다
      for (let i = 0; i < 20 && viewportW.current === 0; i++) await new Promise((r) => requestAnimationFrame(() => r(null)));
      if (cancelled.current) return;
      if (!muted) playTaDum();
      const out: UnboxResult[] = [];
      const n = Math.max(1, count);
      for (let i = 0; i < n; i++) {
        if (cancelled.current) return;
        const r = await spinOnce(n > 1 ? REEL_DURATION_MULTI_S : REEL_DURATION_S);
        out.push(r);
        setResults([...out]);
        if (i < n - 1) await new Promise((r) => setTimeout(r, 700));
      }
      setPhase("results");
    })();
    return () => {
      cancelled.current = true;
      stopTicks();
      controls.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box]);

  // 닫힐 때 상태 리셋
  useEffect(() => {
    if (box) return;
    setPhase("idle");
    setStrip([]);
    setResults([]);
    setCurrent(null);
    setSold(false);
    setShipped(false);
    setShipOpen(false);
  }, [box]);

  useEffect(() => {
    if (!box) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase === "results") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [box, phase, onClose]);

  if (!box) return null;

  const totalValue = results.reduce((s, r) => s + r.item.value, 0);
  const sellAmount = +(totalValue * REFUND_RATE).toFixed(2);
  const last = results[results.length - 1] ?? current;

  return (
    <AnimatePresence>
      <motion.div
        key="unbox"
        className="fixed inset-0 z-[100] flex flex-col bg-obsidian/95 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* 상단 바 */}
        <header className="flex items-center gap-3 px-4 py-3 md:px-8">
          <div className="min-w-0">
            <div className={cn("caption-luxury", demo && "!text-gold-champagne")}>{demo ? t("demoLabel") : count > 1 ? t("open5") : t("open1")}</div>
            <div className="truncate font-display text-lg font-bold uppercase tracking-tight text-white md:text-2xl">{boxTitle(box)}</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className={cn("hidden max-w-xs truncate font-mono text-[10px] text-faint md:inline", demo && "md:hidden")} title={fair.serverSeedHash}>
              {t("seedHash")}: {fair.serverSeedHash.slice(0, 16)}…
            </span>
            <button type="button" onClick={toggleMuted} aria-label={muted ? t("unmute") : t("mute")} className="glass-dark flex h-9 w-9 items-center justify-center rounded-md text-muted hover:text-white">
              {muted ? <VolumeX className="h-4 w-4" strokeWidth={2} /> : <Volume2 className="h-4 w-4" strokeWidth={2} />}
            </button>
            <button type="button" onClick={onClose} disabled={phase === "spinning"} aria-label={t("close")} className="glass-dark flex h-9 w-9 items-center justify-center rounded-md text-muted hover:text-white disabled:opacity-40">
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </header>

        {/* ── 룰렛 스트립 ── */}
        <div className="relative flex flex-1 flex-col items-center justify-center px-0">
          {count > 1 && (
            <div className="mb-3 flex items-center gap-1.5">
              {Array.from({ length: count }, (_, i) => (
                <span key={i} className={cn("h-1.5 w-8 rounded-full transition-colors", i < results.length ? "bg-gold-champagne" : i === results.length && phase !== "results" ? "bg-white/60" : "bg-white/15")} />
              ))}
            </div>
          )}

          <div ref={viewportRef} className="relative w-full overflow-hidden" style={{ height: TILE_W + 70 }}>
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-20 w-32 bg-gradient-to-r from-obsidian to-transparent" />
            <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-20 w-32 bg-gradient-to-l from-obsidian to-transparent" />

            {/* 중앙 인디케이터 — 레드/골드 */}
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 z-30 w-0.5 -translate-x-1/2 bg-gradient-to-b from-crimson via-gold-champagne to-crimson shadow-[0_0_14px_rgba(230,202,101,0.8)]" />
            <span aria-hidden className="pointer-events-none absolute left-1/2 top-0 z-30 -translate-x-1/2 border-x-8 border-t-[10px] border-x-transparent border-t-crimson" />
            <span aria-hidden className="pointer-events-none absolute bottom-0 left-1/2 z-30 -translate-x-1/2 border-x-8 border-b-[10px] border-x-transparent border-b-crimson" />

            {/* 플래시 */}
            <AnimatePresence>
              {flash && (
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-40"
                  style={{ background: `radial-gradient(50% 100% at 50% 50%, ${glow(flash, 0.55)} 0%, transparent 70%)` }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                />
              )}
            </AnimatePresence>

            <motion.ul data-reel className="absolute left-0 top-1/2 flex -translate-y-1/2 items-center" style={{ gap: GAP, willChange: "transform" }} animate={controls} initial={{ x: 0 }}>
              {strip.map((it, i) => {
                const tier = tierOf(it.value, box.price);
                const isTarget = phase !== "spinning" && i === REEL_TARGET_INDEX;
                return (
                  <li
                    key={`${it.id}-${i}`}
                    className={cn("relative flex flex-none flex-col overflow-hidden rounded-lg bg-surface transition-shadow duration-300", isTarget ? "border-metallic-gold" : "border-metallic-subtle")}
                    style={{ width: TILE_W, boxShadow: isTarget ? `0 0 0 1px ${glow(tier.accent, 0.7)}, 0 0 36px ${glow(tier.accent, 0.5)}` : undefined }}
                  >
                    <span aria-hidden className="absolute inset-x-0 top-0 z-10 h-0.5" style={{ background: tier.accent, boxShadow: `0 0 8px ${glow(tier.accent, 0.6)}` }} />
                    <div className="relative" style={{ height: TILE_W - 24 }}>
                      <ProductArt image={it.image} alt="" accent={tier.accent} glowStrength={0.22} fallbackSize="sm" />
                    </div>
                    <div className="px-2 py-1.5">
                      <div className="truncate text-[10px] leading-tight text-white">{itemName(it)}</div>
                      <div className="font-mono text-[10px] font-bold tabular-nums" style={{ color: tier.accent }}>
                        {fmt(it.value)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </motion.ul>
          </div>

          <div className="mt-4 h-5 text-xs text-muted">
            {phase === "spinning" && t("spinning")}
            {phase === "landed" && last && (
              <span style={{ color: last.tier.accent }} className="font-semibold">
                {t("landing")} — {itemName(last.item)}
              </span>
            )}
          </div>
        </div>

        {/* ── 결과 팝업 ── */}
        <AnimatePresence>
          {phase === "results" && last && (
            <motion.div
              className="absolute inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 py-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="border-metallic-gold relative w-full max-w-lg rounded-2xl bg-canvas p-6"
                style={{ boxShadow: `0 0 80px ${glow(last.tier.accent, 0.3)}, 0 30px 80px rgba(0,0,0,0.8)` }}
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                <span aria-hidden className="pedestal-glow-strong pointer-events-none absolute inset-0 rounded-2xl" />

                {results.length === 1 ? (
                  <div className="relative text-center">
                    <div className="caption-luxury" style={{ color: last.tier.accent }}>
                      {last.tier.label} · {t("result")}
                    </div>
                    <div className="relative mx-auto mt-3 overflow-hidden rounded-xl" style={{ width: 240, height: 200 }}>
                      <ProductArt image={last.item.image} alt={itemName(last.item)} accent={last.tier.accent} glowStrength={0.4} fallbackSize="md" priority />
                    </div>
                    <h2 className="mt-4 text-2xl font-bold text-white">{itemName(last.item)}</h2>
                    <div className="mt-1">
                      <Money value={last.item.value} size="lg" numberClassName="text-gold-gradient" />
                    </div>
                    {!demo && <div className="mt-1 text-xs text-faint">{t("paid", { price: fmt(box.price) })}</div>}
                  </div>
                ) : (
                  <div className="relative">
                    <div className="caption-luxury">{t("results")}</div>
                    <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">
                      {results.map((r, i) => (
                        <li key={i} className="border-metallic-subtle flex items-center gap-3 rounded-md bg-surface p-2">
                          <div className="relative h-12 w-14 flex-none overflow-hidden rounded">
                            <ProductArt image={r.item.image} alt="" accent={r.tier.accent} glowStrength={0.25} fallbackSize="sm" />
                          </div>
                          <span className="caption-luxury w-20 flex-none" style={{ color: r.tier.accent }}>
                            {r.tier.label}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm text-white">{itemName(r.item)}</span>
                          <span className="font-mono text-sm font-bold tabular-nums" style={{ color: r.tier.accent }}>
                            {fmt(r.item.value)}
                          </span>
                          <button type="button" disabled={!r.ownedId} onClick={() => r.ownedId && setVerifyId(r.ownedId)} aria-label={t("verify")} title={t("verify")} className="glass-dark flex h-7 w-7 flex-none items-center justify-center rounded-md text-gold-champagne hover:border-gold-champagne disabled:opacity-40">
                            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex items-baseline justify-between border-t border-hairline pt-3">
                      <span className="caption-luxury">{t("total")}</span>
                      <Money value={totalValue} size="md" numberClassName="text-gold-gradient" />
                    </div>
                    <div className="text-right text-xs text-faint">{t("paid", { price: fmt(box.price * results.length) })}</div>
                  </div>
                )}

                {/* 데모: 전환 CTA 하나만 */}
                {demo ? (
                  <div className="relative mt-5 grid gap-2">
                    <p className="text-center text-sm font-semibold text-white">{t("demoCongrats", { item: itemName(last.item), n: tr("tiers.multiple", { n: formatMultiple(last.item.value / box.price) }) })}</p>
                    <p className="text-center text-xs text-secondary">{t("demoBody", { bonus: fmt(WELCOME_BONUS_USDT) })}</p>
                    <button type="button" onClick={() => onDemoConvert?.(box)} className="mt-2 flex h-12 items-center justify-center gap-2 rounded-lg bg-crimson text-sm font-bold text-white shadow-[0_0_24px_rgba(229,9,20,0.35)] transition-colors hover:bg-red-600">
                      <Play className="h-4 w-4 fill-current" strokeWidth={0} />
                      {welcomeClaimed ? t("demoCtaClaimed") : t("demoCta")}
                    </button>
                    <p className="text-center text-[10px] text-faint">{t("demoNote")}</p>
                    <button type="button" onClick={onClose} className="relative mt-1 h-10 w-full rounded-lg text-sm font-semibold text-muted transition-colors hover:text-white">
                      {t("close")}
                    </button>
                  </div>
                ) : (
                <>
                {/* 액션 */}
                <div className="relative mt-5 grid gap-2">
                  <button
                    type="button"
                    disabled={sold || shipped}
                    onClick={() => {
                      setSold(true);
                      const ids = results.map((r) => r.ownedId).filter((x): x is string => !!x);
                      const { totalUsdt } = sellOwned(ids, REFUND_RATE);
                      onSellBack(results, totalUsdt || sellAmount);
                    }}
                    className="flex h-12 items-center justify-center gap-2 rounded-lg bg-gold-champagne text-sm font-bold text-obsidian transition-colors hover:bg-gold-metallic disabled:opacity-50"
                  >
                    <Wallet className="h-4 w-4" strokeWidth={2.2} />
                    {results.length === 1 ? t("sellBack", { amount: fmt(sellAmount) }) : t("sellBackAll", { amount: fmt(sellAmount) })}
                  </button>
                  <p className="text-center text-[10px] text-faint">{t("sellBackNote", { rate: `${Math.round(REFUND_RATE * 100)}%` })}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" disabled={sold || shipped} onClick={() => setShipOpen(true)} className="glass flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50">
                      <Truck className="h-4 w-4" strokeWidth={2} />
                      {t("claimShipping")}
                    </button>
                    <button type="button" disabled={!last?.ownedId} onClick={() => last?.ownedId && setVerifyId(last.ownedId)} className="glass-dark flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-gold-champagne hover:border-gold-champagne disabled:opacity-50">
                      <ShieldCheck className="h-4 w-4" strokeWidth={2.2} />
                      {t("verify")}
                    </button>
                  </div>
                </div>

                {/* 공정성 메타 */}
                <details className="relative mt-4 rounded-md border border-hairline bg-obsidian p-3 text-[10px] text-faint">
                  <summary className="cursor-pointer text-muted">{t("fairNote")}</summary>
                  <dl className="mt-2 grid gap-1 font-mono">
                    <div><dt className="inline text-faint">{t("serverSeed")}: </dt><dd className="inline break-all text-secondary">{last.serverSeed}</dd></div>
                    <div><dt className="inline text-faint">{t("clientSeed")}: </dt><dd className="inline break-all text-secondary">{last.clientSeed}</dd></div>
                    <div><dt className="inline text-faint">{t("nonce")}: </dt><dd className="inline text-secondary">{results.map((r) => r.nonce).join(", ")}</dd></div>
                    <div><dt className="inline text-faint">{t("roll")}: </dt><dd className="inline text-secondary">{results.map((r) => r.roll.toLocaleString("en-US")).join(", ")}</dd></div>
                  </dl>
                </details>

                <p className="relative mt-3 text-center text-[10px] text-faint">
                  {sold ? "" : shipped ? "" : t("kept")}{" "}
                  <Link href="/inventory" className="text-gold-champagne underline-offset-2 hover:underline">
                    {t("keep")}
                  </Link>
                </p>
                <button type="button" onClick={onClose} className="relative mt-2 h-10 w-full rounded-lg text-sm font-semibold text-muted transition-colors hover:text-white">
                  {t("close")}
                </button>
                </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <ShippingModal
          open={shipOpen}
          itemCount={results.length}
          balanceUsdt={balance}
          onClose={() => setShipOpen(false)}
          onSubmit={(address: ShippingAddress, fee: number) => {
            if (!debit(fee)) return;
            const ids = results.map((r) => r.ownedId).filter((x): x is string => !!x);
            requestShipping(ids, address, fee);
            setShipped(true);
            setShipOpen(false);
            onShip(results);
          }}
        />
        <VisualVerifyModal item={verifyRecord} onClose={() => setVerifyId(null)} />
      </motion.div>
    </AnimatePresence>
  );
}

export default UnboxingRoulette;
