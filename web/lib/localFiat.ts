"use client";

/**
 * **표시 전용 현지 통화 병기**, "455,714 USDT" 옆의 "≈ ₩628,885,320".
 *
 * 왜 별도 모듈인가
 *   플랫폼의 금액 표기는 `lib/formatCurrency.ts` 하나가 지배하고, 선택 통화 **하나만** 찍는다(§4 Zero Clutter).
 *   그 규칙은 **결제, 잔액, 상금처럼 실제로 주고받는 금액**을 위한 것이다. /about 랜딩은 "이게 우리 돈으로 얼마인가"를
 *   즉시 체감시켜야 하므로, 여기서만 **2차 환산액을 `≈` 를 붙여 병기**한다. 이 값으로는 아무것도 결제, 정산되지 않는다.
 *   통화 스토어(USDT/USD/KRW)는 건드리지 않는다, CNY 는 결제 통화가 아니라 zh 로케일의 읽기용 환산 단위다.
 *
 * 환율은 고정 표시용 근사값이고 화면에 항상 `≈` 를 붙인다. 실시간 환율이 붙으면 RATE 만 갱신한다.
 */

import { useLocale } from "next-intl";
import { DEFAULT_RATES, useCurrencyStore } from "@/stores/currencyStore";

export type Fiat = "KRW" | "USD" | "CNY";

interface FiatSpec {
  symbol: string;
  /** 1 USDT 당 환율 */
  rate: number;
  decimals: number;
  /** 큰 금액 축약, [1억 단위 라벨, 1만 단위 라벨] 또는 null(서양식 M/K) */
  myriad: [string, string] | null;
}

/** CNY 는 통화 스토어에 없는 읽기용 단위라 환율을 여기서 들고 있다 */
const CNY_RATE = 7.1;

export const FIAT_SPEC: Record<Fiat, FiatSpec> = {
  KRW: { symbol: "₩", rate: DEFAULT_RATES.KRW, decimals: 0, myriad: ["억", "만"] },
  USD: { symbol: "$", rate: DEFAULT_RATES.USD, decimals: 2, myriad: null },
  CNY: { symbol: "¥", rate: CNY_RATE, decimals: 0, myriad: ["亿", "万"] },
};

/** 로케일이 기본으로 읽는 통화, 유저가 통화를 고르지 않았을 때(USDT) 쓴다 */
export const FIAT_BY_LOCALE: Record<string, Fiat> = { ko: "KRW", en: "USD", zh: "CNY" };

const digits = (n: number, decimals: number): string =>
  n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: decimals });

/** USDT → 현지 통화 전체 표기. "₩628,885,320" */
export function formatFiat(usdt: number, fiat: Fiat): string {
  const spec = FIAT_SPEC[fiat];
  return `${spec.symbol}${digits(usdt * spec.rate, spec.decimals)}`;
}

/** USDT → 현지 통화 체감 축약. "₩6.3억" , "¥323.6万" , "$455.7K" */
export function formatFiatCompact(usdt: number, fiat: Fiat): string {
  const spec = FIAT_SPEC[fiat];
  const amount = usdt * spec.rate;
  if (spec.myriad) {
    const [big, small] = spec.myriad;
    // 만, 억 단위도 천 단위 구분을 넣는다, "₩2153만" 보다 "₩2,153만" 이 한눈에 읽힌다
    if (amount >= 100_000_000) return `${spec.symbol}${digits(amount / 100_000_000, 1)}${big}`;
    if (amount >= 10_000) return `${spec.symbol}${digits(amount / 10_000, amount >= 1_000_000 ? 0 : 1)}${small}`;
    return formatFiat(usdt, fiat);
  }
  if (amount >= 1_000_000) return `${spec.symbol}${+(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 10_000) return `${spec.symbol}${+(amount / 1_000).toFixed(1)}K`;
  return formatFiat(usdt, fiat);
}

export interface LocalFiat {
  fiat: Fiat;
  /** 선택 통화가 이미 그 현지 통화다, <Money> 가 같은 기호를 찍으므로 병기하면 중복이다 */
  redundant: boolean;
  approx: (usdt: number) => string;
  approxCompact: (usdt: number) => string;
}

/**
 * 병기용 통화를 고른다. 유저가 통화를 골랐으면 그 통화, USDT 를 쓰고 있으면 로케일 기본값.
 * SSR 안전, 스토어 기본값(USDT)으로 서버, 클라 첫 렌더가 같고, 하이드레이션 후 선택값이 반영된다.
 */
export function useLocalFiat(): LocalFiat {
  const locale = useLocale();
  const currency = useCurrencyStore((s) => s.currency);
  const fiat: Fiat = currency === "KRW" || currency === "USD" ? currency : (FIAT_BY_LOCALE[locale] ?? "USD");
  return {
    fiat,
    redundant: currency === fiat,
    approx: (usdt) => formatFiat(usdt, fiat),
    approxCompact: (usdt) => formatFiatCompact(usdt, fiat),
  };
}
