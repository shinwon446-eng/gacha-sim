"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useGachaStore } from "@/store/useGachaStore";
import { LINE_META, itemLine, REFUND_RATE } from "@/lib/types";
import { BOX_MAP } from "@/lib/data";
import { compactUsd } from "@/lib/format";
import { AssetPlate } from "@/components/AssetPlate";
import { useCopy } from "@/lib/i18n";

/** 시네마틱 리빌 이징 — cubic-bezier(0.16, 1, 0.3, 1) */
const CINE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** 우측 슬라이드 획득 목록 — 필름 아카이브 대장 형태의 조밀한 행 구조 */
export function InventoryDrawer() {
  const open = useGachaStore((s) => s.inventoryOpen);
  const setOpen = useGachaStore((s) => s.setInventoryOpen);
  const inventory = useGachaStore((s) => s.inventory);
  const refundItem = useGachaStore((s) => s.refundItem);
  const shipItem = useGachaStore((s) => s.shipItem);
  const { t: tc } = useCopy();

  const totalValue = inventory.filter((i) => i.status === "owned").reduce((s, i) => s + i.item.value, 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[75] bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            className="fixed inset-y-0 right-0 z-[76] flex w-full max-w-md flex-col border-l border-white/[0.08] bg-elevation"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.6, ease: CINE }}
          >
            <div className="flex items-start justify-between border-b border-white/[0.08] px-5 py-4">
              <div>
                <p className="label-caps">acquired</p>
                <h2 className="display mt-1 text-2xl text-white">획득 목록</h2>
                <p className="mt-2 text-[11px] text-neutral-500">
                  보유 가치{" "}
                  <span className="font-mono tabular-nums text-neutral-200">{compactUsd(totalValue)}</span>
                  <span className="mx-1.5 text-neutral-700">/</span>
                  환급 시{" "}
                  <span className="font-mono tabular-nums text-neutral-200">
                    {compactUsd(totalValue * REFUND_RATE)}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="text-neutral-500 transition hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {inventory.length === 0 ? (
                <div className="px-5 py-24 text-center">
                  <p className="label-caps">empty</p>
                  <p className="mt-2 text-sm text-neutral-500">획득한 항목이 없습니다</p>
                </div>
              ) : (
                inventory.map((r) => {
                  const line = itemLine(r.item);
                  const meta = LINE_META[line];
                  return (
                    <div
                      key={r.uid}
                      className="group flex gap-3.5 border-b border-white/[0.08] px-4 py-3.5 transition-colors duration-300 ease-cine hover:bg-canvas"
                    >
                      <AssetPlate
                        code={r.item.code}
                        tone={r.item.art}
                        size="sm"
                        active={line === "jackpot"}
                      />
                      <div className="min-w-0 flex-1">
                        <div
                          className="text-[9px] font-bold uppercase tracking-[0.18em]"
                          style={{ color: meta.color }}
                        >
                          {meta.grade}
                        </div>
                        <div className="display mt-0.5 truncate text-base text-white">{r.item.name}</div>
                        <div className="mt-0.5 truncate text-[11px] text-neutral-500">
                          {BOX_MAP[r.boxId]?.title}
                          <span className="mx-1.5 text-neutral-700">/</span>
                          <span className="font-mono tabular-nums text-neutral-400">
                            {compactUsd(r.item.value)}
                          </span>
                        </div>

                        {r.status === "owned" ? (
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => refundItem(r.uid)}
                              className="bg-crimson px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white transition-all duration-300 ease-cine hover:outline hover:outline-1 hover:outline-white"
                            >
                              <span className="font-mono tabular-nums">
                                {compactUsd(r.item.value * REFUND_RATE)}
                              </span>{" "}
                              {tc("reclaimValue")}
                            </button>
                            <button
                              onClick={() => shipItem(r.uid)}
                              className="border border-white/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-300 transition-all duration-300 ease-cine hover:text-white hover:outline hover:outline-1 hover:outline-white"
                            >
                              {tc("requestDispatch")}
                            </button>
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="border border-white/[0.08] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                              shipped
                            </span>
                            <span className="font-mono text-[11px] tabular-nums text-neutral-500">
                              {r.tracking}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
