"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { animate, motion, useAnimation, useMotionValue } from "framer-motion";
import { X, Truck, RotateCcw, Sparkles, Play, Coins } from "lucide-react";
import { useGachaStore } from "@/store/useGachaStore";
import { TIER_META, REFUND_RATE, type Item, type OwnedItem } from "@/lib/types";
import { bestOf } from "@/lib/rng";
import { compactUsd, cn } from "@/lib/format";
import { playTaDum, playTick, playWin } from "@/lib/audio";
import { ProductImage } from "./ProductImage";

type Phase = "dim" | "spin" | "reveal";

const CELL_W = 176;
const GAP = 12;
const STRIDE = CELL_W + GAP;
const REEL_LEN = 56;
const TARGET_INDEX = 46;
const DIM_MS = 1500;
const SPIN_SEC = 5.4;

function buildReel(items: Item[], target: Item): Item[] {
  const cells: Item[] = [];
  for (let i = 0; i < REEL_LEN; i++) {
    cells.push(i === TARGET_INDEX ? target : items[Math.floor(Math.random() * items.length)]);
  }
  return cells;
}

function ReelCell({ item, hot }: { item: Item; hot: boolean }) {
  const meta = TIER_META[item.tier];
  return (
    <div
      className={cn(
        "relative flex h-[216px] flex-none flex-col items-center justify-center overflow-hidden rounded-md border-2 transition-shadow",
        hot ? meta.glow : "",
      )}
      style={{ width: CELL_W, marginRight: GAP, borderColor: hot ? meta.color : "rgba(255,255,255,0.08)" }}
    >
      <ProductImage
        src={item.image}
        emoji={item.emoji}
        art={item.art}
        className="absolute inset-0"
        emojiClassName="text-6xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
      />
      <div className="holo absolute inset-0 overflow-hidden opacity-50" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2 pb-2 pt-6 text-center">
        <div className="truncate text-[11px] font-bold">{item.name}</div>
        <div className="text-[10px] font-mono" style={{ color: meta.color }}>
          {item.tier} · {compactUsd(item.value)}
        </div>
      </div>
    </div>
  );
}

/** 결과 아이템 + 손실 방어 액션 ([실물 배송] / [★ 80% 환급]) */
function ResultCard({ r, large, demo }: { r: OwnedItem; large: boolean; demo: boolean }) {
  const refundItem = useGachaStore((s) => s.refundItem);
  const shipItem = useGachaStore((s) => s.shipItem);
  const meta = TIER_META[r.item.tier];
  const refund = r.item.value * REFUND_RATE;
  const low = r.item.tier === "N" || r.item.tier === "R";

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-lg border bg-elevation",
        large ? "w-full max-w-md" : "w-full",
        r.item.tier === "SSR" && "animate-pulseGlow",
        meta.glow,
      )}
      style={{ borderColor: meta.color }}
    >
      <div className={cn("relative", large ? "h-56" : "h-24")}>
        <ProductImage
          src={r.item.image}
          emoji={r.item.emoji}
          art={r.item.art}
          priority={large}
          className="absolute inset-0"
          emojiClassName={cn("drop-shadow-[0_10px_30px_rgba(0,0,0,0.9)]", large ? "text-8xl" : "text-4xl")}
        />
        <div className="holo absolute inset-0 overflow-hidden opacity-50" />
        <span
          className="absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-black"
          style={{ background: meta.color, color: "#000" }}
        >
          {meta.label}
        </span>
      </div>
      <div className={cn("flex flex-1 flex-col", large ? "p-4" : "p-2")}>
        <div className={cn("font-bold leading-tight", large ? "text-lg" : "truncate text-[11px]")}>{r.item.name}</div>
        <div className={cn("text-gray-400", large ? "mt-1 text-sm" : "text-[10px]")}>
          시세 <span className="font-mono text-white">{compactUsd(r.item.value)}</span>
          {large && (
            <>
              {" "}
              · 인증 <span className="font-mono">{r.item.cert}</span>
            </>
          )}
        </div>

        {demo ? (
          large && (
            <div className="mt-3 rounded border border-white/15 bg-black/30 p-2 text-xs text-gray-400">
              무료 체험 결과입니다. 실제 오픈에서 획득하면 실물 배송 또는{" "}
              <span className="font-bold text-gold">{compactUsd(refund)} USDT 즉시 환급</span>이 가능합니다.
            </div>
          )
        ) : r.status === "refunded" ? (
          <div className={cn("mt-2 rounded bg-gold/15 text-center font-bold text-gold", large ? "p-2 text-sm" : "p-1 text-[10px]")}>
            +{compactUsd(refund)} USDT 환급 완료
          </div>
        ) : r.status === "shipped" ? (
          <div className={cn("mt-2 rounded bg-emerald-500/15 text-center font-semibold text-emerald-300", large ? "p-2 text-sm" : "p-1 text-[10px]")}>
            배송 신청 완료 · {r.tracking}
          </div>
        ) : (
          <div className={cn("mt-auto flex gap-1.5 pt-2", large ? "flex-col" : "flex-col")}>
            {/* 꽝일수록 환급 버튼을 1순위(빨간 CTA)로 — 이탈 방지 */}
            <button
              onClick={() => refundItem(r.uid)}
              className={cn(
                "flex items-center justify-center gap-1 rounded font-bold transition",
                low ? "bg-accent text-white hover:bg-[#f6121d]" : "bg-gold text-black hover:bg-yellow-300",
                large ? "py-2.5 text-sm" : "py-1 text-[10px]",
              )}
            >
              <Coins className={large ? "h-4 w-4" : "h-3 w-3"} /> ★ 즉시 {compactUsd(refund)} USDT 환급
            </button>
            <button
              onClick={() => shipItem(r.uid)}
              className={cn(
                "flex items-center justify-center gap-1 rounded border border-white/30 font-semibold transition hover:bg-white/10",
                large ? "py-2 text-sm" : "py-1 text-[10px]",
              )}
            >
              <Truck className={large ? "h-4 w-4" : "h-3 w-3"} /> 실물 배송 신청
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function TheaterGacha() {
  const theater = useGachaStore((s) => s.theater);
  const closeTheater = useGachaStore((s) => s.closeTheater);
  const openBox = useGachaStore((s) => s.openBox);
  const priceFor = useGachaStore((s) => s.priceFor);

  const [phase, setPhase] = useState<Phase>("dim");
  const [lights, setLights] = useState(true);
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

  // 세션 시작: 스크롤 잠금 → 암전 → 릴 스핀 → 공개
  useEffect(() => {
    if (!theater || !highlight) return;
    document.body.style.overflow = "hidden";
    setPhase("dim");
    setLights(true);
    setHotIndex(-1);
    x.set(0);

    const t0 = setTimeout(() => setLights(false), 200);
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
        ease: [0.1, 0.85, 0.15, 1],
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
          playWin(highlight.tier);
          if (highlight.tier === "SSR" || highlight.tier === "SR") {
            void import("canvas-confetti").then(({ default: confetti }) => {
              const gold = ["#FFD700", "#FFF2A8", "#E50914", "#ffffff"];
              confetti({ particleCount: 180, spread: 100, origin: { y: 0.6 }, colors: gold, scalar: 1.2 });
              setTimeout(() => confetti({ particleCount: 120, angle: 60, spread: 70, origin: { x: 0 }, colors: gold }), 250);
              setTimeout(() => confetti({ particleCount: 120, angle: 120, spread: 70, origin: { x: 1 }, colors: gold }), 400);
            });
          }
          if (highlight.tier === "SSR") {
            void shake.start({
              x: [0, -14, 12, -10, 8, -5, 3, 0],
              y: [0, 8, -10, 7, -5, 3, -1, 0],
              transition: { duration: 0.7, ease: "easeOut" },
            });
          }
        },
      });
    }, DIM_MS);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      x.stop();
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey]);

  if (!theater || !highlight) return null;
  const { box, count, results, demo } = theater;
  const best = results.find((r) => r.item.id === highlight.id) ?? results[0];

  return (
    <motion.div animate={shake} className="fixed inset-0 z-[100] flex flex-col bg-black text-white">
      {/* 극장 조명 */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-1000",
          lights ? "opacity-100" : "opacity-0",
        )}
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,230,180,0.25), transparent 60%)" }}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-[1500ms]",
          phase === "dim" ? "opacity-0" : "opacity-100",
        )}
        style={{ background: `radial-gradient(ellipse at 50% 50%, ${TIER_META[highlight.tier].color}22, transparent 55%)` }}
      />

      {/* 헤더 */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-gray-500">
            {demo ? "FREE DEMO ROLL" : `NOW OPENING · ${count === 10 ? "10x" : "1x"}`}
          </div>
          <div className="text-lg font-black uppercase">{box.title}</div>
        </div>
        {phase === "reveal" && (
          <button onClick={closeTheater} className="rounded-full bg-white/10 p-2 hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* 스테이지 */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center overflow-hidden">
        {phase === "dim" && (
          <motion.div
            initial={{ opacity: 0, letterSpacing: "0.2em" }}
            animate={{ opacity: [0, 1, 1, 0.6], letterSpacing: "0.6em" }}
            transition={{ duration: DIM_MS / 1000 }}
            className="text-2xl font-black uppercase text-gray-300"
          >
            Lights Off
          </motion.div>
        )}

        {phase !== "dim" && (
          <div ref={stageRef} className="relative w-full">
            {/* 중앙 인디케이터 */}
            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-[2px] -translate-x-1/2 bg-accent shadow-[0_0_20px_#E50914]" />
            <div className="pointer-events-none absolute -top-3 left-1/2 z-20 -translate-x-1/2 border-x-[10px] border-t-[12px] border-x-transparent border-t-accent" />
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-1/4 bg-gradient-to-r from-black to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-1/4 bg-gradient-to-l from-black to-transparent" />

            <motion.div
              className={cn("flex py-6 will-change-transform transition-opacity", phase === "reveal" ? "opacity-40" : "opacity-100")}
              style={{ x }}
            >
              {reel.map((item, i) => (
                <ReelCell key={i} item={item} hot={i === hotIndex} />
              ))}
            </motion.div>
          </div>
        )}

        {/* 결과 오버레이 */}
        {phase === "reveal" && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          >
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em]" style={{ color: TIER_META[highlight.tier].color }}>
              <Sparkles className="h-4 w-4" />
              {highlight.tier === "SSR" ? "LEGENDARY DROP" : highlight.tier === "SR" ? "EPIC DROP" : count === 10 ? "10x RESULTS" : "DROP"}
            </div>

            {count === 1 ? (
              <ResultCard r={results[0]} large demo={demo} />
            ) : (
              <div className="w-full max-w-5xl">
                <div className="mb-4 flex justify-center">
                  <ResultCard r={best} large demo={demo} />
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {results.map((r) => (
                    <ResultCard key={r.uid} r={r} large={false} demo={demo} />
                  ))}
                </div>
              </div>
            )}

            {/* 다시보기 자리 = 재도전 CTA */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {demo ? (
                <button
                  onClick={() => openBox(box.id, 1)}
                  className="flex items-center gap-2 rounded bg-white px-6 py-2.5 font-bold text-black hover:bg-white/80"
                >
                  <Play className="h-4 w-4 fill-black" /> 지금 실제로 오픈 ({priceFor(box, 1)} USDT)
                </button>
              ) : (
                <>
                  <button
                    onClick={() => openBox(box.id, count)}
                    className="flex items-center gap-2 rounded bg-white px-6 py-2.5 font-bold text-black hover:bg-white/80"
                  >
                    <RotateCcw className="h-4 w-4" /> 다시 오픈 ({priceFor(box, count)} USDT)
                  </button>
                  {count === 1 && (
                    <button
                      onClick={() => openBox(box.id, 10)}
                      className="flex items-center gap-2 rounded bg-gold px-6 py-2.5 font-bold text-black hover:bg-yellow-300"
                    >
                      <Play className="h-4 w-4 fill-black" /> 10연속 ({priceFor(box, 10)} USDT · 10% OFF)
                    </button>
                  )}
                </>
              )}
              <button onClick={closeTheater} className="rounded border border-white/30 px-5 py-2.5 font-semibold hover:bg-white/10">
                닫기
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
