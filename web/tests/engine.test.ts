// 엔진 단위/통계 테스트 — Node 내장 러너 (타입 스트리핑 사용, Node 22.18+ / 24)
//   npm test
import test from "node:test";
import assert from "node:assert/strict";
import {
  runPulls,
  lineProbWith,
  effectiveItems,
  tierFor,
  isBoosterActive,
  pickWeightedAdjusted,
  BOOSTER_THRESHOLD,
  BOOST_MULT,
} from "../lib/engine";
import { getBox, BOXES } from "../lib/data";
import { itemLine, lineOf, LINE_ORDER, REFUND_RATE } from "../lib/types";
import { lineProbabilities, topItem } from "../lib/rng";
import { CATALOG, computeGuaranteedMin, weightSum } from "../lib/catalog";
import { COPY, LOCALES } from "../lib/i18n";

const box = getBox("overclock-battle-station");

/** 재현 가능한 난수 (xorshift) */
function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

test("모든 박스의 가중치 합이 100", () => {
  for (const b of BOXES) {
    const sum = b.items.reduce((s, i) => s + i.weight, 0);
    assert.ok(Math.abs(sum - 100) < 1e-6, `${b.id} 가중치 합 ${sum}`);
  }
});

test("라인업은 실판매가에서 결정적으로 파생된다", () => {
  assert.equal(lineOf(99990), "jackpot");
  assert.equal(lineOf(700), "jackpot");
  assert.equal(lineOf(699), "value");
  assert.equal(lineOf(100), "value");
  assert.equal(lineOf(99), "start");
});

test("모든 박스가 3개 라인업을 모두 포함한다", () => {
  for (const b of BOXES) {
    const lines = new Set(b.items.map(itemLine));
    for (const l of LINE_ORDER) assert.ok(lines.has(l), `${b.id} 에 ${l} 없음`);
  }
});

test("라인별 확률 합이 100%", () => {
  for (const b of BOXES) {
    const p = lineProbabilities(b);
    const sum = p.jackpot + p.value + p.start;
    assert.ok(Math.abs(sum - 100) < 1e-6, `${b.id} 합 ${sum}`);
  }
});

test("부스터: 10회 도달 시 활성화, 발동 후 0으로 리셋", () => {
  // RNG 분포가 아니라 상태 머신을 검증한다. 항상 마지막(최저가) 항목을 뽑아
  // [초대박] 자연 당첨에 의한 리셋을 배제하고 게이지 누적만 관찰한다.
  const rand = () => 0.999999;
  let state = { pityCount: 0, totalSpent: 0 };
  const seen: number[] = [];
  let firedAt = -1;

  for (let i = 0; i < 11; i++) {
    const r = runPulls(box, 1, state, rand);
    state = { pityCount: r.pityCount, totalSpent: 0 };
    seen.push(r.pityCount);
    if (r.boosterTriggered && firedAt < 0) firedAt = i;
  }
  assert.equal(seen[9], BOOSTER_THRESHOLD, "10번째 개봉 후 게이지 만충");
  assert.equal(isBoosterActive(seen[9]), true);
  assert.equal(firedAt, 10, "11번째 개봉에서 부스터 발동");
  assert.equal(seen[10], 0, "발동 후 게이지 리셋");
});

test("부스터: [초대박 라인업] 가중치가 정확히 5배", () => {
  const base = effectiveItems(box.items, { boost: false, tierMult: 1 });
  const boosted = effectiveItems(box.items, { boost: true, tierMult: 1 });
  for (let i = 0; i < base.length; i++) {
    const expected = itemLine(base[i].item) === "jackpot" ? base[i].w * BOOST_MULT : base[i].w;
    assert.equal(boosted[i].w, expected, base[i].item.id);
  }
});

test("부스터: 확률 상승 — 가중치 5배이므로 확률 배율은 5배 미만", () => {
  const b = lineProbWith(box, "jackpot", { boost: false, tierMult: 1 });
  const a = lineProbWith(box, "jackpot", { boost: true, tierMult: 1 });
  assert.ok(a > b, "부스트 시 확률 상승");
  assert.ok(a / b < BOOST_MULT, `실제 배율 ${(a / b).toFixed(2)}x 는 ${BOOST_MULT}배 미만이어야 한다`);
});

test("등급 배율: 누적 결제액에 따라 Bronze→VIP", () => {
  assert.equal(tierFor(0).name, "Bronze");
  assert.equal(tierFor(300).name, "Silver");
  assert.equal(tierFor(1000).name, "Gold");
  assert.equal(tierFor(5000).name, "VIP");
  assert.ok(tierFor(5000).mult > tierFor(0).mult);
});

test("통계: 부스트 표본의 [초대박] 출현율이 공시 확률과 일치 (N=200k)", () => {
  const N = 200_000;
  const rate = (boost: boolean) => {
    const rand = seeded(boost ? 7 : 13);
    let hit = 0;
    for (let i = 0; i < N; i++) {
      if (itemLine(pickWeightedAdjusted(box.items, { boost, tierMult: 1 }, rand)) === "jackpot") hit++;
    }
    return hit / N;
  };
  const base = rate(false);
  const boosted = rate(true);
  const expected = lineProbWith(box, "jackpot", { boost: true, tierMult: 1 }) / 100;
  assert.ok(boosted > base, `base=${(base * 100).toFixed(2)}% boosted=${(boosted * 100).toFixed(2)}%`);
  assert.ok(Math.abs(boosted - expected) < 0.01, `기대 ${(expected * 100).toFixed(2)}% vs 실측 ${(boosted * 100).toFixed(2)}%`);
});

test("데모 노출 상품은 데모 박스의 1등 상품이며 [초대박 라인업]이다", () => {
  const demo = getBox("black-label-apex-tech");
  const prize = topItem(demo);
  assert.equal(itemLine(prize), "jackpot");
  assert.equal(prize.value, Math.max(...demo.items.map((i) => i.value)));
});

// ── 카탈로그 무결성 ──────────────────────────────────────

test("카탈로그: 3개 시리즈, 박스마다 가중치 합 100", () => {
  assert.equal(CATALOG.length, 3);
  for (const b of CATALOG) {
    assert.ok(Math.abs(weightSum(b) - 100) < 1e-9, `${b.id} 가중치 합 ${weightSum(b)}`);
  }
});

test("카탈로그: guaranteed_min_value 가 실제 최저 실판매가와 일치", () => {
  for (const b of CATALOG) {
    assert.equal(b.guaranteed_min_value, computeGuaranteedMin(b), b.id);
  }
});

test("카탈로그: probability_pct 가 weight 에서 파생되고 합이 100", () => {
  for (const b of CATALOG) {
    for (const e of b.probability_table) assert.equal(e.probability_pct, e.weight, e.item_id);
    const sum = b.probability_table.reduce((s, e) => s + e.probability_pct, 0);
    assert.ok(Math.abs(sum - 100) < 1e-9, `${b.id} 공시 확률 합 ${sum}`);
  }
});

test("카탈로그: 필수 메타데이터가 전부 채워져 있다", () => {
  for (const b of CATALOG) {
    for (const f of ["id", "name_en", "name_zh", "image_placeholder"] as const) {
      assert.ok(String(b[f]).length > 0, `${b.id}.${f}`);
    }
    assert.ok(b.price_usd > 0, `${b.id}.price_usd`);
    assert.match(b.image_placeholder, /^[A-Z0-9]{2,6}(-[A-Z0-9]{1,5})?$/, `${b.id} 애셋 코드 형식`);
    for (const e of b.probability_table) {
      assert.ok(e.name_en.length > 0 && e.name_zh.length > 0, `${e.item_id} 다국어 상품명`);
      assert.ok(e.cert.length > 0, `${e.item_id}.cert`);
      assert.match(e.image_placeholder, /^[A-Z0-9]{2,6}(-[A-Z0-9]{1,5})?$/, `${e.item_id} 애셋 코드 형식`);
    }
  }
});

test("카탈로그: 최저 보장가 회수액이 가격을 넘지 않는다 (무위험 차익 금지)", () => {
  for (const b of CATALOG) {
    const worstCaseReclaim = b.guaranteed_min_value * REFUND_RATE;
    assert.ok(
      worstCaseReclaim < b.price_usd,
      `${b.id}: 최악의 결과도 ${worstCaseReclaim.toFixed(2)} 회수 > 가격 ${b.price_usd} — 무위험 차익`,
    );
  }
});

test("카탈로그: item_id 전역 고유", () => {
  const ids = CATALOG.flatMap((b) => b.probability_table.map((e) => e.item_id));
  assert.equal(new Set(ids).size, ids.length);
});

// ── 카피 사전 ────────────────────────────────────────────

test("카피 사전: 지정 문자열이 정확히 일치한다", () => {
  assert.equal(COPY.boxOpen.en, "UNLOCK SEQUENCE");
  assert.equal(COPY.boxOpen.zh, "开启盲盒");
  assert.equal(COPY.reclaimValue.en, "RECLAIM VALUE");
  assert.equal(COPY.reclaimValue.zh, "即时回收");
  assert.equal(COPY.requestDispatch.en, "REQUEST DISPATCH");
  assert.equal(COPY.requestDispatch.zh, "申请发货");
  assert.equal(COPY.probabilityIndex.en, "PROBABILITY INDEX");
  assert.equal(COPY.probabilityIndex.zh, "公开概率公示");
  assert.equal(
    COPY.withdrawalWarning.en,
    "Assets sent to an incompatible network or incorrect address cannot be recovered.",
  );
  assert.equal(
    COPY.withdrawalWarning.zh,
    "请核对主网协议与提现地址。若因信息填写错误导致资产丢失，平台概无法找回。",
  );
});

test("카피 사전: 모든 키가 전 로케일을 채우고 이모지가 없다", () => {
  // 서로게이트 페어(성상 평면) + 주요 BMP 이모지 블록.
  // 소스 파일 자체가 ASCII 로 남도록 문자열에서 RegExp 를 만든다 (이모지 전수 검사 자체가 걸리지 않게).
  const emoji = new RegExp("[\\uD83C-\\uDBFF][\\uDC00-\\uDFFF]|[\\u2600-\\u27BF\\u2B00-\\u2BFF\\uFE0F]");
  for (const [key, dict] of Object.entries(COPY)) {
    for (const loc of LOCALES) {
      const v = dict[loc];
      assert.ok(typeof v === "string" && v.length > 0, `${key}.${loc} 누락`);
      assert.ok(!emoji.test(v), `${key}.${loc} 에 이모지 포함: ${v}`);
    }
  }
});

test("10연속 개봉은 정확히 10개를 반환한다", () => {
  const r = runPulls(box, 10, { pityCount: 0, totalSpent: 0 }, seeded(99));
  assert.equal(r.items.length, 10);
});
