// 택배사 배송조회 링크 + 모의 운송장
import test from "node:test";
import assert from "node:assert/strict";
import { CARRIERS, isValidTrackingNumber, mockTrackingNumber, pickCarrier, trackingUrl } from "../lib/carriers";

test("국내(KR)는 CJ대한통운, 해외는 DHL", () => {
  assert.equal(pickCarrier("KR"), "CJ");
  assert.equal(pickCarrier("US"), "DHL");
  assert.equal(pickCarrier("CN"), "DHL");
});

test("모의 운송장은 택배사 형식에 맞고 공식 조회 URL 에 삽입된다", () => {
  for (const key of Object.keys(CARRIERS) as (keyof typeof CARRIERS)[]) {
    const no = mockTrackingNumber(key, 7);
    assert.ok(isValidTrackingNumber(key, no), `${key}: ${no}`);
    assert.ok(trackingUrl(key, no).includes(no), key);
    assert.ok(/^https:\/\//.test(trackingUrl(key, no)));
  }
  assert.ok(trackingUrl("CJ", "123456789012").startsWith("https://www.cjlogistics.com/"));
  assert.ok(trackingUrl("EPOST", "1234567890123").startsWith("https://service.epost.go.kr/"));
  assert.ok(trackingUrl("DHL", "1234567890").startsWith("https://www.dhl.com/"));
  assert.ok(trackingUrl("FEDEX", "123456789012").startsWith("https://www.fedex.com/"));
});
