/**
 * 단일 통화 표시 엔진 (CLAUDE.md §4 Zero Clutter)
 *
 * 입력은 항상 USDT 기준 금액이고, 출력은 선택 통화 "하나"의 표기다.
 *   USDT → "80.00 USDT"   USD → "$80.00"   KRW → "₩110,400"
 * 다른 통화 기호·단위가 섞여 나오는 경로는 존재하지 않는다 — 이 함수 말고는 금액을 문자열로 만들지 않는다.
 */

import { DEFAULT_RATES, type Currency } from "@/stores/currencyStore";

const SPEC: Record<Currency, { decimals: number; render: (n: string) => string }> = {
  USDT: { decimals: 2, render: (n) => `${n} USDT` },
  USD: { decimals: 2, render: (n) => `$${n}` },
  KRW: { decimals: 0, render: (n) => `₩${n}` },
};

export function convertFromUsdt(usdt: number, currency: Currency, rates: Record<Currency, number> = DEFAULT_RATES): number {
  return usdt * rates[currency];
}

export function formatCurrency(
  baseUsdtAmount: number,
  selectedCurrency: Currency,
  rates: Record<Currency, number> = DEFAULT_RATES,
): string {
  const { decimals, render } = SPEC[selectedCurrency];
  const amount = convertFromUsdt(baseUsdtAmount, selectedCurrency, rates);
  const digits = amount.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return render(digits);
}

/**
 * 이미 선택 통화 단위인 금액을 그대로 표기한다 (환산 없음).
 * 결제 프리셋처럼 "₩70,000 을 냈다"는 사실을 보존해야 할 때 쓴다 — USDT 왕복 환산의 반올림 오차를 피한다.
 */
export function formatNative(amountInCurrency: number, currency: Currency): string {
  const { decimals, render } = SPEC[currency];
  return render(amountInCurrency.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }));
}

/**
 * 축약 표기 — 카드 폭이 좁은 자리 전용. 통화 규칙은 동일하다.
 *   USDT/USD: 1,250,000 → 1.25M / 12,900 → 12.9K   KRW: 1,290,000 → ₩129만 / 1.2억
 */
export function formatCurrencyCompact(
  baseUsdtAmount: number,
  selectedCurrency: Currency,
  rates: Record<Currency, number> = DEFAULT_RATES,
): string {
  const amount = convertFromUsdt(baseUsdtAmount, selectedCurrency, rates);
  if (selectedCurrency === "KRW") {
    if (amount >= 100_000_000) return `₩${+(amount / 100_000_000).toFixed(1)}억`;
    if (amount >= 10_000) return `₩${+(amount / 10_000).toFixed(amount >= 1_000_000 ? 0 : 1)}만`;
    return formatCurrency(baseUsdtAmount, selectedCurrency, rates);
  }
  const short =
    amount >= 1_000_000 ? `${+(amount / 1_000_000).toFixed(2)}M` : amount >= 10_000 ? `${+(amount / 1_000).toFixed(1)}K` : null;
  if (!short) return formatCurrency(baseUsdtAmount, selectedCurrency, rates);
  return selectedCurrency === "USD" ? `$${short}` : `${short} USDT`;
}
