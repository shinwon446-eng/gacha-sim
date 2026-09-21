"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { glow } from "@/lib/tiers";

/** 승급 반전 연출 길이(ms) — 노이즈·화면 갈라짐 → 번개 강타 → UPGRADE! 네온 */
export const UPGRADE_FX_MS = 1100;

/**
 * 번개 각성 승급 — 잭팟인데 0.5초 동안 '꽝' 처럼 보여준 뒤 화면이 갈라지며 골드/보라 번개가 카드를 때린다.
 * 결과는 이미 Provably Fair 로 확정돼 있고, 이 컴포넌트는 그 공개 순서만 극적으로 바꾼다.
 */
export function UpgradeFX({ accent }: { accent: string }) {
  const t = useTranslations("unbox");
  const bolt = "M 96 0 L 62 72 L 92 74 L 40 160 L 118 62 L 86 60 Z";
  return (
    <motion.div aria-hidden className="pointer-events-none fixed inset-0 z-[115] overflow-hidden" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      {/* 노이즈 + 화면 갈라짐 */}
      <span className="fx-glitch absolute inset-0" />
      <svg className="fx-crack absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M50 0 L48 18 L53 31 L47 44 L52 58 L46 71 L51 86 L49 100" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.35" />
        <path d="M48 18 L30 26 L22 35" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.25" />
        <path d="M52 58 L68 64 L80 75" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.25" />
        <path d="M47 44 L36 52" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.2" />
        <path d="M51 86 L62 92" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.2" />
      </svg>
      {/* 24K 골드 / 바이올렛 번개 */}
      <motion.svg
        viewBox="0 0 160 160"
        className="absolute left-1/2 top-0 h-[70vh] w-auto -translate-x-1/2"
        initial={{ opacity: 0, scaleY: 0.2, originY: 0 }}
        animate={{ opacity: [0, 1, 0.6, 1, 0], scaleY: [0.2, 1, 1, 1, 1] }}
        transition={{ duration: 0.55, delay: 0.25, times: [0, 0.15, 0.4, 0.6, 1] }}
        style={{ filter: `drop-shadow(0 0 22px ${glow(accent, 0.95)}) drop-shadow(0 0 60px rgba(139,92,246,0.7))` }}
      >
        <path d={bolt} fill="#FFF7D6" />
        <path d={bolt} fill="none" stroke={accent} strokeWidth="3" strokeLinejoin="round" />
      </motion.svg>
      {/* 화이트 → 골드 플래시 */}
      <motion.span className="absolute inset-0" style={{ background: `radial-gradient(60% 60% at 50% 50%, #ffffff 0%, ${glow(accent, 0.7)} 40%, transparent 75%)` }} initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 1, 0] }} transition={{ duration: 0.7, delay: 0.25, times: [0, 0.2, 0.35, 1] }} />
      {/* UPGRADE! 네온 텍스트 */}
      <motion.div
        className="absolute inset-x-0 top-[22%] text-center font-display text-5xl font-bold uppercase tracking-[0.12em] sm:text-7xl"
        style={{ color: "#fff", textShadow: `0 0 12px #fff, 0 0 28px ${accent}, 0 0 60px ${accent}, 0 0 90px rgba(139,92,246,0.8)` }}
        initial={{ opacity: 0, scale: 0.5, rotate: -6 }}
        animate={{ opacity: [0, 1, 1], scale: [0.5, 1.15, 1], rotate: [-6, 2, 0] }}
        transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {t("upgrade")}
      </motion.div>
    </motion.div>
  );
}

export default UpgradeFX;
