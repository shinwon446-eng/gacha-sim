"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useInView, useReducedMotion } from "framer-motion";
import { ArrowRight, BadgeCheck, Check, Coins, Home, Info, Package, PackageCheck, RotateCcw, ShieldCheck, Sparkles, Truck, Wallet, Zap } from "lucide-react";
import { cn } from "@/lib/format";
import { BOXES, BOX_BY_SLUG, dropTable, sellValueOf, type ProductItem } from "@/lib/products";
import { ROLL_RANGE, determineItem } from "@/lib/fairness";
import { INSTANT_SELLBACK_RATE, publishedOddsRows } from "@/lib/aboutStats";
import { useProductText } from "@/lib/useProductText";
import { ProductArt } from "@/components/box/ProductArt";
import { Money } from "@/components/ui/Money";
import { Approx } from "@/components/ui/Approx";

/**
 * /about 섹션 모음 — 줄글 대신 "보면 이해되는" 비주얼.
 *
 * 화면의 모든 숫자는 카탈로그와 정책 상수에서 계산한다(배수 = 최고 상품가 ÷ 박스 가격, 환급 = sellValueOf).
 * 애니메이션은 마운트 후·화면 진입 후에만 돌고, 첫 렌더는 서버와 같은 정적 상태다(하이드레이션 안전).
 * `prefers-reduced-motion` 이면 모션 없이 최종 상태만 보여 준다.
 */

const SECTION_HEAD = "mx-auto max-w-2xl text-center";
const EYEBROW = "text-xs font-medium uppercase tracking-[0.2em] text-gold-champagne";
const H2 = "mt-4 break-keep text-3xl font-semibold tracking-[-0.035em] text-white md:text-[44px] md:leading-[1.15]";
const GLASS = "relative min-w-0 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.03] backdrop-blur-xl";

/** 모바일(sm 미만)은 가로 스와이프 캐러셀, sm 이상은 그리드 */
const SNAP_ROW = "-mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:pb-0";
const SNAP_ITEM = "w-[80%] flex-none snap-center sm:w-auto";

const ALL_ITEMS = BOXES.flatMap((b) => b.items);
const itemById = (id: string): ProductItem | undefined => ALL_ITEMS.find((x) => x.id === id);

/** 화면 진입 + 모션 허용일 때만 true */
function useLive<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { margin: "-80px" });
  const reduced = useReducedMotion();
  return { ref, live: inView && !reduced, reduced: !!reduced };
}

/** 0 → target 카운트업. 모션이 꺼져 있으면 즉시 target */
function useCountUp(target: number, run: boolean, ms = 900) {
  const [v, setV] = useState(run ? 0 : target);
  useEffect(() => {
    if (!run) {
      setV(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setV(+(target * (1 - Math.pow(1 - p, 3))).toFixed(2));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setV(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms]);
  return v;
}

function GoldLine() {
  return <span aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gold-champagne/60 to-transparent" />;
}

/* ─────────────── 신뢰 지표 4열 글래스 스탯 바 ─────────────── */

export function TrustTelemetryStrip() {
  const t = useTranslations("editorialPages");
  const stats = [
    { value: "100%", label: t("teleDraw"), Icon: ShieldCheck },
    { value: t("teleOddsValue", { n: publishedOddsRows().toLocaleString("en-US") }), label: t("teleOdds"), Icon: Sparkles },
    { value: `${Math.round(INSTANT_SELLBACK_RATE * 100)}%`, label: t("teleCash"), Icon: Zap },
    { value: t("teleFree"), label: t("teleShip"), Icon: Truck },
  ];
  return (
    <section className="pb-2 pt-4 md:py-10">
      <div className={cn(GLASS, "grid grid-cols-2 lg:grid-cols-4")}>
        <GoldLine />
        {stats.map(({ value, label, Icon }, i) => (
          <div
            key={label}
            className={cn(
              "min-w-0 px-4 py-6 text-center sm:px-6 md:py-8",
              i % 2 === 1 && "border-l border-white/10",
              i >= 2 && "border-t border-white/10 lg:border-t-0",
              i === 2 && "lg:border-l",
            )}
          >
            <Icon className="mx-auto h-4 w-4 text-gold-champagne/80" strokeWidth={1.7} aria-hidden />
            <p className="mt-3 whitespace-nowrap bg-gradient-to-b from-white to-[#d9c39a] bg-clip-text text-[28px] font-bold leading-none tracking-[-0.04em] text-transparent tabular-nums sm:text-[36px] md:text-[44px]">
              {value}
            </p>
            <p className="mt-2.5 break-keep text-[12px] leading-snug text-muted sm:text-[13px]">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────── 라인업 3타일 ─────────────── */

const LINEUP = [
  { n: 1, item: "rlx-sub", box: "vault-submariner" },
  { n: 2, item: "da-iphone16", box: "dollar-apple" },
  { n: 3, item: "js-porsche", box: "jackpot-supercar" },
] as const;

export function LineupStrip() {
  const t = useTranslations("editorialPages");
  const { itemName } = useProductText();
  return (
    <section className="py-8 md:py-14">
      <p className={cn(EYEBROW, "text-center")}>{t("matrixCol1")}</p>
      <div className={cn("mt-6", SNAP_ROW, "sm:grid-cols-3 sm:gap-4 md:gap-5")}>
        {LINEUP.map(({ n, item: id, box: slug }) => {
          const item = itemById(id);
          const box = BOX_BY_SLUG[slug];
          if (!item || !box) return null;
          const top = dropTable(box)[0];
          const multiple = top ? Math.round(top.value / box.price) : 0;
          return (
            <article key={n} className={cn(GLASS, SNAP_ITEM, "group")}>
              <div className="relative aspect-[16/11] overflow-hidden">
                <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.05]">
                  <ProductArt image={item.image} alt={itemName(item)} accent="#d9c39a" glowStrength={0.06} bordered={false} kind={item.kind} />
                </div>
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/20 to-transparent" />
                <span className="absolute right-3 top-3 rounded-full border border-gold-champagne/40 bg-obsidian/70 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-gold-champagne backdrop-blur">
                  {t("lineupTop", { n: multiple.toLocaleString("en-US") })}
                </span>
              </div>
              <div className="px-5 pb-5 pt-1">
                <h3 className="text-[17px] font-semibold text-white">{t(`m1${n}Title` as "m11Title")}</h3>
                <p className="mt-1.5 break-keep text-[13.5px] leading-[1.6] text-muted">{t(`m1${n}Body` as "m11Body")}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────── 인터랙티브 핵심 가치 카드 3종 ─────────────── */

const DRAW_BOX = "dollar-apple";
const DRAW_ROLL = 412;

/** ① 실시간 추첨 HUD — 난수 롤링 → 번호 고정 → 그 번호가 실제 확률표에서 가리키는 상품 */
function DrawCard() {
  const t = useTranslations("editorialPages");
  const { itemName } = useProductText();
  const { ref, live } = useLive<HTMLElement>();
  const [phase, setPhase] = useState<0 | 1 | 2>(2);
  const [roll, setRoll] = useState(DRAW_ROLL);
  const [seedOpen, setSeedOpen] = useState(false);

  // 데모 번호가 가리키는 상품은 지어내지 않는다 — 그 박스의 실제 구간표로 계산한다
  const prize = useMemo(() => {
    const box = BOX_BY_SLUG[DRAW_BOX];
    return box ? determineItem(DRAW_ROLL, dropTable(box)) : undefined;
  }, []);

  useEffect(() => {
    if (!live) {
      setPhase(2);
      setRoll(DRAW_ROLL);
      return;
    }
    let n = 734_219;
    let spin: ReturnType<typeof setInterval> | undefined;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const cycle = () => {
      setPhase(0);
      spin = setInterval(() => {
        n = (n * 7_919 + 104_729) % ROLL_RANGE; // 결정적 수열(하이드레이션·테스트 안전)
        setRoll(n);
      }, 55);
      timers.push(
        setTimeout(() => {
          clearInterval(spin);
          setRoll(DRAW_ROLL);
          setPhase(1);
        }, 1300),
        setTimeout(() => setPhase(2), 2200),
        setTimeout(cycle, 5200),
      );
    };
    cycle();
    return () => {
      clearInterval(spin);
      timers.forEach(clearTimeout);
    };
  }, [live]);

  const steps = [t("hudStep1"), t("hudStep2"), t("hudStep3")];
  return (
    <article ref={ref} className={cn(GLASS, "flex flex-col p-5 sm:p-6")}>
      <GoldLine />
      <p className={EYEBROW}>{t("matrixCol2")}</p>
      <h3 className="mt-3 break-keep text-xl font-semibold tracking-[-0.02em] text-white md:text-[22px]">{t("coreDrawTitle")}</h3>

      {/* HUD */}
      <div className="mt-5 rounded-2xl border border-white/10 bg-obsidian/80 p-4">
        <div className="flex items-center justify-between text-[10.5px] uppercase tracking-[0.14em] text-muted">
          <span>{t("hudNumber")}</span>
          <span className="flex items-center gap-1.5">
            <span className={cn("h-1.5 w-1.5 rounded-full", phase === 0 ? "animate-pulse bg-gold-champagne" : "bg-emerald-400")} />
            LIVE
          </span>
        </div>
        <p
          className={cn(
            "mt-2 font-mono text-[34px] font-semibold leading-none tabular-nums tracking-[0.06em] transition-colors sm:text-[40px]",
            phase === 0 ? "text-white/70" : "text-gold-champagne [text-shadow:0_0_24px_rgba(217,195,154,0.45)]",
          )}
        >
          #{String(roll).padStart(6, "0")}
        </p>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-gold-champagne/60 to-gold-champagne transition-[width] duration-500"
            style={{ width: `${((phase + 1) / 3) * 100}%` }}
          />
        </div>
        <ol className="mt-3 grid gap-1.5">
          {steps.map((s, i) => (
            <li key={s} className={cn("flex items-center gap-2 text-[12px] transition-colors", i <= phase ? "text-white" : "text-muted/60")}>
              <span className={cn("flex h-4 w-4 flex-none items-center justify-center rounded-full border", i <= phase ? "border-gold-champagne bg-gold-champagne text-obsidian" : "border-white/20")}>
                {i <= phase && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
              </span>
              <span className="min-w-0 break-keep">{s}</span>
            </li>
          ))}
        </ol>
        {prize && (
          <div className={cn("mt-3 flex items-center gap-3 rounded-xl border p-2 transition-all duration-500", phase === 2 ? "border-gold-champagne/40 bg-gold-champagne/[0.07] opacity-100" : "border-white/5 opacity-30")}>
            <span className="relative h-10 w-10 flex-none overflow-hidden rounded-lg">
              <ProductArt image={prize.image} alt={itemName(prize)} accent="#d9c39a" glowStrength={0.02} bordered={false} fallbackSize="sm" kind={prize.kind} />
            </span>
            <span className="min-w-0 truncate text-[13px] font-medium text-white">{itemName(prize)}</span>
          </div>
        )}
      </div>

      <p className="mt-5 break-keep text-[14px] leading-[1.65] text-secondary">{t("m21Body")}</p>
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        {[t("m22Title"), t("m23Title")].map((c) => (
          <span key={c} className="rounded-full border border-white/10 px-3 py-1 text-[11.5px] text-muted">
            {c}
          </span>
        ))}
        <button
          type="button"
          onClick={() => setSeedOpen((v) => !v)}
          aria-expanded={seedOpen}
          className="inline-flex min-h-9 items-center gap-1 rounded-full border border-gold-champagne/30 px-3 text-[12px] text-gold-champagne hover:bg-gold-champagne/10"
        >
          <Info className="h-3 w-3" aria-hidden />
          {t("termSeedLabel")}
        </button>
      </div>
      {seedOpen && <p className="mt-3 break-keep rounded-lg border border-white/10 bg-elevation p-3 text-xs leading-relaxed text-secondary">{t("termSeedBody")}</p>}
    </article>
  );
}

/** ② 정품 + 무료 배송 — 감정 씰 + 3단계 상태 바 */
function ShipCard() {
  const t = useTranslations("editorialPages");
  const { itemName } = useProductText();
  const { ref, live } = useLive<HTMLElement>();
  const [step, setStep] = useState(2);
  const item = itemById("rlx-sub");

  useEffect(() => {
    if (!live) {
      setStep(2);
      return;
    }
    setStep(0);
    const id = setInterval(() => setStep((s) => (s + 1) % 4), 1300);
    return () => clearInterval(id);
  }, [live]);

  const shown = Math.min(step, 2);
  const steps = [
    { label: t("shipStep1"), Icon: BadgeCheck },
    { label: t("shipStep2"), Icon: Truck },
    { label: t("shipStep3"), Icon: Home },
  ];
  return (
    <article ref={ref} className={cn(GLASS, "flex flex-col p-5 sm:p-6")}>
      <GoldLine />
      <p className={EYEBROW}>{t("matrixCol3")}</p>
      <h3 className="mt-3 break-keep text-xl font-semibold tracking-[-0.02em] text-white md:text-[22px]">{t("coreShipTitle")}</h3>

      <div className="relative mt-5 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#1d1b17] to-obsidian">
        <div className="relative mx-auto aspect-[16/10] w-full">
          {item && <ProductArt image={item.image} alt={itemName(item)} accent="#d9c39a" glowStrength={0.08} bordered={false} kind={item.kind} />}
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-transparent to-transparent" />
        </div>
        {/* 감정 씰 */}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-obsidian/75 px-2.5 py-1 text-[10.5px] font-semibold tracking-wide text-emerald-200 shadow-[0_0_24px_rgba(52,211,153,0.25)] backdrop-blur">
          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          {t("sealLabel")}
        </span>
        {/* 상태 바 */}
        <div className="relative px-4 pb-4">
          <div className="relative h-1 rounded-full bg-white/10">
            <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 to-gold-champagne transition-[width] duration-700" style={{ width: `${(shown / 2) * 100}%` }} />
          </div>
          <ol className="mt-3 grid grid-cols-3 gap-2">
            {steps.map(({ label, Icon }, i) => (
              <li key={label} className={cn("min-w-0 text-center transition-colors", i <= shown ? "text-white" : "text-muted/50")}>
                <span className={cn("mx-auto flex h-7 w-7 items-center justify-center rounded-full border transition-all", i <= shown ? "border-emerald-300/60 bg-emerald-400/15 text-emerald-200" : "border-white/15")}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                </span>
                <span className="mt-1.5 block break-keep text-[10.5px] leading-snug sm:text-[11px]">{label}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <p className="mt-5 break-keep text-[14px] leading-[1.65] text-secondary">{t("m31Body")}</p>
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <span className="rounded-full border border-white/10 px-3 py-1 text-[11.5px] text-muted">{t("guard3Title")}</span>
      </div>
    </article>
  );
}

/** ③ 원클릭 95% 환급 — [배송받기 ⟷ 즉시 환급] 토글. 환급을 고르면 골드 네온 + 카운트업 */
function CashCard() {
  const t = useTranslations("editorialPages");
  const { itemName } = useProductText();
  const { ref, live, reduced } = useLive<HTMLElement>();
  const [mode, setMode] = useState<"ship" | "cash">("ship");
  const touched = useRef(false);
  const item = itemById("gc-apple100");
  const payback = item ? sellValueOf(item) : 0;
  const counted = useCountUp(payback, mode === "cash" && !reduced);

  // 손대지 않았으면 화면에 들어온 뒤 한 번 스스로 환급 쪽으로 넘어가 보여 준다
  useEffect(() => {
    if (!live || touched.current) return;
    const id = setTimeout(() => !touched.current && setMode("cash"), 1400);
    return () => clearTimeout(id);
  }, [live]);

  const pick = (m: "ship" | "cash") => {
    touched.current = true;
    setMode(m);
  };
  const cash = mode === "cash";

  return (
    <article ref={ref} className={cn(GLASS, "flex flex-col p-5 sm:p-6")}>
      <GoldLine />
      <p className={EYEBROW}>{t("matrixCol3")}</p>
      <h3 className="mt-3 break-keep text-xl font-semibold tracking-[-0.02em] text-white md:text-[22px]">{t("coreCashTitle")}</h3>

      <div
        className={cn(
          "relative mt-5 rounded-2xl border p-4 transition-all duration-500",
          cash ? "border-gold-champagne/60 bg-gold-champagne/[0.06] shadow-[0_0_44px_rgba(217,195,154,0.28)]" : "border-white/10 bg-obsidian/80",
        )}
      >
        {item && (
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn("relative h-16 w-16 flex-none overflow-hidden rounded-xl ring-1 transition-all", cash ? "ring-gold-champagne/70" : "ring-white/10")}>
              <ProductArt image={item.image} alt={itemName(item)} accent="#d9c39a" glowStrength={0.04} bordered={false} fallbackSize="sm" kind={item.kind} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-medium text-white">{itemName(item)}</span>
              <span className="mt-0.5 block text-[12px] text-muted">
                <Money value={item.value} size="xs" numberClassName="text-muted" />
              </span>
            </span>
          </div>
        )}

        {/* 결과 패널 */}
        <div className="mt-4 flex min-h-[64px] items-center justify-center rounded-xl border border-white/10 bg-black/30 px-3 text-center">
          {cash ? (
            <div className="min-w-0">
              <p className="whitespace-nowrap text-[26px] font-bold leading-none text-gold-champagne [text-shadow:0_0_22px_rgba(217,195,154,0.5)] sm:text-[30px]">
                <Money value={counted} sign="+" size="lg" numberClassName="text-gold-champagne" />
              </p>
              <p className="mt-1.5 text-[11.5px] text-emerald-300">{t("cashCredited")}</p>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-[13px] text-secondary">
              <PackageCheck className="h-4 w-4 text-emerald-300" aria-hidden />
              {t("shipChosen")}
            </p>
          )}
        </div>

        {/* 토글 */}
        <div role="radiogroup" aria-label={t("coreCashTitle")} className="relative mt-4 grid grid-cols-2 rounded-full border border-white/10 bg-black/40 p-1">
          <span
            aria-hidden
            className={cn(
              "absolute inset-y-1 w-[calc(50%-4px)] rounded-full transition-all duration-300",
              cash ? "left-[calc(50%+0px)] bg-gold-champagne" : "left-1 bg-white/15",
            )}
          />
          {(
            [
              ["ship", t("toggleShip")],
              ["cash", t("toggleCash")],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => pick(m)}
              onMouseEnter={() => pick(m)}
              className={cn(
                "relative z-10 min-h-10 truncate rounded-full px-2 text-[12px] font-semibold transition-colors sm:text-[12.5px]",
                mode === m ? (m === "cash" ? "text-obsidian" : "text-white") : "text-muted hover:text-white",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-5 break-keep text-[14px] leading-[1.65] text-secondary">{t("m32Body")}</p>
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-[11.5px] text-muted">
          <Wallet className="h-3 w-3" aria-hidden />
          {t("m33Title")}
        </span>
      </div>
    </article>
  );
}

export function InteractiveCoreCards() {
  const t = useTranslations("editorialPages");
  return (
    <section className="border-t border-hairline py-12 md:py-20">
      <div className={SECTION_HEAD}>
        <p className={EYEBROW}>THE VOILA STANDARD</p>
        <h2 className={H2}>{t("matrixTitle")}</h2>
        <p className="mt-4 break-keep text-base leading-7 text-muted">{t("matrixBody")}</p>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 md:mt-14 md:gap-5 lg:grid-cols-3">
        <DrawCard />
        <ShipCard />
        <CashCard />
      </div>
    </section>
  );
}

/* ─────────────── 실전 라이브 쇼케이스 — 2열 영수증 HUD ─────────────── */

type TermKey = "slot" | "cashback" | "ship";

function Term({ id, open, onToggle, children }: { id: TermKey; open: TermKey | null; onToggle: (k: TermKey) => void; children: ReactNode }) {
  const isOpen = open === id;
  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      aria-expanded={isOpen}
      aria-controls={`term-${id}`}
      className={cn("underline decoration-dotted underline-offset-4 transition-colors", isOpen ? "text-white decoration-white" : "text-secondary decoration-white/40 hover:text-white hover:decoration-white")}
    >
      {children}
    </button>
  );
}

const TERM_COPY: Record<TermKey, { label: "termSlotLabel" | "termShipLabel" | "termCashLabel"; body: "termSlotBody" | "termShipBody" | "termCashbackBody" }> = {
  slot: { label: "termSlotLabel", body: "termSlotBody" },
  ship: { label: "termShipLabel", body: "termShipBody" },
  cashback: { label: "termCashLabel", body: "termCashbackBody" },
};

interface ReceiptStep {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "gold" | "emerald";
}

interface Receipt {
  key: "case1" | "case2";
  item: ProductItem;
  pill: string;
  pillTone: "gold" | "emerald";
  steps: ReceiptStep[];
}

function ReceiptCard({ receipt, index }: { receipt: Receipt; index: number }) {
  const t = useTranslations("editorialPages");
  const { itemName } = useProductText();
  const [open, setOpen] = useState<TermKey | null>(null);
  const toggle = (k: TermKey) => setOpen((cur) => (cur === k ? null : k));
  const terms = {
    slot: (c: ReactNode) => <Term id="slot" open={open} onToggle={toggle}>{c}</Term>,
    ship: (c: ReactNode) => <Term id="ship" open={open} onToggle={toggle}>{c}</Term>,
    cashback: (c: ReactNode) => <Term id="cashback" open={open} onToggle={toggle}>{c}</Term>,
  };
  const gold = receipt.pillTone === "gold";

  return (
    <article className={cn(GLASS, "flex flex-col")}>
      <GoldLine />
      {/* 대형 실물 */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <ProductArt image={receipt.item.image} alt={itemName(receipt.item)} accent={gold ? "#d9c39a" : "#6ee7b7"} glowStrength={0.08} bordered={false} kind={receipt.item.kind} />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/10 to-transparent" />
        <span className="absolute left-4 top-4 text-[11px] font-medium tracking-[0.2em] text-white/70">CASE 0{index + 1}</span>
        <span
          className={cn(
            "absolute right-4 top-4 rounded-full border px-3 py-1 text-[11px] font-bold tracking-[0.08em] backdrop-blur",
            gold
              ? "border-gold-champagne/60 bg-gold-champagne/15 text-gold-champagne shadow-[0_0_26px_rgba(217,195,154,0.45)]"
              : "border-emerald-300/50 bg-emerald-400/10 text-emerald-200 shadow-[0_0_26px_rgba(52,211,153,0.35)]",
          )}
        >
          {receipt.pill}
        </span>
        <div className="absolute inset-x-4 bottom-4 min-w-0">
          <p className="truncate text-lg font-semibold text-white md:text-xl">{itemName(receipt.item)}</p>
          <p className="mt-0.5 break-keep text-[12.5px] text-secondary">{t(`${receipt.key}Sub` as "case1Sub")}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-6">
        {/* 3단 스펙 바 */}
        <ol className="grid grid-cols-3 rounded-xl border border-white/10 bg-obsidian/70">
          {receipt.steps.map((s, i) => (
            <li key={s.label} className={cn("relative min-w-0 px-2.5 py-3 sm:px-4", i > 0 && "border-l border-white/10")}>
              {i > 0 && (
                <span aria-hidden className="absolute -left-[9px] top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-obsidian">
                  <ArrowRight className="h-2.5 w-2.5 text-muted" />
                </span>
              )}
              <p className="break-keep text-[10.5px] leading-snug text-muted sm:text-[11.5px]">{s.label}</p>
              <div
                className={cn(
                  "mt-1.5 break-words text-[13px] font-semibold leading-tight tabular-nums sm:text-base xl:text-lg",
                  s.tone === "gold" ? "text-gold-champagne" : s.tone === "emerald" ? "text-emerald-300" : "text-white",
                )}
              >
                {s.value}
              </div>
              {s.sub && <div className="mt-1 min-w-0 break-keep text-[10.5px] leading-snug sm:text-[11px]">{s.sub}</div>}
            </li>
          ))}
        </ol>

        <p className="mt-4 break-keep text-[13.5px] leading-[1.75] text-secondary">{t.rich(`${receipt.key}Body` as "case1Body", terms)}</p>
        {open && (
          <div id={`term-${open}`} role="note" className="mt-3 w-full min-w-0 rounded-lg border border-white/15 bg-elevation p-3 text-xs leading-relaxed text-secondary">
            <span className="mb-1 block text-[11px] font-semibold tracking-[0.08em] text-gold-champagne">{t(TERM_COPY[open].label)}</span>
            <span className="break-keep">{t(TERM_COPY[open].body)}</span>
          </div>
        )}
      </div>
    </article>
  );
}

export function LiveScenarioHUD() {
  const t = useTranslations("editorialPages");

  const receipts = useMemo<Receipt[]>(() => {
    const out: Receipt[] = [];
    // CASE 01 — 그 컬렉션의 최고 상품을 실물로 받는 경우(배수는 실제 박스 가격 기준)
    const lux = BOX_BY_SLUG["vault-submariner"];
    const top = lux ? dropTable(lux)[0] : undefined;
    if (lux && top) {
      const multiple = Math.round(top.value / lux.price);
      out.push({
        key: "case1",
        item: top,
        pill: t("casePrize", { n: multiple.toLocaleString("en-US") }),
        pillTone: "gold",
        steps: [
          { label: t("statPrice"), value: <Money value={lux.price} size="sm" numberClassName="text-white" /> },
          {
            label: t("statRetail"),
            value: <Money value={top.value} size="sm" numberClassName="text-gold-champagne" />,
            sub: <Approx usdt={top.value} compact className="text-[10.5px]" />,
            tone: "gold",
          },
          {
            label: t("statMultiple"),
            value: `${multiple.toLocaleString("en-US")}x`,
            sub: (
              <span className="inline-flex items-start gap-1 text-emerald-300">
                <Package className="mt-px h-3 w-3 flex-none" aria-hidden />
                <span className="min-w-0">{t("caseShipDone")}</span>
              </span>
            ),
            tone: "gold",
          },
        ],
      });
    }
    // CASE 02 — 1 USDT 박스의 기프트카드를 95% 환급받는 경우
    const starter = BOX_BY_SLUG["dollar-apple"];
    const gift = itemById("gc-apple100");
    if (starter && gift) {
      out.push({
        key: "case2",
        item: gift,
        pill: t("casePayback"),
        pillTone: "emerald",
        steps: [
          { label: t("statPrice"), value: <Money value={starter.price} size="sm" numberClassName="text-white" /> },
          { label: t("statRetail"), value: <Money value={gift.value} size="sm" numberClassName="text-white" /> },
          {
            label: t("statCashback"),
            value: <Money value={sellValueOf(gift)} sign="+" size="sm" numberClassName="text-emerald-300" />,
            sub: (
              <span className="inline-flex items-start gap-1 text-emerald-300">
                <RotateCcw className="mt-px h-3 w-3 flex-none" aria-hidden />
                <span className="min-w-0">{t("caseRetry")}</span>
              </span>
            ),
            tone: "emerald",
          },
        ],
      });
    }
    return out;
  }, [t]);

  return (
    <section className="border-t border-hairline py-12 md:py-20">
      <div className={SECTION_HEAD}>
        <p className={EYEBROW}>LIVE SHOWCASE</p>
        <h2 className={H2}>{t("nowTitle")}</h2>
        <p className="mt-4 break-keep text-base leading-7 text-muted">{t("nowBody")}</p>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 md:mt-14 md:gap-5 lg:grid-cols-2">
        {receipts.map((r, i) => (
          <ReceiptCard key={r.key} receipt={r} index={i} />
        ))}
      </div>
    </section>
  );
}

/* ─────────────── 신뢰 가드레일 — 2×2 글래스 ─────────────── */

const GUARDS = [ShieldCheck, Sparkles, Truck, Coins] as const;

export function TrustGuardrails({ action }: { action: ReactNode }) {
  const t = useTranslations("editorialPages");
  return (
    <section className="border-t border-hairline py-12 md:py-20">
      <div className={SECTION_HEAD}>
        <p className={EYEBROW}>TRUST</p>
        <h2 className={H2}>{t("trustTitle")}</h2>
        <p className="mt-4 break-keep text-base leading-7 text-muted">{t("trustBody")}</p>
        <div className="mt-6 flex justify-center">{action}</div>
      </div>
      <ul className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:mt-12">
        {GUARDS.map((Icon, i) => (
          <li key={i} className={cn(GLASS, "flex gap-4 p-4 sm:block sm:p-6")}>
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-gold-champagne/30 bg-gold-champagne/[0.08]">
              <Icon className="h-[18px] w-[18px] text-gold-champagne" strokeWidth={1.7} aria-hidden />
            </span>
            <span className="min-w-0">
              <b className="block text-[15px] font-semibold leading-[1.4] text-white sm:mt-4 sm:text-[16px]">{t(`guard${i + 1}Title` as "guard1Title")}</b>
              <span className="mt-1 block break-keep text-[13px] leading-[1.6] text-muted sm:mt-1.5 sm:text-[13.5px]">{t(`guard${i + 1}Body` as "guard1Body")}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
