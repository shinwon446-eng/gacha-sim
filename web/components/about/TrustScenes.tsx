"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useTranslations } from "next-intl";
import { ShieldCheck, Sparkles, Check, BadgeCheck, Plane, Link2 } from "lucide-react";
import { cn } from "@/lib/format";
import { Link } from "@/i18n/navigation";
import { useProductText } from "@/lib/useProductText";
import { BOX_BY_SLUG, dropTable, sellValueOf } from "@/lib/products";
import { ROLL_RANGE, sha256Hex } from "@/lib/fairness";
import { imageFor } from "@/lib/productImages";
import {
  AUTHENTICITY_COMPENSATION_MULTIPLE,
  GIFT_BOX_ASSUMED_REFUND_RATE,
  attemptsRange,
  effectiveAttempts,
} from "@/lib/aboutStats";
import { Money } from "@/components/ui/Money";

const EASE = [0.16, 1, 0.3, 1] as const;

/** 뷰포트에 들어오면 0 → value 로 굴러 오르는 숫자 (SSR 안전 — 첫 렌더는 항상 0) */
function CountUp({ value, decimals = 0, className }: { value: number; decimals?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1200);
      setShown(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);
  return (
    <span ref={ref} className={className}>
      {shown.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  );
}

/** 상품 썸네일 — 실제 자산, 없으면 자리만 */
function Shot({ id, alt, className }: { id: string; alt: string; className?: string }) {
  const img = imageFor(id);
  if (!img.src) return <div className={cn("bg-surface", className)} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={img.src} alt={alt} draggable={false} loading="lazy" decoding="async" referrerPolicy="no-referrer" className={cn("object-cover", className)} />
  );
}

/**
 * Scene 1 목업 — 실제 당첨 카드 UI + 95% 페이백 버튼 + 지갑 잔액 카운트업.
 * 상품·정가·페이백 금액은 전부 카탈로그 실측값이다(맥북 프로 박스의 최고 구성).
 */
function SceneRefund() {
  const t = useTranslations("about");
  const { itemName } = useProductText();
  const range = useMemo(() => attemptsRange(), []);
  const rival = useMemo(() => effectiveAttempts(GIFT_BOX_ASSUMED_REFUND_RATE), []);
  const win = useMemo(() => {
    const box = BOX_BY_SLUG["starter-macbook"];
    const item = box ? dropTable(box)[0] : undefined;
    return item ? { item, value: item.value, back: sellValueOf(item) } : null;
  }, []);

  return (
    <div className="grid gap-4">
      {/* 도전 횟수 비교 */}
      <div className="border-metallic-subtle rounded-2xl bg-surface p-4">
        <ul className="grid gap-3">
          {[
            { label: t("s1RivalLabel"), n: rival, pct: 5, gold: false },
            { label: t("s1OursLabel", { n: range.max }), n: range.max, pct: 100, gold: true },
          ].map((row) => (
            <li key={row.label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 break-keep text-[11px] font-semibold text-secondary">{row.label}</span>
                <span className={cn("whitespace-nowrap font-display text-lg font-black tabular-nums", row.gold ? "text-gold-gradient" : "text-faint")}>
                  {t("s1Attempts", { n: row.n })}
                </span>
              </div>
              <span className="mt-1.5 block h-2 w-full overflow-hidden rounded-full bg-white/10">
                <motion.span
                  className={cn("block h-full rounded-full", row.gold ? "bg-gradient-to-r from-gold-metallic to-gold-champagne" : "bg-white/25")}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${row.pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, ease: EASE }}
                />
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2.5 text-[10px] text-faint">{t("s1AttemptsNote")}</p>
      </div>

      {/* 앱 목업 — 당첨 카드 → 페이백 → 잔액 */}
      {win && (
        <div className="border-metallic-gold overflow-hidden rounded-2xl bg-obsidian" style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface">
            <Shot id={win.item.id} alt={itemName(win.item)} className="h-full w-full" />
            <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent" />
            <motion.span
              className="border-metallic-gold absolute right-3 top-3 rounded-full bg-obsidian/85 px-2 py-0.5 text-[9px] font-black tracking-[0.18em] text-gold-champagne backdrop-blur-sm"
              initial={{ scale: 1.6, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1], delay: 0.25 }}
            >
              {t("mockUnboxed")}
            </motion.span>
            <span className="absolute inset-x-3 bottom-2.5">
              <span className="block truncate text-[13px] font-extrabold text-white">{itemName(win.item)}</span>
              <Money value={win.value} size="xs" numberClassName="text-gold-gradient" />
            </span>
          </div>
          <div className="p-3.5">
            <motion.button
              type="button"
              className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-gold-metallic to-gold-champagne text-[13px] font-bold text-obsidian"
              initial={{ scale: 1 }}
              whileInView={{ scale: [1, 0.96, 1] }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.7 }}
            >
              {t("mockPayback")} (+{win.back.toLocaleString("en-US", { minimumFractionDigits: 2 })} USDT)
            </motion.button>
            <div className="mt-3 flex items-baseline justify-between border-t border-hairline pt-2.5">
              <span className="text-[11px] text-secondary">{t("mockWalletAfter")}</span>
              <span className="text-gold-gradient font-display text-xl font-black tabular-nums">
                +<CountUp value={win.back} decimals={2} /> <span className="text-[11px] font-semibold text-muted">USDT</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Scene 2 목업 — 시드가 체인으로 묶여 당첨 슬롯을 가리키는 검증 대시보드. 해시는 화면에서 실제로 계산한다 */
function SceneFair() {
  const t = useTranslations("about");
  const [hash, setHash] = useState<string | null>(null);
  const [roll, setRoll] = useState<number | null>(null);
  useEffect(() => {
    // 보여 주는 값은 바로 위 시드의 진짜 SHA-256 이다 — 예쁜 가짜 문자열이 아니다
    sha256Hex("voila-demo-server-seed")
      .then((h) => {
        setHash(h);
        setRoll(parseInt(h.slice(0, 8), 16) % ROLL_RANGE);
      })
      .catch(() => setHash(null));
  }, []);

  const rows = [
    { label: t("mockSeedHash"), value: hash ? `0x${hash.slice(0, 24)}…` : "…", icon: ShieldCheck },
    { label: t("mockClientSeed"), value: "c7f2…9a41", icon: Sparkles },
    { label: t("mockNonce"), value: "1", icon: Link2 },
  ];

  return (
    <div className="grid gap-3">
      <div className="border-metallic-gold rounded-2xl bg-obsidian p-4" style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
        <ol className="grid gap-2">
          {rows.map((r, i) => (
            <motion.li
              key={r.label}
              initial={{ opacity: 0, x: -14 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, ease: EASE, delay: i * 0.12 }}
              className="relative flex items-center gap-3 rounded-xl border border-hairline bg-surface px-3 py-2.5"
            >
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-gold-champagne/40 bg-obsidian">
                <r.icon className="h-3.5 w-3.5 text-gold-champagne" strokeWidth={2.4} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[10px] text-faint">{r.label}</span>
                <span className="block truncate font-mono text-[11px] font-bold text-white">{r.value}</span>
              </span>
              {/* 체인 연결선 */}
              {i < rows.length - 1 && <span aria-hidden className="absolute -bottom-2 left-[26px] h-2 w-px bg-gold-champagne/40" />}
            </motion.li>
          ))}
        </ol>

        {/* 결합 결과 → 당첨 슬롯 */}
        <motion.div
          className="mt-3 rounded-xl border border-gold-champagne/45 bg-gold-champagne/[0.07] px-3.5 py-3"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.45 }}
        >
          <div className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-gold-champagne" strokeWidth={3} />
            <span className="caption-luxury !text-gold-champagne">HMAC-SHA256 → {t("mockRoll")}</span>
          </div>
          <div className="text-gold-gradient mt-1 font-display text-2xl font-black tabular-nums">
            {roll === null ? "—" : roll.toLocaleString("en-US")}
            <span className="ml-1 text-[11px] font-semibold text-muted">/ {ROLL_RANGE.toLocaleString("en-US")}</span>
          </div>
          {/* 구간 게이지 — 롤 위치 */}
          <span className="mt-2 block h-2 w-full overflow-hidden rounded-full bg-white/10">
            <motion.span
              className="block h-full rounded-full bg-gradient-to-r from-gold-metallic to-gold-champagne"
              initial={{ width: 0 }}
              whileInView={{ width: roll === null ? "0%" : `${Math.max(3, (roll / ROLL_RANGE) * 100)}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: EASE, delay: 0.6 }}
            />
          </span>
        </motion.div>
      </div>
      <p className="break-keep text-[11px] leading-relaxed text-secondary">{t("s2Note")}</p>
      <Link
        href="/fairness"
        className="border-gold-gradient inline-flex h-10 items-center justify-center rounded-lg bg-obsidian/60 px-4 text-[13px] font-bold text-gold-champagne transition-colors hover:bg-gold-champagne/10"
      >
        {t("s2Verify")}
      </Link>
    </div>
  );
}

/** Scene 3 목업 — 롤렉스 실물 + 정품 인증 배지 + 무료 특송 트래킹 */
function SceneDelivery() {
  const t = useTranslations("about");
  const { itemName } = useProductText();
  const item = useMemo(() => {
    const box = BOX_BY_SLUG["vault-submariner"];
    return box ? dropTable(box)[0] : null;
  }, []);
  const steps = [t("s3Track1"), t("s3Track2"), t("s3Track3")];

  return (
    <div className="border-metallic-gold overflow-hidden rounded-2xl bg-obsidian" style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface">
        {item && <Shot id={item.id} alt={itemName(item)} className="h-full w-full" />}
        <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent" />
        {/* 골드 홀로그램 검수 필증 — '찰칵' 도장처럼 찍힌다 */}
        <motion.span
          className="absolute right-3 top-3 flex h-[72px] w-[72px] rotate-[-12deg] flex-col items-center justify-center rounded-full border-2 border-gold-champagne/75 bg-obsidian/70 text-center backdrop-blur-sm"
          initial={{ scale: 2.2, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1], delay: 0.3 }}
          style={{ boxShadow: "0 0 26px rgba(230,202,101,0.5)" }}
        >
          <BadgeCheck className="h-4 w-4 text-gold-champagne" strokeWidth={2.4} />
          <span className="mt-0.5 px-1 text-[7px] font-black leading-tight text-gold-champagne">{t("mockAuthBadge")}</span>
        </motion.span>
        <span className="absolute inset-x-3 bottom-2.5">
          {item && <span className="block truncate text-[13px] font-extrabold text-white">{itemName(item)}</span>}
          <span className="block truncate text-[10px] text-gold-champagne/90">{t("mockAuthLab")}</span>
        </span>
      </div>

      <div className="p-3.5">
        {/* 관부가세 · 배송비 0 */}
        <div className="flex items-center justify-between rounded-lg border border-gold-champagne/35 bg-gold-champagne/[0.06] px-3 py-2">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-secondary">
            <Plane className="h-3.5 w-3.5 text-gold-champagne" strokeWidth={2.3} />
            {t("mockDuty")}
          </span>
          <span className="text-gold-gradient font-display text-sm font-black tabular-nums">{t("mockFree")}</span>
        </div>

        {/* 배송 트래커 */}
        <ol className="mt-3 flex items-center gap-1.5">
          {steps.map((label, i) => (
            <li key={label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <motion.span
                className={cn("h-1.5 w-full rounded-full", i === 0 ? "bg-gold-champagne" : "bg-white/12")}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.25 + i * 0.15 }}
                style={{ originX: 0 }}
              />
              <span className={cn("truncate text-[9px]", i === 0 ? "font-bold text-gold-champagne" : "text-faint")}>{label}</span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[10px] text-faint">{t("s3WaybillPending")}</p>
      </div>
    </div>
  );
}

/**
 * Section 3 — 스티키 3씬.
 *
 * 좌측 텍스트가 화면에 붙어 있는 동안 우측 목업이 ① 95% 페이백 ② SHA-256 공정성 ③ 정품 보증·무료 특송 으로 넘어간다.
 * 목업은 전부 **실제 상품 이미지와 카탈로그 실측 금액**으로 그린다(빈 상자에 글씨 두 줄이던 것을 교체 — 2026-09-28).
 */
export function TrustScenes({ className }: { className?: string }) {
  const t = useTranslations("about");
  const scenes = [
    { key: "s1", eyebrow: t("s1Eyebrow"), title: t("s1Title"), body: t("s1Body"), node: <SceneRefund /> },
    { key: "s2", eyebrow: t("s2Eyebrow"), title: t("s2Title"), body: t("s2Body"), node: <SceneFair /> },
    { key: "s3", eyebrow: t("s3Eyebrow"), title: t("s3Title", { n: AUTHENTICITY_COMPENSATION_MULTIPLE }), body: t("s3Body"), node: <SceneDelivery /> },
  ];

  return (
    <section className={cn("mx-auto w-full max-w-6xl px-6", className)}>
      <div className="grid gap-20 md:gap-28">
        {scenes.map((s) => (
          <div key={s.key} className="grid items-start gap-6 md:grid-cols-2 md:gap-12">
            <div className="md:sticky md:top-24">
              <span className="caption-luxury !text-gold-champagne">{s.eyebrow}</span>
              <h2 className="mt-2 break-keep font-display text-2xl font-black leading-tight tracking-[-0.02em] text-white md:text-4xl">{s.title}</h2>
              <p className="mt-3 max-w-md break-keep text-sm leading-relaxed text-secondary">{s.body}</p>
            </div>
            <div>{s.node}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export { CountUp };
export default TrustScenes;
