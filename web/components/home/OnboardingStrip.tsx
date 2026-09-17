"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Gift, Dices, Zap, ChevronRight } from "lucide-react";
import { cn } from "@/lib/format";

const STEPS = [
  { key: "step1", Icon: Gift },
  { key: "step2", Icon: Dices },
  { key: "step3", Icon: Zap },
] as const;

/**
 * 3-Step 인터랙티브 안심 가이드 스트립 (CLAUDE.md §4-B).
 * 히어로 바로 아래 고정. 넷플릭스 카드 3장 — 선택 → 공정 언박싱 → 배송 or 95% 환전.
 */
export function OnboardingStrip({ className }: { className?: string }) {
  const t = useTranslations("onboarding");
  return (
    <section className={cn("px-[4%]", className)} aria-label={t("title")}>
      <div className="caption-luxury mb-2.5">{t("title")}</div>
      <ol className="grid gap-2 md:grid-cols-3 md:gap-3">
        {STEPS.map(({ key, Icon }, i) => (
          <motion.li
            key={key}
            className="border-metallic-subtle group relative flex items-start gap-3 rounded-xl bg-surface p-4 transition-colors hover:bg-elevation md:p-5"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="border-metallic-gold flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-obsidian text-gold-champagne">
              <Icon className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <div className="caption-luxury !text-gold-champagne">Step {i + 1}</div>
              <div className="mt-0.5 text-sm font-bold text-white md:text-[15px]">{t(`${key}Title`)}</div>
              <p className="mt-1 text-xs leading-relaxed text-muted">{t(`${key}Desc`)}</p>
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight aria-hidden className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-faint md:block" strokeWidth={2} />
            )}
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

export default OnboardingStrip;
