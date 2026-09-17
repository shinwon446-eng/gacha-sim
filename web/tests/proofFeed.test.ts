// 실지급/실배송 모의 피드 — 형식 계약
import test from "node:test";
import assert from "node:assert/strict";
import { RESERVE, buildPayoutFeed, buildShipmentFeed, maskUserId } from "../lib/proofFeed";
import { isValidTxHash } from "../lib/withdrawal";
import { isValidTrackingNumber } from "../lib/carriers";
import { looksLikeAddress } from "../lib/depositAddress";
import { BOX_BY_SLUG } from "../lib/products";

const BASE = Date.UTC(2026, 8, 17, 12, 0, 0);

test("지급 피드: 박스 존재, TxID 형식, 시각은 base 이전, 결정적", () => {
  const a = buildPayoutFeed(BASE);
  assert.ok(a.length >= 6);
  for (const p of a) {
    assert.ok(BOX_BY_SLUG[p.boxSlug], p.boxSlug);
    assert.ok(isValidTxHash(p.network, p.txHash), p.txHash);
    assert.ok(new Date(p.at).getTime() < BASE);
    assert.ok(p.amountUsdt > 0);
    assert.match(p.user, /^u_[0-9a-f]{4}…[0-9a-f]{2}$/);
  }
  assert.deepEqual(buildPayoutFeed(BASE), a);
});

test("배송 피드: 박스·아이템 존재, 택배사 운송장 형식, 3개 국어 마스킹", () => {
  for (const s of buildShipmentFeed(BASE)) {
    const box = BOX_BY_SLUG[s.boxSlug];
    assert.ok(box, s.boxSlug);
    assert.ok(box.items.some((i) => i.id === s.itemId), s.itemId);
    assert.ok(isValidTrackingNumber(s.carrier, s.trackingNumber), `${s.carrier} ${s.trackingNumber}`);
    for (const loc of ["ko", "en", "zh"] as const) {
      assert.ok(s.recipient[loc].includes("*"), `${loc} 마스킹`);
      assert.ok(s.region[loc].length > 0);
    }
  }
});

test("지급 준비금: 최소 500,000 USDT, 보유량 ≥ 최소, 리저브 주소는 TRC-20 형식", () => {
  assert.equal(RESERVE.minUsdt, 500_000);
  assert.ok(RESERVE.balanceUsdt >= RESERVE.minUsdt);
  assert.ok(looksLikeAddress("TRC20", RESERVE.address));
  assert.ok(RESERVE.explorerUrl(RESERVE.address).startsWith("https://tronscan.org/#/address/"));
  assert.equal(maskUserId("u_3f9c12ab"), "u_3f…ab");
});
