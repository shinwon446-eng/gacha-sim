// 실물 상품 데이터셋 무결성 테스트
//   npm test
import test from "node:test";
import assert from "node:assert/strict";
import {
  BOXES,
  BOX_BY_SLUG,
  CATEGORY_FILTERS,
  REFUND_RATE,
  byCategory,
  cashReturn,
  ceilingValue,
  dropTable,
  expectedValue,
  getBoxBySlug,
  guaranteedValue,
  heroBox,
  isValueGuaranteed,
  luxuryAndWatch,
  retailReturn,
  sortBoxes,
  techAndMobility,
  trending,
} from "../lib/products";
import { formatPrice, formatPriceCompact } from "../lib/format";

test("박스 12종 이상, slug 고유", () => {
  assert.ok(BOXES.length >= 12, `박스 ${BOXES.length}종`);
  const slugs = BOXES.map((b) => b.slug);
  assert.equal(new Set(slugs).size, slugs.length, "slug 중복");
  assert.equal(Object.keys(BOX_BY_SLUG).length, BOXES.length);
});

test("박스마다 항목 8종 이상, item id 전역 고유", () => {
  for (const b of BOXES) assert.ok(b.items.length >= 8, `${b.slug}: 항목 ${b.items.length}종`);
  const ids = BOXES.flatMap((b) => b.items.map((i) => i.id));
  assert.equal(new Set(ids).size, ids.length, "item id 중복");
});

test("드롭 확률 합계는 박스마다 정확히 100", () => {
  for (const b of BOXES) {
    const sum = b.items.reduce((s, i) => s + i.dropRate, 0);
    assert.ok(Math.abs(sum - 100) < 1e-6, `${b.slug}: 합 ${sum}`);
    assert.ok(b.items.every((i) => i.dropRate > 0), `${b.slug}: 0 이하 확률 존재`);
  }
});

test("금액은 전부 정수 원이다 — 통화 기호와 소수점은 데이터에 없다", () => {
  for (const b of BOXES) {
    assert.ok(Number.isInteger(b.price), `${b.slug}: price ${b.price}`);
    assert.ok(Number.isInteger(b.guaranteedMin), `${b.slug}: guaranteedMin`);
    for (const i of b.items) assert.ok(Number.isInteger(i.value), `${i.id}: value ${i.value}`);
  }
});

test("현금 회수 기준 무위험 차익이 없다 — EV × 환급률 < 가격", () => {
  for (const b of BOXES) {
    const cash = expectedValue(b) * REFUND_RATE;
    assert.ok(cash < b.price, `${b.slug}: 현금 기대값 ${Math.round(cash)} >= 가격 ${b.price}`);
    assert.ok(cashReturn(b) < 1, `${b.slug}: 현금 회수율 ${cashReturn(b)}`);
  }
});

test("최저 구성을 즉시 환급해도 원금을 넘지 못한다", () => {
  for (const b of BOXES) {
    assert.ok(
      b.guaranteedMin * REFUND_RATE < b.price,
      `${b.slug}: 최저 보장 회수액 ${b.guaranteedMin * REFUND_RATE} >= 가격 ${b.price}`,
    );
  }
});

test("정가 기준 환원율은 0.7 이상 1.25 미만", () => {
  for (const b of BOXES) {
    const r = retailReturn(b);
    assert.ok(r >= 0.7 && r < 1 / REFUND_RATE, `${b.slug}: 환원율 ${r.toFixed(3)}`);
  }
});

test("guaranteedMin 은 항목 최저가에서 파생된다", () => {
  for (const b of BOXES) {
    assert.equal(b.guaranteedMin, Math.min(...b.items.map((i) => i.value)), b.slug);
    assert.equal(ceilingValue(b), Math.max(...b.items.map((i) => i.value)), b.slug);
  }
});

test("보장 박스만 최저가가 오픈가 이상이며, 보장 행은 비어 있지 않다", () => {
  const guaranteed = guaranteedValue();
  assert.ok(guaranteed.length >= 3, `보장 박스 ${guaranteed.length}종`);
  for (const b of BOXES) {
    assert.equal(
      isValueGuaranteed(b),
      b.guaranteedMin >= b.price,
      `${b.slug}: 보장 판정 불일치`,
    );
  }
  for (const b of guaranteed) {
    assert.ok(b.guaranteedMin >= b.price, `${b.slug}: ${b.guaranteedMin} < ${b.price}`);
  }
});

test("4개 행 셀렉터가 전부 채워지고 카테고리 규칙을 지킨다", () => {
  assert.ok(trending().length >= 5);
  assert.deepEqual(
    trending(5)
      .slice(0, 5)
      .map((b) => b.trendingRank),
    [1, 2, 3, 4, 5],
    "TRENDING 앞머리가 순위대로 오지 않음",
  );
  assert.ok(techAndMobility().length >= 4);
  for (const b of techAndMobility()) assert.ok(["tech", "mobility"].includes(b.category), b.slug);
  assert.ok(luxuryAndWatch().length >= 4);
  for (const b of luxuryAndWatch()) assert.ok(["luxury", "watch"].includes(b.category), b.slug);
});

test("히어로 박스는 TRENDING 1위다", () => {
  assert.equal(heroBox().trendingRank, 1);
  assert.ok(heroBox().tagline.length > 10, "히어로 카피 누락");
});

test("카테고리는 필터 목록 안의 값만 쓰고, 필터마다 결과가 있다", () => {
  const keys = CATEGORY_FILTERS.filter((f) => f.key !== "all").map((f) => f.key);
  const allowed = new Set(keys);
  for (const b of BOXES) assert.ok(allowed.has(b.category), `${b.slug}: ${b.category}`);
  for (const k of keys) assert.ok(byCategory(k).length > 0, `빈 카테고리: ${k}`);
  assert.equal(byCategory("all").length, BOXES.length);
});

test("이미지 경로는 데이터가 아니라 productImages 가 쥔다", () => {
  for (const b of BOXES) {
    assert.ok("image" in b && "src" in b.image, b.slug);
    for (const i of b.items) assert.ok("image" in i && "src" in i.image, i.id);
  }
  // 데이터셋 어디에도 URL 문자열이 박혀 있으면 안 된다
  const flat = JSON.stringify(BOXES.map((b) => ({ t: b.tone, g: b.tagline, i: b.items.map((x) => x.code) })));
  assert.ok(!/https?:\/\//.test(flat), "데이터셋에 URL 이 직접 박혀 있다");
});

test("정렬 키가 원본을 변형하지 않고 올바르게 동작한다", () => {
  const before = BOXES.map((b) => b.slug);
  const asc = sortBoxes(BOXES, "price-asc").map((b) => b.price);
  const desc = sortBoxes(BOXES, "price-desc").map((b) => b.price);
  assert.deepEqual(asc, [...asc].sort((a, b) => a - b));
  assert.deepEqual(desc, [...desc].sort((a, b) => b - a));
  assert.deepEqual(BOXES.map((b) => b.slug), before, "원본 배열이 변형됨");
  assert.equal(getBoxBySlug("cybertruck-dream")?.titleEn, "CYBERTRUCK DREAM");
  assert.equal(getBoxBySlug("no-such-box"), undefined);
});

test("dropTable 은 실판매가 내림차순이며 원본을 변형하지 않는다", () => {
  for (const b of BOXES) {
    const order = dropTable(b).map((i) => i.value);
    assert.deepEqual(order, [...order].sort((x, y) => y - x), b.slug);
    assert.equal(b.items.length, order.length);
  }
});

test("formatPrice 는 원화 정수로만 찍는다", () => {
  assert.equal(formatPrice(80000), "₩80,000");
  assert.equal(formatPrice(132000000), "₩132,000,000");
  assert.equal(formatPriceCompact(12900), "₩1.3만");
  assert.equal(formatPriceCompact(1290000), "₩129만");
  assert.equal(formatPriceCompact(132000000), "₩1.3억");
  assert.equal(formatPriceCompact(9900), "₩9,900");
});

test("카피와 데이터에 이모지가 없다", () => {
  const emoji = new RegExp("[\\uD83C-\\uDBFF][\\uDC00-\\uDFFF]|[\\u2600-\\u27BF\\u2B00-\\u2BFF\\uFE0F]");
  const strings: string[] = [];
  for (const b of BOXES) {
    strings.push(b.title, b.titleEn, b.badge, b.slug, b.code, b.tagline);
    for (const i of b.items) strings.push(i.name, i.nameEn, i.code);
  }
  for (const f of CATEGORY_FILTERS) strings.push(f.label);
  for (const s of strings) assert.ok(!emoji.test(s), `이모지 포함: ${s}`);
});

test("이미지 URL 은 https 이며 출처 표기를 동반하고, imageUrl 은 image.src 의 별칭이다", () => {
  let have = 0;
  for (const b of BOXES) {
    assert.equal(b.imageUrl, b.image.src, b.slug);
    for (const x of [b, ...b.items]) {
      assert.equal(x.imageUrl, x.image.src, x.id);
      if (x.image.src) {
        have += 1;
        assert.match(x.image.src, /^https:\/\/(upload|thumb)\.wikimedia\.org\//, `${x.id}: 검증되지 않은 호스트`);
        assert.ok(!x.image.src.includes("?"), `${x.id}: 쿼리 문자열이 붙어 있다`);
        assert.ok(x.image.credit && x.image.credit.length > 8, `${x.id}: 출처 누락`);
        assert.match(x.image.credit!, /CC|Public domain/, `${x.id}: 라이선스 표기 누락`);
      }
    }
  }
  assert.ok(have >= 40, `확보 이미지 ${have}장`);
  // 히어로와 TRENDING 상위는 반드시 이미지가 있어야 한다
  assert.ok(heroBox().image.src, "히어로 이미지 누락");
  for (const b of trending(5)) assert.ok(b.image.src, `${b.slug}: TRENDING 이미지 누락`);
});
