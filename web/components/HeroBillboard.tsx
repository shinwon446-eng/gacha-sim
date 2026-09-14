"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Play, Info, ShieldCheck, Link2, ChevronRight, Loader2 } from "lucide-react";
import { BOXES } from "@/lib/data";
import { useGachaStore } from "@/store/useGachaStore";
import { topItem } from "@/lib/rng";
import { compactUsd } from "@/lib/format";
import { LINE_META } from "@/lib/types";
import { BoosterGauge } from "./BoosterGauge";

const FEATURED = BOXES.filter((b) => b.featured);
const ROTATE_MS = 9000;
const SPIN_MS = 1500; // 룰렛 연출 1.5초

export function HeroBillboard() {
  const [idx, setIdx] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [reel, setReel] = useState(0);

  const openBox = useGachaStore((s) => s.openBox);
  const setDetail = useGachaStore((s) => s.setDetail);
  const priceFor = useGachaStore((s) => s.priceFor);
  const isMember = useGachaStore((s) => s.isMember);
  const hydrated = useGachaStore((s) => s.demoHydrated);
  const runGuestDemo = useGachaStore((s) => s.runGuestDemo);
  const demoStatus = useGachaStore((s) => s.guestDemo.status);

  useEffect(() => {
    if (spinning) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % FEATURED.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [spinning]);

  const box = FEATURED[idx];
  const top = topItem(box);

  const startDemo = async () => {
    if (spinning) return;
    // 이미 체험한 경우 연출 없이 즉시 안내 모달
    if (demoStatus !== "idle") {
      await runGuestDemo();
      return;
    }
    setSpinning(true);
    const r = setInterval(() => setReel((v) => v + 1), 90);
    await Promise.all([runGuestDemo(), new Promise((res) => setTimeout(res, SPIN_MS))]);
    clearInterval(r);
    setSpinning(false);
  };

  return (
    <section id="top" className="relative h-[85vh] min-h-[560px] w-full overflow-hidden">
      <AnimatePresence mode="sync">
        <motion.div
          key={box.id}
          className="absolute inset-0"
          style={{ background: box.art }}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        >
          <div className="holo absolute inset-0 overflow-hidden">
            <div className="absolute right-[8%] top-[18%] animate-floaty select-none text-[22vw] leading-none opacity-90 drop-shadow-[0_30px_60px_rgba(0,0,0,0.8)] md:text-[18vw]">
              {spinning ? FEATURED[reel % FEATURED.length].emoji : box.emoji}
            </div>
          </div>
          <div className="shimmer-bg absolute inset-0 opacity-40" />
        </motion.div>
      </AnimatePresence>

      <div className="vignette absolute inset-0" />
      <div className="billboard-fade absolute inset-0" />
      <div className="absolute inset-y-0 left-0 w-3/4 bg-gradient-to-r from-[#141414]/90 via-[#141414]/40 to-transparent" />

      <div className="absolute bottom-[10%] left-[4%] right-[4%] max-w-3xl md:bottom-[14%]">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
          <span className="flex items-center gap-1 rounded border border-emerald-400/60 px-2 py-0.5 text-emerald-300">
            <Link2 className="h-3 w-3" /> 온체인 확률 공개
          </span>
          <span className="flex items-center gap-1 rounded border border-white/30 px-2 py-0.5 text-gray-200">
            <ShieldCheck className="h-3 w-3" /> 인증서 번호 공개
          </span>
        </div>

        {/* 메인 카피 */}
        <h1 className="neon-title text-3xl font-black leading-[1.1] tracking-tight md:text-5xl">
          남들은 이미 본전 뽑고 시작했습니다.
          <br />
          당신의 첫 상자는?
        </h1>
        <p className="text-shadow-lg mt-3 text-sm text-gray-200 md:text-base">
          조작 없는 투명 확률. 10번 열면 [{LINE_META.jackpot.label}] 가중치 5배 부스터 가동 중
        </p>

        {/* 현재 박스 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={box.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-300"
          >
            {box.badge && <span className="rounded bg-accent px-2 py-0.5 text-[11px] font-bold">{box.badge}</span>}
            <span className="font-bold text-white">{box.title}</span>
            <span className="text-gray-500">·</span>
            <span>
              1등 <span className="font-bold text-gold">{top.name}</span>{" "}
              <span className="text-gray-400">({compactUsd(top.value)})</span>
            </span>
          </motion.div>
        </AnimatePresence>

        <BoosterGauge box={box} className="mt-4 max-w-xl" />

        {/* 단일 진입점 */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {hydrated && !isMember ? (
            <button
              onClick={startDemo}
              disabled={spinning}
              className="flex items-center gap-2 rounded bg-gold px-7 py-3 text-base font-black text-black transition hover:bg-yellow-300 disabled:opacity-80 md:text-lg"
            >
              {spinning ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> 오픈 중…
                </>
              ) : (
                <>
                  돈 쓰지 마세요. 내 손으로 1회 무료 체험하기
                  <ChevronRight className="h-5 w-5" />
                </>
              )}
            </button>
          ) : (
            <>
              <button
                onClick={() => openBox(box.id, 1)}
                className="flex items-center gap-2 rounded bg-white px-6 py-2.5 text-base font-bold text-black transition hover:bg-white/80"
              >
                <Play className="h-5 w-5 fill-black" /> 1회 오픈 ({priceFor(box, 1)} USDT)
              </button>
              <button
                onClick={() => openBox(box.id, 10)}
                className="flex items-center gap-2 rounded bg-gold px-6 py-2.5 text-base font-bold text-black transition hover:bg-yellow-300"
              >
                <Play className="h-5 w-5 fill-black" /> 10연속 ({priceFor(box, 10)} USDT · 10% OFF)
              </button>
            </>
          )}
          <button
            onClick={() => setDetail(box.id)}
            className="flex items-center gap-2 rounded bg-gray-500/60 px-5 py-2.5 text-sm font-bold transition hover:bg-gray-500/40"
          >
            <Info className="h-5 w-5" /> 상세 정보 및 확률
          </button>
        </div>
      </div>

      <div className="absolute bottom-[4%] right-[4%] flex gap-1.5">
        {FEATURED.map((b, i) => (
          <button
            key={b.id}
            onClick={() => setIdx(i)}
            className={`h-1 rounded-full transition-all ${i === idx ? "w-8 bg-white" : "w-4 bg-white/30"}`}
          />
        ))}
      </div>
    </section>
  );
}
