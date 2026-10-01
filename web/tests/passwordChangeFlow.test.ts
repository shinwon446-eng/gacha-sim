import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { AccountActionError, AccountError, accountRequest, changeAccountPasswordWithOtp, confirmAccountClosureWithCode, getAccountSession, getPasswordChangeStatus, sendClosureVerificationCode, sendPasswordChangeOtpCode, sendPasswordUnlockCode, unlockPasswordChangeWithCode, verifyCurrentPassword, type ServerAccount } from "../lib/account";
import { browserAccountRequest } from "../lib/browserAccount";
import { useAuthStore } from "../stores/authStore";
import { totpNow, verifyTotp } from "../lib/totp";

const ACCOUNTS = "voila.browser-accounts.v1";
const SESSION = "voila.browser-session.v1";
const current = "Original-password-123";
const next = "Replacement-password-456";
const wrongCode = (code: string) => code === "000000" ? "000001" : "000000";
const reason = (expected: string) => (cause: unknown) => cause instanceof AccountActionError && cause.reason === expected;
async function withBrowser(run: (storage: Map<string, string>) => Promise<void>) {
  const savedStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const savedWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) } });
  // Account transport uses the same browser adapter as the production client.
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  try { await run(values); }
  finally {
    if (savedStorage) Object.defineProperty(globalThis, "localStorage", savedStorage); else Reflect.deleteProperty(globalThis, "localStorage");
    if (savedWindow) Object.defineProperty(globalThis, "window", savedWindow); else Reflect.deleteProperty(globalThis, "window");
    useAuthStore.getState().clearSession();
  }
}
async function login(email = "owner@example.test", password = current) {
  const result = await browserAccountRequest("/auth/login", { email, password });
  useAuthStore.getState().acceptSession(result.user as ServerAccount);
  return result.user as ServerAccount;
}

test("current password hashes are verified, failures persist, fifth failure locks even correct credentials", () => withBrowser(async storage => {
  const user = await login();
  for (let i = 1; i <= 5; i++) {
    const result = await verifyCurrentPassword("incorrect");
    assert.equal(result.matched, false); assert.equal(result.failures, i); assert.equal(result.locked, i === 5);
    assert.equal((await getAccountSession()).passwordFailures, i);
  }
  assert.equal((await getPasswordChangeStatus()).locked, true);
  assert.equal((await verifyCurrentPassword(current)).matched, false);
  const c = await sendPasswordUnlockCode();
  assert.match(c.browserCode!, /^\d{6}$/);
  await assert.rejects(unlockPasswordChangeWithCode(wrongCode(c.browserCode!)), reason("code_invalid"));
  assert.equal((await getPasswordChangeStatus()).failures, 5);
  await assert.rejects(sendPasswordUnlockCode(), reason("resend_wait"));
  assert.equal((await unlockPasswordChangeWithCode(c.browserCode!)).unlocked, true);
  assert.equal((await getPasswordChangeStatus()).failures, 0);
  await assert.rejects(unlockPasswordChangeWithCode(c.browserCode!), reason("verification_required"));
  await assert.rejects(changeAccountPasswordWithOtp(current, next, "123456"), reason("verification_required"), "unlock does not authorize a password change");
  assert.equal((await verifyCurrentPassword(current)).matched, true);
  assert.ok(!storage.get(ACCOUNTS)!.includes(current), "plaintext password is never persisted");
  assert.equal((await getAccountSession()).id, user.id);
}));

test("fallback OTP must exactly match, new-password rules apply, completion revokes sessions and proofs", () => withBrowser(async storage => {
  const user = await login();
  await verifyCurrentPassword(current);
  await assert.rejects(changeAccountPasswordWithOtp(current, "short", "123456"), reason("password_invalid"));
  await assert.rejects(changeAccountPasswordWithOtp(current, current, "123456"), reason("password_reused"));
  await assert.rejects(changeAccountPasswordWithOtp(current, "a".repeat(129), "123456"), reason("password_invalid"));
  const c = await sendPasswordChangeOtpCode();
  await assert.rejects(changeAccountPasswordWithOtp(current, next, wrongCode(c.browserCode!)), reason("code_invalid"));
  const records = JSON.parse(storage.get(ACCOUNTS)!);
  records[0].proofs = [{ authorization: "old-withdrawal-proof", method: "2FA_OTP", draft: "[]", expiresAt: Date.now() + 100000 }];
  records[0].reset = { token: "old-reset-token", expiresAt: Date.now() + 100000 };
  records[0].setup = { id: "old-setup", secret: "A".repeat(16) };
  records[0].signupPending = true;
  storage.set(ACCOUNTS, JSON.stringify(records));
  const result = await changeAccountPasswordWithOtp(current, next, c.browserCode!);
  assert.equal(result.changed, true); assert.equal(result.sessionsRevoked, true);
  assert.equal(storage.get(SESSION), undefined);
  await assert.rejects(getAccountSession());
  const updated = JSON.parse(storage.get(ACCOUNTS)!)[0];
  assert.deepEqual(updated.proofs, []); assert.deepEqual(updated.accountCodes, {});
  assert.equal(updated.reset, undefined); assert.equal(updated.setup, undefined); assert.equal(updated.passwordVerifiedUntil, undefined);
  assert.equal(updated.signupPending, false);
  assert.equal(JSON.parse(storage.get("voila.account-revocation.v1")!).accountId, user.id);
  assert.equal(updated.user.sessionVersion, 1);
  assert.notEqual(updated.passwordHash, records[0].passwordHash);
  await assert.rejects(browserAccountRequest("/auth/login", { email: user.email, password: current }));
  assert.equal((await login(user.email, next)).id, user.id);
  await assert.rejects(browserAccountRequest("/withdraw", { authorization: "old-withdrawal-proof", requestId: "replay" }));
  await assert.rejects(changeAccountPasswordWithOtp(next, current, c.browserCode!), reason("verification_required"));
}));

test("enabled Google OTP validates real TOTP rather than accepting any six digits", () => withBrowser(async () => {
  await login();
  const setup = await browserAccountRequest("/account/security/totp/setup", {});
  await browserAccountRequest("/account/security/totp/enable", { setupId: setup.setupId, code: "123456" });
  assert.equal((await verifyCurrentPassword(current)).twoFactorEnabled, true);
  await assert.rejects(sendPasswordChangeOtpCode(), reason("verification_required"));
  await assert.rejects(changeAccountPasswordWithOtp(current, next, "not-six-digits"));
  let invalid = "000000";
  while (await verifyTotp(String(setup.secret), invalid)) invalid = String(Number(invalid) + 1).padStart(6, "0");
  await assert.rejects(changeAccountPasswordWithOtp(current, next, invalid), reason("code_invalid"));
  const valid = await totpNow(String(setup.secret));
  assert.equal((await changeAccountPasswordWithOtp(current, next, valid)).changed, true);
}));

test("Google, Apple and Microsoft providers persist and cannot enter any password mutation route", () => withBrowser(async () => {
  for (const provider of ["google", "apple", "microsoft"] as const) {
    const result = await browserAccountRequest("/auth/oauth/start", { provider });
    const user = result.user as ServerAccount;
    useAuthStore.getState().acceptSession(user);
    assert.equal(user.provider, provider); assert.equal(useAuthStore.getState().user?.provider, provider);
    assert.equal((await getAccountSession()).provider, provider);
    assert.equal((await getPasswordChangeStatus()).provider, provider);
    await assert.rejects(verifyCurrentPassword(current), reason("social_account"));
    await assert.rejects(sendPasswordUnlockCode(), reason("social_account"));
    await assert.rejects(changeAccountPasswordWithOtp(current, next, "123456"), reason("social_account"));
  }
}));

test("codes expire, stop after five errors and cannot cross purpose or account boundaries", () => withBrowser(async storage => {
  const user = await login();
  for (let i = 0; i < 5; i++) await verifyCurrentPassword("wrong");
  const unlock = await sendPasswordUnlockCode();
  for (let i = 1; i <= 5; i++) await assert.rejects(unlockPasswordChangeWithCode(wrongCode(unlock.browserCode!)), reason(i === 5 ? "code_attempts_exceeded" : "code_invalid"));
  await assert.rejects(unlockPasswordChangeWithCode(unlock.browserCode!), reason("code_attempts_exceeded"));
  const records = JSON.parse(storage.get(ACCOUNTS)!);
  records[0].accountCodes.password_unlock.resendAt = 0;
  storage.set(ACCOUNTS, JSON.stringify(records));
  const fresh = await sendPasswordUnlockCode();
  const expiring = JSON.parse(storage.get(ACCOUNTS)!); expiring[0].accountCodes.password_unlock.expiresAt = Date.now() - 1;
  storage.set(ACCOUNTS, JSON.stringify(expiring));
  await assert.rejects(unlockPasswordChangeWithCode(fresh.browserCode!), reason("code_expired"));
  await login("another@example.test");
  await assert.rejects(browserAccountRequest("/account/password/unlock", { accountId: user.id, code: fresh.browserCode }), (cause: unknown) => cause instanceof AccountError && cause.code === "credentials");
  await assert.rejects(unlockPasswordChangeWithCode(fresh.browserCode!), reason("verification_required"));
  const closure = await sendClosureVerificationCode();
  await assert.rejects(unlockPasswordChangeWithCode(closure.browserCode!), reason("verification_required"));
}));

test("closure rechecks balances and holdings at confirmation and revokes the session on success", () => withBrowser(async storage => {
  const user = await login();
  const walletKey = `voila.browser-wallet.${user.id}`;
  const inventoryKey = `voila.browser-inventory.${user.id}`;
  storage.set(walletKey, JSON.stringify({ state: { cryptoBalance: 0, cardBalance: 1, balance: 1, transactions: [] } }));
  await assert.rejects(sendClosureVerificationCode(), reason("assets_remaining"));
  storage.set(walletKey, JSON.stringify({ state: { cryptoBalance: 0, cardBalance: 0, balance: 0, transactions: [] } }));
  const c = await sendClosureVerificationCode();
  storage.set(inventoryKey, JSON.stringify({ state: { items: [{ status: "IN_STORAGE" }] } }));
  await assert.rejects(confirmAccountClosureWithCode(c.browserCode!), reason("assets_remaining"));
  storage.set(inventoryKey, JSON.stringify({ state: { items: [{ status: "SOLD" }] } }));
  await assert.rejects(confirmAccountClosureWithCode(wrongCode(c.browserCode!)), reason("code_invalid"));
  assert.equal((await confirmAccountClosureWithCode(c.browserCode!)).deleted, true);
  assert.equal(storage.get(SESSION), undefined); assert.deepEqual(JSON.parse(storage.get(ACCOUNTS)!), []);
  await assert.rejects(confirmAccountClosureWithCode(c.browserCode!));
}));

test("nickname timestamp alias works in both directions and failed counts cannot cross accounts", () => withBrowser(async () => {
  const user = await login();
  const changed = await browserAccountRequest("/account/profile", { nickname: "NicknameOne" });
  const profile = changed.user as ServerAccount;
  assert.equal(profile.nicknameUpdatedAt, profile.nicknameChangedAt);
  useAuthStore.getState().acceptSession({ ...user, nicknameUpdatedAt: "2026-09-01T00:00:00Z", nicknameChangedAt: undefined });
  assert.equal(useAuthStore.getState().user?.nicknameChangedAt, "2026-09-01T00:00:00Z");
  await login("other@example.test");
  useAuthStore.getState().setPasswordFailures(user.id, 5);
  assert.equal(useAuthStore.getState().user?.passwordFailures, 0);
}));

test("HTTP password and closure routes preserve cookie/CSRF contract and typed errors", async () => {
  const calls: string[] = [];
  const server = createServer(async (req, res) => {
    calls.push(req.url!); res.setHeader("Content-Type", "application/json");
    if (req.url === "/auth/csrf") { res.end(JSON.stringify({ token: "server-issued-csrf-token" })); return; }
    assert.equal(req.headers["x-csrf-token"], "server-issued-csrf-token");
    const parts: Buffer[] = []; for await (const part of req) parts.push(Buffer.from(part));
    const body = JSON.parse(Buffer.concat(parts).toString());
    assert.equal(body.accountId, "account-1");
    res.statusCode = 423; res.end(JSON.stringify({ code: "password_locked", failures: 5 }));
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    await assert.rejects(accountRequest("/account/password/change", { accountId: "account-1", currentPassword: current, newPassword: next, otpCode: "123456" }, `http://127.0.0.1:${(server.address() as AddressInfo).port}`), (cause: unknown) => cause instanceof AccountActionError && cause.reason === "password_locked" && cause.failures === 5);
    assert.deepEqual(calls, ["/auth/csrf", "/account/password/change"]);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
