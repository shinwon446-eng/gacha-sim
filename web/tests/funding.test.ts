// 자산 원천 분리 — 차감 계획, 족보 비율, 환급 귀속 (카드깡·세탁 차단의 핵심 수학)
import test from "node:test";
import assert from "node:assert/strict";
import { CARD_ONLY, CRYPTO_ONLY, attributeRefund, attributeRefunds, normalizeRatio, planDebit, sourceOf } from "../lib/funding";

test("암호화폐 잔액을 먼저 소진한다", () => {
  const s = planDebit(30, 100, 50);
  assert.deepEqual(s, { fromCrypto: 30, fromCard: 0, source: "crypto", ratio: { crypto: 1, card: 0 } });
});

test("암호화폐가 모자라면 결합 결제(mixed) 로 비율이 남는다", () => {
  const s = planDebit(100, 60, 40)!;
  assert.equal(s.fromCrypto, 60);
  assert.equal(s.fromCard, 40);
  assert.equal(s.source, "mixed");
  assert.equal(s.ratio.crypto, 0.6);
  assert.equal(s.ratio.card, 0.4);
});

test("암호화폐 잔액이 0 이면 카드 전용 개봉", () => {
  const s = planDebit(25, 0, 25)!;
  assert.equal(s.source, "card");
  assert.deepEqual(s.ratio, { crypto: 0, card: 1 });
});

test("합쳐도 모자라면 차감 계획을 만들지 않는다", () => {
  assert.equal(planDebit(100, 60, 39.99), null);
  assert.equal(planDebit(0, 10, 10), null);
  assert.equal(planDebit(-5, 10, 10), null);
});

test("환급은 족보 비율대로만 — 카드 출처가 암호화폐로 새지 않는다", () => {
  assert.deepEqual(attributeRefund(100, CARD_ONLY), { toCrypto: 0, toCard: 100 });
  assert.deepEqual(attributeRefund(100, CRYPTO_ONLY), { toCrypto: 100, toCard: 0 });
  assert.deepEqual(attributeRefund(100, { crypto: 0.6, card: 0.4 }), { toCrypto: 60, toCard: 40 });
});

test("반올림이 생겨도 환급 합계는 보존된다", () => {
  const { toCrypto, toCard } = attributeRefund(0.85, { crypto: 1 / 3, card: 2 / 3 });
  assert.equal(+(toCrypto + toCard).toFixed(2), 0.85);
  const many = attributeRefunds([
    { amountUsdt: 0.85, ratio: { crypto: 1 / 3, card: 2 / 3 } },
    { amountUsdt: 19.95, ratio: CARD_ONLY },
    { amountUsdt: 4.4, ratio: CRYPTO_ONLY },
  ]);
  assert.equal(+(many.toCrypto + many.toCard).toFixed(2), 25.2);
  assert.ok(many.toCard >= 19.95, "카드 출처 19.95 는 전액 카드 잔액으로");
});

test("원천 라벨", () => {
  assert.equal(sourceOf(CRYPTO_ONLY), "crypto");
  assert.equal(sourceOf(CARD_ONLY), "card");
  assert.equal(sourceOf({ crypto: 0.5, card: 0.5 }), "mixed");
});

test("구버전·손상 기록은 crypto 로 본다", () => {
  assert.deepEqual(normalizeRatio(undefined), CRYPTO_ONLY);
  assert.deepEqual(normalizeRatio({}), CRYPTO_ONLY);
  assert.deepEqual(normalizeRatio({ crypto: 0.25 }), { crypto: 0.25, card: 0.75 });
  assert.deepEqual(normalizeRatio({ crypto: 9 }), CRYPTO_ONLY);
});
