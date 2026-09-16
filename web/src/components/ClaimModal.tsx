"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Wallet, Truck, X } from "lucide-react";
import { assetPath } from "@/lib/assetPath";
import { glow } from "@/lib/tiers";
import type { GachaItem } from "@/src/data/gachaItems";
import { TIER_LABEL, formatUsdt } from "@/src/data/gachaRules";

export interface ClaimModalProps {
  item: GachaItem | null;
  /** 지불한 박스 가격 — 배수 표기용 */
  paidUsdt: number;
  onClaim: (item: GachaItem) => void;
  onShip: (item: GachaItem) => void;
  onClose: () => void;
}

/**
 * 당첨 팝업. 아이템 이미지·이름·USDT 가치와 두 가지 출구.
 *   [즉시 USDT 환전]  → onClaim 후 닫힘 (호출측이 잔고 반영)
 *   [실물 배송 신청]  → onShip (호출측이 배송비·세관 안내 토스트)
 * ESC / 배경 클릭으로도 닫힌다. 닫기만 하면 아무것도 지급되지 않는다 — 그 사실을 적어둔다.
 */
export function ClaimModal({ item, paidUsdt, onClaim, onShip, onClose }: ClaimModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [item, onClose]);

  const multiple = item ? item.usdtValue / paidUsdt : 0;

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: "rgba(0,0,0,0.82)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={`${item.name} 획득`}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border outline-none"
            style={{
              backgroundColor: "#111521",
              borderColor: glow(item.glowColor, 0.45),
              boxShadow: `0 0 0 1px ${glow(item.glowColor, 0.25)}, 0 0 60px ${glow(item.glowColor, 0.28)}, 0 30px 80px rgba(0,0,0,0.8)`,
            }}
            initial={{ opacity: 0, y: 28, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* 상단 글로우 */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-64"
              style={{ background: `radial-gradient(70% 80% at 50% 0%, ${glow(item.glowColor, 0.35)} 0%, transparent 70%)` }}
            />

            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>

            <div className="relative px-6 pt-8 text-center">
              <div className="text-xs font-bold uppercase tracking-widest" style={{ color: item.glowColor }}>
                {item.tier} · {TIER_LABEL[item.tier]}
              </div>

              <div className="relative mx-auto mt-3" style={{ width: 220, height: 220 }}>
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full"
                  style={{ background: `radial-gradient(50% 50% at 50% 50%, ${glow(item.glowColor, 0.4)} 0%, transparent 70%)` }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={assetPath(item.imageSrc)}
                  alt={item.name}
                  draggable={false}
                  className="relative h-full w-full object-contain"
                />
              </div>

              <h2 className="mt-2 text-2xl font-bold text-white">{item.name}</h2>
              <div className="mt-1 font-mono text-3xl font-bold tabular-nums" style={{ color: item.glowColor }}>
                {formatUsdt(item.usdtValue)}
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                지불 {formatUsdt(paidUsdt)} · <span className="font-mono text-neutral-300">{multiple >= 10 ? multiple.toFixed(0) : multiple.toFixed(2)}x</span>
              </div>
            </div>

            <div className="mt-6 grid gap-2 px-6 pb-6">
              <button
                type="button"
                onClick={() => onClaim(item)}
                className="flex h-12 items-center justify-center gap-2 rounded-lg text-sm font-bold text-neutral-950 transition-transform duration-150 hover:scale-105"
                style={{ backgroundColor: item.glowColor, boxShadow: `0 0 24px ${glow(item.glowColor, 0.5)}` }}
              >
                <Wallet className="h-4 w-4" strokeWidth={2.2} />
                즉시 USDT로 지갑 환전 (Claim)
              </button>
              <button
                type="button"
                onClick={() => onShip(item)}
                className="flex h-12 items-center justify-center gap-2 rounded-lg border border-neutral-700 text-sm font-semibold text-white transition-colors duration-150 hover:border-neutral-400"
                style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
              >
                <Truck className="h-4 w-4" strokeWidth={2} />
                실물 배송 신청
              </button>
              <p className="mt-1 text-center text-neutral-500" style={{ fontSize: 10 }}>
                환전은 표기 가치 100% 로 잔고에 반영됩니다. 닫기만 하면 아무것도 지급되지 않습니다. (데모)
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ClaimModal;
