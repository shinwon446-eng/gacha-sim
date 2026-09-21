"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";

const KEY = "hasSeenIntro";
/** 인트로 길이 — 스펙 1.8초 */
export const INTRO_MS = 1800;

/**
 * 넷플릭스 스타일 럭셔리 브랜드 시네마틱 인트로.
 * 딥 옵시디언 위로 샴페인 골드 레이저가 좌우 스위프 → 메탈릭 'GACHAFLIX' 가 떠오르고 → 슬로건 페이드인 → 1.8초 뒤 디졸브.
 * sessionStorage('hasSeenIntro') — 세션당 1회. 우측 상단 SKIP.
 */
export function SplashScreen() {
  const t = useTranslations("splash");
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY) === "1";
      if (!seen) sessionStorage.setItem(KEY, "1");
    } catch {
      /* 스토리지 불가 — 한 번은 보여준다 */
    }
    if (seen) return;
    setShow(true);
    const id = setTimeout(() => setShow(false), INTRO_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          role="presentation"
          className="fixed inset-0 z-[300] flex flex-col items-center justify-center overflow-hidden bg-obsidian"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {/* 바닥 비네트 */}
          <span aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(60% 50% at 50% 50%, rgba(230,202,101,0.08) 0%, rgba(11,11,11,0) 70%)" }} />
          {/* 샴페인 골드 레이저 스위프 — 좌→우→좌 */}
          <motion.span
            aria-hidden
            className="absolute inset-y-0 w-[38%]"
            style={{ background: "linear-gradient(90deg, transparent 0%, rgba(230,202,101,0.10) 35%, rgba(255,247,214,0.55) 50%, rgba(230,202,101,0.10) 65%, transparent 100%)", filter: "blur(2px)" }}
            initial={{ x: "-120%" }}
            animate={{ x: ["-120%", "300%", "-120%"] }}
            transition={{ duration: 1.6, ease: "easeInOut", times: [0, 0.55, 1] }}
          />
          <motion.span
            aria-hidden
            className="absolute left-1/2 top-1/2 h-px w-[70vw] -translate-x-1/2"
            style={{ background: "linear-gradient(90deg, transparent, #E6CA65 30%, #fff7d6 50%, #E6CA65 70%, transparent)", boxShadow: "0 0 18px rgba(230,202,101,0.8)" }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: [0, 1, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 1.4, times: [0, 0.4, 1], ease: "easeOut" }}
          />

          {/* 로고 */}
          <motion.div
            className="relative text-center"
            initial={{ opacity: 0, scale: 0.92, letterSpacing: "0.3em" }}
            animate={{ opacity: 1, scale: 1, letterSpacing: "0.08em" }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          >
            <div className="text-gold-gradient font-display text-[44px] font-bold uppercase leading-none tracking-[0.08em] sm:text-[72px]" style={{ textShadow: "0 0 40px rgba(230,202,101,0.35)" }}>
              GACHAFLIX
            </div>
            <motion.div
              className="mt-4 text-[10px] font-semibold uppercase tracking-[0.42em] text-[#B8A25A] sm:text-xs"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
            >
              {t("slogan")}
            </motion.div>
          </motion.div>

          {/* SKIP */}
          <button
            type="button"
            onClick={() => setShow(false)}
            className="absolute right-[4%] top-5 flex h-9 items-center gap-1 rounded-md border border-white/20 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-secondary transition-colors hover:border-gold-champagne hover:text-gold-champagne"
          >
            {t("skip")} ➔
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SplashScreen;
