import test from "node:test";
import assert from "node:assert/strict";
import { AccountError, accountRequest, closureReadiness, validAuthBase, validEmail, validPassword } from "../lib/account";
import { validateNewNickname } from "../lib/nicknameRules";

const empty = { cryptoBalance: 0, cardBalance: 0, items: [], transactions: [] };
test("closure requires both funding buckets to settle, including cancelling offsets", () => {
  assert.equal(closureReadiness(empty).eligible, true);
  assert.equal(closureReadiness({ ...empty, cryptoBalance: 1 }).eligible, false);
  assert.equal(closureReadiness({ ...empty, cardBalance: 2 }).eligible, false);
  assert.equal(closureReadiness({ ...empty, cryptoBalance: 1, cardBalance: -1 }).eligible, false);
  assert.equal(closureReadiness({ ...empty, cryptoBalance: NaN }).eligible, false);
});
test("closure preserves completed history and blocks assets and pending shipments", () => {
  for (const status of ["IN_STORAGE", "SHIPPING_REQUESTED", "SHIPPING", "UNKNOWN"]) assert.equal(closureReadiness({ ...empty, items: [{ status }] }).eligible, false, status);
  assert.equal(closureReadiness({ ...empty, items: [{ status: "DELIVERED" }, { status: "SOLD" }] }).eligible, true);
  for (const status of ["PENDING", "PENDING_ADMIN_REVIEW", "BROADCASTING"]) assert.equal(closureReadiness({ ...empty, transactions: [{ type: "withdraw", status }] }).eligible, false);
  assert.equal(closureReadiness({ ...empty, transactions: [{ type: "withdraw", status: "COMPLETED" }] }).eligible, true);
});
test("account configuration rejects cleartext remote services and credentials in URLs", () => {
  for (const url of ["", "http://example.org", "https://a:b@example.org", "https://example.org#key", "https://example.org?key=1", "javascript:alert(1)"]) assert.equal(validAuthBase(url), "");
  assert.equal(validAuthBase("https://accounts.example.org/api/"), "https://accounts.example.org/api");
  assert.equal(validAuthBase("http://localhost:3001/"), "http://localhost:3001");
});
test("email and password boundaries", () => {
  assert.equal(validEmail("someone@example.com"), true);
  assert.equal(validEmail("someone @example.com"), false);
  assert.equal(validPassword("12345678901"), false);
  assert.equal(validPassword("long-unique-password"), true);
  assert.equal(validPassword("a".repeat(129)), false);
});
test("nickname availability rules require 2–12 Korean or English letters and numbers", () => {
  assert.deepEqual(validateNewNickname("SunnyUser"), { valid: true });
  assert.deepEqual(validateNewNickname("가나다12"), { valid: true });
  assert.deepEqual(validateNewNickname("a_1"), { valid: false, reason: "format" });
  assert.deepEqual(validateNewNickname("관리자닉"), { valid: false, reason: "forbidden" });
  assert.deepEqual(validateNewNickname("SameName", "samename"), { valid: false, reason: "same" });
});
test("unconfigured account calls never make a request or report success", async () => {
  await assert.rejects(accountRequest("/auth/signup", {}, ""), (error: unknown) => error instanceof AccountError && error.code === "unavailable");
});
test("mutations require server CSRF and cookie credentials, not client-generated identity", async () => {
  const previous = globalThis.fetch;
  const calls: { url: string; init?: RequestInit }[] = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return Response.json(calls.length === 1 ? { token: "server-issued-csrf-token" } : { accepted: true });
  };
  try {
    assert.deepEqual(await accountRequest("/auth/password/reset-request", { email: "person@example.org" }, "https://account.example.org"), { accepted: true });
    assert.equal(calls[0].url, "https://account.example.org/auth/csrf");
    assert.equal(calls[1].init?.credentials, "include");
    assert.equal(calls[1].init?.method, "POST");
    assert.equal((calls[1].init?.headers as Record<string, string>)["X-CSRF-Token"], "server-issued-csrf-token");
  } finally { globalThis.fetch = previous; }
});
test("server errors and invalid CSRF do not submit a mutation", async () => {
  const previous = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return Response.json({}); };
  try {
    await assert.rejects(accountRequest("/account/closure", {}, "https://account.example.org"), (error: unknown) => error instanceof AccountError && error.code === "invalid");
    assert.equal(calls, 1);
    globalThis.fetch = async () => new Response("", { status: 409 });
    await assert.rejects(accountRequest("/account/closure", undefined, "https://account.example.org"), (error: unknown) => error instanceof AccountError && error.code === "conflict");
    globalThis.fetch = async () => Response.json(null);
    await assert.rejects(accountRequest("/auth/session", undefined, "https://account.example.org"), (error: unknown) => error instanceof AccountError && error.code === "invalid");
  } finally { globalThis.fetch = previous; }
});
