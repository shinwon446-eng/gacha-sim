// Google OTP (TOTP) — RFC 6238 공식 테스트 벡터로 구현이 표준과 같은지 검증한다.
// 이게 통과해야 실제 Google Authenticator 앱이 보여 주는 코드와 일치한다.
//   npm test
import test from "node:test";
import assert from "node:assert/strict";
import {
  TOTP_DIGITS,
  TOTP_PERIOD_SEC,
  base32Decode,
  base32Encode,
  groupSecret,
  hotp,
  newTotpSecret,
  otpauthUri,
  totpCounter,
  totpNow,
  totpSecondsRemaining,
  verifyTotp,
} from "../lib/totp";

/** RFC 6238 Appendix B 의 SHA-1 시드 "12345678901234567890" 을 Base32 로 옮긴 값 */
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

test("Base32 왕복 — RFC 6238 시드가 정확히 복원된다", () => {
  const seed = new TextEncoder().encode("12345678901234567890");
  assert.equal(base32Encode(seed), RFC_SECRET);
  assert.deepEqual(Array.from(base32Decode(RFC_SECRET)), Array.from(seed));
  // 사람이 옮겨 적은 형태(공백·소문자·패딩)도 받아들인다
  assert.deepEqual(Array.from(base32Decode("gezd gnbv gy3t qojq gezd gnbv gy3t qojq")), Array.from(seed));
  assert.deepEqual(Array.from(base32Decode("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ====")), Array.from(seed));
});

test("Base32 는 잘못된 문자를 거절한다", () => {
  for (const bad of ["", "ABC1", "!!!!", "0189"]) assert.throws(() => base32Decode(bad), /invalid base32/, bad);
});

test("RFC 6238 Appendix B 테스트 벡터 (SHA-1, 8자리)", async () => {
  const vectors: [number, string][] = [
    [59, "94287082"],
    [1111111109, "07081804"],
    [1111111111, "14050471"],
    [1234567890, "89005924"],
    [2000000000, "69279037"],
    [20000000000, "65353130"],
  ];
  for (const [seconds, expected] of vectors) {
    const code = await hotp(RFC_SECRET, Math.floor(seconds / TOTP_PERIOD_SEC), 8);
    assert.equal(code, expected, `T=${seconds}`);
  }
});

test("6자리 코드는 같은 벡터의 뒤 6자리다", async () => {
  assert.equal(await totpNow(RFC_SECRET, 59_000), "287082");
  assert.equal(await totpNow(RFC_SECRET, 1111111109_000), "081804");
});

test("검증은 ±30초(한 칸)까지만 통과시킨다", async () => {
  const at = 1111111109_000;
  const code = await totpNow(RFC_SECRET, at);
  assert.equal(await verifyTotp(RFC_SECRET, code, at), true);
  // 앞뒤 한 칸은 통과
  assert.equal(await verifyTotp(RFC_SECRET, code, at + TOTP_PERIOD_SEC * 1000), true);
  assert.equal(await verifyTotp(RFC_SECRET, code, at - TOTP_PERIOD_SEC * 1000), true);
  // 두 칸은 거절 — 무한정 유효하면 관문이 아니다
  assert.equal(await verifyTotp(RFC_SECRET, code, at + TOTP_PERIOD_SEC * 2000), false);
  assert.equal(await verifyTotp(RFC_SECRET, code, at - TOTP_PERIOD_SEC * 2000), false);
});

test("형식이 틀린 입력은 계산 없이 거절한다 — '6자리면 통과' 같은 관문이 아니다", async () => {
  const at = 1111111109_000;
  for (const bad of ["", "12345", "1234567", "abcdef", "12 34 56", "000000"]) {
    if (bad === (await totpNow(RFC_SECRET, at))) continue;
    assert.equal(await verifyTotp(RFC_SECRET, bad, at), false, bad);
  }
});

test("otpauth URI 는 Google Authenticator 규격을 따른다", () => {
  const uri = otpauthUri({ secret: RFC_SECRET, account: "voila_a3f91" });
  assert.ok(uri.startsWith("otpauth://totp/VOILA:voila_a3f91?"), uri);
  const params = new URLSearchParams(uri.slice(uri.indexOf("?") + 1));
  assert.equal(params.get("secret"), RFC_SECRET);
  assert.equal(params.get("issuer"), "VOILA");
  assert.equal(params.get("algorithm"), "SHA1");
  assert.equal(params.get("digits"), String(TOTP_DIGITS));
  assert.equal(params.get("period"), String(TOTP_PERIOD_SEC));
  // 계정에 구분자가 들어가도 라벨이 깨지지 않는다
  assert.ok(otpauthUri({ secret: RFC_SECRET, account: "a:b c" }).includes("VOILA:a%3Ab%20c"));
});

test("새 시크릿은 매번 다르고 Base32 로 디코딩된다", () => {
  const made = Array.from({ length: 20 }, () => newTotpSecret());
  assert.equal(new Set(made).size, made.length, "시크릿이 중복 생성된다");
  for (const s of made) {
    assert.match(s, /^[A-Z2-7]{16}$/);
    assert.ok(base32Decode(s).length > 0);
  }
  assert.equal(groupSecret("ABCDEFGHIJKLMNOP"), "ABCD EFGH IJKL MNOP");
});

test("카운터와 남은 시간", () => {
  assert.equal(totpCounter(59_000), 1);
  assert.equal(totpCounter(60_000), 2);
  assert.equal(totpSecondsRemaining(0), 30);
  assert.equal(totpSecondsRemaining(29_000), 1);
  assert.equal(totpSecondsRemaining(30_000), 30);
});
