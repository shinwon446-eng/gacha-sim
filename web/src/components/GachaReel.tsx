"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import confetti from "canvas-confetti";
import { Play, Zap } from "lucide-react";
import { assetPath } from "@/lib/assetPath";
import { glow } from "@/lib/tiers";
import type { GachaItem } from "@/src/data/gachaItems";
import { formatUsdt, pickGachaItem, secureUnit } from "@/src/data/gachaRules";
import {
  REEL_DURATION_S,
  REEL_EASE,
  REEL_TARGET_INDEX,
  buildStrip,
  maxJackpot,
  offsetForTarget,
} from "@/src/data/reel";

export interface GachaReelProps {
  boxName: string;
  priceUsdt: number;
  /** 스핀 직전 호출. 잔고 차감을 여기서 하고, 부족하면 false 를 돌려 스핀을 막는다. */
  onSpinStart: () => boolean;
  /** 릴이 완전히 정지한 뒤 호출. 호출측이 ClaimModal 을 연다. */
  onResult: (item: GachaItem) => void;
  disabled?: boolean;
  disabledReason?: string;
}

const TILE_W = 132;
const GAP = 8;

function fireConfetti(item: GachaItem) {
  if (item.tier !== "S" && item.tier !== "A") return;
  const big = item.tier === "S";
  const colors = [item.glowColor, "#FFFFFF", "#FFD700"];
  confetti({ particleCount: big ? 160 : 80, spread: 75, startVelocity: 42, origin: { y: 0.55 }, colors, ticks: 240 });
  if (big) {
    setTimeout(() => confetti({ particleCount: 120, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors }), 250);
    setTimeout(() => confetti({ particleCount: 120, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors }), 250);
  }
}

/**
 * CS:GO / Stake 스타일 수평 감속 릴.
 *
 * 순서가 전부다:
 *   1. 잔고 차감(onSpinStart) → 실패면 아무것도 안 한다
 *   2. 결과 확정(pickGachaItem, crypto RNG)
 *   3. 결과를 target 칸에 심은 스트립 생성
 *   4. framer-motion controls 로 5.5초 cubic-bezier(0.12,0.8,0.33,1) 감속
 *   5. 정지 후 confetti(S/A) + onResult
 * 연출(4)은 결과(2)를 절대 바꾸지 못한다.
 */
export function GachaReel({ boxName, priceUsdt, onSpinStart, onResult, disabled = false, disabledReason }: GachaReelProps) {
  const controls = useAnimationControls();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportW, setViewportW] = useState(0);
  // 초기 스트립 — SSR 과 첫 렌더가 같아야 하므로 결정적 저불일치 수열로 채운다 (표시용, 확률과 무관)
  const [strip, setStrip] = useState<GachaItem[]>(() => {
    let x = 0.31;
    const seq = () => (x = (x + 0.6180339887) % 1);
    return buildStrip(pickGachaItem(seq), seq);
  });
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState<GachaItem | null>(null);

  // 뷰포트 폭 — 정지 오프셋 계산에 필요. 리사이즈에도 따라간다.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const sync = () => setViewportW(el.clientWidth);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const jackpot = useMemo(() => maxJackpot(priceUsdt), [priceUsdt]);

  const spin = useCallback(async () => {
    if (spinning || disabled || viewportW === 0) return;
    if (!onSpinStart()) return;

    const result = pickGachaItem();
    const next = buildStrip(result, secureUnit);
    const jitter = secureUnit() - 0.5;
    const target = offsetForTarget({ tileWidth: TILE_W, gap: GAP, viewportWidth: viewportW }, REEL_TARGET_INDEX, jitter);

    setLanded(null);
    setStrip(next);
    setSpinning(true);
    controls.set({ x: 0 });
    await controls.start({ x: target, transition: { duration: REEL_DURATION_S, ease: REEL_EASE } });

    setSpinning(false);
    setLanded(result);
    fireConfetti(result);
    onResult(result);
  }, [spinning, disabled, viewportW, onSpinStart, onResult, controls]);

  // 언마운트 시 진행 중 애니메이션 정지
  useEffect(() => () => controls.stop(), [controls]);

  return (
    <section className="rounded-2xl border border-neutral-800" style={{ backgroundColor: "#0F131C" }}>
      {/* 헤더 — 박스명 + MAX JACKPOT */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 px-4 py-3 md:px-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Mystery Box</div>
          <h2 className="font-display text-2xl font-bold uppercase leading-none tracking-tight text-white md:text-3xl">{boxName}</h2>
        </div>
        <div
          className="flex items-center gap-2 rounded-md border px-3 py-2"
          style={{ borderColor: glow(jackpot.item.glowColor, 0.5), backgroundColor: glow(jackpot.item.glowColor, 0.08), boxShadow: `0 0 20px ${glow(jackpot.item.glowColor, 0.25)}` }}
        >
          <Zap className="h-4 w-4" strokeWidth={2.2} style={{ color: jackpot.item.glowColor }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: jackpot.item.glowColor }}>
            Max Jackpot
          </span>
          <span className="font-mono text-sm font-bold tabular-nums text-white">{formatUsdt(jackpot.item.usdtValue)}</span>
          <span className="rounded-sm px-1.5 py-0.5 font-mono text-xs font-bold tabular-nums text-neutral-950" style={{ backgroundColor: jackpot.item.glowColor }}>
            {jackpot.multiple.toLocaleString("en-US")}x
          </span>
        </div>
      </header>

      {/* 릴 */}
      <div className="relative px-0 py-6">
        <div ref={viewportRef} className="relative w-full overflow-hidden" style={{ height: TILE_W + 56 }}>
          {/* 좌우 페이드 */}
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-20 w-24" style={{ background: "linear-gradient(to right, #0F131C, transparent)" }} />
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-20 w-24" style={{ background: "linear-gradient(to left, #0F131C, transparent)" }} />

          {/* 중앙 마커 */}
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 z-30 w-0.5 -translate-x-1/2" style={{ background: "linear-gradient(to bottom, #FF4655, rgba(255,70,85,0.15), #FF4655)", boxShadow: "0 0 12px rgba(255,70,85,0.7)" }} />
          <span aria-hidden className="pointer-events-none absolute left-1/2 top-0 z-30 h-0 w-0 -translate-x-1/2" style={{ borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderTop: "9px solid #FF4655" }} />
          <span aria-hidden className="pointer-events-none absolute bottom-0 left-1/2 z-30 h-0 w-0 -translate-x-1/2" style={{ borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderBottom: "9px solid #FF4655" }} />

          <motion.ul
            className="absolute left-0 top-0 flex h-full items-center"
            style={{ gap: GAP, willChange: "transform" }}
            animate={controls}
            initial={{ x: 0 }}
          >
            {strip.map((it, i) => {
              const isTarget = landed !== null && i === REEL_TARGET_INDEX;
              return (
                <li
                  key={`${it.id}-${i}`}
                  className="relative flex flex-none flex-col items-center justify-center overflow-hidden rounded-lg border"
                  style={{
                    width: TILE_W,
                    height: TILE_W + 40,
                    backgroundColor: "#151A25",
                    borderColor: isTarget ? it.glowColor : glow(it.glowColor, 0.35),
                    boxShadow: isTarget ? `0 0 0 1px ${glow(it.glowColor, 0.6)}, 0 0 30px ${glow(it.glowColor, 0.5)}` : "none",
                    transition: "box-shadow 300ms, border-color 300ms",
                  }}
                >
                  <span aria-hidden className="absolute inset-x-0 top-0" style={{ height: 3, backgroundColor: it.glowColor, boxShadow: `0 0 8px ${glow(it.glowColor, 0.6)}` }} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={assetPath(it.imageSrc)} alt="" draggable={false} loading="lazy" decoding="async" className="object-contain" style={{ width: TILE_W - 24, height: TILE_W - 24 }} />
                  <div className="w-full truncate px-2 text-center text-white" style={{ fontSize: 10 }}>{it.name}</div>
                  <div className="font-mono font-bold tabular-nums" style={{ fontSize: 11, color: it.glowColor }}>{formatUsdt(it.usdtValue)}</div>
                </li>
              );
            })}
          </motion.ul>
        </div>
      </div>

      {/* 컨트롤 */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-800 px-4 py-4 md:px-6">
        <div className="text-xs text-neutral-500">
          {disabled && disabledReason ? (
            <span className="font-semibold" style={{ color: "#FF4655" }}>{disabledReason}</span>
          ) : landed ? (
            <>
              정지: <span className="font-bold" style={{ color: landed.glowColor }}>{landed.name}</span>{" "}
              <span className="font-mono text-white">{formatUsdt(landed.usdtValue)}</span>
            </>
          ) : (
            "결과는 스핀 전에 crypto RNG 로 확정되고, 릴은 그 칸에 멈춥니다."
          )}
        </div>
        <button
          type="button"
          onClick={spin}
          disabled={spinning || disabled}
          className="flex h-12 items-center gap-2 rounded-lg px-6 text-sm font-bold text-white transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          style={{ backgroundColor: "#E50914", boxShadow: spinning ? "none" : "0 0 28px rgba(229,9,20,0.45)" }}
        >
          <Play className="h-4 w-4 fill-current" strokeWidth={0} />
          {spinning ? "돌리는 중…" : `오픈 · ${formatUsdt(priceUsdt)}`}
        </button>
      </footer>
    </section>
  );
}

export default GachaReel;
