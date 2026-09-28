"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useTranslations } from "next-intl";
import { ShieldCheck, Sparkles, Truck, Check } from "lucide-react";
import { cn } from "@/lib/format";
import { Link } from "@/i18n/navigation";
import { BOX_BY_SLUG, dropTable, sellValueOf } from "@/lib/products";
import { ROLL_RANGE, sha256Hex } from "@/lib/fairness";
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

/** Scene 1 — 95% 페이백이 도전 횟수를 바꾼다. 비교값은 화면의 계산식 그대로다 */
function SceneRefund() {
  const t = useTranslations("about");
  const range = useMemo(() => attemptsRange(), []);
  const rival = useMemo(() => effectiveAttempts(GIFT_BOX_ASSUMED_REFUND_RATE), []);
  // 목업 금액은 실제 카탈로그 상품의 95% 페이백액이다 — 지어낸 숫자가 아니다
  const demo = useMemo(() => {
    const box = BOX_BY_SLUG["starter-macbook"];
    const item = box ? dropTable(box)[0] : undefined;
    return item ? { name: item.id, back: sellValueOf(item) } : { name: "", back: 0 };
  }, []);

  return (
    <div className="grid gap-5">
      <div className="border-metallic-subtle rounded-2xl bg-surface p-4">
        <div className="caption-luxury !text-gold-champagne">{t("s1Formula")}</div>
        <ul className="mt-3 grid gap-2.5">
          {[
            { label: t("s1RivalLabel", { rate: (GIFT_BOX_ASSUMED_REFUND_RATE * 100).toFixed(1) }), n: rival, pct: 5, gold: false },
            { label: t("s1OursLabel", { min: range.minRate, max: range.maxRate }), n: range.max, pct: 100, gold: true },
          ].map((row) => (
            <li key={row.label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 break-keep text-[11px] text-secondary">{row.label}</span>
                <span className={cn("whitespace-nowrap font-display text-lg font-black tabular-nums", row.gold ? "text-gold-gradient" : "text-faint")}>
                  {t("s1Attempts", { n: row.n })}
                </span>
              </div>
              <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-white/10">
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
        <p className="mt-2.5 break-keep text-[10px] leading-relaxed text-faint">{t("s1AttemptsNote")} · {t("s1Assume")}</p>
      </div>

      {/* 앱 목업 — 개봉 후 95% 바로 돌려받기 */}
      <div className="border-metallic-gold rounded-2xl bg-obsidian p-4">
        <div className="caption-luxury !text-gold-champagne">{t("s1MockTitle")}</div>
        <button type="button" className="mt-2.5 flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-gold-metallic to-gold-champagne text-[13px] font-bold text-obsidian">
          {t("s1MockCta")}
        </button>
        <div className="mt-3 flex items-baseline justify-between border-t border-hairline pt-2.5">
          <span className="text-[11px] text-secondary">{t("s1MockWallet")}</span>
          <span className="text-gold-gradient font-display text-xl font-black tabular-nums">
            +<CountUp value={demo.back} decimals={2} /> <span className="text-[11px] font-semibold text-muted">USDT</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/** Scene 2 — SHA-256 프로버블리 페어 3단계. 해시는 화면에서 실제로 계산한다 */
function SceneFair() {
  const t = useTranslations("about");
  const [hash, setHash] = useState<string | null>(null);
  useEffect(() => {
    // 보여 주는 해시는 바로 위에 적힌 시드의 진짜 SHA-256 이다 — 예쁜 가짜 문자열이 아니다
    sha256Hex("voila-demo-server-seed").then(setHash).catch(() => setHash(null));
  }, []);

  const steps = [
    { title: t("s2Step1"), sub: t("s2Step1Sub"), icon: ShieldCheck },
    { title: t("s2Step2"), sub: t("s2Step2Sub"), icon: Sparkles },
    { title: t("s2Step3"), sub: t("s2Step3Sub", { range: ROLL_RANGE.toLocaleString("en-US") }), icon: Check },
  ];

  return (
    <div className="grid gap-3">
      <ol className="grid gap-2">
        {steps.map((s, i) => (
          <motion.li
            key={s.title}
            initial={{ opacity: 0, x: -14 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, ease: EASE, delay: i * 0.12 }}
            className="border-metallic-subtle flex items-start gap-3 rounded-xl bg-surface px-3.5 py-3"
          >
            <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full border border-gold-champagne/40 bg-obsidian">
              <s.icon className="h-3.5 w-3.5 text-gold-champagne" strokeWidth={2.4} />
            </span>
            <span className="min-w-0">
              <span className="block break-keep text-[13px] font-bold text-white">{s.title}</span>
              <span className="block break-keep text-[11px] leading-relaxed text-faint">{s.sub}</span>
            </span>
          </motion.li>
        ))}
      </ol>
      <div className="border-metallic-gold rounded-xl bg-obsidian px-3.5 py-3">
        <div className="caption-luxury !text-gold-champagne">SHA-256</div>
        <code className="mt-1 block break-all font-mono text-[10px] leading-relaxed text-gold-champagne/90">
          {hash ? `0x${hash}` : "…"}
        </code>
      </div>
      <p className="break-keep text-[11px] leading-relaxed text-secondary">{t("s2Note")}</p>
      <Link href="/fairness" className="border-gold-gradient inline-flex h-10 items-center justify-center rounded-lg bg-obsidian/60 px-4 text-[13px] font-bold text-gold-champagne transition-colors hover:bg-gold-champagne/10">
        {t("s2Verify")}
      </Link>
    </div>
  );
}

/** Scene 3 — 정품 보증 + 특송. 운송장 번호는 지어내지 않는다 */
function SceneDelivery() {
  const t = useTranslations("about");
  const steps = [t("s3Track1"), t("s3Track2"), t("s3Track3")];
  return (
    <div className="grid gap-3">
      <motion.div
        className="border-metallic-gold relative overflow-hidden rounded-2xl bg-surface p-5"
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        {/* 골드 홀로그램 인증 엠블럼 — '찰칵' 도장처럼 찍힌다 */}
        <motion.span
          className="absolute right-4 top-4 flex h-16 w-16 rotate-[-12deg] items-center justify-center rounded-full border-2 border-gold-champagne/70 text-center text-[9px] font-black leading-tight text-gold-champagne"
          initial={{ scale: 2.2, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1], delay: 0.35 }}
          style={{ boxShadow: "0 0 22px rgba(230,202,101,0.45)" }}
        >
          {t("s3Stamp")}
        </motion.span>
        <Truck className="h-5 w-5 text-gold-champagne" strokeWidth={2.2} />
        <h3 className="mt-2.5 max-w-[70%] break-keep text-[15px] font-extrabold text-white">
          {t("s3Title", { n: AUTHENTICITY_COMPENSATION_MULTIPLE })}
        </h3>
        <p className="mt-1.5 break-keep text-[11px] leading-relaxed text-secondary">{t("s3Body")}</p>
      </motion.div>

      <div className="border-metallic-subtle rounded-xl bg-obsidian px-3.5 py-3">
        <div className="flex items-baseline justify-between">
          <span className="caption-luxury">{t("s3Waybill")}</span>
          <span className="text-[10px] text-faint">{t("s3WaybillPending")}</span>
        </div>
        <ol className="mt-3 flex items-center gap-1.5">
          {steps.map((label, i) => (
            <li key={label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <motion.span
                className={cn("h-1.5 w-full rounded-full", i === 0 ? "bg-gold-champagne" : "bg-white/12")}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.2 + i * 0.15 }}
                style={{ originX: 0 }}
              />
              <span className={cn("truncate text-[9px]", i === 0 ? "font-bold text-gold-champagne" : "text-faint")}>{label}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/**
 * Section 2 — 스크롤 고정(sticky) 3씬.
 *
 * 좌측 텍스트가 화면에 붙어 있는 동안 우측 목업이 ① 95% 페이백 ② SHA-256 공정성 ③ 정품 보증·특송 으로 넘어간다.
 * 모바일은 스티키를 풀고 세로로 쌓는다(작은 화면에서 좌우 분할은 둘 다 읽히지 않는다).
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
