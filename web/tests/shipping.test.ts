// 실물 배송 규칙 — 휴대폰 포맷·통관 링크·보상 정책
import test from "node:test";
import assert from "node:assert/strict";

// ── 배송 신뢰 패키지
import { COUNTERFEIT_COMPENSATION_MULTIPLE, UNIPASS_URL, formatPhoneKR } from "../lib/shipping";

test("휴대폰 자동 하이픈 — 010-XXXX-XXXX", () => {
  assert.equal(formatPhoneKR("01012345678"), "010-1234-5678");
  assert.equal(formatPhoneKR("010"), "010");
  assert.equal(formatPhoneKR("0101234"), "010-1234");
  assert.equal(formatPhoneKR("0212345678"), "021-234-5678");
  assert.equal(formatPhoneKR("010-1234-5678"), "010-1234-5678", "이미 포맷된 값도 그대로");
  assert.equal(formatPhoneKR("010abc12345678"), "010-1234-5678", "숫자만 추린 뒤 11자리로 자른다");
});

test("유니패스 발급 링크와 보상 배수", () => {
  assert.equal(UNIPASS_URL, "https://unipass.customs.go.kr/csp/persIndex.do");
  assert.equal(COUNTERFEIT_COMPENSATION_MULTIPLE, 3);
});
