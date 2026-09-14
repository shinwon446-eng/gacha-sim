"use client";

// 게스트 무료체험 시스템 루트:
// - 마운트 시 localStorage 에서 임시 보관함 상태 복원 (새로고침 유지 — 시나리오 B)
// - 1초 틱으로 카운트다운 + 만료 처리
// - 임시 보관함 홀드 바(모달 닫힘 상태) + 타이머 잠금 모달 렌더
import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { useGachaStore } from "@/store/useGachaStore";
import { TRIAL_MAP } from "@/lib/engine";
import { TrialLockModal } from "./TrialLockModal";

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export function TrialSystem() {
  const trial = useGachaStore((s) => s.trial);
  const modalOpen = useGachaStore((s) => s.trialModalOpen);
  const hydrateTrial = useGachaStore((s) => s.hydrateTrial);
  const expireTrial = useGachaStore((s) => s.expireTrial);
  const setModalOpen = useGachaStore((s) => s.setTrialModalOpen);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    hydrateTrial();
    // 개발 환경 전용: 시나리오 검증 스크립트에서 스토어 접근용 훅
    if (process.env.NODE_ENV === "development") {
      (window as unknown as { __gacha?: typeof useGachaStore }).__gacha = useGachaStore;
    }
  }, [hydrateTrial]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // 타이머 만료 → 상품 자동 소멸
  useEffect(() => {
    if (trial.status === "won" && trial.deadline && now >= trial.deadline) expireTrial();
  }, [now, trial, expireTrial]);

  const prize = trial.prizeId ? TRIAL_MAP[trial.prizeId] : null;
  const showHoldBar = trial.status === "won" && !modalOpen && prize && trial.deadline;

  return (
    <>
      {showHoldBar && (
        <button
          onClick={() => setModalOpen(true)}
          className="fixed bottom-4 left-1/2 z-[65] flex -translate-x-1/2 items-center gap-2 rounded-full border border-gold/60 bg-elevation/95 px-4 py-2 text-sm shadow-[0_0_30px_rgba(255,215,0,0.3)] backdrop-blur transition hover:scale-105"
        >
          <span className="text-lg">{prize.emoji}</span>
          <span className="font-bold">임시 보관함: {prize.name}</span>
          <span className="flex items-center gap-1 font-mono font-black text-accent">
            <Timer className="h-4 w-4" />
            {fmt(trial.deadline! - now)}
          </span>
          <span className="text-[10px] text-gray-500">후 소멸</span>
        </button>
      )}
      <TrialLockModal now={now} />
    </>
  );
}
