"use client";

// 비회원 모의 체험 결과 모달 — 소멸형 FOMO 퍼널의 단일 진입/전환 지점.
//
// ⚠️ 이 모달은 상품을 지급하지 않는다. 지급 관련 스토어 액션을 일절 호출하지 않으며,
//    가입 시 호출하는 signupFromDemo 는 포인트만 적립한다.
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Lock, Timer, CheckCircle2, Zap, Users, Ban } from "lucide-react";
import { useGachaStore, demoBox, demoPrize } from "@/store/useGachaStore";
import { itemProbability } from "@/lib/rng";
import { EXIT_SOCIAL_PROOF } from "@/lib/config";
import { compactUsd, cn } from "@/lib/format";
import { LINE_META } from "@/lib/types";

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const SOCIALS: { name: string; bg: string; fg: string }[] = [
  { name: "카카오", bg: "#FEE500", fg: "#191919" },
  { name: "구글", bg: "#ffffff", fg: "#1f1f1f" },
  { name: "네이버", bg: "#03C75A", fg: "#ffffff" },
];

export function GuestDemoModal() {
  const open = useGachaStore((s) => s.demoModalOpen);
  const demo = useGachaStore((s) => s.guestDemo);
  const repeat = useGachaStore((s) => s.demoRepeat);
  const setOpen = useGachaStore((s) => s.setDemoModalOpen);
  const expire = useGachaStore((s) => s.expireDemo);
  const signup = useGachaStore((s) => s.signupFromDemo);

  const [now, setNow] = useState(() => Date.now());
  const [exitConfirm, setExitConfirm] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (demo.status === "shown" && demo.deadline && now >= demo.deadline) expire();
  }, [now, demo, expire]);

  useEffect(() => {
    if (!open) setExitConfirm(false);
  }, [open]);

  const box = demoBox();
  const prize = demoPrize();
  const realOdds = itemProbability(box, prize);
  const jackpot = LINE_META.jackpot;
  const remaining = demo.deadline ? demo.deadline - now : 0;
  const expired = demo.status === "expired";
  const urgent = remaining < 30_000;

  const tryClose = () => (expired ? setOpen(false) : setExitConfirm(true));

  return (
    <AnimatePresence>
      {open && (
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

            {/* 지급 불가 경고 배지 — 상품 카드 상단 고정 */}
            <div className="flex items-center justify-center gap-1.5 bg-accent px-4 py-2 text-center text-[11px] font-black text-white">
              <Ban className="h-3.5 w-3.5 flex-none" />
              비회원 모의 체험: 실제 지급 불가 / 즉시 소멸 대상
            </div>

            <div className="px-6 pt-5">
              <h2 className="text-lg font-black leading-snug">
                {repeat || expired ? "이미 대박 기운을 확인하셨습니다" : "아… 이걸 그냥 날리시나요?"}
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-300">
                {repeat || expired ? (
                  <>소멸되기 전에 &lsquo;진짜&rsquo;를 뽑으세요. 체험은 1회만 제공됩니다.</>
                ) : (
                  <>
                    지금 보신 건 <b className="text-gold">[{jackpot.label}] 1등 상품</b>입니다. 실제 오픈에서 이 상품이
                    나올 확률은 <b className="font-mono text-gold">{realOdds.toFixed(3)}%</b> — 체험판에서는 100%
                    보여드립니다.
                  </>
                )}
              </p>
            </div>

            {/* 상품 카드 */}
            <div
              className={cn(
                "mx-6 mt-3 flex items-center gap-3 rounded-lg border p-3",
                expired && "opacity-40 grayscale",
              )}
              style={{ borderColor: jackpot.color }}
            >
              <div
                className="flex h-16 w-16 flex-none items-center justify-center rounded text-4xl"
                style={{ background: prize.art }}
              >
                {prize.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <span
                  className="rounded px-1 text-[9px] font-black"
                  style={{ background: jackpot.color, color: "#000" }}
                >
                  {jackpot.label}
                </span>
                <div className="truncate text-base font-bold">{prize.name}</div>
                <div className="text-[11px] text-gray-500">
                  실판매가 {compactUsd(prize.value)} · {box.title}
                </div>
              </div>
            </div>

            <p className="mx-6 mt-2 text-[11px] leading-relaxed text-gray-400">
              모의 체험 모드이므로 본 상품은 <b className="text-accent">수령할 수 없으며</b> 세션 종료와 함께 즉시
              폐기됩니다. 너무 아깝지 않으신가요?
            </p>

            {/* 소멸 카운트다운 */}
            <div className="mt-3 text-center">
              {expired ? (
                <p className="text-xs font-bold text-gray-500">
                  체험 세션이 만료되어 화면에서 폐기되었습니다
                </p>
              ) : (
                <>
                  <div
                    className={cn(
                      "inline-flex items-center gap-2 font-mono text-4xl font-black tabular-nums",
                      urgent ? "animate-pulse text-accent" : "text-white",
                    )}
                  >
                    <Timer className={cn("h-7 w-7", urgent ? "text-accent" : "text-gold")} />
                    {fmt(remaining)}
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-500">0초 도달 시 체험 상품이 자동 폐기됩니다</p>
                </>
              )}
            </div>

            {/* 전환 인센티브 — 포인트/부스터만, 현물 지급 없음 */}
            <div className="space-y-2 px-6 pb-5 pt-4">
              <div className="rounded-lg border border-gold/60 bg-gold/10 p-3">
                <div className="flex items-center gap-2 text-sm font-bold text-gold">
                  <CheckCircle2 className="h-4 w-4" /> 1단계 · 지금 3초 간편가입
                </div>
                <p className="mt-0.5 text-xs text-gray-300">
                  <b>웰컴 보너스 3,000P</b> 즉시 적립
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {SOCIALS.map((s) => (
                    <button
                      key={s.name}
                      onClick={() => signup(s.name)}
                      className="rounded py-2 text-sm font-black transition hover:brightness-95"
                      style={{ background: s.bg, color: s.fg }}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-center text-[9px] text-gray-500">
                  프로토타입 — 실제 OAuth 미연동, 클릭 시 모의 가입
                </p>
              </div>

              <div className="rounded-lg border border-white/10 p-3 opacity-80">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-200">
                  <Lock className="h-4 w-4 text-gray-500" /> 2단계 · 첫 결제 시
                </div>
                <p className="mt-0.5 text-xs text-gray-400">
                  <b>확률 부스터 9/10 즉시 충전</b> — 다음 실제 오픈에 [{jackpot.label}] 가중치 5배 확정
                </p>
              </div>

              <div className="rounded-lg border border-white/10 p-3 opacity-80">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-200">
                  <Zap className="h-4 w-4 text-gray-500" /> 3단계 · 첫 충전
                </div>
                <p className="mt-0.5 text-xs text-gray-400">
                  <b>1+1 더블 충전</b> — 충전 금액 100% 추가 지급
                </p>
              </div>

              <button
                onClick={() => signup("카카오")}
                className="mt-1 w-full animate-pulseGlow rounded bg-gold py-3 text-sm font-black text-black transition hover:bg-yellow-300"
              >
                3,000P 받고 &lsquo;진짜&rsquo; 뽑으러 가기
              </button>
            </div>

            {/* 이탈 방지 */}
            <AnimatePresence>
              {exitConfirm && (
                <motion.div
                  className="absolute inset-0 z-20 flex items-center justify-center bg-black/85 p-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="w-full rounded-lg border border-accent/60 bg-surface p-5 text-center shadow-2xl">
                    <div className="text-2xl">⚠️</div>
                    <h3 className="mt-2 text-lg font-black">정말 이 혜택을 포기하시겠습니까?</h3>
                    <p className="mt-1 text-xs text-gray-400">
                      지금 닫으면 <b className="text-accent">웰컴 보너스 3,000P</b>와 첫 결제 부스터 혜택을 받지 못합니다.
                    </p>
                    {EXIT_SOCIAL_PROOF && (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-gray-500">
                        <Users className="h-3 w-3" />
                        현재 {EXIT_SOCIAL_PROOF.count.toLocaleString()}명이 가입하고 혜택을 받았습니다
                        {EXIT_SOCIAL_PROOF.isDemo && (
                          <span className="rounded border border-white/20 px-1 text-[9px] uppercase tracking-wider">
                            demo
                          </span>
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
                      <button
                        onClick={() => {
                          setExitConfirm(false);
                          setOpen(false);
                        }}
                        className="rounded border border-white/20 py-2 text-xs text-gray-400 hover:bg-white/5"
                      >
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
