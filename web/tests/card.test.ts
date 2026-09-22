// 카드 입력 폼 도우미 — 브랜드 감지 · Luhn · 만료일 · 포맷
import test from "node:test";
import assert from "node:assert/strict";
import { CARD_PRESETS_USD, cardMask, cvcValid, detectBrand, expiryValid, formatCardNumber, formatExpiry, holderValid, luhnValid } from "../lib/card";

test("프리셋 $20/$50/$100/$500 (1:1 USDT)", () => {
  assert.deepEqual([...CARD_PRESETS_USD], [20, 50, 100, 500]);
});

test("브랜드 자동 감지 — Visa 4…, Mastercard 51–55 / 2221–2720", () => {
  assert.equal(detectBrand("4242 4242 4242 4242"), "visa");
  assert.equal(detectBrand("5555 5555 5555 4444"), "mastercard");
  assert.equal(detectBrand("2223 0031 2200 3222"), "mastercard");
  assert.equal(detectBrand("3782 822463 10005"), "unknown");
  assert.equal(detectBrand(""), "unknown");
});

test("Luhn · 포맷 · 마스킹", () => {
  assert.ok(luhnValid("4242 4242 4242 4242"));
  assert.ok(luhnValid("5555555555554444"));
  assert.ok(!luhnValid("4242 4242 4242 4241"));
  assert.ok(!luhnValid("1234"));
  assert.equal(formatCardNumber("42424242424242424242"), "4242 4242 4242 4242");
  assert.equal(cardMask("4242424242424242"), "**** 4242");
});

test("만료일 MM/YY 는 이번 달 이후만, CVC 3자리, 소유자 영문", () => {
  const now = new Date(2026, 8, 22);
  assert.equal(formatExpiry("1229"), "12/29");
  assert.ok(expiryValid("12/29", now));
  assert.ok(expiryValid("09/26", now));
  assert.ok(!expiryValid("08/26", now));
  assert.ok(!expiryValid("13/27", now));
  assert.ok(cvcValid("123") && !cvcValid("12") && !cvcValid("1234"));
  assert.ok(holderValid("HONG GILDONG") && !holderValid("홍길동") && !holderValid("A"));
});
