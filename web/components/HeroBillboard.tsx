"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Play, Info, Gift, ShieldCheck, Link2 } from "lucide-react";
import { BOXES } from "@/lib/data";
import { useGachaStore } from "@/store/useGachaStore";
import { topItem, tierProbabilities, formatProb } from "@/lib/rng";
import { compactUsd } from "@/lib/format";

const FEATURED = BOXES.filter((b) => b.featured);
const ROTATE_MS = 9000;

export function HeroBillboard() {
  const [idx, setIdx] = useState(0);
  const openBox = useGachaStore((s) => s.openBox);
  const demoRoll = useGachaStore((s) => s.demoRoll);
  const setDetail = useGachaStore((s) => s.setDetail);
  const priceFor = useGachaStore((s) => s.priceFor);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % FEATURED.length), ROTATE_MS);
    return () => clearInterval(t);
  }, []);

  const box = FEATURED[idx];
  const top = topItem(box);
  const probs = tierProbabilities(box);

  return (
    <section id="top" className="relative h-[85vh] min-h-[560px] w-full overflow-hidden">
      {/* 배경 아트 (크로스페이드) */}
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
          {/* 쇼케이스 대체: 거대 이모지 + 홀로그램 스윕 + 부유 애니메이션 */}
          <div className="holo absolute inset-0 overflow-hidden">
            <div className="absolute right-[8%] top-[18%] animate-floaty select-none text-[22vw] leading-none opacity-90 drop-shadow-[0_30px_60px_rgba(0,0,0,0.8)] md:text-[18vw]">
              {box.emoji}
            </div>
          </div>
          <div className="shimmer-bg absolute inset-0 opacity-40" />
        </motion.div>
      </AnimatePresence>

      <div className="vignette absolute inset-0" />
      <div className="billboard-fade absolute inset-0" />
      <div className="absolute inset-y-0 left-0 w-3/4 bg-gradient-to-r from-[#141414]/90 via-[#141414]/40 to-transparent" />

      {/* 콘텐츠 */}
      <div className="absolute bottom-[14%] left-[4%] right-[4%] max-w-3xl md:bottom-[18%]">
        <AnimatePresence mode="wait">
          <motion.div
            key={box.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
              {box.badge && <span className="rounded bg-accent px-2 py-0.5">{box.badge} 오늘의 박스</span>}
              <span className="flex items-center gap-1 rounded border border-emerald-400/60 px-2 py-0.5 text-emerald-300">
                <Link2 className="h-3 w-3" /> 온체인 확률 공개
              </span>
              <span className="flex items-center gap-1 rounded border border-white/30 px-2 py-0.5 text-gray-200">
                <ShieldCheck className="h-3 w-3" /> 인증서 번호 공개
              </span>
            </div>

            <h1 className="neon-title text-4xl font-black uppercase leading-[0.95] tracking-tight md:text-6xl lg:text-7xl">
              {box.title}
            </h1>
            <p className="text-shadow-lg mt-3 text-base text-gray-200 md:text-lg">{box.tagline}</p>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-300">
              <span>
                최고 당첨 <span className="font-bold text-gold">{top.name}</span>{" "}
                <span className="text-gray-400">({compactUsd(top.value)})</span>
              </span>
              <span className="text-gray-500">·</span>
              <span>
                SSR <span className="font-mono">{formatProb(probs.SSR)}</span> / SR{" "}
                <span className="font-mono">{formatProb(probs.SR)}</span>
              </span>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
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
                <Play className="h-5 w-5 fill-black" /> 10연속 오픈 ({priceFor(box, 10)} USDT · 10% OFF)
              </button>
              <button
                onClick={() => setDetail(box.id)}
                className="flex items-center gap-2 rounded bg-gray-500/60 px-6 py-2.5 text-base font-bold transition hover:bg-gray-500/40"
              >
                <Info className="h-5 w-5" /> 상세 정보 및 확률
              </button>
              <button
                onClick={() => demoRoll(box.id)}
                className="flex items-center gap-2 rounded border border-white/40 px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10"
              >
                <Gift className="h-4 w-4" /> 무료 체험 뽑기
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 인디케이터 */}
      <div className="absolute bottom-[8%] right-[4%] flex gap-1.5">
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
