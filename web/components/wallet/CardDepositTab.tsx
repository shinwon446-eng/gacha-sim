"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, Check, X, Receipt, Loader2, Lock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { useWalletStore } from "@/stores/walletStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { playChime } from "@/lib/audio";
import { DEFAULT_3DS_REQUEST, liabilityShiftApplied, resolveProvider, validateAmount, type CheckoutResult } from "@/lib/payments";
import { CARD_PRESETS_USD, cardMask, cvcValid, detectBrand, expiryValid, formatCardNumber, formatExpiry, holderValid, luhnValid } from "@/lib/card";

type Stage = { kind: "form" } | { kind: "3ds" } | { kind: "receipt"; result: CheckoutResult; amountUsd: number } | { kind: "declined"; result: CheckoutResult };

const usd = (n: number) => `$${n.toFixed(2)}`;

/** 브랜드 로고 — 카드 번호 앞자리로 자동 표기 */
function BrandMark({ brand }: { brand: ReturnType<typeof detectBrand> }) {
  if (brand === "visa")
    return (
      <span className="rounded-sm bg-white px-1.5 py-0.5 font-display text-[11px] font-bold italic tracking-tight text-[#1A1F71]">
        VISA
      </span>
    );
  if (brand === "mastercard")
    return (
      <span aria-label="Mastercard" className="flex items-center">
        <span className="h-4 w-4 rounded-full bg-[#EB001B]" />
        <span className="-ml-1.5 h-4 w-4 rounded-full bg-[#F79E1B] opacity-90" />
      </span>
    );
  return <CreditCard className="h-4 w-4 text-faint" strokeWidth={2} />;
}

/**
 * 글로벌 신용카드 결제 (Visa / Mastercard) — Stripe 온램프 스타일.
 *   $20 / $50 / $100 / $500 → 1:1 USDT. 카드 번호(브랜드 자동 표기) · MM/YY · CVC · 영문 소유자명 · 🔒 256-Bit SSL · PCI-DSS Level 1.
 *   [💳 $50.00 결제하고 50 USDT 즉시 충전] → 3D Secure 인증 애니메이션 → PG 승인 → 잔고 반영.
 * 카드 정보는 화면 검증(Luhn·만료일·CVC)에만 쓰고 전송하지 않는다 — 실결제는 PG(Stripe/PortOne)의 토큰화 세션이 처리한다.
 * PG 키가 없으면 결제 버튼은 잠긴다(가짜 승인·가짜 영수증 없음).
 */
export function CardDepositTab({ onCredited }: { onCredited: (amountUsdt: number) => void }) {
  const t = useTranslations("cardPay");
  const locale = useLocale();
  const { fmt } = useCurrency();
  const credit = useWalletStore((s) => s.credit);
  const addTransaction = useWalletStore((s) => s.addTransaction);
  const transactions = useWalletStore((s) => s.transactions);

  const [picked, setPicked] = useState<number>(50);
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [holder, setHolder] = useState("");
  const [touched, setTouched] = useState(false);
  /** 필드별 입력 시작 여부 — 결제 버튼을 누르기 전에도 값이 틀리면 바로 붉게 표시한다 */
  const [dirty, setDirty] = useState({ number: false, expiry: false, cvc: false, holder: false });
  const mark = (k: keyof typeof dirty) => setDirty((d) => (d[k] ? d : { ...d, [k]: true }));
  const [stage, setStage] = useState<Stage>({ kind: "form" });

  const amountUsd = picked;
  const amountUsdt = amountUsd; // 1:1
  const validity = validateAmount(amountUsdt);
  const { provider, intended, configured } = useMemo(() => resolveProvider("USD"), []);
  const brand = detectBrand(number);
  const errors = {
    number: !luhnValid(number) || brand === "unknown",
    expiry: !expiryValid(expiry),
    cvc: !cvcValid(cvc),
    holder: !holderValid(holder),
  };
  const formOk = !errors.number && !errors.expiry && !errors.cvc && !errors.holder;
  const canPay = configured && validity === "ok" && formOk && stage.kind === "form";

  const pay = useCallback(async () => {
    setTouched(true);
    if (!canPay) return;
    setStage({ kind: "3ds" });
    await new Promise((r) => setTimeout(r, 1800));
    // 카드 원문은 넘기지 않는다 — PG 가 자체 토큰화/3DS 로 승인한다
    const result = await provider.checkout({ amount: amountUsd, currency: "USD", amountUsdt, locale, requestThreeDSecure: DEFAULT_3DS_REQUEST }).catch<CheckoutResult>((e: Error) => ({ ok: false, provider: intended, transactionId: "", at: new Date().toISOString(), reason: e.message }));
    if (!result.ok) {
      setStage({ kind: "declined", result });
      return;
    }
    // 카드 충전분은 카드 잔액으로만 — 온체인 출금 불가 (CLAUDE.md §7-B)
    credit(amountUsdt, "card");
    addTransaction({ type: "deposit_card", amountUsdt, ref: `${result.provider}:${result.transactionId}` });
    if (!useSettingsStore.getState().muted) playChime();
    onCredited(amountUsdt);
    setStage({ kind: "receipt", result: { ...result, cardMask: result.cardMask ?? cardMask(number) }, amountUsd });
  }, [canPay, provider, intended, amountUsd, amountUsdt, locale, credit, addTransaction, onCredited, number]);

  const recent = transactions.filter((x) => x.type === "deposit_card" || x.type === "deposit_usdt").slice(0, 4);
  const providerLabel = intended === "portone" ? t("providerPortone") : t("providerStripe");
  const field = "h-11 w-full rounded-md border bg-obsidian px-3 font-mono text-sm text-white outline-none transition-colors focus:border-gold-champagne";

  if (stage.kind === "receipt") {
    const r = stage.result;
    return (
      <div className="border-metallic-gold rounded-xl bg-obsidian p-5">
        <div className="flex items-center gap-2 text-gold-champagne">
          <Receipt className="h-5 w-5" strokeWidth={2.2} />
          <span className="caption-luxury !text-gold-champagne">{t("receipt")}</span>
        </div>
        <div className="text-gold-gradient mt-3 font-display text-4xl font-bold tabular-nums">{usd(stage.amountUsd)}</div>
        <dl className="mt-4 grid gap-2 text-xs">
          {[
            [t("receiptPaid"), usd(stage.amountUsd)],
            [t("receiptCredited"), fmt(stage.amountUsd)],
            [t("receiptProvider"), providerLabel],
            [t("receiptCard"), r.cardMask ?? "—"],
            [t("receiptId"), r.transactionId],
            [t("receiptAt"), new Date(r.at).toLocaleString(locale)],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 border-b border-hairline pb-1.5">
              <dt className="text-faint">{k}</dt>
              <dd className="break-all text-right font-mono text-secondary">{v}</dd>
            </div>
          ))}
        </dl>
        {/* 3DS 2.0 인증 마크 — PG 응답에 근거할 때만 책임 전가 문구를 붙인다 */}
        <div className={cn("mt-4 flex items-start gap-2 rounded-md border p-2.5", liabilityShiftApplied(r) ? "border-emerald-500/40 bg-emerald-500/[0.07]" : "border-white/10 bg-elevation")}>
          <ShieldCheck className={cn("mt-0.5 h-3.5 w-3.5 flex-none", liabilityShiftApplied(r) ? "text-emerald-300" : "text-muted")} strokeWidth={2.4} />
          <div className="min-w-0">
            <div className={cn("text-[11px] font-bold", liabilityShiftApplied(r) ? "text-emerald-300" : "text-secondary")}>
              {liabilityShiftApplied(r) ? "3DS Verified (Liability Shift Applied)" : t(`threeDS.${r.threeDSecure ?? "unknown"}`)}
            </div>
            <div className="mt-0.5 break-keep text-[10px] leading-relaxed text-faint">{t("threeDSNote")}</div>
          </div>
        </div>

        <button type="button" onClick={() => setStage({ kind: "form" })} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-gold-champagne text-sm font-bold text-obsidian hover:bg-gold-metallic">
          <Check className="h-4 w-4" strokeWidth={2.5} />
          {t("done")}
        </button>
      </div>
    );
  }

  return (
    <div className="relative grid gap-5 md:grid-cols-5">
      {/* 3D Secure 인증 오버레이 */}
      <AnimatePresence>
        {stage.kind === "3ds" && (
          <motion.div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl bg-obsidian/92 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold-champagne/60" animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}>
              <Lock className="h-6 w-6 text-gold-champagne" strokeWidth={2.2} />
            </motion.div>
            <div className="mt-4 text-sm font-bold text-white">{t("threeDSTitle")}</div>
            <div className="mt-1 text-[11px] text-muted">{t("threeDsBody", { brand: brand === "mastercard" ? "Mastercard" : "Visa" })}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4 md:col-span-3">
        {/* 결제 금액 */}
        <div>
          <div className="caption-luxury">{t("quick")}</div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {CARD_PRESETS_USD.map((p) => {
              const active = picked === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPicked(p)}
                  className={cn("flex h-14 flex-col items-center justify-center rounded-md transition-colors", active ? "border-metallic-gold bg-gold-champagne/15 text-gold-champagne" : "border-metallic-subtle bg-obsidian text-secondary hover:text-white")}
                >
                  <span className="font-display text-sm font-bold leading-none sm:text-base">{usd(p)}</span>
                  <span className="mt-1 font-mono text-[10px] leading-none opacity-80">= {fmt(p)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 카드 정보 */}
        <div className="grid gap-3">
          <label className="block">
            <span className="caption-luxury">{t("cardNumber")}</span>
            <span className="relative mt-2 block">
              <input
                value={number}
                onChange={(e) => { setNumber(formatCardNumber(e.target.value)); mark("number"); }}
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="4242 4242 4242 4242"
                className={cn(field, "pr-16", (touched || dirty.number) && errors.number ? "border-crimson" : "border-hairline")}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <BrandMark brand={brand} />
              </span>
            </span>
            {(touched || dirty.number) && errors.number && <span className="mt-1 block text-[11px] text-crimson">{t("errCardNumber")}</span>}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="caption-luxury">{t("expiry")}</span>
              <input value={expiry} onChange={(e) => { setExpiry(formatExpiry(e.target.value)); mark("expiry"); }} inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" className={cn(field, "mt-2", (touched || dirty.expiry) && errors.expiry ? "border-crimson" : "border-hairline")} />
              {(touched || dirty.expiry) && errors.expiry && <span className="mt-1 block text-[11px] text-crimson">{t("errExpiry")}</span>}
            </label>
            <label className="block">
              <span className="caption-luxury">{t("cvc")}</span>
              <input value={cvc} onChange={(e) => { setCvc(e.target.value.replace(/\D/g, "").slice(0, 3)); mark("cvc"); }} inputMode="numeric" autoComplete="cc-csc" placeholder="123" className={cn(field, "mt-2", (touched || dirty.cvc) && errors.cvc ? "border-crimson" : "border-hairline")} />
              {(touched || dirty.cvc) && errors.cvc && <span className="mt-1 block text-[11px] text-crimson">{t("errCvc")}</span>}
            </label>
          </div>
          <label className="block">
            <span className="caption-luxury">{t("holder")}</span>
            <input value={holder} onChange={(e) => { setHolder(e.target.value.toUpperCase()); mark("holder"); }} autoComplete="cc-name" placeholder="HONG GILDONG" className={cn(field, "mt-2 font-sans uppercase", (touched || dirty.holder) && errors.holder ? "border-crimson" : "border-hairline")} />
            {(touched || dirty.holder) && errors.holder && <span className="mt-1 block text-[11px] text-crimson">{t("errHolder")}</span>}
          </label>
        </div>

        {/* 결제 수단 · 보안 뱃지 */}
        <div className="border-metallic-subtle rounded-lg bg-obsidian p-3">
          <div className="flex items-center justify-between">
            <span className="caption-luxury">{t("provider")}</span>
            <span className={cn("text-[11px] font-semibold", configured ? "text-gold-champagne" : "text-muted")}>{providerLabel}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="flex items-center gap-1 rounded-sm border border-white/10 bg-elevation px-2 py-1 text-[10px] font-semibold text-secondary">
              <Lock className="h-3 w-3 text-gold-champagne" strokeWidth={2.4} /> 🔒 256-Bit SSL Encrypted
            </span>
            <span className="flex items-center gap-1 rounded-sm border border-white/10 bg-elevation px-2 py-1 text-[10px] font-semibold text-secondary">
              <ShieldCheck className="h-3 w-3 text-gold-champagne" strokeWidth={2.4} /> PCI-DSS Level 1
            </span>
            <span className="flex items-center gap-1 rounded-sm border border-white/10 bg-elevation px-2 py-1 text-[10px] font-semibold text-secondary">
              <BrandMark brand="visa" /> <BrandMark brand="mastercard" />
            </span>
          </div>
          {!configured && <p className="mt-2 break-keep text-[10px] leading-relaxed text-faint">{t("cardSoon")}</p>}
        </div>

        {stage.kind === "declined" && (
          <div className="flex items-start gap-2 rounded-md border border-crimson/40 bg-crimson/10 p-3 text-xs">
            <X className="mt-0.5 h-4 w-4 flex-none text-crimson" strokeWidth={2.5} />
            <div>
              <div className="font-bold text-white">{t("declined")}</div>
              <div className="mt-0.5 break-all text-muted">{stage.result.reason}</div>
              <button type="button" onClick={() => setStage({ kind: "form" })} className="mt-2 text-[11px] font-semibold text-gold-champagne hover:underline">{t("retry")}</button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={pay}
          disabled={!configured || validity !== "ok" || stage.kind !== "form"}
          className="flex h-12 items-center justify-center gap-2 rounded-md bg-crimson text-sm font-bold text-white shadow-[0_0_24px_rgba(229,9,20,0.35)] transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {stage.kind === "3ds" && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />}
          {stage.kind === "3ds" ? t("processing") : `💳 ${t("payAndCredit", { usd: usd(amountUsd), usdt: fmt(amountUsdt) })}`}
        </button>
      </div>

      {/* 우: 요약 + 최근 내역 */}
      <div className="grid content-start gap-4 md:col-span-2">
        <div className="border-metallic-gold rounded-lg bg-obsidian p-4">
          <div className="caption-luxury">{t("summaryPay")}</div>
          <div className="mt-1 font-display text-3xl font-bold text-white">{usd(amountUsd)}</div>
          <div className="caption-luxury mt-3">{t("summaryCredit")}</div>
          <div className="text-gold-gradient mt-1 font-display text-2xl font-bold">{fmt(amountUsdt)}</div>
          <div className="mt-2 text-[10px] text-faint">{t("rateNote")}</div>
        </div>
        <div className="border-metallic-subtle rounded-lg bg-obsidian p-4">
          <div className="caption-luxury">{t("recent")}</div>
          {recent.length === 0 ? (
            <div className="mt-2 text-xs text-faint">{t("noRecent")}</div>
          ) : (
            <ul className="mt-2 space-y-1.5 text-xs">
              {recent.map((x) => (
                <li key={x.id} className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-muted">{x.type === "deposit_card" ? t("recentCard") : t("recentUsdt")}</span>
                  <span className="font-mono text-secondary">{fmt(x.amountUsdt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default CardDepositTab;
