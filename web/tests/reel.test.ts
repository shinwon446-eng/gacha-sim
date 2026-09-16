// 릴 수학 — 결과 칸이 마커 아래에 서는지
import test from "node:test";
import assert from "node:assert/strict";
import { GACHA_ITEMS } from "../src/data/gachaItems";
import { PULL_PRICE_USDT } from "../src/data/gachaRules";
import {
  REEL_DURATION_S,
  REEL_EASE,
  REEL_LENGTH,
  REEL_TARGET_INDEX,
  buildStrip,
  indexUnderMarker,
  maxJackpot,
  offsetForTarget,
} from "../src/data/reel";

test("스펙 상수: 5.5초, cubic-bezier(0.12, 0.8, 0.33, 1)", () => {
  assert.equal(REEL_DURATION_S, 5.5);
  assert.deepEqual(REEL_EASE, [0.12, 0.8, 0.33, 1]);
});

test("스트립은 target 칸에 결과를 심고 나머지는 확률표로 채운다", () => {
  const result = GACHA_ITEMS[0];
  let x = 0.1;
  const rand = () => (x = (x + 0.618) % 1);
  const strip = buildStrip(result, rand);
  assert.equal(strip.length, REEL_LENGTH);
  assert.equal(strip[REEL_TARGET_INDEX].id, result.id);
  assert.ok(REEL_TARGET_INDEX < REEL_LENGTH - 3, "정지 후 오른쪽에 타일이 남아야 한다");
  assert.throws(() => buildStrip(result, rand, 10, 10));
});

test("정지 오프셋에서 마커 아래 칸은 항상 target 이다 (지터·뷰포트 무관)", () => {
  for (const viewportWidth of [320, 640, 960, 1280, 1600]) {
    for (const jitter of [-0.5, -0.2, 0, 0.3, 0.5]) {
      const layout = { tileWidth: 132, gap: 8, viewportWidth };
      const x = offsetForTarget(layout, REEL_TARGET_INDEX, jitter);
      assert.ok(x < 0, "왼쪽으로 이동해야 한다");
      assert.equal(indexUnderMarker(layout, x), REEL_TARGET_INDEX, `vw=${viewportWidth} jitter=${jitter}`);
    }
  }
});

test("MAX JACKPOT 은 최고 가치 항목이며 배수는 가격에서 파생된다", () => {
  const j = maxJackpot(PULL_PRICE_USDT);
  assert.equal(j.item.id, "s-btc-1");
  assert.equal(j.multiple, Math.round(65000 / PULL_PRICE_USDT));
  assert.equal(maxJackpot(20).multiple, 3250);
});
