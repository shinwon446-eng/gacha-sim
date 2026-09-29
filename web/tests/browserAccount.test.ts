import test from "node:test";
import assert from "node:assert/strict";
import { browserAccountRequest, startBrowserAccount } from "../lib/browserAccount";
import { totpNow } from "../lib/totp";
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
    const setup = await browserAccountRequest("/account/security/totp/setup", {});
    const code = await totpNow(setup.secret as string);
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
    const proof = await browserAccountRequest("/account/security/withdrawal/email/verify", { ...draft, challengeId: challenge.challengeId, code: challenge.browserCode });
    assert.ok(Number(proof.unlockAt) >= started + HOLD_MS);
    const held = await browserAccountRequest("/withdraw", { ...draft, requestId: "hold-request", authorization: proof.authorization, authMethod: "EMAIL_72H_HOLD" });
    assert.equal(held.status, "PENDING_72H_HOLD");
    assert.equal((await browserAccountRequest(`/withdraw/${held.id}/cancel`, {})).status, "CANCELLED");
    assert.equal((await browserAccountRequest(`/withdraw/${held.id}/cancel`, {})).status, "CANCELLED");
    await assert.rejects(browserAccountRequest("/account/security/withdrawal/email/verify", { ...draft, challengeId: challenge.challengeId, code: challenge.browserCode }));
    await browserAccountRequest("/auth/logout", {});
    await assert.rejects(browserAccountRequest("/account/security"));
    await browserAccountRequest("/auth/signup", { email: "alice@example.test", password: "a-long-unique-password" });
    await browserAccountRequest("/auth/logout", {});
    await assert.rejects(browserAccountRequest("/auth/login", { email: "alice@example.test", password: "wrong-password" }));
    const login = await browserAccountRequest("/auth/login", { email: "alice@example.test", password: "a-long-unique-password" });
    assert.equal((login.user as { local: boolean }).local, true);
    assert.equal((await browserAccountRequest("/account/security")).twoFactorEnabled, false, "another account cannot inherit OTP");
    assert.ok(!Array.from(memory.values()).some(value => value.includes("a-long-unique-password")), "password is never stored in plain text");
    await startBrowserAccount();
    assert.equal((await browserAccountRequest("/account/security")).twoFactorEnabled, true, "returning to the account restores its OTP");
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
