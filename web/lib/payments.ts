/**
 * 신용카드 결제 브릿지 (PROMPTS 4-2, CLAUDE.md §5-A-2).
 *
 * 설계
 *   · 화면은 Provider 인터페이스만 안다. 실제 PG(Stripe / PortOne)는 여기서 교체한다.
 *   · 키가 없으면 Stripe/PortOne 은 "미설정"을 명시적으로 던지고, 화면은 결제 버튼을 잠근 채 오픈 예정 안내를 띄운다.
 *     가짜 승인·가짜 영수증은 만들지 않는다.
 *   · 금액은 "선택 통화" 단위로 입력받고, 잔액 반영은 USDT 로 환산한다. 화면엔 통화 하나만 보인다.
 *   · 실서비스: 서버가 세션을 만들고(Stripe Checkout Session / PortOne 결제창) 웹훅으로 잔액을 올린다.
 *     클라이언트가 직접 잔액을 올리는 경로는 없다.
 */

import type { Currency } from "@/stores/currencyStore";

export type CardProvider = "stripe" | "portone";

/** 통화별 빠른 충전 프리셋 — 선택 통화 단위의 "예쁜" 숫자 (PROMPTS 4-2-1) */
export const PRESETS: Record<Currency, number[]> = {
  USDT: [20, 50, 100, 300, 500],
  USD: [20, 50, 100, 300, 500],
  KRW: [30000, 70000, 150000, 400000, 700000],
};

export const MIN_CARD_USDT = 10;
export const MAX_CARD_USDT = 5000;

export interface CheckoutRequest {
  /** 선택 통화 단위 금액 */
  amount: number;
  currency: Currency;
  /** 환산된 USDT — 잔액 반영액 */
  amountUsdt: number;
  locale: string;
}

export interface CheckoutResult {
  ok: boolean;
  provider: CardProvider;
  /** PG 거래 id */
  transactionId: string;
  /** 승인 시각(ISO) */
  at: string;
  /** 카드 마스킹 */
  cardMask?: string;
  /** 실패 사유 */
  reason?: string;
}

export interface PaymentProvider {
  key: CardProvider;
  /** 현재 환경에서 사용 가능한가 (키 존재 여부) */
  configured(): boolean;
  checkout(req: CheckoutRequest): Promise<CheckoutResult>;
}

/** 지역 규칙: KRW 는 국내 PG(PortOne), 나머지는 Stripe */
export function providerFor(currency: Currency): Exclude<CardProvider, "mock"> {
  return currency === "KRW" ? "portone" : "stripe";
}

const envKey = (name: string): string | undefined => {
  const env = (typeof process !== "undefined" ? process.env : {}) as Record<string, string | undefined>;
  return env[name];
};

const randomId = (prefix: string): string => {
  const c = globalThis.crypto;
  const buf = new Uint8Array(8);
  c?.getRandomValues?.(buf);
  return prefix + "_" + Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
};

/** Stripe — NEXT_PUBLIC_STRIPE_PK 가 있어야 한다. 실제 연동은 서버 세션 생성이 필요하다. */
export const stripeProvider: PaymentProvider = {
  key: "stripe",
  configured: () => !!envKey("NEXT_PUBLIC_STRIPE_PK"),
  async checkout() {
    // 실서비스: fetch("/api/payments/stripe/session") → stripe.redirectToCheckout(sessionId)
    throw new Error("Stripe 미설정: NEXT_PUBLIC_STRIPE_PK 와 서버 세션 엔드포인트가 필요합니다");
  },
};

/** PortOne(구 아임포트) — NEXT_PUBLIC_PORTONE_STORE_ID 가 있어야 한다. */
export const portoneProvider: PaymentProvider = {
  key: "portone",
  configured: () => !!envKey("NEXT_PUBLIC_PORTONE_STORE_ID"),
  async checkout() {
    // 실서비스: PortOne.requestPayment({ storeId, channelKey, paymentId, orderName, totalAmount, currency:"KRW" })
    throw new Error("PortOne 미설정: NEXT_PUBLIC_PORTONE_STORE_ID 와 채널 키가 필요합니다");
  },
};

/** 통화에 맞는 PG. 키가 없으면 `configured: false` — 결제 버튼은 잠기고 카드 결제 오픈 예정 안내가 뜬다(가짜 승인 없음). */
export function resolveProvider(currency: Currency): { provider: PaymentProvider; intended: CardProvider; configured: boolean } {
  const intended = providerFor(currency);
  const p = intended === "portone" ? portoneProvider : stripeProvider;
  return { provider: p, intended, configured: p.configured() };
}

/** 입력 검증 — USDT 환산 기준 한도 */
export function validateAmount(amountUsdt: number): "ok" | "min" | "max" | "nan" {
  if (!Number.isFinite(amountUsdt) || amountUsdt <= 0) return "nan";
  if (amountUsdt < MIN_CARD_USDT) return "min";
  if (amountUsdt > MAX_CARD_USDT) return "max";
  return "ok";
}
