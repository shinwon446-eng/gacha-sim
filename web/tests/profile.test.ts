import test from "node:test";
import assert from "node:assert/strict";
import { nicknameIssue, nicknameKey, nextNicknameChangeAt, NICKNAME_CHANGE_INTERVAL_MS, validAvatarData, validAvatarUrl } from "../lib/profilePolicy";
import { AccountError, ProfileError, accountRequest, type ServerAccount } from "../lib/account";
import { browserAccountRequest, startBrowserAccount } from "../lib/browserAccount";

test("nickname policy preserves multilingual names and rejects offensive, reserved and invisible forms", () => {
  for (const value of ["하늘_별", "Alice-20", "王小明", "さくら", "José", "Scunthorpe", "Yoshito"]) assert.equal(nicknameIssue(value), null, value);
  assert.equal(nicknameKey(" Ａlice "), nicknameKey("alice"));
  for (const value of ["시_발", "씨발123", "ㅅㅂ", "ＦＵＣＫ", "f_u_c_k", "f4ggot", "傻逼"]) assert.equal(nicknameIssue(value), "nickname_prohibited", value);
  for (const value of ["Admin", "admin_12", "운영자123", "voila_official", "고객센터"]) assert.equal(nicknameIssue(value), "nickname_reserved", value);
  for (const value of ["a b", "a\u200Bb", "a\u202Eb", "a😀", "<script>"]) assert.equal(nicknameIssue(value), "nickname_format", value);
  assert.equal(nicknameIssue("a"), "nickname_length");
  assert.equal(nicknameIssue("가".repeat(20)), null);
  assert.equal(nicknameIssue("가".repeat(21)), "nickname_length");
});

test("avatar contract excludes scriptable, external upload input and oversized content", () => {
  assert.equal(validAvatarData("data:image/jpeg;base64,/9j/AA=="), true);
  for (const value of ["data:image/svg+xml;base64,AAA", "javascript:alert(1)", "https://example.test/a.png", "data:image/png;base64,AAAA", "data:image/jpeg;base64,/9j/" + "A".repeat(350000)]) assert.equal(validAvatarData(value), false);
  assert.equal(validAvatarUrl("https://cdn.example.test/avatar.jpg"), true);
  assert.equal(validAvatarUrl("http://example.test/avatar.jpg"), false);
  assert.equal(validAvatarUrl("https://user:pass@example.test/a.jpg"), false);
});

test("profile service enforces duplicate and cooldown checks independently of UI, including exact 14-day boundary", async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => memory.set(key, value), removeItem: (key: string) => memory.delete(key) } });
  const originalNow = Date.now;
  let now = Date.parse("2026-09-01T12:00:00Z");
  Date.now = () => now;
  const failsWith = (reason: string) => (cause: unknown) => cause instanceof ProfileError && cause.reason === reason;
  try {
    const first = await startBrowserAccount();
    assert.equal((await browserAccountRequest("/account/profile/nickname/check", { nickname: "Alice" })).available, true);
    const saved = (await browserAccountRequest("/account/profile", { nickname: "Alice", accountId: first.id })).user as ServerAccount;
    assert.equal(Date.parse(saved.nextNicknameChangeAt!), now + NICKNAME_CHANGE_INTERVAL_MS);
    assert.equal(nextNicknameChangeAt(saved), saved.nextNicknameChangeAt);
    await assert.rejects(browserAccountRequest("/account/profile", { nickname: "Alice2" }), failsWith("nickname_cooldown"));
    assert.equal(((await browserAccountRequest("/account/profile", { nickname: "Alice" })).user as ServerAccount).nicknameChangedAt, saved.nicknameChangedAt);
    await browserAccountRequest("/auth/oauth/start", { provider: "google" });
    assert.equal((await browserAccountRequest("/account/profile/nickname/check", { nickname: "ＡＬＩＣＥ" })).available, false);
    await assert.rejects(browserAccountRequest("/account/profile", { nickname: "alice" }), failsWith("nickname_taken"));
    await assert.rejects(browserAccountRequest("/account/profile", { nickname: "시_발" }), failsWith("nickname_prohibited"));
    await assert.rejects(browserAccountRequest("/account/profile/avatar", { avatar: null, accountId: first.id }), (cause: unknown) => cause instanceof AccountError && cause.code === "credentials");
    await startBrowserAccount();
    const avatar = "data:image/jpeg;base64,/9j/AA==";
    assert.equal(((await browserAccountRequest("/account/profile/avatar", { avatar })).user as ServerAccount).avatarUrl, avatar);
    assert.equal(((await browserAccountRequest("/auth/session")).user as ServerAccount).nicknameChangedAt, saved.nicknameChangedAt, "avatar changes must not reset cooldown");
    assert.equal(((await browserAccountRequest("/account/profile/avatar", { avatar: null })).user as ServerAccount).avatarUrl, null);
    await assert.rejects(browserAccountRequest("/account/profile/avatar", { avatar: "data:image/svg+xml;base64,AAA" }), failsWith("avatar_invalid"));
    now += NICKNAME_CHANGE_INTERVAL_MS - 1;
    await assert.rejects(browserAccountRequest("/account/profile", { nickname: "Alice2" }), failsWith("nickname_cooldown"));
    now++;
    const results = await Promise.allSettled([browserAccountRequest("/account/profile", { nickname: "Alice2" }), browserAccountRequest("/account/profile", { nickname: "Alice3" })]);
    assert.equal(results[0].status, "fulfilled");
    assert.equal(results[1].status, "rejected");
    const restored = (await browserAccountRequest("/auth/session")).user as ServerAccount;
    assert.equal(restored.nickname, "Alice2");
    assert.equal(Date.parse(restored.nextNicknameChangeAt!), now + NICKNAME_CHANGE_INTERVAL_MS);
    const write = localStorage.setItem;
    localStorage.setItem = () => { throw new Error("quota"); };
    await assert.rejects(browserAccountRequest("/account/profile/avatar", { avatar }), failsWith("storage_unavailable"));
    localStorage.setItem = write;
    assert.equal(((await browserAccountRequest("/auth/session")).user as ServerAccount).avatarUrl, null, "failed persistence must not claim an image was saved");
  } finally {
    Date.now = originalNow;
    if (previous) Object.defineProperty(globalThis, "localStorage", previous); else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("HTTP profile errors preserve actionable reason and server unlock date", async () => {
  const previous = globalThis.fetch;
  const next = "2026-10-14T12:00:00Z";
  globalThis.fetch = async url => String(url).endsWith("/auth/csrf") ? Response.json({ token: "server-issued-csrf-token" }) : Response.json({ code: "nickname_cooldown", nextNicknameChangeAt: next }, { status: 409 });
  try {
    await assert.rejects(accountRequest("/account/profile", { nickname: "Changed" }, "https://accounts.example.test"), (cause: unknown) => cause instanceof ProfileError && cause.reason === "nickname_cooldown" && cause.nextChangeAt === next);
  } finally { globalThis.fetch = previous; }
});
