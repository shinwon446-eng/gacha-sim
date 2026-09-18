"use client";

import { useCallback } from "react";
import { useCurrencyStore, type Currency } from "@/stores/currencyStore";
import { formatCurrency, formatCurrencyCompact, formatNative, splitCurrency, splitNative, type MoneyParts } from "@/lib/formatCurrency";

/**
 * 컴포넌트용 훅. 선택 통화에 묶인 포맷터를 돌려준다.
 * 스토어 값이 바뀌면 이 훅을 쓰는 모든 컴포넌트가 함께 리렌더된다 — 일괄 전환의 원리.
 */
export function useCurrency() {
  const currency = useCurrencyStore((s) => s.currency);
  const rates = useCurrencyStore((s) => s.rates);
  const setCurrency = useCurrencyStore((s) => s.setCurrency);
  const fmt = useCallback((usdt: number) => formatCurrency(usdt, currency, rates), [currency, rates]);
  const fmtCompact = useCallback((usdt: number) => formatCurrencyCompact(usdt, currency, rates), [currency, rates]);
  const fmtNative = useCallback((amount: number) => formatNative(amount, currency), [currency]);
  const split = useCallback((usdt: number) => splitCurrency(usdt, currency, rates), [currency, rates]);
  const splitNativeParts = useCallback((amount: number) => splitNative(amount, currency), [currency]);
  return { currency, setCurrency, fmt, fmtCompact, fmtNative, split, splitNative: splitNativeParts } as {
    currency: Currency;
    setCurrency: (c: Currency) => void;
    fmt: (usdt: number) => string;
    fmtCompact: (usdt: number) => string;
    /** 이미 선택 통화 단위인 금액 — 환산 없이 표기 */
    fmtNative: (amount: number) => string;
    /** 숫자·단위 분리 — <Money> 전용 */
    split: (usdt: number) => MoneyParts;
    splitNative: (amount: number) => MoneyParts;
  };
}
