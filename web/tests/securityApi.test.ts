import test from "node:test";
import assert from "node:assert/strict";

test("security and nickname clients require validated server responses and bind withdrawal proofs", async () => {
  process.env.NEXT_PUBLIC_AUTH_API_BASE = "https://account.example.test";
  process.env.NEXT_PUBLIC_API_BASE = "https://wallet.example.test";
  const account = await import("../lib/account");
  const security = await import("../lib/security");
  const { api } = await import("../lib/api");
  const original = globalThis.fetch;
  let response: Record<string, unknown> = {};
  let posted: Record<string, unknown> = {};
  globalThis.fetch = async (url, init) => {
    assert.equal(init?.credentials, "include");
    if (String(url).endsWith("/auth/csrf")) return Response.json({ token: "a-valid-server-csrf-token" });
    if (init?.body) posted = JSON.parse(String(init.body));
    return Response.json(response);
  };
  try {
    const user = { id: "a", email: "alice@example.test", emailVerified: true, createdAt: new Date().toISOString(), nickname: "Alice" };
    response = { user };
    assert.equal((await account.updateAccountNickname(" Alice ")).nickname, "Alice");
    assert.deepEqual(posted, { nickname: "Alice" });
    await assert.rejects(account.updateAccountNickname("!"));
    response = { setupId: "setup-1", secret: "A".repeat(16) };
    await assert.rejects(security.beginTotpSetup());
    response = { setupId: "setup-1", secret: "A".repeat(32) };
    assert.equal((await security.beginTotpSetup()).setupId, "setup-1");
    response = { twoFactorEnabled: true, enabledAt: user.createdAt };
    assert.equal((await security.confirmTotpSetup("setup-1", "123456")).twoFactorEnabled, true);
    assert.deepEqual(posted, { setupId: "setup-1", code: "123456" });
    const draft = { network: "TRC20" as const, address: "T-example", amountUsdt: 50 };
    response = { challengeId: "challenge-1", emailMasked: "al****@example.test", expiresAt: Date.now() + 300000 };
    await security.sendWithdrawalEmail(draft);
    assert.deepEqual(posted, draft, "an arbitrary recovery email must not be submitted");
    const unlockAt = Date.now() + 72 * 3600000;
    response = { authorization: "proof", method: "EMAIL_72H_HOLD", unlockAt, emailMasked: "al****@example.test" };
    const proof = await security.verifyWithdrawalEmail(draft, "challenge-1", "123456");
    assert.equal(proof.unlockAt, unlockAt);
    assert.deepEqual(posted, { ...draft, challengeId: "challenge-1", code: "123456" });
    response = { authorization: "proof", method: "EMAIL_72H_HOLD" };
    await assert.rejects(security.verifyWithdrawalEmail(draft, "challenge-1", "123456"));
    response = { authorization: "proof", method: "2FA_OTP" };
    assert.equal((await security.verifyWithdrawalOtp(draft, "123456")).method, "2FA_OTP");
    response = { id: "withdraw-1", status: "COMPLETED" };
    const request = { ...draft, requestId: "request-1", authorization: "proof", authMethod: "EMAIL_72H_HOLD" as const };
    await assert.rejects(api.withdraw(request), "email authorization cannot skip the hold");
    response = { id: "withdraw-1", status: "PENDING_72H_HOLD", unlockAt };
    assert.equal((await api.withdraw(request)).unlockAt, unlockAt);
    assert.deepEqual(posted, request);
  } finally { globalThis.fetch = original; }
});
