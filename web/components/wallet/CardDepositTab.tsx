"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CreditCard, Check, X, Receipt, Loader2 } from "lucide-react";
import { cn } from "@/lib/format";
import { useCurrency } from "@/lib/useCurrency";
import { useCurrencyStore } from "@/stores/currencyStore";
import { useWalletStore } from "@/stores/walletStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { playChime } from "@/lib/audio";
import { MAX_CARD_USDT, MIN_CARD_USDT, PRESETS, resolveProvider, validateAmount, type CheckoutResult } from "@/lib/payments";

type Stage = { kind: "form" } | { kind: "processing" } | { kind: "receipt"; result: CheckoutResult; amount: number; amountUsdt: number } | { kind: "declined"; result: CheckoutResult };

/**
 * 신용카드 결제 탭 (PROMPTS 4-2).
 *   선택 통화 기준 프리셋(USDT 20/50/100/300/500 · KRW 3만/7만/15만/40만/70만) + 직접 입력
 *   → 통화별 PG(KRW=PortOne, 그 외=Stripe) 브릿지 → 영수증 + 잔액 즉시 갱신 + 거래 기록. PG 키가 없으면 버튼을 잠근다.
 * 화면의 금액은 선택 통화 하나로만 표기한다 (CLAUDE.md §4). 잔액 반영은 USDT 로 환산.
 */
export function CardDepositTab({ onCredited }: { onCredited: (amountUsdt: number) => void }) {
  const t = useTranslations("cardPay");
  const locale = useLocale();
  const { currency, fmt, fmtNative } = useCurrency();
  const rates = useCurrencyStore((s) => s.rates);
  const credit = useWalletStore((s) => s.credit);
  const addTransaction = useWalletStore((s) => s.addTransaction);
  const transactions = useWalletStore((s) => s.transactions);

  const presets = PRESETS[currency];
  const [picked, setPicked] = useState<number | null>(presets[1]);
  const [custom, setCustom] = useState("");
  const [stage, setStage] = useState<Stage>({ kind: "form" });

  const amount = picked ?? Number(custom);
  // 잔액 반영용 USDT — 표시는 원금액(fmtNative)으로만 한다
  const amountUsdt = useMemo(() => +(amount / rates[currency]).toFixed(4), [amount, rates, currency]);
  const validity = validateAmount(amountUsdt);
  const { provider, intended, configured } = useMemo(() => resolveProvider(currency), [currency]);

  const errorText =
    validity === "min" ? t("belowMin", { min: fmt(MIN_CARD_USDT) }) : validity === "max" ? t("aboveMax", { max: fmt(MAX_CARD_USDT) }) : validity === "nan" ? t("invalid") : null;

  const pay = useCallback(async () => {
    if (validity !== "ok" || !configured) return;
    setStage({ kind: "processing" });
    const result = await provider.checkout({ amount, currency, amountUsdt, locale });
    if (!result.ok) {
      setStage({ kind: "declined", result });
      return;
    }
    credit(amountUsdt);
    addTransaction({ type: "deposit_card", amountUsdt, ref: `${result.provider}:${result.transactionId}` });
    if (!useSettingsStore.getState().muted) playChime();
    onCredited(amountUsdt);
    setStage({ kind: "receipt", result, amount, amountUsdt });
  }, [validity, configured, provider, amount, currency, amountUsdt, locale, credit, addTransaction, onCredited]);

  const providerLabel = intended === "portone" ? t("providerPortone") : t("providerStripe");
  const recent = transactions.filter((x) => x.type === "deposit_card" || x.type === "deposit_usdt").slice(0, 4);

  if (stage.kind === "receipt") {
    const r = stage.result;
    return (
      <div className="border-metallic-gold rounded-xl bg-obsidian p-5">
        <div className="flex items-center gap-2 text-gold-champagne">
          <Receipt className="h-5 w-5" strokeWidth={2.2} />
          <span className="caption-luxury !text-gold-champagne">{t("receipt")}</span>
        </div>
        <div className="text-gold-gradient mt-3 font-display text-4xl font-bold tabular-nums">{fmtNative(stage.amount)}</div>
        <dl className="mt-4 grid gap-2 text-xs">
          {[
            [t("receiptPaid"), fmtNative(stage.amount)],
            [t("receiptCredited"), fmtNative(stage.amount)],
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
        <button type="button" onClick={() => setStage({ kind: "form" })} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-gold-champagne text-sm font-bold text-obsidian hover:bg-gold-metallic">
          <Check className="h-4 w-4" strokeWidth={2.5} />
          {t("done")}
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-5">
      <div className="grid gap-4 md:col-span-3">
        {/* 프리셋 */}
        <div>
          <div className="caption-luxury">{t("quick")}</div>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {presets.map((p) => {
              const active = picked === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPicked(p);
                    setCustom("");
                  }}
                  className={cn(
                    "h-12 rounded-md font-mono text-sm font-bold tabular-nums transition-colors",
                    active ? "border-metallic-gold bg-gold-champagne/10 text-gold-champagne" : "border-metallic-subtle bg-obsidian text-secondary hover:text-white",
                  )}
                >
                  {fmtNative(p)}
                </button>
              );
            })}
          </div>
        </div>

        {/* 직접 입력 */}
        <label className="block">
          <span className="caption-luxury">{t("custom")}</span>
          <input
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              setPicked(null);
            }}
            inputMode="decimal"
            placeholder={currency}
            className="mt-2 w-full rounded-md border border-hairline bg-obsidian px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-gold-champagne"
          />
        </label>

        {/* 결제 수단 */}
        <div className="border-metallic-subtle rounded-lg bg-obsidian p-3">
          <div className="flex items-center justify-between">
            <span className="caption-luxury">{t("provider")}</span>
            <span className={cn("text-[11px] font-semibold", configured ? "text-gold-champagne" : "text-muted")}>{providerLabel}</span>
          </div>
          {!configured && <p className="mt-1.5 text-[10px] leading-relaxed text-faint">{t("cardSoon")}</p>}
        </div>

        {stage.kind === "declined" && (
          <div className="flex items-start gap-2 rounded-md border border-crimson/40 bg-crimson/10 p-3 text-xs">
            <X className="mt-0.5 h-4 w-4 flex-none text-crimson" strokeWidth={2.5} />
            <div>
              <div className="font-bold text-crimson">{t("declined")}</div>
              <div className="mt-0.5 text-faint">{t("declinedHint")}</div>
            </div>
          </div>
        )}
        {errorText && stage.kind === "form" && <p className="text-xs text-crimson">{errorText}</p>}

        <button
          type="button"
          onClick={pay}
          disabled={!configured || validity !== "ok" || stage.kind === "processing"}
          className="flex h-12 items-center justify-center gap-2 rounded-md bg-crimson text-sm font-bold text-white shadow-[0_0_24px_rgba(229,9,20,0.35)] transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {stage.kind === "processing" ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} /> : <CreditCard className="h-4 w-4" strokeWidth={2.2} />}
          {stage.kind === "processing" ? t("processing") : t("pay", { amount: validity === "ok" ? fmtNative(amount) : "—" })}
        </button>
      </div>

      {/* 우: 요약 + 최근 내역 */}
      <div className="grid gap-4 md:col-span-2">
        <div className="border-metallic-gold rounded-lg bg-obsidian p-4">
          <div className="caption-luxury">{t("amount")}</div>
          <div className="mt-1 font-display text-3xl font-bold tabular-nums text-white">{validity === "ok" ? fmtNative(amount) : "—"}</div>
          <div className="mt-3 caption-luxury">{t("credit")}</div>
          <div className="text-gold-gradient mt-1 font-display text-2xl font-bold tabular-nums">{validity === "ok" ? fmtNative(amount) : "—"}</div>
        </div>

        <div className="border-metallic-subtle rounded-lg bg-obsidian p-3">
          <div className="caption-luxury">{t("history")}</div>
          {recent.length === 0 ? (
            <p className="mt-2 text-[11px] text-faint">{t("noHistory")}</p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-[11px]">
              {recent.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-2">
                  <span className="text-muted">{x.type === "deposit_card" ? t("txDepositCard") : t("txDepositUsdt")}</span>
                  <span className="font-mono tabular-nums text-gold-champagne">+{fmt(x.amountUsdt)}</span>
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
