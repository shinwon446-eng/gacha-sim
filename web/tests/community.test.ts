// 커뮤니티 후기 모의 데이터 — 참조 무결성·인증 형식·3개 국어
import test from "node:test";
import assert from "node:assert/strict";
import { REVIEW_BONUS_USDT, buildReviews } from "../lib/community";
import { BOX_BY_SLUG } from "../lib/products";
import { isValidTrackingNumber } from "../lib/carriers";
import { isValidTxHash } from "../lib/withdrawal";

test("후기 보너스 10 USDT, 모든 후기가 유효한 박스·아이템·운송장·(선택) TxID 를 가진다", () => {
  assert.equal(REVIEW_BONUS_USDT, 10);
  const rs = buildReviews(Date.UTC(2026, 8, 18));
  assert.ok(rs.length >= 6);
  let onchain = 0;
  for (const r of rs) {
    const box = BOX_BY_SLUG[r.boxSlug];
    assert.ok(box && box.items.some((i) => i.id === r.itemId), `${r.boxSlug}/${r.itemId}`);
    assert.ok(isValidTrackingNumber(r.proof.carrier, r.proof.trackingNumber));
    if (r.proof.txHash) {
      onchain++;
      assert.ok(isValidTxHash(r.proof.network!, r.proof.txHash));
    }
    assert.ok(r.rating >= 1 && r.rating <= 5);
    assert.match(r.user, /\*\*\*/);
    for (const loc of ["ko", "en", "zh"] as const) assert.ok(r.text[loc].length >= 10);
  }
  assert.ok(onchain >= 3);
});
