"use client";

import { useState } from "react";
import { Gift, Loader2 } from "lucide-react";
import { useGachaStore } from "@/store/useGachaStore";
import { TRIAL_POOL } from "@/lib/engine";
import { cn } from "@/lib/format";

const SPIN_MS = 1500; // 스펙: 룰렛/오픈 연출 1.5초

/** 비회원 전용 1회 무료 뽑기 배너 — Phase 2 */
export function GuestTrialBanner() {
  const isMember = useGachaStore((s) => s.isMember);
  const trial = useGachaStore((s) => s.trial);
  const hydrated = useGachaStore((s) => s.trialHydrated);
  const guestTrial = useGachaStore((s) => s.guestTrial);

  const [spinning, setSpinning] = useState(false);
  const [reelIdx, setReelIdx] = useState(0);

  if (!hydrated || isMember || trial.status !== "idle") return null;

  const start = async () => {
    if (spinning) return;
    setSpinning(true);
    // 룰렛 연출: 상품 풀 이모지를 고속 순환
    const reel = setInterval(() => setReelIdx((i) => i + 1), 90);
    await Promise.all([guestTrial(), new Promise((r) => setTimeout(r, SPIN_MS))]);
    clearInterval(reel);
    setSpinning(false);
  };

  return (
    <section className="mx-[4%] mb-10 overflow-hidden rounded-lg border border-gold/50 bg-gradient-to-r from-[#2a1a00] via-[#1d1405] to-[#141414] shadow-[0_0_40px_rgba(255,215,0,0.15)]">
      <div className="flex flex-wrap items-center gap-4 px-5 py-4 md:px-8">
        <div
          className={cn(
            "flex h-14 w-14 flex-none items-center justify-center rounded-full bg-gold/15 text-3xl",
            spinning && "animate-spin",
          )}
        >
          {spinning ? TRIAL_POOL[reelIdx % TRIAL_POOL.length].emoji : "🎁"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-black uppercase">비회원 전용</span>
            <h2 className="text-lg font-black md:text-xl">1회 무료 뽑기 — 꽝 없이 100% 당첨</h2>
          </div>
          <p className="mt-0.5 text-xs text-gray-400 md:text-sm">
            가입 없이 지금 바로. 상품 풀:{" "}
            {TRIAL_POOL.map((t) => `${t.emoji} ${t.name}`).join(" · ")}
          </p>
        </div>
        <button
          onClick={start}
          disabled={spinning}
          className={cn(
            "flex items-center gap-2 rounded bg-gold px-6 py-2.5 text-base font-black text-black transition",
            spinning ? "opacity-80" : "animate-pulseGlow hover:bg-yellow-300",
          )}
        >
          {spinning ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> 오픈 중…
            </>
          ) : (
            <>
              <Gift className="h-5 w-5" /> 무료로 뽑기
            </>
          )}
        </button>
      </div>
    </section>
  );
}
