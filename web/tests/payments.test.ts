// 카드 결제 브릿지 — 프리셋·PG 선택·한도·데모 승인/거절
import test from "node:test";
import assert from "node:assert/strict";
import { MAX_CARD_USDT, MIN_CARD_USDT, PRESETS, mockProvider, portoneProvider, providerFor, resolveProvider, stripeProvider, validateAmount } from "../lib/payments";
import { CURRENCIES, DEFAULT_RATES } from "../stores/currencyStore";

test("프리셋: 통화마다 5개, USDT/USD 20·50·100·300·500, KRW 3만·7만·15만·40만·70만", () => {
  for (const c of CURRENCIES) assert.equal(PRESETS[c].length, 5, c);
  assert.deepEqual(PRESETS.USDT, [20, 50, 100, 300, 500]);
  assert.deepEqual(PRESETS.KRW, [30000, 70000, 150000, 400000, 700000]);
  // 어떤 프리셋도 USDT 환산 시 한도 안
  for (const c of CURRENCIES) for (const p of PRESETS[c]) assert.equal(validateAmount(p / DEFAULT_RATES[c]), "ok", `${c} ${p}`);
});

test("PG 선택: KRW → PortOne, USDT/USD → Stripe. 키가 없으면 mock 으로 폴백하되 의도를 보고한다", () => {
  assert.equal(providerFor("KRW"), "portone");
  assert.equal(providerFor("USDT"), "stripe");
  assert.equal(providerFor("USD"), "stripe");
  assert.equal(stripeProvider.configured(), false);
  assert.equal(portoneProvider.configured(), false);
  const r = resolveProvider("KRW");
  assert.equal(r.intended, "portone");
  assert.equal(r.fellBack, true);
  assert.equal(r.provider.key, "mock");
});

test("미설정 PG 는 조용히 성공하지 않고 명시적으로 던진다", async () => {
  await assert.rejects(() => stripeProvider.checkout({ amount: 50, currency: "USD", amountUsdt: 50, locale: "en" }), /Stripe/);
  await assert.rejects(() => portoneProvider.checkout({ amount: 70000, currency: "KRW", amountUsdt: 50.72, locale: "ko" }), /PortOne/);
});

test("한도: 10 USDT 미만·5,000 초과·비수치 거부", () => {
  assert.equal(MIN_CARD_USDT, 10);
  assert.equal(MAX_CARD_USDT, 5000);
  assert.equal(validateAmount(9.99), "min");
  assert.equal(validateAmount(5000.01), "max");
  assert.equal(validateAmount(NaN), "nan");
  assert.equal(validateAmount(0), "nan");
  assert.equal(validateAmount(10), "ok");
});

test("데모 결제: 승인 시 거래 id·카드 마스킹, 끝자리 13 은 거절", async () => {
  const ok = await mockProvider.checkout({ amount: 50, currency: "USDT", amountUsdt: 50, locale: "en" });
  assert.equal(ok.ok, true);
  assert.match(ok.transactionId, /^mock_[0-9a-f]{16}$/);
  assert.equal(ok.cardMask, "**** 4242");
  const bad = await mockProvider.checkout({ amount: 113, currency: "USDT", amountUsdt: 113, locale: "en" });
  assert.equal(bad.ok, false);
  assert.equal(bad.reason, "card_declined");
});
