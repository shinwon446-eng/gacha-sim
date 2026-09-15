"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useGachaStore } from "@/store/useGachaStore";
import { cn } from "@/lib/format";

/**
 * 시스템 알림 스택 (우상단).
 * 색 블록 대신 1px 좌측 룰 하나로 톤을 구분한다. 크림슨은 오류 톤 전용.
 */
export function Toasts() {
  const toasts = useGachaStore((s) => s.toasts);
  const dismiss = useGachaStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed right-4 top-[104px] z-[90] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const isError = t.tone === "red";
          const isHighlight = t.tone === "highlight" || t.tone === "gold";
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "pointer-events-auto flex items-start gap-3 border border-white/[0.08] border-l bg-elevation/95 p-3 backdrop-blur",
                isError ? "border-l-crimson" : isHighlight ? "border-l-white" : "border-l-neutral-600",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold tracking-tight text-white">{t.title}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-neutral-400">{t.body}</div>
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="알림 닫기"
                className="flex-none text-neutral-600 transition duration-600 ease-cine hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
