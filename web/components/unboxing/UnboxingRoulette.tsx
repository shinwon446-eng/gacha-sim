"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useReducedMotion, useMotionTemplate, useMotionValue } from "framer-motion";
import { useModal } from "@/lib/useModal";
import { MegaWinFX } from "@/components/unboxing/MegaWinFX";
import { useLocale, useTranslations } from "next-intl";
import { Wallet, Truck, ShieldCheck, X, Volume2, VolumeX, Play, SkipForward } from "lucide-react";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { useProductText } from "@/lib/useProductText";
import { dropTable, sellValueOf, REFUND_RATE, type ProductBox, type ProductItem } from "@/lib/products";
import { formatMultiple, glow, tierOf, type Tier } from "@/lib/tiers";
import { canAfford, netOf, remainingSpins, stopReasonAfter, type AutoplayConfig, type AutoplayState, type StopReason } from "@/lib/autoplay";
import { REEL_DURATION_MULTI_S, REEL_DURATION_S, REEL_EASE, REEL_TARGET_INDEX, buildStrip, offsetForTarget, unitRandom, type NearMissSide } from "@/lib/reel";
import { useFairStore } from "@/stores/fairStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { playTick, playWin, playTaDum, playTension, playGlitch } from "@/lib/audio";
import { VaultGateFX, GATE_TOTAL_MS } from "@/components/unboxing/VaultGateFX";
import { UpgradeFX, UPGRADE_FX_MS } from "@/components/unboxing/UpgradeFX";
import { ProductArt } from "@/components/box/ProductArt";
import { Money } from "@/components/ui/Money";
import { VisualVerifyModal } from "@/components/fairness/VisualVerifyModal";
import { DeliveryModal } from "@/components/inventory/DeliveryModal";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useTelemetryStore } from "@/stores/telemetryStore";
import { CRYPTO_ONLY, type FundingRatio } from "@/lib/funding";
import { useWalletStore, WELCOME_BONUS_USDT } from "@/stores/walletStore";
import type { ShippingAddress } from "@/lib/shipping";
import { createOpeningPurchase, InsufficientOpeningBalance, type OpeningResult } from "@/lib/opening";
import { Link } from "@/i18n/navigation";

export interface UnboxResult {
  /** 보관함 레코드 id, 결과 확정 시 부여 */
  ownedId?: string;
  /** USDT 캐시백, 인스턴트 드롭, 개봉 즉시 100% 잔액에 적립돼 회수, 배송 대상이 아니다 */
  settled?: boolean;
  /** 오토플레이 자동 환전액(USDT), 있으면 이미 잔액에 반영됨 */
  autoSold?: number;
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
  prepared?: OpeningResult[];
  onDeposit?: () => void;
  /** 1 또는 5 */
  count: number;
  onClose: () => void;
  /** 즉시 판매, 호출측이 잔액에 반영한다 */
  onSellBack: (results: UnboxResult[], amountUsdt: number, split?: { toCrypto: number; toCard: number }) => void;
  /** 배송 신청 완료, 호출측이 토스트를 띄운다 (배송비 차감, 상태 전환은 여기서) */
  onShip: (results: UnboxResult[]) => void;
  /** 결과가 전부 USDT 캐시백일 때 [다시 돌리기], 호출측이 같은 박스를 다시 연다 */
  onRespin?: (box: ProductBox) => void;
  /** 오토플레이, 스핀마다 가격을 차감하고 규칙(lib/autoplay)에 따라 멈춘다. count 는 무시된다 */
  auto?: AutoplayConfig;
  /** 이 개봉에 쓰인 잔액의 원천 비율, 당첨 아이템 족보로 박힌다 (호출측 debitSplit 결과) */
  funding?: FundingRatio;
  /**
   * 무료 체험 모드 (CLAUDE.md §4-A). 지정 항목으로 결과를 고정하고 잔액, 보관함, 공정성 nonce 를 건드리지 않는다.
   * 결과 팝업은 전환 CTA(웰컴 보너스) 하나만 보여준다.
   */
  demo?: { itemId: string };
  /** 데모 팝업의 전환 CTA, 호출측이 보너스 지급, 실제 박스 열기를 처리한다 */
  onDemoConvert?: (box: ProductBox) => void;
  /** 웰컴 보너스 수령 여부, CTA 문구 분기 */
  welcomeClaimed?: boolean;
}

type Phase = "idle" | "gate" | "spinning" | "landed" | "results";
/** 승급 반전(잭팟을 0.5초 꽝처럼 보여준 뒤 각성) 빈도 */
/** 니어미스 텐션 셰이크 길이 */
const SHAKE_MS = 400;

const TILE_W = 148;
const GAP = 10;

/**
 * 시네마틱 룰렛 언박싱 (PROMPTS 3-2-2).
 *
 * 순서, 이 순서가 공정성의 전부다:
 *   1. 결과 확정: Provably Fair 엔진이 (serverSeed, clientSeed, nonce) 로 롤과 항목을 낸다
 *   2. 스트립: 결과를 target 칸에 심고 나머지는 확률표 가중으로 채운다
 *   3. 연출: 88칸이 초고속으로 흐르다 cubic-bezier(0.12,0.8,0.33,1) 로 감속해 중앙 인디케이터에 정지
 *   4. 정지: 등급색 플래시 + 승리 징글 → 결과 팝업(사진, 등급, 가치, 시드, nonce)
 * 연출(3)은 결과(1)를 바꿀 수 없다. 5연속은 1~3 을 짧게 반복하고 마지막에 목록으로 보여준다.
 */
export function UnboxingRoulette({ box, count, onClose, onSellBack, onShip, onRespin, auto, funding, demo, onDemoConvert, welcomeClaimed, prepared, onDeposit }: UnboxingRouletteProps) {
  const reducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("unbox");
  const locale = useLocale();
  const tr = useTranslations();
  const { fmt } = useCurrency();
  const { boxTitle, itemName } = useProductText();
  const fair = useFairStore();
  const muted = useSettingsStore((s) => s.muted);
  const toggleMuted = useSettingsStore((s) => s.toggleMuted);

  // 릴 x 는 모션 값으로 직접 몬다, animate() 컨트롤의 speed 를 스핀 중에 바꿔 텐션(0.3배속)을 건다
  const x = useMotionValue(0);
  const blurMv = useMotionValue(0);
  const blurFilter = useMotionTemplate`blur(${blurMv}px)`;
  const stripRef = useRef<ProductItem[]>([]);
  const [tension, setTension] = useState(false);
  const [mega, setMega] = useState<string | null>(null);
  // 오토플레이 진행 상태, 남은 회전 , 누적 투입/획득 , 정지 사유
  const [autoState, setAutoState] = useState<AutoplayState>({ done: 0, spent: 0, won: 0 });
  // 도파민 엔진: 니어미스 셰이크 , 승급 반전 , 문지기 컷인
  const [shake, setShake] = useState(false);
  const nearMissRef = useRef<NearMissSide | null>(null);
  const [disguise, setDisguise] = useState<ProductItem | null>(null);
  const [upgradeFx, setUpgradeFx] = useState<string | null>(null);
  const [autoStop, setAutoStop] = useState<StopReason>(null);
  const stopRef = useRef(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const viewportW = useRef(0);
  const [openError, setOpenError] = useState(false);
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
  const sellOwned = useInventoryStore((s) => s.sell);
  const requestShipping = useInventoryStore((s) => s.requestShipping);
  const balance = useWalletStore((s) => s.balance);
  const debit = useWalletStore((s) => s.debit);
  const credit = useWalletStore((s) => s.credit);
  const creditSplit = useWalletStore((s) => s.creditSplit);
  /** 이번 개봉(또는 오토플레이 스핀)에 쓰인 잔액 원천, 아이템 족보로 박힌다 */
  const addTransaction = useWalletStore((s) => s.addTransaction);
  const tickIndex = useRef(-1);
  const rafRef = useRef<number | null>(null);
  const cancelled = useRef(false);
  const skipRef = useRef(false);
  const [skipRequested, setSkipRequested] = useState(false);
  const activeAnimation = useRef<{ complete: () => void } | null>(null);
  const wakePresentation = useRef<(() => void) | null>(null);
  const waitPresentation = (ms: number) => new Promise<void>((resolve) => {
    if (skipRef.current) { resolve(); return; }
    const timer = setTimeout(() => { wakePresentation.current = null; resolve(); }, ms);
    wakePresentation.current = () => { clearTimeout(timer); wakePresentation.current = null; resolve(); };
  });
  const skipPresentation = () => {
    skipRef.current = true;
    if (auto) stopRef.current = true;
    setSkipRequested(true);
    wakePresentation.current?.();
    activeAnimation.current?.complete();
  };
  const closePresentation = () => { if (phase === "results") onClose(); else skipPresentation(); };

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

  // 틱 사운드, 릴 x 를 rAF 로 읽어 칸이 바뀔 때마다 한 번
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
    async (duration: number, allocated?: UnboxResult): Promise<UnboxResult> => {
      if (!box) throw new Error("box 없음");
      // 매크로 봇 탐지용 스핀 간격 기록, 무료 체험은 제외 (lib/fraudScoring.ts)
      if (!demo) useTelemetryStore.getState().recordSpin();
      let res: UnboxResult;
      let item: ProductItem;
      if (demo) {
        // 무료 체험: 결과 고정, 시드, nonce, 보관함 모두 건드리지 않는다
        item = items.find((i) => i.id === demo.itemId) ?? items[0];
        res = { item, tier: tierOf(item.value, box.price), roll: 0, hmac: "", nonce: 0, serverSeed: "", serverSeedHash: "", clientSeed: "" };
      } else {
        res = allocated ?? (await createOpeningPurchase(box, 1)())[0];
        item = res.item;
      }
      if (skipRef.current || cancelled.current) return res;

      const built = buildStrip(item, items, unitRandom);
      const jitter = 0;
      nearMissRef.current = null;
      stripRef.current = built;
      setStrip(built);
      setCurrent(null);
      setPhase("spinning");
      x.set(0);
      blurMv.set(0);
      setTension(false);
      await new Promise((r) => requestAnimationFrame(() => r(null)));

      // 3. 감속
      const target = offsetForTarget({ tileWidth: TILE_W, gap: GAP, viewportWidth: viewportW.current }, REEL_TARGET_INDEX, jitter);
      const track = viewportRef.current?.querySelector<HTMLElement>("[data-reel]");
      if (track && !reducedMotion) startTicks(track);
      // Phase 1 초광속(속도 → 모션 블러) , Phase 2 안티시페이션(고등급 근처 0.3배속 + 스파크)
      const step = TILE_W + GAP;
      const isHigh = (i: number) => {
        const it = stripRef.current[i];
        if (!it) return false;
        const k = tierOf(it.value, box.price).key;
        return k === "royal" || k === "prestige";
      };
      let lastV = 0;
      let lastT = performance.now();
      let tense = false;
      const anim = animate(x, target, {
        duration: reducedMotion ? 0.01 : duration,
        ease: REEL_EASE,
        onUpdate: (v) => {
          if (reducedMotion) return;
          const now = performance.now();
          const dt = Math.max(1, now, lastT);
          const vel = (Math.abs(v, lastV) / dt) * 1000; // px/s (60타일/초 ≈ 9,500px/s)
          lastV = v;
          lastT = now;
          blurMv.set(Math.min(14, Math.max(0, (vel, 1200) / 550)));
          const progress = target === 0 ? 1 : v / target;
          const idx = Math.floor((-v + viewportW.current / 2) / step);
          const nm = nearMissRef.current !== null;
          // 쇼케이스 타일 근처(55~96.5%)는 0.3배속. 니어미스는 경계 직전(92% 이후)만 슬로우 모션, 전체가 늘어지지 않게
          const showcaseNear = progress > 0.7 && progress < 0.965 && idx < REEL_TARGET_INDEX, 1 && (isHigh(idx) || isHigh(idx + 1));
          const nearMissNear = nm && progress > 0.996 && progress < 0.9995 && idx >= REEL_TARGET_INDEX, 1 && idx <= REEL_TARGET_INDEX;
          const near = showcaseNear || nearMissNear;
          if (near !== tense) {
            tense = near;
            anim.speed = near ? 0.3 : 1;
            setTension(near);
          }
        },
      });
      activeAnimation.current = anim;
      if (skipRef.current) anim.complete();
      await anim;
      activeAnimation.current = null;
      blurMv.set(0);
      setTension(false);
      stopTicks();
      // 니어미스 텐션 셰이크: 인디케이터 0.4초 미세 진동 + 릴 ±1.5px 멈칫 (경계는 넘지 않는다)
      if (skipRef.current || cancelled.current) return res;
      if (!reducedMotion && nearMissRef.current) {
        setShake(true);
        if (!useSettingsStore.getState().muted) playTension();
        const dir = nearMissRef.current === "left" ? 1 : -1;
        await animate(x, [target, target + dir * 1.5, target, dir * 1, target + dir * 1.2, target], { duration: SHAKE_MS / 1000, ease: "easeInOut" });
        setShake(false);
      }

      // 4. 정지
      setCurrent(res);
      setPhase("landed");
      const big = res.tier.key === "royal" || res.tier.key === "prestige";
      setFlash(big ? res.tier.accent : "#E50914");
      if (big) {
        setMega(res.tier.accent);
        setTimeout(() => setMega(null), 3200);
      }
      if (!useSettingsStore.getState().muted) playWin(res.tier.key === "royal" || res.tier.key === "prestige" ? "jackpot" : res.tier.key === "executive" ? "value" : "start");
      setTimeout(() => setFlash(null), 600);
      return res;
    },
    [box, items, fair, x, blurMv, startTicks, sellOwned, credit, addTransaction, demo, auto, count, reducedMotion],
  );

  // 오픈 시작, box 가 들어오면 한 번. 리사이즈는 스핀을 취소하지 않는다.
  useEffect(() => {
    if (!box || phase !== "idle") return;
    cancelled.current = false;
    skipRef.current = false;
    stopRef.current = false;
    setSkipRequested(false);
    (async () => {
      // 뷰포트 폭이 측정될 때까지 한두 프레임 기다린다
      for (let i = 0; i < 20 && viewportW.current === 0; i++) await new Promise((r) => requestAnimationFrame(() => r(null)));
      if (cancelled.current) return;
      if (!reducedMotion && !demo && !auto) {
        // 3단계 문지기 컷인, 휠 잠금 해제 → 틈새 아우라 → 암전, 심장 박동
        setPhase("gate");
        await waitPresentation(GATE_TOTAL_MS);
        if (cancelled.current) return;
      }
      if (!muted) playTaDum();
      const out: UnboxResult[] = [];
      if (auto) {
        // ── 오토플레이: 스핀마다 차감 → 스핀 → (자동 환전) → 정지 규칙 ──

        const st: AutoplayState = { done: 0, spent: 0, won: 0 };
        setAutoState({ ...st });
        setAutoStop(null);
        let reason: StopReason = null;
        while (!cancelled.current) {
          if (stopRef.current) { reason = "manual"; break; }
          if (!canAfford(useWalletStore.getState().balance, box.price)) { reason = "balance"; break; }
          let r: UnboxResult;
          try { r = await spinOnce(REEL_DURATION_MULTI_S); }
          catch (error) {
            if (error instanceof InsufficientOpeningBalance) { reason = "balance"; break; }
            setOpenError(true); reason = "manual"; break;
          }
          st.spent = +(st.spent + box.price).toFixed(2);
          if (cancelled.current) return;
          st.done += 1;
          st.won = +(st.won + r.item.value).toFixed(2);
          if (auto.autoSell && !r.settled && r.ownedId) {
            const { totalUsdt, toCrypto, toCard } = sellOwned([r.ownedId], REFUND_RATE);
            creditSplit(toCrypto, toCard);
            addTransaction({ type: "sellback", amountUsdt: totalUsdt, ref: `${r.item.id}:auto` });
            r.settled = true;
            r.autoSold = totalUsdt;
          }
          out.push(r);
          setResults([...out]);
          setAutoState({ ...st });
          reason = stopReasonAfter(auto, st, { tier: r.tier.key, value: r.item.value }, box.price);
          if (reason) break;
          await waitPresentation(550);
        }
        setAutoStop(reason ?? "manual");
        setPhase("results");
        return;
      }
      const n = Math.max(1, count);
      for (let i = 0; i < n; i++) {
        if (cancelled.current) return;
        const r = await spinOnce(n > 1 ? REEL_DURATION_MULTI_S : REEL_DURATION_S, prepared?.[i]);
        out.push(r);
        setResults([...out]);
        if (i < n, 1) await waitPresentation(700);
      }
      setPhase("results");
    })().catch(() => {
      if (cancelled.current) return;
      setOpenError(true);
      if (prepared) setResults(prepared);
      setPhase("results");
    });
    return () => {
      cancelled.current = true;
      stopTicks();
      x.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box]);

  // 닫힐 때 상태 리셋
  useEffect(() => {
    if (box) return;
    setPhase("idle");
    setOpenError(false);
    setSkipRequested(false);
    setStrip([]);
    setResults([]);
    setCurrent(null);
    setSold(false);
    setShipped(false);
    setShipOpen(false);
    setShake(false);
    setDisguise(null);
    setUpgradeFx(null);
    nearMissRef.current = null;
  }, [box]);

  useModal(Boolean(box), closePresentation, phase === "results" && results.length > 0 ? resultRef : panelRef);

  if (!box) return null;

  const totalValue = results.reduce((s, r) => s + r.item.value, 0);
  const pending = results.filter((r) => !r.settled);
  const settledAmount = +results.filter((r) => r.settled).reduce((s, r) => s + r.item.value, 0).toFixed(2);
  const sellAmount = +pending.reduce((s, r) => s + sellValueOf(r.item), 0).toFixed(2);
  const allSettled = results.length > 0 && pending.length === 0;
  const last = results[results.length, 1] ?? current;
  // 승급 반전 중에는 바닥 아이템으로 위장해 보여준다
  const shownItem = disguise ?? last?.item ?? null;
  const shownTier = disguise && box ? tierOf(disguise.value, box.price) : (last?.tier ?? null);
  const shownSettled = disguise ? true : !!last?.settled;

  return (
    <AnimatePresence>
      <motion.div
        key="unbox"
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={boxTitle(box)}
        className="outline-none fixed inset-0 z-[100] flex flex-col bg-obsidian backdrop-blur-sm md:bg-obsidian/95"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* 상단 바 */}
        <header className="flex items-center gap-3 px-4 py-3 md:px-8">
          <div className="min-w-0">
            <div className={cn("caption-luxury", demo && "!text-gold-champagne")}>{demo ? t("trialLabel") : count > 1 ? t("openCountLabel", { n: count }) : t("open1")}</div>
            <div className="truncate font-display text-lg font-bold uppercase tracking-tight text-white md:text-2xl">{boxTitle(box)}</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className={cn("hidden max-w-xs truncate font-mono text-xs text-faint md:inline", demo && "md:hidden")} title={fair.serverSeedHash}>
              {t("seedHash")}: {fair.serverSeedHash.slice(0, 16)}…
            </span>
            <button type="button" onClick={toggleMuted} aria-label={muted ? t("unmute") : t("mute")} className="glass-dark flex h-11 w-11 items-center justify-center rounded-md text-muted hover:text-white">
              {muted ? <VolumeX className="h-4 w-4" strokeWidth={2} /> : <Volume2 className="h-4 w-4" strokeWidth={2} />}
            </button>
            <button type="button" onClick={closePresentation} aria-label={t(phase === "results" ? "close" : "skipToResults")} className="glass-dark flex h-11 w-11 items-center justify-center rounded-md text-muted hover:text-white disabled:opacity-40">
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </header>

        {/* ── Phase 3: 메가 윈 폭발 축제 , 승급 반전 번개 , 문지기 컷인 ── */}
        {!demo && phase !== "results" && <div className="mx-4 flex flex-col gap-3 rounded-xl border border-hairline bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:mx-8">
          <p className="max-w-2xl text-sm leading-relaxed text-secondary">{t(auto ? "autoCloseNote" : "batchCloseNote", { n: count })}</p>
          <button type="button" onClick={skipPresentation} disabled={skipRequested} className="btn-secondary flex min-h-11 shrink-0 items-center justify-center gap-2 px-4 disabled:opacity-50"><SkipForward size={16} />{t(skipRequested ? "finishingBatch" : "skipToResults")}</button>
        </div>}
        {phase === "results" && results.length === 0 && <div className="m-auto max-w-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-white">{t(openError ? "openFailed" : autoStop === "balance" ? "insufficientAuto" : "autoStoppedEmpty")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-secondary">{t(openError ? "openFailedBody" : autoStop === "balance" ? "topUp" : "noPurchaseMade")}</p>
          {autoStop === "balance" && <button type="button" onClick={onDeposit} className="btn-primary mt-5 min-h-12 w-full">{t("topUpAction")}</button>}
          <button type="button" onClick={onClose} className="btn-secondary mt-3 min-h-12 w-full">{t("close")}</button>
        </div>}

        <AnimatePresence>{!reducedMotion && mega && <MegaWinFX key="mega" accent={mega} />}</AnimatePresence>
        <AnimatePresence>{!reducedMotion && upgradeFx && <UpgradeFX key="upgrade" accent={upgradeFx} />}</AnimatePresence>
        <AnimatePresence>{!reducedMotion && phase === "gate" && <VaultGateFX key="gate" />}</AnimatePresence>

        {/* ── 룰렛 스트립 ── */}
        <div className={cn("relative flex flex-1 flex-col items-center justify-center px-0", phase === "results" && results.length === 0 && "hidden")}>
          {count > 1 && (
            <div className="mb-3 flex w-full max-w-md items-center gap-1.5 px-4">
              {Array.from({ length: count }, (_, i) => (
                <span key={i} className={cn("h-1.5 min-w-0 flex-1 rounded-full transition-colors", i < results.length ? "bg-gold-champagne" : i === results.length && phase !== "results" ? "bg-white/60" : "bg-white/15")} />
              ))}
            </div>
          )}

          <div ref={viewportRef} className={cn("reel-viewport relative w-full overflow-hidden transition-shadow duration-200", !reducedMotion && tension && "reel-tension")} style={{ height: TILE_W + 70 }}>
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-20 w-32 bg-gradient-to-r from-obsidian to-transparent" />
            <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-20 w-32 bg-gradient-to-l from-obsidian to-transparent" />

            {/* 중앙 인디케이터, 레드/골드 */}
            <span aria-hidden className={cn("pointer-events-none absolute inset-y-0 left-1/2 z-30 w-0.5 -translate-x-1/2 bg-gold-champagne", !reducedMotion && shake && "marker-shake")} />
            <span aria-hidden className="pointer-events-none absolute left-1/2 top-0 z-30 -translate-x-1/2 border-x-8 border-t-[10px] border-x-transparent border-t-gold-champagne" />
            <span aria-hidden className="pointer-events-none absolute bottom-0 left-1/2 z-30 -translate-x-1/2 border-x-8 border-b-[10px] border-x-transparent border-b-gold-champagne" />

            {/* 플래시 */}
            <AnimatePresence>
              {!reducedMotion && flash && (
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

            <motion.ul aria-hidden="true" data-reel className="absolute left-0 top-1/2 flex items-center" style={{ gap: GAP, willChange: "transform, filter", x, y: "-50%", filter: blurFilter }}>
              {strip.map((it, i) => {
                const tier = tierOf(it.value, box.price);
                const isTarget = phase !== "spinning" && i === REEL_TARGET_INDEX;
                return (
                  <li
                    key={`${it.id}-${i}`}
                    className={cn("relative flex flex-none flex-col overflow-hidden rounded-lg bg-surface transition-shadow duration-300", isTarget ? "border border-hairline" : "border border-hairline")}
                    style={{ width: TILE_W, boxShadow: isTarget ? `0 0 0 1px ${glow(tier.accent, 0.7)}, 0 0 36px ${glow(tier.accent, 0.5)}` : undefined }}
                  >
                    <span aria-hidden className="absolute inset-x-0 top-0 z-10 h-0.5" style={{ background: tier.accent, boxShadow: `0 0 8px ${glow(tier.accent, 0.6)}` }} />
                    <div className="relative" style={{ height: TILE_W, 24 }}>
                      <ProductArt image={it.image} alt="" accent={tier.accent} glowStrength={0.22} fallbackSize="sm" kind={it.kind} />
                    </div>
                    <div className="px-2 py-1.5">
                      <div className="truncate text-xs leading-tight text-white">{itemName(it)}</div>
                      <div className="font-mono text-xs font-bold tabular-nums" style={{ color: tier.accent }}>
                        {fmt(it.value)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </motion.ul>
          </div>

          {auto && phase !== "results" && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  skipPresentation();
                }}
                disabled={skipRequested}
                className="flex h-12 items-center gap-2 rounded-lg border border-hairline bg-surface px-6 text-sm font-bold text-white  transition-colors hover:bg-elevation disabled:opacity-60"
              >
                {/* 라벨(autoStop)에 ⏹ 이모지가 이미 있다, lucide 아이콘을 같이 두면 ■■ 로 겹친다 */}
                {t("autoStop", { n: Number.isFinite(remainingSpins(auto, autoState.done)) ? String(remainingSpins(auto, autoState.done)) : "∞" })}
              </button>
              <div className="flex items-center gap-3 font-mono text-xs tabular-nums text-muted">
                <span>{t("autoSpent")} <span className="text-white">{fmt(autoState.spent)}</span></span>
                <span>{t("autoWon")} <span className="text-gold-champagne">{fmt(autoState.won)}</span></span>
                <span className={netOf(autoState) >= 0 ? "text-tier-prestige" : "text-crimson"}>{netOf(autoState) >= 0 ? "+" : ""}{fmt(netOf(autoState))}</span>
              </div>
            </div>
          )}
          <div className="mt-4 h-5 text-xs text-muted">
            {phase === "spinning" && !auto && t("spinning")}
            {phase === "landed" && last && (
              <span style={{ color: last.tier.accent }} className="font-semibold">
                {t("landing")}, {itemName(last.item)}
              </span>
            )}
          </div>
        </div>

        {/* ── 결과 팝업 ── */}
        <AnimatePresence>
          {(phase === "results" || (phase === "landed" && disguise)) && last && (
            <motion.div
              className="absolute inset-0 z-50 flex items-start justify-center overflow-y-auto bg-obsidian/80 px-4 py-6 sm:items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                ref={resultRef}
                tabIndex={-1}
                className="outline-none border border-hairline relative my-auto w-full max-w-lg rounded-xl bg-surface p-5 sm:p-7"

                initial={reducedMotion ? false : { opacity: 0, scale: 0.98, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >

                {!demo && <p className="mb-4 rounded-lg border border-hairline bg-obsidian px-4 py-3 text-sm leading-relaxed text-secondary">{t("batchComplete", { n: results.length })}</p>}
                {autoStop === "balance" && <button type="button" onClick={onDeposit} className="btn-primary mb-4 min-h-12 w-full">{t("topUpAction")}</button>}
                {results.length === 1 ? (
                  <div className="relative text-center">
                    <div className="caption-luxury" style={{ color: shownTier.accent }}>
                      {shownTier.label} , {t("result")}
                    </div>
                    <motion.div
                      className="relative mx-auto mt-3 overflow-hidden rounded-xl"
                      style={{ width: "min(100%, 240px)", height: 200 }}
                      initial={reducedMotion ? false : { scale: 0.97, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 180, damping: 18, mass: 0.9 }}
                    >
                      <ProductArt image={shownItem.image} alt={itemName(shownItem)} accent={shownTier.accent} kind={shownItem.kind} glowStrength={0.4} fallbackSize="md" priority />
                    </motion.div>
                    <h2 className="mt-4 text-2xl font-bold text-white">{itemName(shownItem)}</h2>
                    <div className="mt-1">
                      <Money value={shownItem.value} size="lg" numberClassName="text-gold-champagne" />
                    </div>
                    {!demo && <div className="mt-1 text-xs text-faint">{t("paid", { price: fmt(box.price) })}</div>}
                    {shownSettled && (
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gold-champagne/50 bg-gold-champagne/10 px-3 py-1 text-xs font-bold text-gold-champagne">
                        ⚡ {t("cashCredited", { amount: fmt(shownItem.value) })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <div className="caption-luxury">{t("results", { n: results.length })}</div>
                    <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">
                      {results.map((r, i) => (
                        <li key={i} className="border border-hairline flex items-center gap-3 rounded-md bg-surface p-2">
                          <div className="relative h-12 w-14 flex-none overflow-hidden rounded">
                            <ProductArt image={r.item.image} alt="" accent={r.tier.accent} glowStrength={0.25} kind={r.item.kind} fallbackSize="sm" />
                          </div>
                          <span className="caption-luxury hidden w-20 flex-none sm:inline" style={{ color: r.tier.accent }}>
                            {r.tier.label}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm text-white">{itemName(r.item)}</span>
                          <span className="font-mono text-sm font-bold tabular-nums" style={{ color: r.tier.accent }}>
                            {fmt(r.item.value)}
                          </span>
                          <button type="button" disabled={!r.ownedId} onClick={() => r.ownedId && setVerifyId(r.ownedId)} aria-label={t("verify")} title={t("verify")} className="glass-dark flex h-11 w-11 flex-none items-center justify-center rounded-md text-gold-champagne hover:border-gold-champagne disabled:opacity-40">
                            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex items-baseline justify-between border-t border-hairline pt-3">
                      <span className="caption-luxury">{t("total")}</span>
                      <Money value={totalValue} size="md" numberClassName="text-gold-champagne" />
                    </div>
                    <div className="text-right text-xs text-faint">{t("paid", { price: fmt(box.price * results.length) })}</div>
                    {auto && (
                      <div className={cn("mt-2 flex items-center justify-between rounded-md border px-3 py-2 text-xs", netOf(autoState) >= 0 ? "border-tier-prestige/40 bg-tier-prestige/10 text-tier-prestige" : "border-crimson/40 bg-crimson/10 text-crimson")}>
                        <span className="font-semibold">{t(`autoStopped.${autoStop ?? "manual"}`)}</span>
                        <span className="font-mono font-bold tabular-nums">{t("autoNet")} {netOf(autoState) >= 0 ? "+" : ""}{fmt(netOf(autoState))}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 데모: 전환 CTA 하나만 */}
                {demo ? (
                  <div className="relative mt-5 grid gap-2">
                    <p className="break-keep text-center text-sm font-semibold leading-snug text-white">{t("trialCongrats", { item: itemName(last.item), n: tr("tiers.multiple", { n: formatMultiple(last.item.value / box.price) }) })}</p>
                    <p className="break-keep text-center text-xs text-secondary">{t("trialBody", { bonus: fmt(WELCOME_BONUS_USDT) })}</p>
                    <button type="button" onClick={() => onDemoConvert?.(box)} className="mt-2 flex h-12 items-center justify-center gap-2 rounded-lg bg-[#f1eee7] text-sm font-semibold text-obsidian transition-colors hover:bg-gold-champagne">
                      <Play className="h-4 w-4 fill-current" strokeWidth={0} />
                      {welcomeClaimed ? t("trialCtaClaimed") : t("trialCta")}
                    </button>
                    <p className="break-keep text-center text-xs leading-relaxed text-faint">{t("trialNote")}</p>
                    <button type="button" onClick={onClose} className="relative mt-1 h-11 w-full rounded-lg text-sm font-semibold text-muted transition-colors hover:text-white">
                      {t("close")}
                    </button>
                  </div>
                ) : (
                <>
                {/* 액션, 즉시 회수와 집으로 배송을 같은 비중으로. 승급 반전 위장 중에는 진짜 금액이 새지 않게 숨긴다 */}
                <div className={cn("relative mt-5 grid gap-2", disguise && "invisible")}>
                  {settledAmount > 0 && results.length > 1 && (
                    <p className="break-keep text-center text-xs font-semibold text-gold-champagne">⚡ {t("cashCredited", { amount: fmt(settledAmount) })}</p>
                  )}
                  {allSettled ? (
                    <button
                      type="button"
                      onClick={() => onRespin?.(box)}
                      disabled={!onRespin}
                      className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#f1eee7] text-sm font-semibold text-obsidian transition-colors hover:bg-gold-champagne disabled:opacity-50"
                    >
                      <Play className="h-4 w-4 fill-current" strokeWidth={0} />
                      {t("respin", { price: fmt(box.price) })}
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={sold || shipped}
                        onClick={() => {
                          setSold(true);
                          const ids = pending.map((r) => r.ownedId).filter((x): x is string => !!x);
                          const { totalUsdt, toCrypto, toCard } = sellOwned(ids, REFUND_RATE);
                          onSellBack(pending, totalUsdt, { toCrypto, toCard });
                        }}
                        className="flex h-14 flex-col items-center justify-center rounded-lg bg-[#f1eee7] px-3 text-obsidian transition-colors hover:bg-gold-champagne disabled:opacity-50"
                      >
                        <span className="flex items-center gap-1.5 text-sm font-bold leading-none">
                          <Wallet className="h-4 w-4" strokeWidth={2.2} />
                          {t("cashoutCta")}
                        </span>
                        <span className="mt-1 font-mono text-xs font-bold leading-none tabular-nums">{fmt(sellAmount)} , {t("noFee")}</span>
                      </button>
                      <button
                        type="button"
                        disabled={sold || shipped}
                        onClick={() => setShipOpen(true)}
                        className="glass flex h-14 flex-col items-center justify-center rounded-lg px-2 text-white hover:bg-white/15 disabled:opacity-50"
                      >
                        <span className="flex items-center gap-1.5 text-sm font-bold leading-none">
                          <Truck className="h-4 w-4" strokeWidth={2} />
                          {t("claimShipping")}
                        </span>
                        <span className="mt-1 text-xs leading-none text-secondary">{t("shipSub")}</span>
                      </button>
                    </div>
                  )}
                  <button type="button" disabled={!last?.ownedId} onClick={() => last?.ownedId && setVerifyId(last.ownedId)} className="glass-dark flex h-11 items-center justify-center gap-2 rounded-lg text-xs font-semibold text-gold-champagne hover:border-gold-champagne disabled:opacity-50">
                    <ShieldCheck className="h-4 w-4" strokeWidth={2.2} />
                    {t("verify")}
                  </button>
                </div>

                {/* 공정성 메타 */}
                <details className="relative mt-4 rounded-md border border-hairline bg-obsidian p-3 text-xs text-faint">
                  <summary className="min-h-11 cursor-pointer py-3 text-muted">{t("fairNote")}</summary>
                  <dl className="mt-2 grid gap-1 font-mono">
                    <div><dt className="inline text-faint">{t("serverSeed")}: </dt><dd className="inline break-all text-secondary">{last.serverSeed}</dd></div>
                    <div><dt className="inline text-faint">{t("clientSeed")}: </dt><dd className="inline break-all text-secondary">{last.clientSeed}</dd></div>
                    <div><dt className="inline text-faint">{t("nonce")}: </dt><dd className="inline text-secondary">{results.map((r) => r.nonce).join(", ")}</dd></div>
                    <div><dt className="inline text-faint">{t("roll")}: </dt><dd className="inline text-secondary">{results.map((r) => r.roll.toLocaleString("en-US")).join(", ")}</dd></div>
                  </dl>
                </details>

                <p className="relative mt-3 text-center text-xs text-faint">
                  {sold ? "" : shipped ? "" : t("kept")}{" "}
                  <Link href="/inventory" className="text-gold-champagne underline-offset-2 hover:underline">
                    {t("keep")}
                  </Link>
                  <span className="mt-2 block text-xs leading-6 text-secondary">{locale === "ko" ? "보관함 보관 기한은 30일이며, 30일 미사용 시 상품 가치의 95% 캐시백(USDT)으로 자동 전환됩니다." : locale === "zh" ? "保管期限为30天。30天未使用的商品将自动转换为商品价值95%的返现（USDT）。" : "Items can be stored for 30 days. After 30 days without use, they are automatically converted to 95% cashback (USDT)."}</span>
                </p>
                <button type="button" onClick={onClose} className="relative mt-2 h-11 w-full rounded-lg text-sm font-semibold text-muted transition-colors hover:text-white">
                  {t("close")}
                </button>
                </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <DeliveryModal
          open={shipOpen}
          itemCount={results.length}
          balanceUsdt={balance}
          onClose={() => setShipOpen(false)}
          onSubmit={(address: ShippingAddress, fee: number) => {
            const split = fee > 0 ? useWalletStore.getState().debitSplit(fee) : null;
            if (fee > 0 && !split) return;
            const ids = results.map((r) => r.ownedId).filter((x): x is string => !!x);
            requestShipping(ids, address, fee, split?.ratio);
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
