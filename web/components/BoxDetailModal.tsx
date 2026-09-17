"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Play, Link2 } from "lucide-react";
import { useGachaStore } from "@/store/useGachaStore";
import { BOX_MAP } from "@/lib/data";
import { CATEGORY_META } from "@/lib/types";
import { compactUsd, timeAgo, cn } from "@/lib/format";
import { AssetPlate } from "./AssetPlate";
import { ProbabilityTable } from "./ProbabilityTable";
import { BoosterGauge } from "./BoosterGauge";
import { useCopy } from "@/lib/i18n";

type Tab = "items" | "log";

/** 시네마틱 리빌 이징 — cubic-bezier(0.16, 1, 0.3, 1) */
const CINE = [0.16, 1, 0.3, 1] as const;

/** 에피소드 상세 시트 — 확률 공시의 단일 창구 */
export function BoxDetailModal() {
  const boxId = useGachaStore((s) => s.detailBoxId);
  const setDetail = useGachaStore((s) => s.setDetail);
  const openBox = useGachaStore((s) => s.openBox);
  const priceFor = useGachaStore((s) => s.priceFor);
  const openLog = useGachaStore((s) => s.openLog);

  const { t: tc } = useCopy();
  const [tab, setTab] = useState<Tab>("items");
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (boxId) {
      setTab("items");
      setNow(Date.now());
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [boxId]);

  const box = boxId ? BOX_MAP[boxId] : null;

  return (
    <AnimatePresence>
      {box && (
        <motion.div
          className="fixed inset-0 z-[80] overflow-y-auto bg-black/85 px-4 py-8 md:py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: CINE }}
          onClick={() => setDetail(null)}
        >
          <motion.div
            className="relative mx-auto w-full max-w-4xl overflow-hidden border border-white/[0.08] bg-elevation"
            initial={{ scale: 0.97, y: 28, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.97, y: 28, opacity: 0 }}
            transition={{ duration: 0.7, ease: CINE }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── 히어로 — 애셋 플레이트 + 비네트 + 그레인 ───────────── */}
            <div className="vignette-bg relative min-h-[360px] w-full overflow-hidden md:aspect-[16/10] md:min-h-0">
              <div aria-hidden className="absolute inset-0 opacity-25" style={{ background: box.art }} />
              <div aria-hidden className="film-grain absolute inset-0" />

              <div className="absolute inset-0 flex items-start justify-center pt-7 md:items-center md:pb-32 md:pt-0">
                <AssetPlate code={box.code} tone={box.art} size="md" className="relative z-10 md:hidden" />
                <AssetPlate
                  code={box.code}
                  tone={box.art}
                  size="xl"
                  label={box.tagline}
                  className="relative z-10 hidden md:flex"
                />
              </div>

              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-elevation via-elevation/80 to-transparent"
              />

              <button
                onClick={() => setDetail(null)}
                aria-label="닫기"
                className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center border border-white/[0.08] bg-ink/80 text-neutral-300 outline-offset-0 transition duration-300 ease-cine hover:text-white hover:outline hover:outline-1 hover:outline-white"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="absolute inset-x-5 bottom-5 z-20 md:inset-x-10 md:bottom-8">
                <div className="label-caps">{CATEGORY_META[box.category].label}</div>
                <h2 className="display mt-1.5 text-4xl font-bold text-white md:text-6xl">{box.title}</h2>
                <p className="mt-2 max-w-xl text-sm text-neutral-400">{box.subtitle}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => openBox(box.id, 1)}
                    className="inline-flex items-center gap-2 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-black outline-offset-0 transition duration-300 ease-cine hover:scale-[1.02] hover:outline hover:outline-1 hover:outline-white"
                  >
                    <Play className="h-4 w-4 flex-none fill-black" />
                    {tc("boxOpen")} · {priceFor(box, 1)} USDT
                  </button>
                  <button
                    onClick={() => openBox(box.id, 10)}
                    className="inline-flex items-center gap-2 bg-crimson px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white outline-offset-0 transition duration-300 ease-cine hover:scale-[1.02] hover:outline hover:outline-1 hover:outline-crimson"
                  >
                    <Play className="h-4 w-4 flex-none fill-white" />
                    {tc("boxOpenMulti")} · {priceFor(box, 10)} USDT
                  </button>
                </div>
              </div>
            </div>

            {/* ── 본문 ─────────────────────────────────────────────── */}
            <div className="px-5 py-5 md:px-10 md:py-6">
              <p className="max-w-3xl text-sm leading-relaxed text-neutral-300">{box.description}</p>

              <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-white/[0.08] pt-4">
                <span className="border border-white/[0.08] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  실물 배송
                </span>
                <span className="border border-white/[0.08] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  95% 즉시 환급
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  <Link2 className="h-3 w-3 flex-none" />
                  확률 컨트랙트
                  <span className="font-mono tracking-normal text-neutral-400">0x0000…0000</span>
                </span>
              </div>

              <BoosterGauge box={box} className="mt-4" />

              {/* 탭 — 크림슨 언더라인 */}
              <div className="mt-6 flex gap-6 border-b border-white/[0.08]">
                {(
                  [
                    { key: "items", label: `${tc("probabilityIndex")} (${box.items.length})` },
                    { key: "log", label: "실시간 재생 로그" },
                  ] as { key: Tab; label: string }[]
                ).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "-mb-px border-b-2 pb-3 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors duration-300 ease-cine",
                      tab === t.key
                        ? "border-crimson text-white"
                        : "border-transparent text-neutral-500 hover:text-neutral-300",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === "items" ? (
                <div className="pt-4">
                  <ProbabilityTable box={box} />
                </div>
              ) : (
                <div className="py-4">
                  {openLog.filter((e) => e.boxId === box.id).length === 0 ? (
                    <div className="py-12 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                      이 시퀀스의 재생 기록이 아직 없습니다
                    </div>
                  ) : (
                    openLog
                      .filter((e) => e.boxId === box.id)
                      .slice(0, 30)
                      .map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center gap-3 border-b border-white/[0.05] py-2.5 text-sm"
                        >
                          <AssetPlate code={e.item.code} tone={e.item.art} size="xs" />
                          <div className="min-w-0 flex-1 truncate">
                            <span className="font-semibold text-neutral-200">{e.user}</span>
                            <span className="text-neutral-500"> 님이 </span>
                            <span className="font-semibold text-white">{e.item.name}</span>
                            <span className="text-neutral-500"> 획득 </span>
                            <span className="font-mono text-xs tabular-nums text-neutral-400">
                              {compactUsd(e.item.value)}
                            </span>
                            {e.isDemo && (
                              <span className="ml-2 border border-white/[0.08] px-1 py-px text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                                demo
                              </span>
                            )}
                          </div>
                          <div className="flex-none font-mono text-[10px] tabular-nums text-neutral-500">
                            {now ? timeAgo(e.at, now) : ""}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
