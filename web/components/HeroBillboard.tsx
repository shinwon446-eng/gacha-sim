"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Play, Info, ShieldCheck, Link2, ChevronRight, Loader2 } from "lucide-react";
import { BOXES } from "@/lib/data";
import { useGachaStore } from "@/store/useGachaStore";
import { topItem } from "@/lib/rng";
import { compactUsd, cn } from "@/lib/format";
import { LINE_META } from "@/lib/types";
import { AssetPlate } from "./AssetPlate";
import { BoosterGauge } from "./BoosterGauge";
import { useCopy } from "@/lib/i18n";

const FEATURED = BOXES.filter((b) => b.featured);
const ROTATE_MS = 9000;
const SPIN_MS = 1500; // 릴 스캔 연출 1.5초

const JACKPOT = LINE_META.jackpot;

/** cubic-bezier(0.16, 1, 0.3, 1) — 토큰의 cine 이징과 동일 */
const CINE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function HeroBillboard() {
  const [idx, setIdx] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [reel, setReel] = useState(0);

  const openBox = useGachaStore((s) => s.openBox);
  const setDetail = useGachaStore((s) => s.setDetail);
  const priceFor = useGachaStore((s) => s.priceFor);
  const { t: tc } = useCopy();
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
  const plate = spinning ? FEATURED[reel % FEATURED.length] : box;

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
    <section id="top" className="relative h-[86vh] min-h-[580px] w-full overflow-hidden bg-canvas">
      {/* 배경 톤 램프 */}
      <AnimatePresence mode="sync">
        <motion.div
          key={box.id}
          className="absolute inset-0"
          style={{ background: box.art }}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: CINE }}
        />
      </AnimatePresence>

      {/* 텍스처 레이어 — scanlines / film-grain 은 각각 별도 래퍼 */}
      <div className="scanlines pointer-events-none absolute inset-0" />
      <div className="film-grain pointer-events-none absolute inset-0 overflow-hidden" />

      {/* 우측 애셋 플레이트 — 부유하는 글리프를 대체한다 */}
      <div className="pointer-events-none absolute right-[6%] top-1/2 hidden -translate-y-1/2 xl:block">
        <AssetPlate
          size="xl"
          code={plate.code}
          tone={plate.art}
          label={spinning ? "SCANNING REEL" : (box.badge ?? "FEATURED REEL")}
          active={spinning}
          className={cn("transition-transform duration-700 ease-cine", spinning && "animate-flicker")}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 vignette" />
      <div className="pointer-events-none absolute inset-0 billboard-fade" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-3/4 bg-gradient-to-r from-canvas via-canvas/70 to-transparent" />

      <div className="absolute bottom-[9%] left-[4%] right-[4%] max-w-3xl md:bottom-[13%]">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="label-caps inline-flex items-center gap-1.5 border border-white/[0.08] px-2 py-1 text-neutral-300">
            <Link2 className="h-3 w-3 text-neutral-500" /> 온체인 확률 공개
          </span>
          <span className="label-caps inline-flex items-center gap-1.5 border border-white/[0.08] px-2 py-1 text-neutral-300">
            <ShieldCheck className="h-3 w-3 text-neutral-500" /> 인증서 번호 공개
          </span>
        </div>

        {/* 편성 표기 */}
        <div className="label-caps mb-2 flex flex-wrap items-center gap-2">
          <span>이번 주 편성</span>
          <span className="text-neutral-700">/</span>
          <span className="font-semibold text-crimson">{JACKPOT.grade}</span>
          <span className="text-neutral-700">/</span>
          <span>{JACKPOT.desc}</span>
        </div>

        {/* 메인 타이틀 — 편성된 릴 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={box.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.7, ease: CINE }}
          >
            <h1 className="display text-5xl font-bold text-white md:text-7xl">{box.title}</h1>
            <p className="mt-3 max-w-xl text-sm text-neutral-400 md:text-base">{box.subtitle}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              {box.badge && (
                <span className="label-caps border border-crimson/60 px-1.5 py-0.5 text-crimson">{box.badge}</span>
              )}
              <span className="label-caps text-neutral-500">TOP ASSET</span>
              <span className="font-semibold text-white">{top.name}</span>
              <span className="font-mono text-xs text-neutral-500">{compactUsd(top.value)}</span>
            </div>
          </motion.div>
        </AnimatePresence>

        <p className="mt-4 max-w-xl text-xs leading-relaxed text-neutral-400 md:text-sm">
          확률은 전량 공개된다. 10회 재생마다 {JACKPOT.grade} 가중치 5배 부스터가 적용된다.
        </p>

        <BoosterGauge box={box} className="mt-4 max-w-xl" />

        {/* 단일 진입점 */}
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          {hydrated && !isMember ? (
            <button
              onClick={startDemo}
              disabled={spinning}
              className="flex items-center gap-2 bg-crimson px-7 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white outline outline-1 outline-transparent transition duration-600 ease-cine hover:scale-[1.02] hover:outline-white disabled:opacity-70 md:text-base"
            >
              {spinning ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> 재생 중
                </>
              ) : (
                <>
                  {tc("previewPlay")} · 결제 없음
                  <ChevronRight className="h-5 w-5" />
                </>
              )}
            </button>
          ) : (
            <>
              <button
                onClick={() => openBox(box.id, 1)}
                className="flex items-center gap-2 bg-crimson px-6 py-2.5 text-sm font-bold uppercase tracking-[0.12em] text-white outline outline-1 outline-transparent transition duration-600 ease-cine hover:scale-[1.02] hover:outline-white md:text-base"
              >
                <Play className="h-5 w-5 fill-white" /> {tc("boxOpen")} · {priceFor(box, 1)} USDT
              </button>
              <button
                onClick={() => openBox(box.id, 10)}
                className="flex items-center gap-2 border border-white/[0.08] bg-white/[0.06] px-6 py-2.5 text-sm font-bold uppercase tracking-[0.12em] text-white outline outline-1 outline-transparent transition duration-600 ease-cine hover:scale-[1.02] hover:outline-white md:text-base"
              >
                <Play className="h-5 w-5 fill-white" /> {tc("boxOpenMulti")} · {priceFor(box, 10)} USDT · 10% OFF
              </button>
            </>
          )}
          <button
            onClick={() => setDetail(box.id)}
            className="flex items-center gap-2 border border-white/[0.08] bg-transparent px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-300 outline outline-1 outline-transparent transition duration-600 ease-cine hover:text-white hover:outline-white md:text-sm"
          >
            <Info className="h-4 w-4" /> {tc("episodeInfo")}
          </button>
        </div>

        {hydrated && !isMember && (
          /* 지급 불가 고지 — 장식용 label-caps 로 낮추지 않는다. */
          <p className="mt-3 inline-block border-l-2 border-crimson bg-crimson/[0.08] py-1.5 pl-3 pr-3 text-[12px] font-bold tracking-tight text-white">
            비회원 모의 체험: 실제 지급 불가 / 즉시 소멸 대상
          </p>
        )}
      </div>

      {/* 편성 인디케이터 */}
      <div className="absolute bottom-[4%] right-[4%] flex gap-1.5">
        {FEATURED.map((b, i) => (
          <button
            key={b.id}
            onClick={() => setIdx(i)}
            aria-label={b.title}
            className={cn(
              "h-[3px] transition-all duration-600 ease-cine",
              i === idx ? "w-10 bg-white" : "w-4 bg-white/25 hover:bg-white/50",
            )}
          />
        ))}
      </div>
    </section>
  );
}
