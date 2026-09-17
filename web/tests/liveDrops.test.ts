// 라이브 드랍 티커 — 결정적 생성, 상품 참조 무결성
import test from "node:test";
import assert from "node:assert/strict";
import { LIVE_DROPS_CYCLE_MS, buildLiveDrops, liveDropsClock } from "../lib/liveDrops";
import { BOX_BY_SLUG } from "../lib/products";

test("같은 seed → 같은 티커, 다른 seed → 다른 티커", () => {
  assert.deepEqual(buildLiveDrops(7), buildLiveDrops(7));
  assert.notDeepEqual(buildLiveDrops(7), buildLiveDrops(8));
});

test("모든 이벤트가 유효한 박스·항목을 가리키고 시각은 단조 증가", () => {
  const drops = buildLiveDrops(42);
  assert.ok(drops.length >= 10);
  let prev = -1;
  for (const d of drops) {
    assert.match(d.user, /\*\*\*/, "마스킹");
    assert.ok(d.secondsAgo > prev);
    prev = d.secondsAgo;
    if (d.kind === "cashout") assert.ok((d.amountUsdt ?? 0) > 0);
    else {
      const box = BOX_BY_SLUG[d.boxSlug!];
      assert.ok(box && box.items.some((i) => i.id === d.itemId), `${d.boxSlug}/${d.itemId}`);
    }
  }
});

test("clock: 주기마다 seed 가 1 증가하고 경과 초는 주기 안에 있다", () => {
  const a = liveDropsClock(LIVE_DROPS_CYCLE_MS * 3 + 5000);
  assert.equal(a.seed, 3);
  assert.equal(a.elapsedSec, 5);
  assert.equal(liveDropsClock(LIVE_DROPS_CYCLE_MS * 4).seed, 4);
});
