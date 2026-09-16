"use client";

import { useCallback } from "react";
import { useCurrencyStore, type Currency } from "@/stores/currencyStore";
import { formatCurrency, formatCurrencyCompact } from "@/lib/formatCurrency";

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
  return { currency, setCurrency, fmt, fmtCompact } as { currency: Currency; setCurrency: (c: Currency) => void; fmt: (usdt: number) => string; fmtCompact: (usdt: number) => string };
}
