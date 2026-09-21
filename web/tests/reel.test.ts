// 룰렛 스트립 수학 — 결과 칸이 인디케이터 아래에 서는지
import test from "node:test";
import assert from "node:assert/strict";
import { BOXES, dropTable } from "../lib/products";
import { REEL_EASE, REEL_LENGTH, REEL_TARGET_INDEX, buildStrip, indexUnderMarker, offsetForTarget } from "../lib/reel";

test("스펙 상수: 80~100칸, cubic-bezier 감속, target 이 끝에서 떨어져 있다", () => {
  assert.ok(REEL_LENGTH >= 80 && REEL_LENGTH <= 100);
  assert.deepEqual(REEL_EASE, [0.12, 0.8, 0.33, 1]);
  assert.ok(REEL_TARGET_INDEX < REEL_LENGTH - 3);
});

test("스트립은 target 에 결과를 심고 나머지는 확률표에서 뽑는다", () => {
  const b = BOXES[0];
  const items = dropTable(b);
  const result = items[items.length - 1];
  let x = 0.1;
  const rand = () => (x = (x + 0.6180339887) % 1);
  const strip = buildStrip(result, items, rand);
  assert.equal(strip.length, REEL_LENGTH);
  assert.equal(strip[REEL_TARGET_INDEX].id, result.id);
  const ids = new Set(items.map((i) => i.id));
  for (const s of strip) assert.ok(ids.has(s.id));
  assert.throws(() => buildStrip(result, items, rand, 10, 10));
});

test("쇼케이스 타일은 감속 구간에만 심기고 결과 칸은 그대로다", async () => {
  const { SHOWCASE_OFFSETS } = await import("../lib/reel");
  const b = BOXES[0];
  const items = dropTable(b);
  const result = items[items.length - 1];
  const high = items.slice(0, 2);
  let x = 0.37;
  const rand = () => (x = (x + 0.6180339887) % 1);
  const strip = buildStrip(result, items, rand, undefined, undefined, high);
  assert.equal(strip[REEL_TARGET_INDEX].id, result.id);
  for (const off of SHOWCASE_OFFSETS) assert.ok(high.some((h) => h.id === strip[REEL_TARGET_INDEX - off].id), `offset ${off}`);
  assert.ok(SHOWCASE_OFFSETS.every((o) => o >= 6 && o <= 40));
});

test("정지 오프셋에서 인디케이터 아래 칸은 항상 target (뷰포트·지터 무관)", () => {
  for (const viewportWidth of [320, 640, 960, 1280, 1920]) {
    for (const jitter of [-0.5, -0.2, 0, 0.3, 0.5]) {
      const layout = { tileWidth: 148, gap: 10, viewportWidth };
      const x = offsetForTarget(layout, REEL_TARGET_INDEX, jitter);
      assert.ok(x < 0);
      assert.equal(indexUnderMarker(layout, x), REEL_TARGET_INDEX, `vw=${viewportWidth} jitter=${jitter}`);
    }
  }
});
