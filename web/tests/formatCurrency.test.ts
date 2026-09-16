// 단일 통화 표시 엔진 — 혼용 0건
//   npm test
import test from "node:test";
import assert from "node:assert/strict";
import { formatCurrency, formatCurrencyCompact, convertFromUsdt } from "../lib/formatCurrency";
import { DEFAULT_RATES, CURRENCIES } from "../stores/currencyStore";

test("스펙 예시 그대로: 80 USDT → 80.00 USDT / $80.00 / ₩110,400", () => {
  assert.equal(formatCurrency(80, "USDT"), "80.00 USDT");
  assert.equal(formatCurrency(80, "USD"), "$80.00");
  assert.equal(formatCurrency(80, "KRW"), "₩110,400");
});

test("환율: 1 USDT = 1.00 USD = 1,380 KRW", () => {
  assert.equal(DEFAULT_RATES.USDT, 1);
  assert.equal(DEFAULT_RATES.USD, 1);
  assert.equal(DEFAULT_RATES.KRW, 1380);
  assert.equal(convertFromUsdt(1, "KRW"), 1380);
});

test("쉼표·소수점 규칙: USDT/USD 2자리, KRW 0자리", () => {
  assert.equal(formatCurrency(1234567.891, "USDT"), "1,234,567.89 USDT");
  assert.equal(formatCurrency(0.5, "USD"), "$0.50");
  assert.equal(formatCurrency(0.5, "KRW"), "₩690");
  assert.equal(formatCurrency(95700, "KRW"), "₩132,066,000");
});

test("어떤 통화를 골라도 다른 통화의 기호·단위가 섞이지 않는다", () => {
  const markers: Record<string, RegExp> = { USDT: /USDT/, USD: /\$/, KRW: /₩/ };
  const samples = [0, 0.01, 7, 80, 999.99, 58, 95700, 1234567];
  for (const c of CURRENCIES) {
    for (const n of samples) {
      const out = formatCurrency(n, c);
      const compact = formatCurrencyCompact(n, c);
      for (const [other, re] of Object.entries(markers)) {
        if (other === c) {
          assert.match(out, re, `${c} ${n}: 자기 기호 누락 → ${out}`);
        } else {
          assert.doesNotMatch(out, re, `${c} ${n}: ${other} 기호 혼용 → ${out}`);
          assert.doesNotMatch(compact, re, `${c} ${n}: compact 에 ${other} 혼용 → ${compact}`);
        }
      }
      // 기호는 정확히 한 번
      assert.equal((out.match(markers[c]) ?? []).length, 1, `${c} ${n}: 기호 중복 → ${out}`);
    }
  }
});

test("compact 표기도 통화 하나로만", () => {
  assert.equal(formatCurrencyCompact(12900, "USDT"), "12.9K USDT");
  assert.equal(formatCurrencyCompact(1250000, "USD"), "$1.25M");
  assert.equal(formatCurrencyCompact(1000, "KRW"), "₩138만");
  assert.equal(formatCurrencyCompact(80, "USD"), "$80.00");
});
