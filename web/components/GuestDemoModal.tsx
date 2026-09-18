"use client";

// 비회원 프리뷰 결과 모달 — 소멸형 전환 퍼널의 단일 진입/전환 지점.
//
// [경고] 이 모달은 상품을 지급하지 않는다. 지급 관련 스토어 액션을 일절 호출하지 않으며,
//        가입 시 호출하는 signupFromDemo 는 포인트만 적립한다.
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useGachaStore, demoBox, demoPrize } from "@/store/useGachaStore";
import { itemProbability } from "@/lib/rng";
import { EXIT_SOCIAL_PROOF } from "@/lib/config";
import { compactUsd, cn } from "@/lib/format";
import { LINE_META } from "@/lib/types";
import { AssetPlate } from "@/components/AssetPlate";

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const SOCIALS: { name: string }[] = [{ name: "카카오" }, { name: "구글" }, { name: "네이버" }];

/** 시네마틱 리빌 이징 — cubic-bezier(0.16, 1, 0.3, 1) */
const CINE: [number, number, number, number] = [0.16, 1, 0.3, 1];

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
          className="fixed inset-0 z-[105] flex items-center justify-center overflow-y-auto bg-black/90 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={tryClose}
        >
          <motion.div
            className="relative w-full max-w-lg overflow-hidden border border-crimson/40 bg-elevation"
            initial={{ scale: 0.96, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 24, opacity: 0 }}
            transition={{ duration: 0.6, ease: CINE }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 필름 그레인 오버레이 — 콘텐츠는 relative z-10 으로 위에 쌓인다 */}
            <span aria-hidden className="film-grain pointer-events-none absolute inset-0 z-0" />

            <button
              onClick={tryClose}
              aria-label="닫기"
              className="absolute right-3 top-11 z-20 text-neutral-500 transition hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative z-10">
              {/* 지급 불가 경고 바 — 최상단 고정, 크림슨 풀블리드 */}
              <div className="bg-crimson px-4 py-2.5 text-center">
                <span className="mr-2 align-middle text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">
                  restricted
                </span>
                <span className="align-middle text-[11px] font-bold tracking-tight text-white">
                  비회원 모의 체험: 실제 지급 불가 / 즉시 소멸 대상
                </span>
              </div>

              <div className="px-6 pt-6">
                <p className="label-caps">{repeat || expired ? "session log" : "preview complete"}</p>
                <h2 className="display mt-1.5 text-3xl text-white">
                  {repeat || expired ? "프리뷰 기록 확인" : "프리뷰 재생 완료"}
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                  {repeat || expired ? (
                    <>프리뷰 재생은 1회만 제공됩니다. 소멸 이전에 실제 세션으로 전환하십시오.</>
                  ) : (
                    <>
                      방금 노출된 항목은 <b className="font-semibold text-white">{jackpot.grade} 1등 상품</b>입니다. 실제
                      재생에서 이 상품이 나올 확률은{" "}
                      <b className="font-mono font-bold tabular-nums text-crimson">{realOdds.toFixed(3)}%</b> — 프리뷰는
                      100% 고정 노출입니다.
                    </>
                  )}
                </p>
              </div>

              {/* 상품 패널 */}
              <div
                className={cn(
                  "mx-6 mt-4 flex items-center gap-4 border border-white/[0.08] bg-ink p-3",
                  expired && "opacity-40 grayscale",
                )}
              >
                <AssetPlate code={prize.code} tone={prize.art} size="sm" active={!expired} />
                <div className="min-w-0 flex-1">
                  <span
                    className="text-[9px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: jackpot.color }}
                  >
                    {jackpot.grade}
                  </span>
                  <div className="display mt-0.5 truncate text-lg text-white">{prize.name}</div>
                  <div className="mt-0.5 text-[11px] text-neutral-500">
                    실판매가 <span className="font-mono tabular-nums text-neutral-300">{compactUsd(prize.value)}</span>
                    <span className="mx-1.5 text-neutral-700">/</span>
                    {box.title}
                  </div>
                </div>
              </div>

              {/* 지급 불가 고지 — 문구·강조 유지 */}
              <p className="mx-6 mt-3 border-l-2 border-crimson pl-3 text-[11px] leading-relaxed text-neutral-400">
                프리뷰 모드이므로 본 상품은 <b className="font-bold text-crimson">수령할 수 없으며</b> 세션 종료와 함께
                즉시 폐기됩니다. 복구 경로는 없습니다.
              </p>

              {/* 소멸 카운트다운 */}
              <div className="mt-5 border-y border-white/[0.08] py-4 text-center">
                {expired ? (
                  <>
                    <p className="label-caps">session terminated</p>
                    <p className="mt-1.5 text-xs font-semibold text-neutral-500">
                      프리뷰 세션이 만료되어 화면에서 폐기되었습니다
                    </p>
                  </>
                ) : (
                  <>
                    <p className="label-caps">time to expiry</p>
                    <div
                      className={cn(
                        "display mt-1 text-6xl tabular-nums",
                        urgent ? "animate-flicker text-crimson" : "text-white",
                      )}
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {fmt(remaining)}
                    </div>
                    <p className="mt-1.5 text-[11px] text-neutral-500">
                      0초 도달 시 프리뷰 상품이 자동 폐기됩니다
                    </p>
                  </>
                )}
              </div>

              {/* 전환 인센티브 — 포인트/부스터만, 현물 지급 없음 */}
              <div className="space-y-2 px-6 pb-6 pt-4">
                <div className="border border-white/[0.08] bg-surface p-3.5">
                  <p className="label-caps text-neutral-400">step 01 / 계정 연결</p>
                  <p className="mt-1.5 text-xs text-neutral-300">
                    <b className="font-bold text-white">웰컴 보너스 3,000P</b> 즉시 적립
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {SOCIALS.map((s) => (
                      <button
                        key={s.name}
                        onClick={() => signup(s.name)}
                        className="border border-white/[0.08] bg-ink py-2.5 text-xs font-bold tracking-tight text-neutral-200 transition-all duration-300 ease-cine hover:bg-canvas hover:text-white hover:outline hover:outline-1 hover:outline-white"
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-center text-[9px] uppercase tracking-[0.14em] text-neutral-600">
                    프로토타입 / 실제 OAuth 미연동 / 클릭 시 모의 가입
                  </p>
                </div>

                <div className="border border-white/[0.08] p-3.5">
                  <p className="label-caps">step 02 / 첫 결제 시</p>
                  <p className="mt-1.5 text-xs text-neutral-400">
                    <b className="font-bold text-neutral-200">부스터 게이지 9/10 즉시 충전</b> · 1회 재생 후 무장되며
                    그 다음 재생에 {jackpot.grade} 가중치 5배가 적용됩니다
                  </p>
                </div>

                <div className="border border-white/[0.08] p-3.5">
                  <p className="label-caps">step 03 / 첫 충전</p>
                  <p className="mt-1.5 text-xs text-neutral-400">
                    <b className="font-bold text-neutral-200">1+1 더블 충전</b> — 충전 금액 100% 추가 지급
                  </p>
                </div>

                <button
                  onClick={() => signup("카카오")}
                  className="mt-2 w-full bg-crimson py-3.5 text-sm font-black tracking-tight text-white transition-all duration-300 ease-cine hover:outline hover:outline-1 hover:outline-white"
                >
                  3,000P 수령 후 실제 세션 재생
                </button>
              </div>
            </div>

            {/* 이탈 방지 */}
            <AnimatePresence>
              {exitConfirm && (
                <motion.div
                  className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 p-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="w-full border border-crimson/50 bg-surface p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-crimson">exit session</p>
                    <div className="mt-2 h-px w-full bg-crimson" />
                    <h3 className="display mt-3 text-2xl text-white">혜택 없이 종료</h3>
                    <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                      지금 닫으면 <b className="font-bold text-crimson">웰컴 보너스 3,000P</b>와 첫 결제 부스터는
                      적용되지 않습니다.
                    </p>
                    {EXIT_SOCIAL_PROOF && (
                      <p className="mt-3 flex items-center gap-2 border-t border-white/[0.08] pt-3 text-[11px] text-neutral-500">
                        <span className="font-mono tabular-nums text-neutral-300">
                          {EXIT_SOCIAL_PROOF.count.toLocaleString()}
                        </span>
                        명이 가입하고 혜택을 받았습니다
                        {EXIT_SOCIAL_PROOF.isDemo && (
                          <span className="border border-white/20 px-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                            demo
                          </span>
                        )}
                      </p>
                    )}
                    <div className="mt-4 flex flex-col gap-2">
                      <button
                        onClick={() => setExitConfirm(false)}
                        className="bg-crimson py-2.5 text-sm font-black tracking-tight text-white transition-all duration-300 ease-cine hover:outline hover:outline-1 hover:outline-white"
                      >
                        세션 유지
                      </button>
                      <button
                        onClick={() => {
                          setExitConfirm(false);
                          setOpen(false);
                        }}
                        className="border border-white/[0.08] py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 transition hover:bg-white/5 hover:text-neutral-300"
                      >
                        세션 종료
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
