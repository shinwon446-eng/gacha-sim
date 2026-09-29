"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Rocket } from "lucide-react";
import { cn } from "@/lib/format";
import { Link } from "@/i18n/navigation";
import { imageFor } from "@/lib/productImages";

/**
 * Section 1, 히어로.
 *
 * **스티키 트랙 없음.** 이전 버전은 `h-[170vh]` 트랙 + `h-screen justify-center` 라서 상단에 시커먼 빈 여백이
 * 한참 남고 스크롤이 헛돌았다(2026-09-28 운영자 지적). 지금은 평범한 섹션 패딩(`pt-10 pb-16 md:pt-16 md:pb-24`)
 * 하나로 밀도 있게 붙는다.
 *
 * **롤링 헤드라인 ↔ 쇼케이스 카드 1:1 연동.** 둘째 줄이 2.4초마다 위아래로 슬라이드되며 바뀌고, 그때마다
 * 아래 실물 카드 중 해당 상품이 골드 네온 + 스포트라이트를 받으며 떠오른다(scale 1.08 , y −10). 카드를 호버하거나
 * 누르면 즉시 그 상품으로 헤드라인이 넘어가고 자동 순환 타이머가 처음부터 다시 돈다.
 *
 * SSR 안전: 첫 렌더는 항상 `active = 0` 이고 타이머는 `useEffect` 가 켠다. `AnimatePresence initial={false}` 라
 * 첫 페인트에 글자가 튀지 않는다. 좌표, 지연은 고정 상수(Math.random 금지).
 */

const EASE = [0.16, 1, 0.3, 1] as const;
const ROLL_MS = 2400;

/** 롤링 문구와 쇼케이스 카드는 같은 배열이다, 인덱스가 곧 활성 상품 */
const SHOWCASE = [
  { id: "vault-submariner", roll: "heroRoll1", cls: "w-[21%] max-w-[150px] md:w-[16%]", rot: -10, delay: 0 },
  { id: "jackpot-cybertruck", roll: "heroRoll2", cls: "w-[28%] max-w-[215px] md:w-[20%]", rot: 0, delay: 0.5 },
  { id: "vault-gold", roll: "heroRoll3", cls: "w-[21%] max-w-[150px] md:w-[16%]", rot: 10, delay: 1 },
  { id: "vault-handbag", roll: "heroRoll4", cls: "w-[19%] max-w-[140px] md:w-[15%]", rot: 5, delay: 1.5 },
] as const;

function ShowcaseCard({
  spec,
  active,
  onSelect,
  label,
}: {
  spec: (typeof SHOWCASE)[number];
  active: boolean;
  onSelect: () => void;
  label: string;
}) {
  const img = imageFor(spec.id);
  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onSelect}
      onMouseEnter={onSelect}
      onFocus={onSelect}
      className={cn("flex-none cursor-pointer", spec.cls)}
      animate={{ scale: active ? 1.08 : 1, y: active ? -10 : 0, rotate: spec.rot }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      {/* 부유 루프, 활성 여부와 무관하게 은은하게 떠 있다 */}
      <motion.span
        className="relative block"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: spec.delay }}
        style={{ filter: "drop-shadow(0 30px 54px rgba(0,0,0,0.85))" }}
      >
        {/* 활성 카드만 받는 골드 스포트라이트 */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -inset-[18%] rounded-full"
          animate={{ opacity: active ? 1 : 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          style={{ background: "radial-gradient(50% 50% at 50% 42%, rgba(230,202,101,0.42) 0%, transparent 70%)" }}
        />
        {img.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <motion.img
            src={img.src}
            alt=""
            aria-hidden
            draggable={false}
            decoding="async"
            referrerPolicy="no-referrer"
            className="relative aspect-square w-full rounded-2xl object-cover"
            animate={{
              boxShadow: active
                ? "0 0 0 2px rgba(230,202,101,0.95), 0 0 46px rgba(230,202,101,0.62)"
                : "0 0 0 1px rgba(230,202,101,0.32), 0 0 26px rgba(230,202,101,0.16)",
              filter: active ? "saturate(1.06) brightness(1.04)" : "saturate(0.92) brightness(0.8)",
            }}
            transition={{ duration: 0.45, ease: EASE }}
          />
        ) : (
          <span className="relative block aspect-square w-full rounded-2xl bg-surface" />
        )}
      </motion.span>
    </motion.button>
  );
}

export function VaultHero({ className }: { className?: string }) {
  const t = useTranslations("about");
  const [active, setActive] = useState(0);

  // active 가 바뀔 때마다 타이머가 새로 걸린다, 수동 선택이 곧 순환 리셋이다
  useEffect(() => {
    const id = window.setTimeout(() => setActive((i) => (i + 1) % SHOWCASE.length), ROLL_MS);
    return () => window.clearTimeout(id);
  }, [active]);

  return (
    <section className={cn("relative overflow-hidden bg-obsidian px-6 pb-16 pt-10 md:pb-24 md:pt-16", className)}>
      {/* 무대 조명 */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(64% 56% at 50% 40%, rgba(230,202,101,0.2) 0%, transparent 72%)" }}
      />
      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-canvas to-transparent" />

      <div className="relative z-20 mx-auto w-full max-w-4xl text-center">
        <span
          className="border-metallic-gold inline-flex items-center rounded-full bg-obsidian/80 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-gold-champagne backdrop-blur-sm sm:text-[10px] sm:tracking-[0.2em]"
          style={{ boxShadow: "0 0 24px rgba(230,202,101,0.28)" }}
        >
          {t("heroSlogan")}
        </span>

        <h1
          className="mt-5 break-keep font-display text-[28px] font-black leading-[1.16] tracking-[-0.03em] text-white sm:text-4xl md:text-[54px]"
          style={{ textShadow: "0 2px 24px rgba(0,0,0,0.95)" }}
        >
          <span className="block">{t("heroLine1")}</span>
          {/* 롤링 둘째 줄, 높이를 미리 잡아 두어 레이아웃이 튀지 않는다 */}
          {/* popLayout: 나가는 줄만 흐름에서 빠지고 들어오는 줄이 바로 자리를 잡는다.
              mode="wait" 로 두면 두 줄 사이에 0.8초씩 빈 줄이 보인다(865px 에서 실측) */}
          {/* 두 줄 높이를 고정으로 잡고 가운데 정렬한다, 문구 길이에 따라 1↔2줄로 갈려도 아래 카피가 밀리지 않는다 */}
          <span className="relative mt-1 flex min-h-[2.45em] items-center justify-center overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={active}
                className="text-gold-gradient block w-full"
                initial={{ y: "58%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "-58%", opacity: 0 }}
                transition={{ duration: 0.42, ease: EASE }}
              >
                {t(SHOWCASE[active].roll as "heroRoll1")}
              </motion.span>
            </AnimatePresence>
          </span>
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
      </div>

      {/* 실물 4점, 헤드라인과 1:1 로 연동된다 */}
      <div className="relative z-10 mx-auto mt-9 flex w-full max-w-4xl items-center justify-center gap-2 px-1 sm:gap-4 md:mt-11">
        {SHOWCASE.map((spec, i) => (
          <ShowcaseCard
            key={spec.id}
            spec={spec}
            active={i === active}
            onSelect={() => setActive(i)}
            label={t(spec.roll as "heroRoll1")}
          />
        ))}
      </div>
    </section>
  );
}

export default VaultHero;
