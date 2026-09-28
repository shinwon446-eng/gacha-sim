// 인증 — 번호 포맷·마스킹·공급자 설정 여부, 그리고 "로그아웃이 지갑을 건드리지 않는다"
//   npm test
import test from "node:test";
import assert from "node:assert/strict";
import {
  DIAL_BY_LOCALE,
  OTP_LENGTH,
  PHONE_SPECS,
  anyProviderConfigured,
  digitsOnly,
  formatPhone,
  isPhoneComplete,
  localHandle,
  maskPhone,
  newLocalOtp,
  providerConfigured,
  specFor,
} from "../lib/auth";

test("숫자만 쳐도 국가별 하이픈이 붙는다", () => {
  assert.equal(formatPhone("01012345678", "+82"), "010-1234-5678");
  assert.equal(formatPhone("0212345678", "+82"), "021-234-5678"); // 10자리는 3-3-4 로 끊는다
  assert.equal(formatPhone("4155550132", "+1"), "415-555-0132");
  assert.equal(formatPhone("13800138000", "+86"), "138-0013-8000");
  assert.equal(formatPhone("9012345678", "+81"), "90-1234-5678");
});

test("입력 중에도 끊기고, 자릿수를 넘기면 잘라낸다", () => {
  assert.equal(formatPhone("010", "+82"), "010");
  assert.equal(formatPhone("0101", "+82"), "010-1");
  assert.equal(formatPhone("010123456789999", "+82"), "010-1234-5678");
  // 이미 하이픈이 있어도 다시 넣어도 같은 결과
  assert.equal(formatPhone("010-1234-5678", "+82"), "010-1234-5678");
});

test("완성 판정은 그 국가의 유효 자릿수에서만 참", () => {
  assert.equal(isPhoneComplete("010-1234-5678", "+82"), true);
  assert.equal(isPhoneComplete("021-234-5678", "+82"), true); // 10자리도 유효
  assert.equal(isPhoneComplete("010-1234-56", "+82"), false); // 9자리는 어느 형식에도 안 맞는다
  assert.equal(isPhoneComplete("415-555-0132", "+1"), true);
  assert.equal(isPhoneComplete("415-555-013", "+1"), false);
});

test("마스킹은 앞 그룹과 뒤 4자리만 남긴다 — 가운데는 복원 불가", () => {
  assert.equal(maskPhone("01012345678", "+82"), "010-****-5678");
  assert.equal(maskPhone("4155550132", "+1"), "415-****-0132");
  assert.equal(maskPhone("9012345678", "+81"), "90-****-5678");
  const masked = maskPhone("01098765432", "+82");
  assert.ok(!masked.includes("9876"), `가운데 자리가 남았다: ${masked}`);
});

test("빠른 입력 번호는 실제 사용자의 번호가 아니다 — 0 으로 채워진 자리", () => {
  for (const s of PHONE_SPECS) {
    assert.equal(isPhoneComplete(s.quickFill, s.dial), true, `${s.dial} quickFill 자릿수`);
    const tail = digitsOnly(s.quickFill).slice(-4);
    assert.match(tail, /^(0000|0100)$/, `${s.dial} 는 예약/비실사용 번호여야 한다: ${s.quickFill}`);
  }
});

test("로케일마다 기본 국가번호가 정해져 있고 전부 선택지 안에 있다", () => {
  for (const [loc, dial] of Object.entries(DIAL_BY_LOCALE)) {
    assert.ok(
      PHONE_SPECS.some((s) => s.dial === dial),
      `${loc} 기본값 ${dial} 가 선택지에 없다`,
    );
    assert.equal(specFor(dial).dial, dial);
  }
  // 모르는 국가번호는 첫 선택지로 폴백한다
  assert.equal(specFor("+999").dial, PHONE_SPECS[0].dial);
});

test("공급자 키가 없으면 실계정이 아니다 — 화면이 이 값을 보고 로컬 세션을 고지한다", () => {
  // 테스트 환경에는 NEXT_PUBLIC_* 키가 없다
  assert.equal(providerConfigured("google"), false);
  assert.equal(providerConfigured("apple"), false);
  assert.equal(providerConfigured("phone"), false);
  assert.equal(anyProviderConfigured(), false);
});

test("로컬 OTP 는 상수가 아니라 매번 새로 만든다 — 실서버에 박힌 코드가 남지 않는다", () => {
  const made = Array.from({ length: 40 }, () => newLocalOtp());
  assert.ok(new Set(made).size > 1, "매번 같은 코드가 나온다");
  for (const c of made) assert.match(c, new RegExp(`^\\d{${OTP_LENGTH}}$`));
});

test("계정 식별명은 안정적이고 개인정보를 담지 않는다", () => {
  assert.equal(localHandle("google:2026-09-28"), localHandle("google:2026-09-28"));
  assert.notEqual(localHandle("google:a"), localHandle("google:b"));
  assert.match(localHandle("seed"), /^voila_[0-9a-z]{1,6}$/);
});

test("로그아웃은 지갑·보관함 persist 키를 건드리지 않는다", async () => {
  // 인증 스토어는 자기 키(voila-auth-v1)만 쓴다. 지갑/보관함은 gachaflix.* 로 분리돼 있다.
  const src = await import("node:fs").then((fs) => fs.readFileSync(new URL("../stores/authStore.ts", import.meta.url), "utf8"));
  assert.ok(src.includes('name: "voila-auth-v1"'), "persist 키가 voila-auth-v1 이어야 한다");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  assert.ok(!code.includes("gachaflix."), "인증 스토어가 지갑·보관함 키를 참조하면 안 된다");
  assert.ok(!/useWalletStore|useInventoryStore/.test(src), "인증 스토어가 지갑·보관함 스토어를 import 하면 안 된다");
});
