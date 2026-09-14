"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Lock, CheckCircle2, Share2, Zap, Timer, Users } from "lucide-react";
import { useGachaStore } from "@/store/useGachaStore";
import { TRIAL_MAP, TRIAL_POOL, effectiveItems } from "@/lib/engine";
import { EXIT_SOCIAL_PROOF } from "@/lib/config";
import { cn } from "@/lib/format";
import { TIER_META } from "@/lib/types";

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const SOCIALS: { name: string; bg: string; fg: string }[] = [
  { name: "카카오", bg: "#FEE500", fg: "#191919" },
  { name: "구글", bg: "#ffffff", fg: "#1f1f1f" },
  { name: "네이버", bg: "#03C75A", fg: "#ffffff" },
];

/** 당첨 직후 전체화면 타이머 잠금 모달 + 3단계 리워드 퍼널 — Phase 2 */
export function TrialLockModal({ now }: { now: number }) {
  const open = useGachaStore((s) => s.trialModalOpen);
  const trial = useGachaStore((s) => s.trial);
  const isMember = useGachaStore((s) => s.isMember);
  const firstChargeUsed = useGachaStore((s) => s.firstChargeUsed);
  const setOpen = useGachaStore((s) => s.setTrialModalOpen);
  const claim = useGachaStore((s) => s.claimTrialSignup);
  const copyInvite = useGachaStore((s) => s.copyInviteLink);

  const [exitConfirm, setExitConfirm] = useState(false);

  const prize = trial.prizeId ? TRIAL_MAP[trial.prizeId] : null;
  const remaining = trial.deadline ? trial.deadline - now : 0;
  const urgent = remaining < 60_000;
  const totalW = effectiveItems(TRIAL_POOL, { boost: false, tierMult: 1 }).reduce((s, e) => s + e.w, 0);

  // 이탈 방지(Exit-Intent): 바깥 클릭/X → 즉시 닫지 않고 경고 다이얼로그
  const tryClose = () => setExitConfirm(true);
  const reallyClose = () => {
    setExitConfirm(false);
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && trial.status === "won" && prize && (
        <motion.div
          className="fixed inset-0 z-[105] flex items-center justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={tryClose}
        >
          <motion.div
            className="relative w-full max-w-lg overflow-hidden rounded-xl border border-gold/40 bg-elevation shadow-[0_0_80px_rgba(255,215,0,0.25)]"
            initial={{ scale: 0.9, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 30 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={tryClose} className="absolute right-3 top-3 z-10 text-gray-500 hover:text-white">
              <X className="h-5 w-5" />
            </button>

            {/* 헤더 */}
            <div className="bg-gradient-to-b from-gold/15 to-transparent px-6 pt-6 text-center">
              <div className="text-3xl">🎉</div>
              <h2 className="mt-1 text-xl font-black">축하합니다!</h2>
              <p className="mt-1 text-sm text-gray-300">
                당첨 상품이 <b className="text-gold">[임시 보관함]</b>에 안전하게 보관되었습니다.
              </p>
            </div>

            {/* 당첨 상품 */}
            <div className="mx-6 mt-4 flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: TIER_META[prize.tier].color }}>
              <div className="flex h-16 w-16 flex-none items-center justify-center rounded text-4xl" style={{ background: prize.art }}>
                {prize.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <span
                  className="rounded px-1 text-[9px] font-black"
                  style={{ background: TIER_META[prize.tier].color, color: "#000" }}
                >
                  {prize.tier}
                </span>
                <div className="truncate text-base font-bold">{prize.name}</div>
                <div className="text-[10px] text-gray-500">
                  당첨 확률 {((prize.weight / totalW) * 100).toFixed(1)}% · 전체 확률은 배너에 공개
                </div>
              </div>
            </div>

            {/* 카운트다운 */}
            <div className="mt-4 text-center">
              <div
                className={cn(
                  "inline-flex items-center gap-2 font-mono text-4xl font-black tabular-nums",
                  urgent ? "animate-pulse text-accent" : "text-white",
                )}
              >
                <Timer className={cn("h-7 w-7", urgent ? "text-accent" : "text-gold")} />
                {fmt(remaining)}
              </div>
              <p className="mt-1 text-[11px] text-gray-500">타이머 종료 시 임시 보관 상품이 자동 소멸됩니다</p>
            </div>

            {/* 3단계 프로그레시브 리워드 */}
            <div className="space-y-2 px-6 py-4">
              {/* Step 1 — 활성 */}
              <div className="rounded-lg border border-gold/60 bg-gold/10 p-3">
                <div className="flex items-center gap-2 text-sm font-bold text-gold">
                  <CheckCircle2 className="h-4 w-4" /> STEP 1 · 간편 회원가입 완료 시
                </div>
                <p className="mt-0.5 text-xs text-gray-300">
                  방금 뽑은 상품 <b>즉시 확정 수령</b> + <b>가입 축하 3,000P</b> 즉시 지급
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {SOCIALS.map((s2) => (
                    <button
                      key={s2.name}
                      onClick={() => claim(s2.name)}
                      className="animate-pulseGlow rounded py-2 text-sm font-black transition hover:brightness-95"
                      style={{ background: s2.bg, color: s2.fg }}
                    >
                      {s2.name}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-center text-[9px] text-gray-500">프로토타입 — 실제 OAuth 미연동, 클릭 시 모의 가입</p>
              </div>

              {/* Step 2 — 잠금 */}
              <div className={cn("rounded-lg border p-3", isMember ? "border-white/25" : "border-white/10 opacity-70")}>
                <div className="flex items-center gap-2 text-sm font-bold text-gray-200">
                  {isMember ? <Share2 className="h-4 w-4 text-emerald-400" /> : <Lock className="h-4 w-4 text-gray-500" />}
                  STEP 2 · 친구 1명 초대 시
                </div>
                <p className="mt-0.5 text-xs text-gray-400">
                  <b>무료 뽑기 티켓 1회권</b> + <b>친구 결제액 5% 무제한 캐시백</b>
                </p>
                {isMember && (
                  <button onClick={copyInvite} className="mt-2 rounded border border-white/30 px-3 py-1 text-xs font-semibold hover:bg-white/10">
                    초대 링크 복사
                  </button>
                )}
              </div>

              {/* Step 3 — 잠금 */}
              <div className={cn("rounded-lg border p-3", isMember && !firstChargeUsed ? "border-white/25" : "border-white/10 opacity-70")}>
                <div className="flex items-center gap-2 text-sm font-bold text-gray-200">
                  {isMember && !firstChargeUsed ? (
                    <Zap className="h-4 w-4 text-gold" />
                  ) : (
                    <Lock className="h-4 w-4 text-gray-500" />
                  )}
                  STEP 3 · 첫 충전 시
                </div>
                <p className="mt-0.5 text-xs text-gray-400">
                  충전 금액 <b>100% 더블 지급 (1+1)</b> + <b>부스터 게이지 즉시 9/10 충전</b> (다음 뽑기 확률 대폭 상승)
                </p>
              </div>
            </div>

            {/* Exit-Intent 경고 다이얼로그 */}
            <AnimatePresence>
              {exitConfirm && (
                <motion.div
                  className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="w-full rounded-lg border border-accent/60 bg-surface p-5 text-center shadow-2xl">
                    <div className="text-2xl">⚠️</div>
                    <h3 className="mt-2 text-lg font-black">정말 이 혜택을 포기하시겠습니까?</h3>
                    <p className="mt-1 text-xs text-gray-400">
                      지금 닫으면 <b className="text-accent">{prize.name}</b>이(가) {fmt(remaining)} 후 소멸됩니다.
                    </p>
                    {EXIT_SOCIAL_PROOF && (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-gray-500">
                        <Users className="h-3 w-3" />
                        현재 {EXIT_SOCIAL_PROOF.count.toLocaleString()}명이 방금 가입하고 수령했습니다
                        {EXIT_SOCIAL_PROOF.isDemo && (
                          <span className="rounded border border-white/20 px-1 text-[9px] uppercase tracking-wider">demo</span>
                        )}
                      </p>
                    )}
                    <div className="mt-4 flex flex-col gap-2">
                      <button
                        onClick={() => setExitConfirm(false)}
                        className="rounded bg-gold py-2.5 text-sm font-black text-black hover:bg-yellow-300"
                      >
                        혜택 계속 받기
                      </button>
                      <button onClick={reallyClose} className="rounded border border-white/20 py-2 text-xs text-gray-400 hover:bg-white/5">
                        포기하고 닫기
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
