"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Coins, Plane } from "lucide-react";
import { cn } from "@/lib/format";
import { useProductText } from "@/lib/useProductText";
import { BOX_BY_SLUG, dropTable, type ProductItem } from "@/lib/products";
import { imageFor } from "@/lib/productImages";
import { SHIPPING_COUNTRIES } from "@/lib/aboutStats";
import { Money } from "@/components/ui/Money";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Section 4 — 글로벌 언박싱 · 온체인/특송 네트워크.
 *
 * 토스 커뮤니티 알림 스타일의 3D 카드 스택이되, **카드에 적히는 건 "무엇을 어디로 보낼 수 있는지"** 다.
 * 다른 사람의 당첨·수령을 지어내 "12초 전 ○○님 당첨"처럼 띄우지 않는다(부록 C) — 그건 실제로 일어난 적 없는
 * 사건을 실제인 것처럼 보이게 하는 것이라 유저 기만이다. 대신 도시 × 실제 라인업 상품 × 그 도시에서 되는 일
 * (실물 수령 / 95% 페이백 / 관부가세 포함 무료 특송)을 보여 준다. 전부 참인 문장이고 비주얼은 같다.
 *
 * live 모드에서 백엔드가 마스킹된 실제 수령 기록을 주면 그대로 이 자리에 들어간다.
 */
const NODES = [
  { city: "cSeoul", flag: "🇰🇷", slug: "vault-submariner", cap: "globalCap1", x: -8, delay: 0 },
  { city: "cNewYork", flag: "🇺🇸", slug: "jackpot-cybertruck", cap: "globalCap3", x: 6, delay: 0.12 },
  { city: "cTokyo", flag: "🇯🇵", slug: "vault-handbag", cap: "globalCap1", x: -5, delay: 0.24 },
  { city: "cDubai", flag: "🇦🇪", slug: "vault-gold", cap: "globalCap3", x: 8, delay: 0.36 },
  { city: "cLondon", flag: "🇬🇧", slug: "starter-macbook", cap: "globalCap2", x: -6, delay: 0.48 },
] as const;

interface Node {
  key: string;
  flag: string;
  city: string;
  cap: string;
  item: ProductItem;
  x: number;
  delay: number;
}

export function GlobalLiveFeed({ className }: { className?: string }) {
  const t = useTranslations("about");
  const { itemName } = useProductText();

  const nodes = useMemo(
    () =>
      NODES.map((n): Node | null => {
        const box = BOX_BY_SLUG[n.slug];
        const item = box ? dropTable(box)[0] : undefined;
        return item ? { key: n.slug, flag: n.flag, city: n.city, cap: n.cap, item, x: n.x, delay: n.delay } : null;
      }).filter((x): x is Node => !!x),
    [],
  );

  return (
    <section className={cn("relative overflow-hidden px-6 py-20 md:py-28", className)}>
      {/* 지구 반대편까지 이어지는 앰비언트 골드 */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(58% 48% at 50% 34%, rgba(230,202,101,0.12) 0%, transparent 72%)" }}
      />
      <div className="relative mx-auto w-full max-w-4xl">
        <h2 className="break-keep text-center font-display text-2xl font-black leading-tight tracking-[-0.02em] text-white md:text-4xl">
          {t("globalTitle")}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl break-keep text-center text-sm leading-relaxed text-secondary">
          {t("globalSub", { n: SHIPPING_COUNTRIES })}
        </p>

        {/* 다크 글래스모피즘 프레임 위로 떠오르는 노드 카드들 */}
        <div
          className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xl sm:p-5"
          style={{ boxShadow: "0 40px 90px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)" }}
        >
          <ul className="grid gap-2.5" style={{ perspective: 1000 }}>
            {nodes.map((n) => (
              <motion.li
                key={n.key}
                initial={{ opacity: 0, y: 34, rotateX: -14 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.65, ease: EASE, delay: n.delay }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <motion.div
                  className="border-metallic-subtle flex items-center gap-3 rounded-2xl bg-obsidian/85 p-2.5 sm:gap-3.5 sm:p-3"
                  animate={{ y: [0, -5, 0], x: [0, n.x * 0.35, 0] }}
                  transition={{ duration: 6 + n.delay * 4, repeat: Infinity, ease: "easeInOut", delay: n.delay }}
                >
                  <span className="relative h-12 w-12 flex-none overflow-hidden rounded-xl bg-surface sm:h-14 sm:w-14">
                    {imageFor(n.item.id).src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageFor(n.item.id).src!}
                        alt={itemName(n.item)}
                        draggable={false}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden className="text-[13px] leading-none">
                        {n.flag}
                      </span>
                      <span className="truncate text-[11px] font-bold text-white sm:text-[12px]">{t(n.city as "cSeoul")}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] font-extrabold text-white sm:text-[13px]">{itemName(n.item)}</span>
                    <span className="mt-0.5 flex items-center gap-1 truncate text-[10px] font-semibold text-gold-champagne">
                      <Plane className="h-3 w-3 flex-none" strokeWidth={2.4} />
                      {t(n.cap as "globalCap1")}
                    </span>
                  </span>
                  <span className="flex-none text-right">
                    <Money value={n.item.value} size="xs" numberClassName="text-gold-gradient" />
                  </span>
                </motion.div>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* 네트워크 요약 */}
        <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {[
            { icon: Coins, label: t("globalNet") },
            { icon: Plane, label: t("globalShip", { n: SHIPPING_COUNTRIES }) },
          ].map((r) => (
            <li key={r.label} className="border-metallic-subtle flex items-center gap-2.5 rounded-xl bg-surface px-3.5 py-2.5">
              <r.icon className="h-4 w-4 flex-none text-gold-champagne" strokeWidth={2.3} />
              <span className="min-w-0 break-keep text-[11px] font-semibold text-secondary sm:text-xs">{r.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default GlobalLiveFeed;
