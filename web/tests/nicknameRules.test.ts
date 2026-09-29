import assert from "node:assert/strict";
import test from "node:test";
import { NICKNAME_CHANGE_INTERVAL_MS, canChangeNickname, containsForbiddenNicknameWord, validateNewNickname } from "../lib/nicknameRules";

const now = Date.UTC(2026, 0, 15, 12, 0, 0);

test("first nickname and elapsed cooldown can be changed", () => {
  assert.deepEqual(canChangeNickname(null, now), { allowed: true, remainingDays: 0, nextAvailableAt: null });
  assert.equal(canChangeNickname(now - NICKNAME_CHANGE_INTERVAL_MS, now).allowed, true);
});

test("nickname cooldown gives a rounded-up remaining-day count", () => {
  const result = canChangeNickname(now - (NICKNAME_CHANGE_INTERVAL_MS - 25 * 60 * 60 * 1000), now);
  assert.equal(result.allowed, false);
  assert.equal(result.remainingDays, 2);
  assert.equal(result.nextAvailableAt, new Date(now + 25 * 60 * 60 * 1000).toISOString());
});

test("nickname validation normalizes, constrains and blocks reserved words", () => {
  assert.deepEqual(validateNewNickname("  사용자_01  "), { valid: true });
  assert.deepEqual(validateNewNickname("한"), { valid: false, reason: "format" });
  assert.deepEqual(validateNewNickname("same", "same"), { valid: false, reason: "same" });
  assert.deepEqual(validateNewNickname("VOILA_member"), { valid: false, reason: "forbidden" });
  assert.deepEqual(validateNewNickname("porn_user"), { valid: false, reason: "forbidden" });
  assert.deepEqual(validateNewNickname("열두글자닉네임12"), { valid: true });
  assert.deepEqual(validateNewNickname("열세글자인닉네임12345"), { valid: false, reason: "format" });
  assert.equal(containsForbiddenNicknameWord("관리자님"), true);
  assert.equal(containsForbiddenNicknameWord("nude-name"), true);
  assert.equal(containsForbiddenNicknameWord("Member-01"), false);
});
