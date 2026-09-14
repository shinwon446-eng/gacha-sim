"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, Truck, Coins, Package } from "lucide-react";
import { useGachaStore } from "@/store/useGachaStore";
import { LINE_META, itemLine, REFUND_RATE } from "@/lib/types";
import { BOX_MAP } from "@/lib/data";
import { compactUsd } from "@/lib/format";

/** 우측 슬라이드 보관함 — 넷플릭스 '내가 찜한 콘텐츠' 느낌 */
export function InventoryDrawer() {
  const open = useGachaStore((s) => s.inventoryOpen);
  const setOpen = useGachaStore((s) => s.setInventoryOpen);
  const inventory = useGachaStore((s) => s.inventory);
  const refundItem = useGachaStore((s) => s.refundItem);
  const shipItem = useGachaStore((s) => s.shipItem);

  const totalValue = inventory.filter((i) => i.status === "owned").reduce((s, i) => s + i.item.value, 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[75] bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            className="fixed inset-y-0 right-0 z-[76] flex w-full max-w-md flex-col bg-elevation shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <Package className="h-5 w-5" /> 내 보관함
                </h2>
                <p className="text-xs text-gray-400">
                  보유 가치 <span className="font-mono text-white">{compactUsd(totalValue)}</span> · 환급 시{" "}
                  <span className="font-mono text-gold">{compactUsd(totalValue * REFUND_RATE)}</span>
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {inventory.length === 0 ? (
                <div className="py-20 text-center text-sm text-gray-500">아직 뽑은 아이템이 없습니다.</div>
              ) : (
                inventory.map((r) => {
                  const meta = LINE_META[itemLine(r.item)];
                  return (
                    <div key={r.uid} className="mb-2 flex gap-3 rounded border border-white/10 bg-surface p-2">
                      <div
                        className="flex h-16 w-24 flex-none items-center justify-center rounded text-3xl"
                        style={{ background: r.item.art }}
                      >
                        {r.item.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded px-1 text-[9px] font-black" style={{ background: meta.color, color: "#000" }}>
                            {meta.short}
                          </span>
                          <span className="truncate text-sm font-bold">{r.item.name}</span>
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {BOX_MAP[r.boxId]?.title} · {compactUsd(r.item.value)}
                        </div>
                        {r.status === "owned" ? (
                          <div className="mt-1.5 flex gap-1.5">
                            <button
                              onClick={() => refundItem(r.uid)}
                              className="flex items-center gap-1 rounded bg-gold px-2 py-1 text-[11px] font-bold text-black hover:bg-yellow-300"
                            >
                              <Coins className="h-3 w-3" /> {compactUsd(r.item.value * REFUND_RATE)} 환급
                            </button>
                            <button
                              onClick={() => shipItem(r.uid)}
                              className="flex items-center gap-1 rounded border border-white/30 px-2 py-1 text-[11px] font-semibold hover:bg-white/10"
                            >
                              <Truck className="h-3 w-3" /> 배송
                            </button>
                          </div>
                        ) : (
                          <div className="mt-1.5 text-[11px] text-emerald-300">배송 신청 완료 · {r.tracking}</div>
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
