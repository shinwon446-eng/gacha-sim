"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useTranslations } from "next-intl";
import { Rocket } from "lucide-react";
import { cn } from "@/lib/format";
import { Link } from "@/i18n/navigation";
import { imageFor } from "@/lib/productImages";

/**
 * Section 1 — 히어로.
 *
 * **진입 즉시 전부 보인다.** 이전 버전은 스크롤 0 에서 카피와 상품이 `opacity: 0` 이고 CSS 금고 문만 덮여 있어
 * 시커먼 빈 화면처럼 보였다(2026-09-28 운영자 지적). 문짝 오버레이는 제거했고, 슬로건·헤드라인·CTA·상품 4점이
 * 처음부터 `opacity: 1` 로 서 있다. 스크롤은 **패럴랙스(스케일업 + 시차 이동)** 로만 쓰고 무엇도 숨기지 않는다.
 *
 * SSR 안전: `useScroll` 초기값은 항상 0 이라 서버·클라 첫 렌더가 같고, 좌표·지연은 고정 상수다(Math.random 금지).
 */

/** 카피 아래 한 줄로 세우는 실물 4점 — id 는 lib/productImages.ts 의 실제 자산 키 */
const FLOATS = [
  { id: "vault-submariner", cls: "w-[26%] max-w-[170px] md:w-[17%]", rot: -10, depth: 0.22, delay: 0 },
  { id: "jackpot-cybertruck", cls: "w-[34%] max-w-[240px] md:w-[21%]", rot: 0, depth: 0.34, delay: 0.5 },
  { id: "vault-gold", cls: "w-[26%] max-w-[170px] md:w-[17%]", rot: 10, depth: 0.22, delay: 1 },
  { id: "vault-handbag", cls: "hidden w-[15%] max-w-[130px] rotate-3 md:block", rot: 5, depth: 0.16, delay: 1.5 },
] as const;

function Float({ progress, spec }: { progress: MotionValue<number>; spec: (typeof FLOATS)[number] }) {
  const img = imageFor(spec.id);
  // 패럴랙스 — 깊이가 클수록 더 크게 자라고 더 많이 밀린다
  const scale = useTransform(progress, [0, 1], [1, 1 + spec.depth]);
  const y = useTransform(progress, [0, 1], [0, -120 * spec.depth]);
  return (
    <motion.div className={cn("flex-none", spec.cls)} style={{ scale, y, rotate: spec.rot }}>
      <motion.div
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: spec.delay }}
        style={{ filter: "drop-shadow(0 34px 60px rgba(0,0,0,0.85))" }}
      >
        {img.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img.src}
            alt=""
            aria-hidden
            draggable={false}
            decoding="async"
            referrerPolicy="no-referrer"
            className="aspect-square w-full rounded-2xl object-cover"
            style={{ boxShadow: "0 0 0 1px rgba(230,202,101,0.45), 0 0 80px rgba(230,202,101,0.28)" }}
          />
        ) : (
          <div className="aspect-square w-full rounded-2xl bg-surface" />
        )}
      </motion.div>
    </motion.div>
  );
}

export function VaultHero({ className }: { className?: string }) {
  const t = useTranslations("about");
  const track = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end start"] });

  // 스크롤은 숨기는 데 쓰지 않는다 — 카피는 끝까지 읽히고 살짝 위로만 떠오른다
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const glow = useTransform(scrollYProgress, [0, 0.6], [1, 0.35]);

  return (
    <div ref={track} className={cn("relative h-[150vh] md:h-[170vh]", className)}>
      <div className="sticky top-0 flex h-[calc(100vh-56px)] w-full flex-col items-center justify-center overflow-hidden bg-obsidian md:h-screen">
        {/* 골드 스포트라이트 — 무대 조명 */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ opacity: glow, background: "radial-gradient(64% 52% at 50% 44%, rgba(230,202,101,0.22) 0%, transparent 72%)" }}
        />
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-obsidian to-transparent" />

        {/* 카피 — 진입 즉시 100% 선명 */}
        <motion.div className="relative z-30 mx-auto w-full max-w-4xl px-6 text-center" style={{ y: copyY }}>
          <span
            className="border-metallic-gold inline-flex items-center rounded-full bg-obsidian/80 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-gold-champagne backdrop-blur-sm sm:text-[10px] sm:tracking-[0.2em]"
            style={{ boxShadow: "0 0 24px rgba(230,202,101,0.28)" }}
          >
            {t("heroSlogan")}
          </span>
          <h1
            className="mt-5 break-keep font-display text-[28px] font-black leading-[1.14] tracking-[-0.03em] text-white sm:text-4xl md:text-6xl"
            style={{ textShadow: "0 2px 24px rgba(0,0,0,0.95)" }}
          >
            {t("heroLine1")}
            <br />
            <span className="text-gold-gradient">{t("heroLine2")}</span>
          </h1>
          <p
            className="mx-auto mt-4 max-w-2xl break-keep text-[13px] leading-relaxed text-secondary sm:text-sm md:text-base"
            style={{ textShadow: "0 2px 16px rgba(0,0,0,0.92)" }}
          >
            {t("heroSub")}
          </p>
          <Link
            href="/"
            className="mt-7 inline-flex h-12 items-center gap-2 rounded-lg bg-crimson px-6 text-sm font-bold text-white shadow-[0_0_34px_rgba(229,9,20,0.42)] transition-transform duration-200 hover:scale-[1.04] sm:h-14 sm:px-8 sm:text-base"
          >
            <Rocket className="h-5 w-5" strokeWidth={2.3} />
            {t("heroCta")}
          </Link>
        </motion.div>

        {/* 실물 4점 — 카피 아래 한 줄. 절대 좌표를 쓰지 않으므로 어느 폭에서도 글자와 겹치지 않는다 */}
        <div className="relative z-10 mt-8 flex w-full items-center justify-center gap-2.5 px-4 sm:gap-4 md:mt-10">
          {FLOATS.map((spec) => (
            <Float key={spec.id} progress={scrollYProgress} spec={spec} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default VaultHero;
