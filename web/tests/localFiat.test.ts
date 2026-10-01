// /about 의 현지 통화 병기 — 표시 전용 환산이 통화별로 정확히 나오는지
//   npm test
import test from "node:test";
import assert from "node:assert/strict";
import { FIAT_BY_LOCALE, FIAT_SPEC, formatFiat, formatFiatCompact } from "../lib/localFiat";
import { DEFAULT_RATES } from "../stores/currencyStore";
import { MIN_ENTRY_USDT, totalJackpotValueUsdt } from "../lib/aboutStats";

test("로케일마다 읽히는 통화가 하나씩 정해져 있다", () => {
  assert.equal(FIAT_BY_LOCALE.ko, "KRW");
  assert.equal(FIAT_BY_LOCALE.en, "USD");
  assert.equal(FIAT_BY_LOCALE.zh, "CNY");
});

test("KRW 환율은 통화 스토어와 같은 값을 쓴다 — 두 군데서 갈리지 않는다", () => {
  assert.equal(FIAT_SPEC.KRW.rate, DEFAULT_RATES.KRW);
  assert.equal(FIAT_SPEC.USD.rate, DEFAULT_RATES.USD);
});

test("전체 표기: 1 USDT → ₩1,380 / $1 / ¥7", () => {
  assert.equal(formatFiat(1, "KRW"), "₩1,380");
  assert.equal(formatFiat(1, "USD"), "$1");
  assert.equal(formatFiat(1, "CNY"), "¥7");
  assert.equal(formatFiat(95, "KRW"), "₩131,100");
});

test("축약 표기: 만·억(KRW) / 万·亿(CNY) / K·M(USD)", () => {
  assert.equal(formatFiatCompact(455714, "KRW"), "₩6.3억");
  assert.equal(formatFiatCompact(455714, "USD"), "$455.7K");
  assert.equal(formatFiatCompact(455714, "CNY"), "¥324万");
  // 만 단위에도 천 단위 구분이 들어간다
  assert.equal(formatFiatCompact(15600, "KRW"), "₩2,153만");
  // 작은 금액은 축약하지 않는다
  assert.equal(formatFiatCompact(1, "KRW"), "₩1,380");
  assert.equal(formatFiatCompact(1, "USD"), "$1");
});

test("한 통화 안에서 다른 통화 기호가 섞이지 않는다", () => {
  const others: Record<string, RegExp[]> = {
    KRW: [/\$/, /¥/],
    USD: [/₩/, /¥/],
    CNY: [/₩/, /\$/],
  };
  for (const [fiat, res] of Object.entries(others)) {
    for (const v of [0, 1, 20, 455714, MIN_ENTRY_USDT, totalJackpotValueUsdt()]) {
      const full = formatFiat(v, fiat as "KRW");
      const compact = formatFiatCompact(v, fiat as "KRW");
      for (const re of res) {
        assert.doesNotMatch(full, re, `${fiat} ${v}: ${full}`);
        assert.doesNotMatch(compact, re, `${fiat} ${v}: ${compact}`);
      }
    }
  }
});

test("최소 시작 금액은 카탈로그에서 가장 싼 박스 가격이다", () => {
  assert.equal(MIN_ENTRY_USDT, 1);
});
