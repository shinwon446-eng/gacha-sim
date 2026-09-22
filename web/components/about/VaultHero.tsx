"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/format";
import { imageFor } from "@/lib/productImages";

/**
 * Section 1 — 스크롤 반응형 시네마틱 볼트 리빌.
 *
 * 스크롤 트랙(220vh) 안에 화면 하나를 sticky 로 고정하고, 진행률 0→1 에 맞춰
 * 금고 문 두 짝이 좌우로 열리며 롤렉스 · 사이버트럭 · 골드바가 스케일업하며 부유한다.
 *
 * SSR 안전: `useScroll` 은 마운트 후에야 값을 채우고 초기값은 항상 0 이라 서버 렌더와 첫 클라이언트 렌더가 같다.
 * `window` 를 직접 읽지 않고, 좌표·지연은 전부 고정 상수다(Math.random 금지).
 */

/** 볼트 안에서 떠오르는 3점 — id 는 lib/productImages.ts 의 실제 자산 키 */
const REVEALS = [
  { id: "vault-submariner", x: "-26%", y: "-6%", size: "w-[38%] max-w-[240px]", from: 0.18, rot: -8, delay: 0 },
  { id: "jackpot-cybertruck", x: "0%", y: "4%", size: "w-[54%] max-w-[380px]", from: 0.1, rot: 0, delay: 0.4 },
  { id: "vault-gold", x: "27%", y: "-2%", size: "w-[36%] max-w-[230px]", from: 0.26, rot: 9, delay: 0.8 },
] as const;

function Reveal({ progress, spec }: { progress: MotionValue<number>; spec: (typeof REVEALS)[number] }) {
  const img = imageFor(spec.id);
  const scale = useTransform(progress, [spec.from, 0.72], [0.55, 1]);
  const opacity = useTransform(progress, [spec.from, spec.from + 0.2], [0, 1]);
  const y = useTransform(progress, [spec.from, 0.85], [90, 0]);
  return (
    <motion.div
      className={cn("absolute", spec.size)}
      style={{ left: `calc(50% + ${spec.x})`, top: `calc(46% + ${spec.y})`, x: "-50%", y, scale, opacity, rotate: spec.rot }}
    >
      {/* 부유 — 스크롤과 무관한 상시 루프 */}
      <motion.div animate={{ y: [0, -14, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: spec.delay }}>
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
            style={{ filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.85))", boxShadow: "0 0 0 1px rgba(230,202,101,0.35), 0 0 70px rgba(230,202,101,0.22)" }}
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

  // 금고 문 두 짝 — 0 → 0.55 구간에서 완전히 열린다
  const leftX = useTransform(scrollYProgress, [0, 0.55], ["0%", "-104%"]);
  const rightX = useTransform(scrollYProgress, [0, 0.55], ["0%", "104%"]);
  const doorFade = useTransform(scrollYProgress, [0.4, 0.62], [1, 0]);
  const glow = useTransform(scrollYProgress, [0.05, 0.6], [0, 1]);
  const copyY = useTransform(scrollYProgress, [0.35, 0.8], [40, 0]);
  const copyOpacity = useTransform(scrollYProgress, [0.35, 0.62], [0, 1]);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);

  return (
    <div ref={track} className={cn("relative h-[220vh]", className)}>
      <div className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden bg-obsidian">
        {/* 볼트 내부 — 문 뒤에서 피어오르는 샴페인 골드 */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ opacity: glow, background: "radial-gradient(60% 50% at 50% 46%, rgba(230,202,101,0.20) 0%, transparent 70%)" }}
        />

        {REVEALS.map((spec) => (
          <Reveal key={spec.id} progress={scrollYProgress} spec={spec} />
        ))}

        {/* 금고 문 — 좌우 두 짝. 열리면서 투명해진다 */}
        <motion.div aria-hidden className="pointer-events-none absolute inset-0 z-20" style={{ opacity: doorFade }}>
          {(["left", "right"] as const).map((side) => (
            <motion.div
              key={side}
              className={cn("absolute inset-y-0 w-1/2 bg-obsidian", side === "left" ? "left-0" : "right-0")}
              style={{
                x: side === "left" ? leftX : rightX,
                background: "linear-gradient(135deg, #17171a 0%, #0B0B0B 45%, #1d1a13 100%)",
                boxShadow: side === "left" ? "inset -1px 0 0 rgba(230,202,101,0.5)" : "inset 1px 0 0 rgba(230,202,101,0.5)",
              }}
            >
              {/* 금고 휠 — 문 안쪽 가장자리에 반씩 걸린다 */}
              <span
                className={cn(
                  "absolute top-1/2 h-40 w-40 -translate-y-1/2 rounded-full border-2 border-gold-champagne/25 sm:h-56 sm:w-56",
                  side === "left" ? "right-0 translate-x-1/2" : "left-0 -translate-x-1/2",
                )}
                style={{ boxShadow: "inset 0 0 40px rgba(230,202,101,0.12)" }}
              />
              <span className={cn("absolute inset-y-0 w-px bg-gold-champagne/20", side === "left" ? "right-6" : "left-6")} />
            </motion.div>
          ))}
        </motion.div>

        {/* 헤드라인 — 문이 열린 뒤 떠오른다 */}
        <motion.div className="relative z-30 mx-auto max-w-4xl px-6 text-center" style={{ y: copyY, opacity: copyOpacity }}>
          <span className="border-metallic-gold inline-flex items-center rounded-full bg-obsidian/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-gold-champagne backdrop-blur-sm">
            {t("badge")}
          </span>
          <h1 className="mt-5 break-keep font-display text-4xl font-black leading-[1.12] tracking-[-0.03em] text-white md:text-6xl">
            {t("heroLine1")}
            <br />
            <span className="text-gold-gradient">{t("heroLine2")}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl break-keep text-sm leading-relaxed text-secondary md:text-base">{t("heroSub")}</p>
        </motion.div>

        {/* 스크롤 힌트 — 문이 열리기 시작하면 사라진다 */}
        <motion.div
          className="absolute bottom-10 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-1.5"
          style={{ opacity: hintOpacity }}
        >
          <span className="whitespace-nowrap text-[11px] font-semibold tracking-wide text-faint">{t("scrollHint")}</span>
          <motion.span animate={{ y: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
            <ChevronDown className="h-4 w-4 text-gold-champagne" strokeWidth={2.4} />
          </motion.span>
        </motion.div>
      </div>
    </div>
  );
}

export default VaultHero;
