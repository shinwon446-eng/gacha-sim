/**
 * 신용카드 결제 브릿지 (PROMPTS 4-2, CLAUDE.md §5-A-2).
 *
 * 설계
 *   · 화면은 Provider 인터페이스만 안다. 실제 PG(Stripe / PortOne)는 여기서 교체한다.
 *   · 정적 데모에는 키가 없다. 키가 없으면 Stripe/PortOne 은 "미설정"을 명시적으로 던지고,
 *     화면은 MockProvider 로 떨어져 결제 흐름(로딩 → 승인/실패 → 영수증)을 재현한다.
 *   · 금액은 "선택 통화" 단위로 입력받고, 잔액 반영은 USDT 로 환산한다. 화면엔 통화 하나만 보인다.
 *   · 실서비스: 서버가 세션을 만들고(Stripe Checkout Session / PortOne 결제창) 웹훅으로 잔액을 올린다.
 *     클라이언트가 직접 잔액을 올리는 건 데모에서만 허용한다.
 */

import type { Currency } from "@/stores/currencyStore";

export type CardProvider = "stripe" | "portone" | "mock";

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
  /** 카드 마스킹 (mock: **** 4242) */
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

/**
 * 데모 결제. 1.4초 뒤 승인. 금액 끝자리가 13 이면 실패(카드 거절)를 재현한다 — 에러 경로 확인용.
 */
export const mockProvider: PaymentProvider = {
  key: "mock",
  configured: () => true,
  async checkout(req) {
    await new Promise((r) => setTimeout(r, 1400));
    const declined = Math.round(req.amount) % 100 === 13;
    if (declined) return { ok: false, provider: "mock", transactionId: randomId("mock"), at: new Date().toISOString(), reason: "card_declined" };
    return { ok: true, provider: "mock", transactionId: randomId("mock"), at: new Date().toISOString(), cardMask: "**** 4242" };
  },
};

/** 통화에 맞는 PG 를 고르되, 미설정이면 mock 으로 떨어진다. 어느 쪽을 썼는지 돌려준다. */
export function resolveProvider(currency: Currency): { provider: PaymentProvider; intended: CardProvider; fellBack: boolean } {
  const intended = providerFor(currency);
  const p = intended === "portone" ? portoneProvider : stripeProvider;
  if (p.configured()) return { provider: p, intended, fellBack: false };
  return { provider: mockProvider, intended, fellBack: true };
}

/** 입력 검증 — USDT 환산 기준 한도 */
export function validateAmount(amountUsdt: number): "ok" | "min" | "max" | "nan" {
  if (!Number.isFinite(amountUsdt) || amountUsdt <= 0) return "nan";
  if (amountUsdt < MIN_CARD_USDT) return "min";
  if (amountUsdt > MAX_CARD_USDT) return "max";
  return "ok";
}
