"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { playGearClick, playHeartbeat } from "@/lib/audio";
import { useSettingsStore } from "@/stores/settingsStore";

/** 3단계 문지기 컷인 타이밍(ms) — 휠 잠금 해제 → 틈새 아우라 → 암전·심장 박동 */
export const GATE_STAGE_MS = [900, 800, 420] as const;
export const GATE_TOTAL_MS = GATE_STAGE_MS[0] + GATE_STAGE_MS[1] + GATE_STAGE_MS[2];

/**
 * 박스를 열기 전 3단계 텐션 컷인.
 *   1) 메탈릭 기어 휠이 '찰칵' 돌아가며 잠금 해제
 *   2) 금고 문틈으로 빛이 샘 — 블루 → 바이올렛 → 골드 레이저 빔
 *   3) 0.4초 암전 + 심장 박동 → 부모가 릴을 시작한다
 * 결과와 무관한 순수 연출. 부모가 GATE_TOTAL_MS 뒤 언마운트한다.
 */
export function VaultGateFX() {
  const t = useTranslations("gate");
  const [stage, setStage] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    const muted = () => useSettingsStore.getState().muted;
    const clicks = [0, 180, 360, 560, 760].map((d) => setTimeout(() => !muted() && playGearClick(), d));
    const s1 = setTimeout(() => setStage(1), GATE_STAGE_MS[0]);
    const s2 = setTimeout(() => {
      setStage(2);
      if (!muted()) playHeartbeat();
    }, GATE_STAGE_MS[0] + GATE_STAGE_MS[1]);
    return () => {
      clicks.forEach(clearTimeout);
      clearTimeout(s1);
      clearTimeout(s2);
    };
  }, []);

  return (
    <motion.div aria-hidden className="absolute inset-0 z-[60] flex items-center justify-center overflow-hidden bg-obsidian" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      {stage < 2 ? (
        <>
          {/* 문틈 아우라 — 2단계에서 블루 → 바이올렛 → 골드 */}
          <motion.span
            className="absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2"
            initial={{ opacity: 0, scaleY: 0.2 }}
            animate={stage === 1 ? { opacity: [0, 1, 1, 1], scaleY: [0.2, 1, 1, 1], backgroundColor: ["#3B82F6", "#3B82F6", "#8B5CF6", "#E6CA65"], boxShadow: ["0 0 20px rgba(59,130,246,0.9)", "0 0 40px rgba(59,130,246,0.9)", "0 0 60px rgba(139,92,246,0.9)", "0 0 90px rgba(230,202,101,1)"] } : { opacity: 0 }}
            transition={{ duration: GATE_STAGE_MS[1] / 1000, times: [0, 0.3, 0.65, 1], ease: "easeInOut" }}
          />
          {stage === 1 && (
            <>
              <motion.span className="absolute inset-y-0 left-0 w-1/2 bg-[#101010]" initial={{ x: 0 }} animate={{ x: "-6%" }} transition={{ duration: GATE_STAGE_MS[1] / 1000, ease: "easeInOut" }} style={{ boxShadow: "inset -1px 0 0 rgba(255,255,255,0.08)" }} />
              <motion.span className="absolute inset-y-0 right-0 w-1/2 bg-[#101010]" initial={{ x: 0 }} animate={{ x: "6%" }} transition={{ duration: GATE_STAGE_MS[1] / 1000, ease: "easeInOut" }} style={{ boxShadow: "inset 1px 0 0 rgba(255,255,255,0.08)" }} />
              <motion.span className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.25, 0.5, 0.9] }} transition={{ duration: GATE_STAGE_MS[1] / 1000, times: [0, 0.3, 0.65, 1] }} style={{ background: "radial-gradient(30% 100% at 50% 50%, rgba(230,202,101,0.35) 0%, rgba(139,92,246,0.15) 40%, transparent 75%)" }} />
            </>
          )}

          {/* 1단계: 메탈릭 기어 휠 */}
          {stage === 0 && (
            <div className="relative flex flex-col items-center">
              <motion.svg
                viewBox="0 0 200 200"
                className="h-44 w-44 sm:h-56 sm:w-56"
                initial={{ rotate: -140, scale: 0.9, opacity: 0.6 }}
                animate={{ rotate: [-140, -60, -20, 40, 0], scale: 1, opacity: 1 }}
                transition={{ duration: GATE_STAGE_MS[0] / 1000, times: [0, 0.25, 0.45, 0.8, 1], ease: "easeOut" }}
                style={{ filter: "drop-shadow(0 0 24px rgba(230,202,101,0.35))" }}
              >
                <defs>
                  <linearGradient id="gate-metal" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#E9E9E9" />
                    <stop offset="0.35" stopColor="#7A7A7A" />
                    <stop offset="0.7" stopColor="#D4AF37" />
                    <stop offset="1" stopColor="#3A3A3A" />
                  </linearGradient>
                </defs>
                {Array.from({ length: 12 }, (_, i) => (
                  <rect key={i} x="92" y="6" width="16" height="30" rx="3" fill="url(#gate-metal)" transform={`rotate(${i * 30} 100 100)`} />
                ))}
                <circle cx="100" cy="100" r="78" fill="#141414" stroke="url(#gate-metal)" strokeWidth="10" />
                <circle cx="100" cy="100" r="52" fill="none" stroke="rgba(230,202,101,0.5)" strokeWidth="2" strokeDasharray="6 10" />
                {[0, 120, 240].map((a) => (
                  <rect key={a} x="96" y="48" width="8" height="52" rx="4" fill="#D4AF37" transform={`rotate(${a} 100 100)`} />
                ))}
                <circle cx="100" cy="100" r="16" fill="url(#gate-metal)" />
              </motion.svg>
              <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.35em] text-gold-champagne">{t("stage1")}</div>
            </div>
          )}
          {stage === 1 && <div className="absolute bottom-[12%] text-[11px] font-bold uppercase tracking-[0.35em] text-white/80">{t("stage2")}</div>}
        </>
      ) : (
        /* 3단계: 암전 + 심장 박동 */
        <motion.div className="absolute inset-0 bg-black" initial={{ opacity: 0.6 }} animate={{ opacity: [0.6, 1, 1, 0.92, 1] }} transition={{ duration: GATE_STAGE_MS[2] / 1000, times: [0, 0.2, 0.5, 0.6, 1] }}>
          <motion.span className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "radial-gradient(circle, rgba(229,9,20,0.35) 0%, transparent 70%)" }} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: [0.6, 1.6, 0.8, 1.8], opacity: [0, 0.9, 0.3, 0] }} transition={{ duration: GATE_STAGE_MS[2] / 1000, times: [0, 0.25, 0.5, 1] }} />
        </motion.div>
      )}
    </motion.div>
  );
}

export default VaultGateFX;
