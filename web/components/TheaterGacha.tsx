"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { animate, motion, useAnimation, useMotionValue } from "framer-motion";
import { Play, RotateCcw, X } from "lucide-react";
import { useGachaStore } from "@/store/useGachaStore";
import { AssetPlate } from "@/components/AssetPlate";
import { LINE_META, itemLine, REFUND_RATE, type Item, type OwnedItem } from "@/lib/types";
import { bestOf } from "@/lib/rng";
import { compactUsd, cn } from "@/lib/format";
import { playTaDum, playTick, playWin } from "@/lib/audio";
import { useCopy } from "@/lib/i18n";

/** 단계: arm(잠금 대기) / spin(필름 이송) / reveal(대비 전환 후 확정) */
type Phase = "arm" | "spin" | "reveal";

/* 물리 타이밍은 기존 값을 그대로 유지한다 */
const CELL_W = 176;
const GAP = 12;
const STRIDE = CELL_W + GAP;
const REEL_LEN = 56;
const TARGET_INDEX = 46;
const ARM_MS = 1500;
const SPIN_SEC = 5.4;

/** 대비 전환 셔터 스터터 길이 */
const SHUTTER_SEC = 0.12;
/** 시네 감속 커브 — cubic-bezier(0.16, 1, 0.3, 1) */
const CINE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** 스프로켓 홀 — 필름 상·하단 천공 */
const SPROCKET: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(to right, rgba(255,255,255,0.14) 0 10px, transparent 10px 26px)",
};

function buildReel(items: Item[], target: Item): Item[] {
  const cells: Item[] = [];
  for (let i = 0; i < REEL_LEN; i++) {
    cells.push(i === TARGET_INDEX ? target : items[Math.floor(Math.random() * items.length)]);
  }
  return cells;
}

/** 필름 한 프레임 — 애셋 카세트 + 밀도 높은 캡션 */
function ReelCell({ item, hot }: { item: Item; hot: boolean }) {
  const line = itemLine(item);
  const meta = LINE_META[line];
  const jackpot = line === "jackpot";

  return (
    <div
      className={cn(
        "relative flex-none bg-ink",
        hot && (meta.edge || "outline outline-1 outline-neutral-600"),
      )}
      style={{ width: CELL_W, marginRight: GAP }}
    >
      <div className="flex justify-center px-4 pt-4">
        <AssetPlate code={item.code} tone={item.art} size="md" active={hot && jackpot} />
      </div>
      <div className="px-4 py-3">
        <div className="label-caps truncate" style={hot ? { color: meta.color } : undefined}>
          {meta.grade}
        </div>
        <div className="mt-1 truncate text-[11px] font-semibold uppercase tracking-tight text-neutral-200">
          {item.name}
        </div>
        <div className="mt-0.5 font-mono text-[10px] text-neutral-500">{compactUsd(item.value)}</div>
      </div>
      {/* 프레임 구분 헤어라인 — 셀 간격 중앙 */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-[-6px] w-px bg-white/[0.07]"
      />
    </div>
  );
}

/**
 * 환급 / 실물 배송 액션.
 * 환급률(95%)과 금액 표기는 어떤 경우에도 변경하지 않는다.
 */
function ResultActions({ r, dense }: { r: OwnedItem; dense: boolean }) {
  const refundItem = useGachaStore((s) => s.refundItem);
  const shipItem = useGachaStore((s) => s.shipItem);
  const { t: tc } = useCopy();
  const line = itemLine(r.item);
  const refund = r.item.value * REFUND_RATE;
  // 하위 라인일수록 환급을 1순위 CTA로 노출한다
  const pushRefund = line !== "jackpot";

  const tag = cn(
    "border border-white/[0.08] bg-white/[0.04] text-center font-semibold uppercase tracking-[0.12em] text-neutral-200",
    dense ? "px-2 py-1.5 text-[9px]" : "px-3 py-2.5 text-[11px]",
  );

  if (r.status === "refunded") {
    return <div className={tag}>+{compactUsd(refund)} USDT 환급 완료</div>;
  }
  if (r.status === "shipped") {
    return (
      <div className={tag}>
        배송 신청 완료 · <span className="font-mono text-neutral-400">{r.tracking}</span>
      </div>
    );
  }

  const base = cn(
    "flex-1 whitespace-nowrap font-semibold uppercase tracking-[0.12em] transition-colors duration-200 ease-cine",
    dense ? "px-2 py-1.5 text-[9px]" : "px-4 py-2.5 text-[11px]",
  );

  return (
    <div className={cn("flex w-full", dense ? "flex-col gap-1 sm:flex-row" : "gap-2")}>
      <button
        onClick={() => refundItem(r.uid)}
        className={cn(
          base,
          pushRefund
            ? "bg-crimson text-white hover:bg-[#f6121d]"
            : "border border-white/20 text-neutral-100 hover:border-white hover:bg-white/[0.06]",
        )}
      >
        {tc("reclaimValue")} · 95% {compactUsd(refund)} USDT
      </button>
      <button
        onClick={() => shipItem(r.uid)}
        className={cn(
          base,
          "border border-white/[0.08] text-neutral-300 hover:border-white hover:text-white",
        )}
      >
        {tc("requestDispatch")}
      </button>
    </div>
  );
}

function SpecRow({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="label-caps shrink-0">{k}</span>
      <span
        className={cn(
          "min-w-0 truncate text-right text-[12px] text-neutral-200",
          mono && "font-mono",
        )}
      >
        {v}
      </span>
    </div>
  );
}

/** 확정된 최상위 애셋 — 대형 카세트 + 브래킷 등급 */
function ResultHero({ r }: { r: OwnedItem }) {
  const line = itemLine(r.item);
  const meta = LINE_META[line];
  const jackpot = line === "jackpot";

  return (
    <div
      className={cn(
        "w-full max-w-2xl border bg-elevation",
        jackpot ? "border-crimson/40" : "border-white/[0.08]",
      )}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row">
        <AssetPlate code={r.item.code} tone={r.item.art} size="lg" active={jackpot} />
        <div className="min-w-0 flex-1">
          <div className="label-caps" style={{ color: meta.color }}>
            {meta.grade}
          </div>
          <div className="display mt-2 text-2xl text-white sm:text-3xl">{r.item.name}</div>
          <div className="mt-3 divide-y divide-white/[0.08] border-t border-white/[0.08]">
            <SpecRow k="실판매가" v={compactUsd(r.item.value)} mono />
            <SpecRow k="인증" v={r.item.cert} mono />
            <SpecRow k="라인업" v={meta.label} />
          </div>
        </div>
      </div>
      <div className="border-t border-white/[0.08] p-3">
        <ResultActions r={r} dense={false} />
      </div>
    </div>
  );
}

/** 10연속 결과 한 줄 */
function ResultRow({ r, index }: { r: OwnedItem; index: number }) {
  const line = itemLine(r.item);
  const meta = LINE_META[line];
  const jackpot = line === "jackpot";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 px-3 py-2.5 transition-colors duration-200 ease-cine hover:bg-white/[0.03]",
        jackpot && "bg-crimson/[0.06]",
      )}
    >
      <span className="label-caps w-5 shrink-0 font-mono">
        {String(index + 1).padStart(2, "0")}
      </span>
      <AssetPlate code={r.item.code} tone={r.item.art} size="sm" active={jackpot} />
      <div className="min-w-0 flex-1 basis-40">
        <div className="label-caps truncate" style={{ color: meta.color }}>
          {meta.grade}
        </div>
        <div className="truncate text-[12px] font-semibold uppercase tracking-tight text-neutral-100">
          {r.item.name}
        </div>
        <div className="font-mono text-[10px] text-neutral-500">{compactUsd(r.item.value)}</div>
      </div>
      <div className="w-full sm:w-[320px]">
        <ResultActions r={r} dense />
      </div>
    </div>
  );
}

export function TheaterGacha() {
  const theater = useGachaStore((s) => s.theater);
  const closeTheater = useGachaStore((s) => s.closeTheater);
  const openBox = useGachaStore((s) => s.openBox);
  const priceFor = useGachaStore((s) => s.priceFor);
  const { t: tc } = useCopy();

  const [phase, setPhase] = useState<Phase>("arm");
  const [armStep, setArmStep] = useState(0);
  const [hotIndex, setHotIndex] = useState(-1);
  const x = useMotionValue(0);
  const shake = useAnimation();
  const stageRef = useRef<HTMLDivElement>(null);
  const sessionKey = theater ? theater.results[0]?.uid : null;

  const highlight = useMemo(() => (theater ? bestOf(theater.results.map((r) => r.item)) : null), [theater]);
  const reel = useMemo(
    () => (theater && highlight ? buildReel(theater.box.items, highlight) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionKey],
  );

  // 세션 시작: 스크롤 잠금, 잠금 대기(arm), 필름 이송(spin), 확정(reveal) 순으로 진행
  useEffect(() => {
    if (!theater || !highlight) return;
    document.body.style.overflow = "hidden";
    setPhase("arm");
    setArmStep(0);
    setHotIndex(-1);
    x.set(0);

    const t0 = setTimeout(() => setArmStep(1), 850);
    playTaDum();

    const t1 = setTimeout(() => {
      setPhase("spin");
      const width = stageRef.current?.clientWidth ?? window.innerWidth;
      const centerOffset = width / 2 - CELL_W / 2;
      const jitter = (Math.random() - 0.5) * CELL_W * 0.6;
      const finalX = centerOffset - TARGET_INDEX * STRIDE + jitter;
      let lastIdx = -1;

      animate(x, finalX, {
        duration: SPIN_SEC,
        ease: CINE,
        onUpdate: (v) => {
          const idx = Math.round((centerOffset - v) / STRIDE);
          if (idx !== lastIdx) {
            lastIdx = idx;
            setHotIndex(idx);
            playTick();
          }
        },
        onComplete: () => {
          setHotIndex(TARGET_INDEX);
          setPhase("reveal");
          const line = itemLine(highlight);
          playWin(line);
          if (line === "jackpot") {
            // 무채색 + 크림슨, 사각 파티클 단발. 레인보우 버스트는 사용하지 않는다.
            void import("canvas-confetti").then(({ default: confetti }) => {
              confetti({
                particleCount: 64,
                spread: 52,
                startVelocity: 34,
                decay: 0.9,
                gravity: 1.1,
                ticks: 110,
                scalar: 0.7,
                shapes: ["square"],
                colors: ["#E50914", "#FFFFFF", "#E5E5E5", "#737373"],
                origin: { y: 0.55 },
              });
            });
            // 카메라 셰이크 — 짧고 타이트하게
            void shake.start({
              x: [0, -6, 5, -3, 2, 0],
              y: [0, 3, -4, 2, -1, 0],
              transition: { duration: 0.34, ease: "easeOut" },
            });
          }
        },
      });
    }, ARM_MS);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      x.stop();
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey]);

  if (!theater || !highlight) return null;
  const { box, count, results, boosterTriggered } = theater;
  const highlightLine = itemLine(highlight);
  const highlightMeta = LINE_META[highlightLine];
  const best = results.find((r) => r.item.id === highlight.id) ?? results[0];

  return (
    <motion.div animate={shake} className="fixed inset-0 z-[100] flex flex-col bg-ink text-white">
      {/* 표면 — 비네트 / 필름 그레인은 서로 다른 레이어에 둔다 */}
      <div aria-hidden className="vignette-bg pointer-events-none absolute inset-0 opacity-70" />
      <div aria-hidden className="film-grain pointer-events-none absolute inset-0 overflow-hidden" />
      {/* 세션 개막 — 잉크 셔터가 열린다 */}
      <motion.div
        key={sessionKey ?? "session"}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-40 bg-ink"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: CINE }}
      />

      {/* 헤더 */}
      <div className="relative z-10 flex items-start justify-between gap-4 border-b border-white/[0.08] px-5 py-4">
        <div className="min-w-0">
          <div className="label-caps">{count === 10 ? "SESSION · 10X REEL" : "SESSION · 1X REEL"}</div>
          <div className="display mt-1 truncate text-xl text-white sm:text-2xl">{box.title}</div>
          {boosterTriggered && (
            <div className="mt-2 inline-flex items-center gap-2 border border-crimson/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-crimson">
              부스터 발동 · {LINE_META.jackpot.grade} 가중치 5배 적용
            </div>
          )}
        </div>
        {phase === "reveal" && (
          <button
            onClick={closeTheater}
            aria-label="닫기"
            className="shrink-0 border border-white/[0.08] p-2 text-neutral-400 transition-colors duration-200 ease-cine hover:border-white hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 스테이지 */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center overflow-hidden">
        {/* 1단계 — 잠금 대기 */}
        {phase === "arm" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, ease: CINE }}
            className="flex flex-col items-center gap-6 px-6 text-center"
          >
            <div className="label-caps">SEQUENCE LOCKED</div>
            <div className="display text-5xl text-neutral-200 sm:text-7xl">{box.code}</div>
            <div className="relative h-px w-56 overflow-hidden bg-white/10">
              <motion.span
                aria-hidden
                className="absolute inset-y-0 w-16 bg-crimson"
                initial={{ x: -64 }}
                animate={{ x: 224 }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
              />
            </div>
            <div className="label-caps text-neutral-400">
              {armStep === 0 ? "인증 확인 중" : "시퀀스 잠금 해제"}
            </div>
          </motion.div>
        )}

        {/* 2단계 — 필름 이송 */}
        {phase !== "arm" && (
          <div
            ref={stageRef}
            className={cn(
              "relative w-full border-y transition-opacity duration-700 ease-cine",
              boosterTriggered ? "border-crimson/40" : "border-white/[0.08]",
              phase === "reveal" ? "opacity-[0.14]" : "opacity-100",
            )}
          >
            {/* 재생 헤드 — 1px 크림슨 */}
            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-px -translate-x-1/2 bg-crimson" />
            <div className="pointer-events-none absolute left-1/2 top-0 z-20 h-1.5 w-3 -translate-x-1/2 bg-crimson" />
            <div className="pointer-events-none absolute bottom-0 left-1/2 z-20 h-1.5 w-3 -translate-x-1/2 bg-crimson" />
            {/* 양단 감쇠 */}
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-1/4 bg-gradient-to-r from-ink via-ink/60 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-1/4 bg-gradient-to-l from-ink via-ink/60 to-transparent" />

            <motion.div className="relative flex py-6 will-change-transform" style={{ x }}>
              {/* 스프로켓 천공 — 릴과 함께 이송된다 */}
              <span
                aria-hidden
                className="pointer-events-none absolute left-0 right-0 top-0 h-2.5"
                style={SPROCKET}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute bottom-0 left-0 right-0 h-2.5"
                style={SPROCKET}
              />
              {reel.map((item, i) => (
                <ReelCell key={i} item={item} hot={i === hotIndex} />
              ))}
            </motion.div>
          </div>
        )}

        {/* 3단계 — 확정 */}
        {phase === "reveal" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: CINE }}
            className="absolute inset-0 z-30 overflow-y-auto bg-ink/90 backdrop-blur-sm"
          >
            {/* 셔터 스터터 — 약 120ms 대비 전환 */}
            <motion.div
              aria-hidden
              className="pointer-events-none fixed inset-0 z-50 origin-center bg-ink"
              initial={{ scaleY: 1, opacity: 1 }}
              animate={{ scaleY: [1, 1, 0.04, 0], opacity: [1, 0.55, 1, 0] }}
              transition={{ duration: SHUTTER_SEC, times: [0, 0.35, 0.75, 1], ease: "linear" }}
            />

            <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col items-center justify-center gap-6 px-4 py-10">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.14, ease: CINE }}
                className="text-center"
              >
                <div className="display text-5xl sm:text-7xl" style={{ color: highlightMeta.color }}>
                  {highlightMeta.grade}
                </div>
                <div className="label-caps mt-3">{highlightMeta.label} 확정</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.22, ease: CINE }}
                className="flex w-full flex-col items-center gap-5"
              >
                <ResultHero r={count === 1 ? results[0] : best} />

                {count === 10 && (
                  <div className="w-full border border-white/[0.08] bg-surface">
                    <div className="flex items-center justify-between border-b border-white/[0.08] px-3 py-2">
                      <span className="label-caps">세션 결과</span>
                      <span className="label-caps">10 프레임</span>
                    </div>
                    <div className="divide-y divide-white/[0.08]">
                      {results.map((r, i) => (
                        <ResultRow key={r.uid} r={r} index={i} />
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* 재생 컨트롤 */}
              <div className="flex w-full flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => openBox(box.id, count)}
                  className="flex items-center gap-2 bg-crimson px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-colors duration-200 ease-cine hover:bg-[#f6121d]"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> {tc("boxOpenAgain")} · {priceFor(box, count)} USDT
                </button>
                {count === 1 && (
                  <button
                    onClick={() => openBox(box.id, 10)}
                    className="flex items-center gap-2 border border-white/20 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-100 transition-colors duration-200 ease-cine hover:border-white hover:bg-white/[0.06]"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" /> {tc("boxOpenMulti")} · {priceFor(box, 10)} USDT · 10% OFF
                  </button>
                )}
                <button
                  onClick={closeTheater}
                  className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400 transition-colors duration-200 ease-cine hover:text-white"
                >
                  닫기
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
