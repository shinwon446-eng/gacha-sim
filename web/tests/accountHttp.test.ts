import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

test("configured clients complete account and withdrawal contracts over real HTTP without browser fallback", async () => {
  const user = { id: "server-user", email: "owner@example.test", emailVerified: true, createdAt: new Date().toISOString(), nickname: "Owner" };
  const requests: { path: string; body: Record<string, unknown> }[] = [];
  let rejectOtp = false;
  let redirectUrl = "https://accounts.google.com/o/oauth2/v2/auth?state=server-state";
  const unlockAt = Date.now() + 72 * 3600000;
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
    const path = req.url!;
    requests.push({ path, body });
    res.setHeader("Content-Type", "application/json");
    if (req.method === "POST" && req.headers["x-csrf-token"] !== "server-issued-csrf-token") {
      res.writeHead(403).end("{}"); return;
    }
    if (path === "/account/security/withdrawal/otp" && rejectOtp) { res.writeHead(401).end("{}"); return; }
    const responses: Record<string, unknown> = {
      "/auth/csrf": { token: "server-issued-csrf-token" },
      "/auth/signup": { verificationRequired: true },
      "/auth/email/resend": { accepted: true },
      "/auth/email/verify": { user },
      "/auth/login": { user },
      "/auth/session": { user },
      "/auth/logout": { loggedOut: true },
      "/auth/password/reset-request": { accepted: true },
      "/auth/password/reset": { updated: true },
      "/auth/oauth/start": { redirectUrl },
      "/account/profile": { user: { ...user, nickname: body.nickname, nicknameChangedAt: user.createdAt, nextNicknameChangeAt: new Date(Date.parse(user.createdAt) + 14 * 86400000).toISOString() } },
      "/account/profile/nickname/check": { nickname: body.nickname, available: body.nickname !== "TakenName" },
      "/account/profile/avatar": { user: { ...user, avatarUrl: body.avatar === null ? null : "https://cdn.example.test/avatar.jpg" } },
      "/account/security/totp/setup": { setupId: "setup-1", secret: "A".repeat(32) },
      "/account/security/totp/enable": { twoFactorEnabled: true, enabledAt: user.createdAt },
      "/account/security/withdrawal/otp": { authorization: "otp-proof", method: "2FA_OTP" },
      "/account/security/withdrawal/email": { challengeId: "email-1", emailMasked: "ow****@example.test", expiresAt: Date.now() + 300000 },
      "/account/security/withdrawal/email/verify": { authorization: "email-proof", method: "EMAIL_72H_HOLD", unlockAt, emailMasked: "ow****@example.test" },
      "/withdraw": { id: "withdraw-1", status: "PENDING_72H_HOLD", unlockAt },
      "/withdraw/withdraw-1": { id: "withdraw-1", status: "PENDING_72H_HOLD", unlockAt },
      "/withdraw/withdraw-1/cancel": { id: "withdraw-1", status: "CANCELLED" },
      "/deposit/check": { status: "confirmed", confirmations: 20, amountUsdt: 50, txHash: "a".repeat(64) },
    };
    if (!(path in responses)) { res.writeHead(404).end("{}"); return; }
    res.end(JSON.stringify(responses[path]));
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + (server.address() as AddressInfo).port;
  process.env.NEXT_PUBLIC_AUTH_API_BASE = base;
  process.env.NEXT_PUBLIC_API_BASE = base;
  try {
    const account = await import("../lib/account");
    const security = await import("../lib/security");
    const { api } = await import("../lib/api");
    const browser = await import("../lib/browserAccount");
    assert.equal(account.browserAccountsEnabled(), false);
    await assert.rejects(browser.startBrowserAccount());
    await assert.rejects(browser.browserAccountRequest("/auth/login", { email: "anything", password: "1" }));
    await assert.rejects(account.signupAccount("anything", "1", "ko"));
    assert.equal(await account.signupAccount(user.email, "a-long-password", "ko"), null);
    await account.resendAccountEmail(user.email, "ko");
    assert.equal((await account.verifyAccountEmail(user.email, "123456")).id, user.id);
    assert.equal((await account.loginAccount(user.email, "a-long-password")).id, user.id);
    assert.equal((await account.getAccountSession()).id, user.id);
    assert.equal((await account.updateAccountNickname("SavedName")).nickname, "SavedName");
    assert.equal(await account.checkAccountNickname("SavedName"), true);
    await assert.rejects(account.checkAccountNickname("TakenName"), (cause: unknown) => cause instanceof account.ProfileError && cause.reason === "nickname_taken");
    assert.equal((await account.updateAccountAvatar("data:image/jpeg;base64,/9j/AA==")).avatarUrl, "https://cdn.example.test/avatar.jpg");
    assert.equal((await account.updateAccountAvatar(null)).avatarUrl, null);
    await account.recoverAccount(user.email, "ko");
    await account.completePasswordRecovery(user.email, "654321", "new-long-password");
    assert.equal((await account.beginSocialLogin("google", "https://site.example/ko/")).redirectUrl, redirectUrl);
    redirectUrl = "javascript:alert(1)";
    await assert.rejects(account.beginSocialLogin("google", "https://site.example/ko/"));
    const setup = await security.beginTotpSetup();
    await security.confirmTotpSetup(setup.setupId, "123456");
    const draft = { network: "TRC20" as const, address: "T" + "A".repeat(33), amountUsdt: 25 };
    rejectOtp = true;
    await assert.rejects(security.verifyWithdrawalOtp(draft, "123456"), (e: unknown) => e instanceof account.AccountError && e.code === "credentials", "server rejection must not fall back to arbitrary-code acceptance");
    const email = await security.sendWithdrawalEmail(draft);
    const proof = await security.verifyWithdrawalEmail(draft, email.challengeId, "123456");
    const result = await api.withdraw({ ...draft, authorization: proof.authorization, authMethod: proof.method, requestId: "request-1" });
    assert.equal(result.unlockAt, unlockAt);
    assert.equal((await api.withdrawStatus(result.id)).status, "PENDING_72H_HOLD");
    assert.equal((await api.cancelWithdrawal(result.id)).status, "CANCELLED");
    assert.equal((await api.depositCheck({ network: "TRC20", address: draft.address, userKey: user.id })).amountUsdt, 50);
    await account.logoutAccount();
    assert.deepEqual(requests.find(x => x.path === "/auth/email/verify")?.body, { email: user.email, code: "123456" });
    assert.deepEqual(requests.find(x => x.path === "/auth/password/reset")?.body, { email: user.email, code: "654321", password: "new-long-password" });
    assert.equal(requests.find(x => x.path === "/withdraw")?.body.authorization, "email-proof");
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    delete process.env.NEXT_PUBLIC_AUTH_API_BASE;
    delete process.env.NEXT_PUBLIC_API_BASE;
  }
});
