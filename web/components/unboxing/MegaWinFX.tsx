"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { glow } from "@/lib/tiers";

const COINS = 34;
const CONFETTI = 60;
const PALETTE = ["#E6CA65", "#FFFFFF", "#E50914", "#F3E3A3", "#D4AF37"];

/** 연출 전용 난수 — 결과와 무관 */
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * Phase 3 메가 윈 폭발 축제 — 고등급(ROYAL / PRESTIGE) 적중 시.
 *   1) 화면 전체 화이트 → 골드 플래시
 *   2) 골드 코인 샤워 (CSS 3D 회전 낙하)
 *   3) 컨페티 폭죽
 * 전부 pointer-events 없음. 3초 뒤 부모가 언마운트한다.
 */
export function MegaWinFX({ accent }: { accent: string }) {
  const coins = useMemo(
    () => Array.from({ length: COINS }, (_, i) => ({ id: i, left: rnd(0, 100), delay: rnd(0, 0.9), dur: rnd(1.8, 2.8), drift: rnd(-120, 120), spin: rnd(360, 1080), size: rnd(14, 26) })),
    [],
  );
  const confetti = useMemo(
    () => Array.from({ length: CONFETTI }, (_, i) => ({ id: i, left: rnd(0, 100), delay: rnd(0, 1.1), dur: rnd(2.2, 3.2), drift: rnd(-160, 160), spin: rnd(360, 1440), color: PALETTE[i % PALETTE.length], w: rnd(6, 10), h: rnd(10, 18) })),
    [],
  );
  return (
    <motion.div aria-hidden className="pointer-events-none fixed inset-0 z-[110] overflow-hidden" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
      {/* 화이트 → 골드 스크린 플래시 */}
      <motion.span
        className="absolute inset-0"
        style={{ background: `radial-gradient(70% 70% at 50% 45%, #ffffff 0%, ${glow(accent, 0.85)} 35%, transparent 75%)` }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.35, 0] }}
        transition={{ duration: 0.9, times: [0, 0.12, 0.5, 1], ease: "easeOut" }}
      />
      {/* 골드 링 충격파 */}
      <motion.span
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{ width: 120, height: 120, marginLeft: -60, marginTop: -60, border: `3px solid ${accent}`, boxShadow: `0 0 40px ${glow(accent, 0.8)}` }}
        initial={{ scale: 0.2, opacity: 1 }}
        animate={{ scale: 14, opacity: 0 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      />
      {/* 코인 샤워 */}
      {coins.map((c) => (
        <span
          key={`c${c.id}`}
          className="fx-coin"
          style={{ left: `${c.left}%`, width: c.size, height: c.size, ["--delay" as string]: `${c.delay}s`, ["--dur" as string]: `${c.dur}s`, ["--drift" as string]: `${c.drift}px`, ["--spin" as string]: `${c.spin}deg` }}
        />
      ))}
      {/* 컨페티 */}
      {confetti.map((f) => (
        <span
          key={`f${f.id}`}
          className="fx-confetti"
          style={{ left: `${f.left}%`, width: f.w, height: f.h, background: f.color, ["--delay" as string]: `${f.delay}s`, ["--dur" as string]: `${f.dur}s`, ["--drift" as string]: `${f.drift}px`, ["--spin" as string]: `${f.spin}deg` }}
        />
      ))}
    </motion.div>
  );
}

export default MegaWinFX;
