// 등급 체계 무결성 테스트 — 가치(Value) 축 단일화
//   npm test
import test from "node:test";
import assert from "node:assert/strict";
import { BOXES, dropTable, isValueGuaranteed } from "../lib/products";
import {
  TIERS,
  TIER_BY_KEY,
  boxFloorTier,
  boxTopTier,
  breakEvenRate,
  formatMultiple,
  glow,
  tierBreakdown,
  tierIndex,
  tierOf,
  topMultiple,
} from "../lib/tiers";

test("등급은 4단계이며 배수 내림차순, 최하위가 0 에서 닫힌다", () => {
  assert.equal(TIERS.length, 4);
  assert.deepEqual(TIERS.map((t) => t.key), ["dream", "highend", "pro", "standard"]);
  for (let i = 1; i < TIERS.length; i++) {
    assert.ok(TIERS[i].minMultiple < TIERS[i - 1].minMultiple, `${TIERS[i].key}`);
  }
  assert.equal(TIERS[TIERS.length - 1].minMultiple, 0, "최하위가 0 에서 닫히지 않으면 미분류가 생긴다");
  assert.equal(Object.keys(TIER_BY_KEY).length, TIERS.length);
});

test("승인된 등급 색이 그대로 쓰인다", () => {
  assert.equal(TIER_BY_KEY.dream.accent, "#FF4655");
  assert.equal(TIER_BY_KEY.highend.accent, "#FFD700");
  assert.equal(TIER_BY_KEY.pro.accent, "#00D2FF");
  assert.equal(TIER_BY_KEY.standard.accent, "#A0AEC0");
  for (const t of TIERS) {
    assert.match(t.accent, /^#[0-9A-F]{6}$/i, `${t.key} accent`);
    assert.match(t.deep, /^#[0-9A-F]{6}$/i, `${t.key} deep`);
  }
});

test("glow 는 hex 를 rgba 로 정확히 변환한다", () => {
  assert.equal(glow("#FF4655", 0.5), "rgba(255, 70, 85, 0.5)");
  assert.equal(glow("#000000", 1), "rgba(0, 0, 0, 1)");
});

test("tierOf 는 경계값에서 상위 등급을 택한다", () => {
  const price = 100000;
  assert.equal(tierOf(2000000, price).key, "dream"); // 20배
  assert.equal(tierOf(1999999, price).key, "highend");
  assert.equal(tierOf(600000, price).key, "highend"); // 6배
  assert.equal(tierOf(200000, price).key, "pro"); // 2배
  assert.equal(tierOf(199999, price).key, "standard");
  assert.equal(tierOf(0, price).key, "standard");
  // 가격이 0 이어도 미분류로 떨어지지 않는다
  assert.equal(tierOf(1000000, 0).key, "standard");
});

test("tierIndex 는 상위 등급이 더 작다", () => {
  assert.ok(tierIndex("dream") < tierIndex("highend"));
  assert.ok(tierIndex("highend") < tierIndex("pro"));
  assert.ok(tierIndex("pro") < tierIndex("standard"));
});

test("박스마다 등급 분포 합계는 정확히 100, 빈 구간 없음", () => {
  for (const b of BOXES) {
    const slices = tierBreakdown(b);
    const sum = slices.reduce((s, x) => s + x.rate, 0);
    assert.ok(Math.abs(sum - 100) < 1e-3, `${b.slug}: 합 ${sum}`);
    assert.ok(slices.every((s) => s.count > 0 && s.rate > 0), `${b.slug}: 빈 구간 포함`);
  }
});

test("등급 분포는 상위부터 내림차순이며 중복이 없다", () => {
  for (const b of BOXES) {
    const order = tierBreakdown(b).map((s) => tierIndex(s.tier.key));
    assert.deepEqual(order, [...order].sort((x, y) => x - y), b.slug);
    assert.equal(new Set(order).size, order.length, `${b.slug}: 등급 중복`);
  }
});

test("보장 박스가 아닌 모든 박스는 최소 2개 등급에 걸쳐 있다", () => {
  for (const b of BOXES) {
    if (isValueGuaranteed(b)) continue;
    assert.ok(tierBreakdown(b).length >= 2, `${b.slug}: 등급 ${tierBreakdown(b).length}개`);
  }
});

test("boxTopTier / boxFloorTier 가 실제 최고·최저 항목과 일치한다", () => {
  for (const b of BOXES) {
    const table = dropTable(b);
    assert.equal(boxTopTier(b).key, tierOf(table[0].value, b.price).key, b.slug);
    assert.equal(boxFloorTier(b).key, tierOf(b.guaranteedMin, b.price).key, b.slug);
    assert.ok(Math.abs(topMultiple(b) - table[0].value / b.price) < 1e-9, b.slug);
  }
});

test("보장 박스는 최저 등급이 STANDARD 이상이고, 일반 박스는 STANDARD 다", () => {
  for (const b of BOXES) {
    const floor = boxFloorTier(b);
    if (isValueGuaranteed(b)) {
      // 최저가가 오픈가 이상이므로 배수 1 이상 — STANDARD 구간 안쪽이지만 0 배는 아니다
      assert.ok(b.guaranteedMin / b.price >= 1, `${b.slug}: 배수 ${b.guaranteedMin / b.price}`);
    } else {
      assert.equal(floor.key, "standard", `${b.slug}: 최저 등급 ${floor.label}`);
    }
  }
});

test("모든 박스에 PRO 이상 등급이 존재한다 — 상위 구성이 없는 박스는 없다", () => {
  for (const b of BOXES) {
    assert.ok(
      tierIndex(boxTopTier(b).key) <= tierIndex("pro"),
      `${b.slug}: 최고 등급 ${boxTopTier(b).label} (${topMultiple(b).toFixed(1)}배)`,
    );
  }
});

test("본전 이상 확률은 0 이상 100 미만이며 실제 항목 합계와 같다", () => {
  for (const b of BOXES) {
    const r = breakEvenRate(b);
    const manual = b.items.filter((i) => i.value >= b.price).reduce((s, i) => s + i.dropRate, 0);
    assert.ok(Math.abs(r - manual) < 1e-3, `${b.slug}: ${r} vs ${manual}`);
    assert.ok(r >= 0 && r <= 100, `${b.slug}: ${r}`);
  }
});

test("보장 박스의 본전 이상 확률은 정확히 100", () => {
  for (const b of BOXES) {
    if (!isValueGuaranteed(b)) continue;
    assert.ok(Math.abs(breakEvenRate(b) - 100) < 1e-3, `${b.slug}: ${breakEvenRate(b)}`);
  }
});

test("formatMultiple 은 자리수에 따라 소수를 접는다", () => {
  assert.equal(formatMultiple(4.72), "4.7배");
  assert.equal(formatMultiple(12.46), "12배");
  assert.equal(formatMultiple(1650.4), "1650배");
});
