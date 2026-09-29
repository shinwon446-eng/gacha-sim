"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { BadgeCheck, Coins, Plane, ShieldCheck, Timer, Truck } from "lucide-react";
import { cn } from "@/lib/format";
import { useProductText } from "@/lib/useProductText";
import { BOX_BY_SLUG, dropTable, type ProductItem } from "@/lib/products";
import { imageFor } from "@/lib/productImages";
import { AUTHENTICITY_COMPENSATION_MULTIPLE, SHIPPING_COUNTRIES } from "@/lib/aboutStats";
import { SHIPPING_HUBS, arcsFrom, type ShippingHub } from "@/lib/shippingHubs";
import { Money } from "@/components/ui/Money";
import { Approx } from "@/components/ui/Approx";

const EASE = [0.16, 1, 0.3, 1] as const;
const CYCLE_MS = 3500;

/**
 * Section 4 — 글로벌 물류 · 결제 인터랙티브 센터.
 *
 * 좌측(파트 A) 다크 글래스 월드 그리드 + 5대 허브 선택기. 도시를 누르면 그 도시에서 뻗어 나가는 황금 아크가
 * 다시 그려지고, **물류 등급 · 평균 배송 · 통관/세금 · 정품 보증** 4줄 스펙 카드가 입체적으로 교체된다.
 * 3.5초마다 자동 순환하고, 유저가 탭을 누르면 그 순간부터 타이머가 다시 돈다.
 *
 * 우측(파트 B) 토스 알림 스타일 3D 스트림. 활성 도시의 카드가 항상 맨 위로 올라오고(`layout` 리오더),
 * 실물 썸네일 · 국기 · 처리 상태 · USDT + 현지 통화 환산액이 함께 붙는다.
 *
 * ⚠️ **카드에 적히는 건 "무엇이 어디로 나갈 수 있는지"** 다. `DHL #4829-****` 처럼 **존재하지 않는 운송장·TxID 를
 *    지어내 실제 배송인 것처럼 보이게 하지 않는다**(부록 C — 그건 우리가 가진 적 없는 사건을 실제로 위장하는 것이다).
 *    식별자 칩은 "언제 발급되는지"를 적는다. live 모드에서 백엔드가 마스킹된 실제 운송장·TxID 를 주면 그 자리에 들어간다.
 */

interface StreamCard {
  code: string;
  flag: string;
  cityKey: string;
  capKey: string;
  item: ProductItem;
  /** 페이백 카드는 온체인 TxID, 출고 카드는 운송장 */
  idKey: "stIdShip" | "stIdChain";
}

/** 파트 A — 월드 그리드 + 황금 아크 + 허브 노드 */
function HubMap({ hub }: { hub: ShippingHub }) {
  const arcs = useMemo(() => arcsFrom(hub), [hub]);
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl"
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}
    >
      <svg viewBox="0 0 400 200" className="block h-auto w-full" role="img" aria-label={`VOILA network · ${hub.code}`}>
        <defs>
          <pattern id="voila-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="1.6" cy="1.6" r="1" fill="rgba(255,255,255,0.10)" />
          </pattern>
          <radialGradient id="voila-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(230,202,101,0.28)" />
            <stop offset="100%" stopColor="rgba(230,202,101,0)" />
          </radialGradient>
        </defs>
        <rect width="400" height="200" fill="url(#voila-grid)" />
        <circle cx={hub.x} cy={hub.y} r="78" fill="url(#voila-glow)" />

        {/* 활성 허브에서 나머지 넷으로 뻗는 항로 */}
        <AnimatePresence mode="wait">
          <motion.g key={hub.code}>
            {arcs.map((a, i) => (
              <motion.path
                key={a.key}
                d={a.d}
                fill="none"
                stroke="rgba(230,202,101,0.75)"
                strokeWidth="1.1"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.9, ease: EASE, delay: i * 0.08 }}
              />
            ))}
          </motion.g>
        </AnimatePresence>

        {/* 허브 노드 */}
        {SHIPPING_HUBS.map((h) => {
          const on = h.code === hub.code;
          return (
            <g key={h.code}>
              {on && (
                <motion.circle
                  cx={h.x}
                  cy={h.y}
                  r={4}
                  fill="none"
                  stroke="rgba(230,202,101,0.85)"
                  strokeWidth="1"
                  // SVG 의 `r` 속성은 framer 가 첫 프레임에 undefined 로 써 버린다 — transform(scale)으로 퍼뜨린다
                  initial={{ scale: 1, opacity: 0.9 }}
                  animate={{ scale: [1, 3.2], opacity: [0.9, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                />
              )}
              <circle cx={h.x} cy={h.y} r={on ? 3.4 : 2.2} fill={on ? "#E6CA65" : "rgba(255,255,255,0.45)"} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * 파트 A — 선택된 허브의 4줄 스펙 카드.
 * `mode="popLayout"` 이라야 나가는 카드만 흐름에서 빠진다. `mode="wait"` 로 두면 교체 사이 0.45초 동안
 * 카드가 통째로 사라져 좌측 칼럼이 빈다(데스크톱 1280 에서 실측).
 */
function HubSpec({ hub }: { hub: ShippingHub }) {
  const t = useTranslations("about");
  const rows = [
    { icon: Truck, label: t("hubPartner"), value: t(hub.partnerKey as "hKRPartner") },
    { icon: Timer, label: t("hubLead"), value: t(hub.leadKey as "hKRLead") },
    { icon: Plane, label: t("hubDuty"), value: t(hub.dutyKey as "hKRDuty") },
    { icon: BadgeCheck, label: t("hubWarranty"), value: t(hub.warrantyKey as "hKRWarranty", { n: AUTHENTICITY_COMPENSATION_MULTIPLE }) },
  ];
  return (
    <div className="relative" style={{ perspective: 1100 }}>
      <AnimatePresence mode="popLayout">
        <motion.ul
          key={hub.code}
          className="border-metallic-gold grid gap-2 rounded-2xl bg-obsidian/85 p-3 sm:p-3.5"
          initial={{ opacity: 0, rotateX: -12, y: 18 }}
          animate={{ opacity: 1, rotateX: 0, y: 0 }}
          exit={{ opacity: 0, rotateX: 8, y: -12 }}
          transition={{ duration: 0.45, ease: EASE }}
          style={{ transformStyle: "preserve-3d", boxShadow: "0 30px 70px rgba(0,0,0,0.6)" }}
        >
          <li className="flex items-center gap-2 border-b border-hairline pb-2">
            <span aria-hidden className="text-base leading-none">
              {hub.flag}
            </span>
            <span className="text-[13px] font-extrabold text-white">{t(hub.cityKey as "cSeoul")}</span>
            <span className="ml-auto rounded border border-gold-champagne/35 px-1.5 py-0.5 font-mono text-[9px] font-bold text-gold-champagne">{hub.code}</span>
          </li>
          {rows.map((r) => (
            <li key={r.label} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full border border-gold-champagne/35 bg-surface">
                <r.icon className="h-3 w-3 text-gold-champagne" strokeWidth={2.4} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[9px] uppercase tracking-[0.12em] text-faint">{r.label}</span>
                <span className="block break-keep text-[11.5px] font-semibold leading-snug text-white">{r.value}</span>
              </span>
            </li>
          ))}
        </motion.ul>
      </AnimatePresence>
    </div>
  );
}

/** 파트 B — 토스 알림 스타일 3D 처리 스트림. 활성 도시가 항상 맨 위로 올라온다 */
function ProofStream({ cards, activeCode }: { cards: StreamCard[]; activeCode: string }) {
  const t = useTranslations("about");
  const { itemName } = useProductText();
  const ordered = useMemo(() => {
    const i = cards.findIndex((c) => c.code === activeCode);
    return i <= 0 ? cards : [...cards.slice(i), ...cards.slice(0, i)];
  }, [cards, activeCode]);

  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 backdrop-blur-xl sm:p-3.5"
      style={{ boxShadow: "0 40px 90px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center gap-1.5 px-1 pb-2">
        <motion.span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full bg-gold-champagne"
          animate={{ opacity: [1, 0.25, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="caption-luxury !text-gold-champagne">{t("streamTitle")}</span>
      </div>
      <ul className="grid gap-2" style={{ perspective: 1000 }}>
        {ordered.map((c, i) => {
          const top = i === 0;
          const img = imageFor(c.item.id);
          return (
            <motion.li
              key={c.code}
              layout
              initial={{ opacity: 0, y: 26, rotateX: -12 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ layout: { duration: 0.5, ease: EASE }, duration: 0.55, ease: EASE, delay: Math.min(i, 4) * 0.07 }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <motion.div
                className={cn(
                  "flex items-center gap-2.5 rounded-xl bg-obsidian/85 p-2 sm:gap-3 sm:p-2.5",
                  top ? "border border-gold-champagne/55" : "border-metallic-subtle",
                )}
                animate={{ y: top ? -2 : 0, scale: top ? 1.015 : 1, boxShadow: top ? "0 0 32px rgba(230,202,101,0.2)" : "0 0 0 rgba(0,0,0,0)" }}
                transition={{ duration: 0.45, ease: EASE }}
              >
                <span className="relative h-11 w-11 flex-none overflow-hidden rounded-lg bg-surface sm:h-12 sm:w-12">
                  {img.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img.src}
                      alt={itemName(c.item)}
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
                    <span aria-hidden className="text-[12px] leading-none">
                      {c.flag}
                    </span>
                    <span className="truncate text-[10.5px] font-bold text-secondary">{t(c.cityKey as "cSeoul")}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] font-extrabold text-white">{itemName(c.item)}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1">
                    <span className="inline-flex items-center gap-1 rounded border border-gold-champagne/35 bg-gold-champagne/[0.08] px-1.5 py-0.5 text-[9px] font-bold text-gold-champagne">
                      {c.idKey === "stIdChain" ? <Coins className="h-2.5 w-2.5" strokeWidth={2.6} /> : <Truck className="h-2.5 w-2.5" strokeWidth={2.6} />}
                      {t(c.capKey as "globalCap1")}
                    </span>
                    <span className="truncate font-mono text-[9px] text-faint">{t(c.idKey)}</span>
                  </span>
                </span>
                <span className="flex-none text-right">
                  <Money value={c.item.value} size="xs" numberClassName="text-gold-gradient" />
                  <Approx usdt={c.item.value} compact className="mt-0.5 block text-[9px]" />
                </span>
              </motion.div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

export function GlobalLiveFeed({ className }: { className?: string }) {
  const t = useTranslations("about");
  const [idx, setIdx] = useState(0);
  const hub = SHIPPING_HUBS[idx];

  // 3.5초 자동 순환 — 탭을 누르면 idx 가 바뀌어 타이머가 처음부터 다시 돈다
  useEffect(() => {
    const id = window.setTimeout(() => setIdx((i) => (i + 1) % SHIPPING_HUBS.length), CYCLE_MS);
    return () => window.clearTimeout(id);
  }, [idx]);

  const cards = useMemo(
    () =>
      SHIPPING_HUBS.map((h): StreamCard | null => {
        const box = BOX_BY_SLUG[h.slug];
        const item = box ? dropTable(box)[0] : undefined;
        if (!item) return null;
        return {
          code: h.code,
          flag: h.flag,
          cityKey: h.cityKey,
          capKey: h.capKey,
          item,
          idKey: h.capKey === "globalCap2" ? "stIdChain" : "stIdShip",
        };
      }).filter((x): x is StreamCard => !!x),
    [],
  );

  return (
    <section className={cn("relative overflow-hidden px-6 py-20 md:py-28", className)}>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(58% 48% at 50% 30%, rgba(230,202,101,0.12) 0%, transparent 72%)" }}
      />
      <div className="relative mx-auto w-full max-w-6xl">
        <h2 className="break-keep text-center font-display text-2xl font-black leading-tight tracking-[-0.02em] text-white md:text-4xl">
          {t("globalTitle")}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl break-keep text-center text-sm leading-relaxed text-secondary">{t("globalSub")}</p>

        {/* 도시 탭 — 모바일은 가로 스크롤 */}
        <div className="mt-7 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:justify-center">
          {SHIPPING_HUBS.map((h, i) => {
            const on = i === idx;
            return (
              <button
                key={h.code}
                type="button"
                onClick={() => setIdx(i)}
                aria-pressed={on}
                className={cn(
                  "flex h-9 flex-none items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[11.5px] font-bold transition-colors sm:text-xs",
                  on
                    ? "border-gold-champagne/70 bg-gold-champagne/[0.12] text-gold-champagne"
                    : "border-hairline bg-surface text-secondary hover:border-gold-champagne/40 hover:text-white",
                )}
                style={on ? { boxShadow: "0 0 24px rgba(230,202,101,0.24)" } : undefined}
              >
                <span aria-hidden>{h.flag}</span>
                {t(h.tabKey as "hubKR")}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[1.08fr_1fr] md:gap-5">
          <div className="grid gap-3">
            <HubMap hub={hub} />
            <HubSpec hub={hub} />
          </div>
          <ProofStream cards={cards} activeCode={hub.code} />
        </div>

        {/* 네트워크 요약 */}
        <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {[
            { icon: Coins, label: t("globalNet") },
            { icon: ShieldCheck, label: t("globalShip", { n: SHIPPING_COUNTRIES }) },
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
