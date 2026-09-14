"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Play, Link2 } from "lucide-react";
import { useGachaStore } from "@/store/useGachaStore";
import { BOX_MAP } from "@/lib/data";
import { compactUsd, timeAgo, cn } from "@/lib/format";
import { ProbabilityTable } from "./ProbabilityTable";
import { BoosterGauge } from "./BoosterGauge";

type Tab = "items" | "log";

/** 박스 상세 — 확률 공시의 단일 창구 */
export function BoxDetailModal() {
  const boxId = useGachaStore((s) => s.detailBoxId);
  const setDetail = useGachaStore((s) => s.setDetail);
  const openBox = useGachaStore((s) => s.openBox);
  const priceFor = useGachaStore((s) => s.priceFor);
  const openLog = useGachaStore((s) => s.openLog);

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
          className="fixed inset-0 z-[80] overflow-y-auto bg-black/70 px-4 py-8 md:py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setDetail(null)}
        >
          <motion.div
            className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-lg bg-surface shadow-[0_0_80px_rgba(0,0,0,0.9)]"
            initial={{ scale: 0.9, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-video w-full overflow-hidden" style={{ background: box.art }}>
              <div className="holo absolute inset-0 overflow-hidden" />
              <div className="shimmer-bg absolute inset-0 opacity-40" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="animate-floaty text-[9rem] drop-shadow-[0_30px_50px_rgba(0,0,0,0.9)] md:text-[12rem]">
                  {box.emoji}
                </span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent" />
              <button
                onClick={() => setDetail(null)}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 hover:bg-surface"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="absolute bottom-6 left-6 right-6 md:left-10">
                <h2 className="neon-title text-3xl font-black uppercase leading-none md:text-5xl">{box.title}</h2>
                <p className="mt-2 text-sm text-gray-300 md:text-base">{box.subtitle}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => openBox(box.id, 1)}
                    className="flex items-center gap-2 rounded bg-white px-5 py-2 font-bold text-black hover:bg-white/80"
                  >
                    <Play className="h-5 w-5 fill-black" /> 1회 오픈 ({priceFor(box, 1)} USDT)
                  </button>
                  <button
                    onClick={() => openBox(box.id, 10)}
                    className="flex items-center gap-2 rounded bg-gold px-5 py-2 font-bold text-black hover:bg-yellow-300"
                  >
                    <Play className="h-5 w-5 fill-black" /> 10연속 ({priceFor(box, 10)} USDT)
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 md:px-10">
              <p className="text-sm leading-relaxed text-gray-200">{box.description}</p>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded border border-gray-500 px-1.5 text-gray-300">실물 배송</span>
                <span className="rounded border border-gray-500 px-1.5 text-gray-300">80% 즉시 환급</span>
                <span className="inline-flex items-center gap-1 text-gray-500">
                  <Link2 className="h-3 w-3" /> 확률 컨트랙트 <span className="font-mono">0x0000…0000</span>
                </span>
              </div>

              <BoosterGauge box={box} className="mt-4" />

              {/* 탭 */}
              <div className="mt-6 flex gap-6 border-b border-white/10 text-sm font-bold">
                {(
                  [
                    { key: "items", label: `구성품 및 확률 공시 (${box.items.length})` },
                    { key: "log", label: "실시간 언박싱 로그" },
                  ] as { key: Tab; label: string }[]
                ).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "-mb-px border-b-4 pb-3 transition",
                      tab === t.key ? "border-accent text-white" : "border-transparent text-gray-500 hover:text-gray-300",
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
                    <div className="py-10 text-center text-sm text-gray-500">
                      아직 이 박스의 언박싱 기록이 없습니다. 첫 번째로 열어보세요.
                    </div>
                  ) : (
                    openLog
                      .filter((e) => e.boxId === box.id)
                      .slice(0, 30)
                      .map((e) => (
                        <div key={e.id} className="flex items-center gap-3 border-b border-white/5 py-2.5 text-sm">
                          <div
                            className="flex h-9 w-9 items-center justify-center rounded text-lg"
                            style={{ background: e.item.art }}
                          >
                            {e.item.emoji}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold">{e.user}</span>
                            <span className="text-gray-400"> 님이 </span>
                            <span className="font-semibold">{e.item.name}</span>
                            <span className="text-gray-400"> 획득 ({compactUsd(e.item.value)})</span>
                            {e.isDemo && (
                              <span className="ml-2 rounded border border-white/20 px-1 text-[9px] uppercase text-gray-500">
                                demo
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{now ? timeAgo(e.at, now) : ""}</div>
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
