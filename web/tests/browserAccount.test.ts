import test from "node:test";
import assert from "node:assert/strict";
import { browserAccountRequest, startBrowserAccount } from "../lib/browserAccount";
import { HOLD_MS } from "../lib/withdrawHold";

test("default browser account supports signup, password login, nickname, OTP, held withdrawals and cancellation", async () => {
  const memory = new Map<string, string>();
  const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => memory.set(key, value), removeItem: (key: string) => memory.delete(key) };
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  try {
    const quick = await startBrowserAccount();
    assert.equal(quick.local, true);
    assert.equal(quick.emailVerified, false);
    assert.equal((await startBrowserAccount()).id, quick.id);
    const profile = await browserAccountRequest("/account/profile", { nickname: "MyAccount" });
    assert.equal((profile.user as { nickname: string }).nickname, "MyAccount");
    assert.deepEqual(await browserAccountRequest("/account/profile/nickname/check", { nickname: "myaccount" }), { nickname: "myaccount", available: false, reason: "same" });
    assert.deepEqual(await browserAccountRequest("/account/profile/nickname/check", { nickname: "GuideTeam" }), { nickname: "GuideTeam", available: false, reason: "taken" });
    assert.deepEqual(await browserAccountRequest("/account/profile/nickname/check", { nickname: "new_name" }), { nickname: "new_name", available: false, reason: "format" });
    const setup = await browserAccountRequest("/account/security/totp/setup", {});
    assert.match(String(setup.secret), /^[A-Z2-7]{16}$/);
    const code = "123456";
    const enabled = await browserAccountRequest("/account/security/totp/enable", { setupId: setup.setupId, code });
    assert.equal(enabled.twoFactorEnabled, true);
    const draft = { network: "TRC20", address: "T" + "A".repeat(33), amountUsdt: 50 };
    const otp = await browserAccountRequest("/account/security/withdrawal/otp", { ...draft, code });
    const request = { ...draft, requestId: "otp-request", authorization: otp.authorization, authMethod: "2FA_OTP" };
    const tx = await browserAccountRequest("/withdraw", request);
    assert.equal(tx.status, "PENDING");
    assert.equal(tx.txHash, undefined, "never invent an on-chain transaction");
    assert.deepEqual(await browserAccountRequest("/withdraw", request), tx);
    const challenge = await browserAccountRequest("/account/security/withdrawal/email", draft);
    await assert.rejects(browserAccountRequest("/account/security/withdrawal/email/verify", { ...draft, amountUsdt: 60, challengeId: challenge.challengeId, code: challenge.browserCode }));
    const started = Date.now();
    const proof = await browserAccountRequest("/account/security/withdrawal/email/verify", { ...draft, challengeId: challenge.challengeId, code: "111111" });
    assert.ok(Number(proof.unlockAt) >= started + HOLD_MS);
    const held = await browserAccountRequest("/withdraw", { ...draft, requestId: "hold-request", authorization: proof.authorization, authMethod: "EMAIL_72H_HOLD" });
    assert.equal(held.status, "PENDING_72H_HOLD");
    assert.equal((await browserAccountRequest(`/withdraw/${held.id}/cancel`, {})).status, "CANCELLED");
    assert.equal((await browserAccountRequest(`/withdraw/${held.id}/cancel`, {})).status, "CANCELLED");
    await assert.rejects(browserAccountRequest("/account/security/withdrawal/email/verify", { ...draft, challengeId: challenge.challengeId, code: challenge.browserCode }));
    await browserAccountRequest("/auth/logout", {});
    await assert.rejects(browserAccountRequest("/account/security"));
    assert.deepEqual(await browserAccountRequest("/auth/signup", { email: "alice", password: "1" }), { verificationRequired: true });
    await assert.rejects(browserAccountRequest("/auth/session"));
    await browserAccountRequest("/auth/email/resend", { email: "alice" });
    await browserAccountRequest("/auth/email/verify", { email: "alice", code: "654321" });
    await browserAccountRequest("/auth/logout", {});
    const login = await browserAccountRequest("/auth/login", { email: "alice", password: "any-value" });
    assert.equal((login.user as { local: boolean }).local, true);
    assert.deepEqual(await browserAccountRequest("/account/profile/nickname/check", { nickname: "MyAccount" }), { nickname: "MyAccount", available: false, reason: "taken" });
    assert.equal((await browserAccountRequest("/account/security")).twoFactorEnabled, false, "another account cannot inherit OTP");
    assert.ok(!Array.from(memory.values()).some(value => value.includes("any-value")), "password is never stored in plain text");
    await browserAccountRequest("/auth/password/reset-request", { email: "alice" });
    assert.deepEqual(await browserAccountRequest("/auth/password/reset", { email: "alice", code: "000000", password: "2" }), { updated: true });
    await assert.rejects(browserAccountRequest("/auth/password/reset", { email: "alice", code: "000000", password: "3" }), "reset challenge is consumed");
    await browserAccountRequest("/auth/logout", {});
    const unknown = await browserAccountRequest("/auth/login", { email: "new-value", password: "1" });
    assert.equal((unknown.user as { email: string }).email, "new-value", "unknown browser identities can continue");
    for (const provider of ["google", "apple", "microsoft"]) {
      const social = await browserAccountRequest("/auth/oauth/start", { provider });
      assert.equal((social.user as { email: string }).email, provider + "@device.invalid");
    }
    await startBrowserAccount();
    assert.equal((await browserAccountRequest("/account/security")).twoFactorEnabled, true, "returning to the account restores its OTP");
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
