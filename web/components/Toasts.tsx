"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useGachaStore } from "@/store/useGachaStore";
import { cn } from "@/lib/format";

/** 넷플릭스 알림창 스타일 토스트 (우상단) */
export function Toasts() {
  const toasts = useGachaStore((s) => s.toasts);
  const dismiss = useGachaStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed right-4 top-[104px] z-[90] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ duration: 0.25 }}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded border-l-4 bg-elevation/95 p-3 shadow-2xl backdrop-blur",
              t.tone === "gold" && "border-gold",
              t.tone === "red" && "border-accent",
              (!t.tone || t.tone === "neutral") && "border-gray-500",
            )}
          >
            <div className="flex-1">
              <div className="text-sm font-bold">{t.title}</div>
              <div className="text-xs text-gray-400">{t.body}</div>
            </div>
            <button onClick={() => dismiss(t.id)} className="text-gray-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
