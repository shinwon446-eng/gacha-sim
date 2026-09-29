import { AccountError, ProfileError, browserAccountsEnabled, normalizeNickname, validAccountEmail, validAccountPassword, type ServerAccount } from "./account";
import { nicknameIssue, nicknameKey, nextNicknameChangeAt, validAvatarData, NICKNAME_CHANGE_INTERVAL_MS } from "./profilePolicy";
import { newTotpSecret } from "./totp";
import { HOLD_MS, maskEmail } from "./withdrawHold";

const KEY = "voila.browser-accounts.v1";
const SESSION = "voila.browser-session.v1";
type Proof = { authorization: string; method: string; unlockAt?: number; emailMasked?: string; draft: string; expiresAt: number };
type Account = {
  user: ServerAccount; salt: string; passwordHash: string; quick?: boolean;
  signupPending?: boolean; reset?: { token: string; expiresAt: number };
  secret?: string; setup?: { id: string; secret: string }; enabledAt?: string;
  challenge?: { id: string; code: string; expiresAt: number; draft: string; attempts: number };
  otpFailures?: number; lockedUntil?: number;
  proofs: Proof[]; withdrawals: Record<string, { id: string; requestId: string; status: string; unlockAt?: number }>;
};
const read = (): Account[] => JSON.parse(localStorage.getItem(KEY) || "[]");
const save = (accounts: Account[]) => localStorage.setItem(KEY, JSON.stringify(accounts));
const publicUser = (account: Account) => ({ ...account.user, local: true, emailVerified: false });
const signature = (body: Record<string, unknown>) => JSON.stringify([body.network, body.address, body.amountUsdt]);
async function passwordHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bytes = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 210000 }, key, 256);
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
}
function makeUser(email: string): ServerAccount {
  return { id: `browser_${crypto.randomUUID()}`, email, createdAt: new Date().toISOString(), emailVerified: false, local: true };
}
export async function startBrowserAccount(): Promise<ServerAccount> {
  if (!browserAccountsEnabled()) throw new AccountError("unavailable");
  const accounts = read();
  let account = accounts.find(x => x.quick);
  if (!account) {
    account = { user: makeUser("member@device.invalid"), salt: "", passwordHash: "", quick: true, proofs: [], withdrawals: {} };
    accounts.push(account); save(accounts);
  }
  localStorage.setItem(SESSION, account.user.id);
  return publicUser(account);
}

// This is a browser account service, never proof of email ownership or a payment backend.
// No requests leave the device. Remote API configuration bypasses this service entirely.
async function request(path: string, input?: unknown): Promise<Record<string, unknown>> {
  if (!browserAccountsEnabled()) throw new AccountError("unavailable");
  const body = (input ?? {}) as Record<string, unknown>;
  const accounts = read();
  const codeAccepted = () => /^\d{6}$/.test(String(body.code ?? ""));
  if (path === "/auth/signup" || path === "/auth/login") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!validAccountEmail(email) || !validAccountPassword(password)) throw new AccountError("invalid");
    let account = accounts.find(x => x.user.email === email);
    if (!account) {
      const salt = crypto.randomUUID();
      account = { user: makeUser(email), salt, passwordHash: await passwordHash(password, salt), proofs: [], withdrawals: {} };
      accounts.push(account);
    }
    // User-requested arbitrary values are accepted only by this browser transport.
    if (path === "/auth/signup") {
      account.signupPending = true; save(accounts); return { verificationRequired: true };
    }
    account.signupPending = false; save(accounts); localStorage.setItem(SESSION, account.user.id);
    return { user: publicUser(account) };
  }
  if (path === "/auth/email/verify" || path === "/auth/email/resend") {
    const account = accounts.find(x => x.user.email === String(body.email).trim().toLowerCase());
    if (!account?.signupPending) throw new AccountError("invalid");
    if (path.endsWith("/resend")) return { accepted: true };
    if (!codeAccepted()) throw new AccountError("credentials");
    account.signupPending = false; save(accounts);
    localStorage.setItem(SESSION, account.user.id);
    return { user: publicUser(account) };
  }
  if (path === "/auth/oauth/start") {
    if (!["google", "apple", "microsoft"].includes(String(body.provider))) throw new AccountError("invalid");
    const email = `${body.provider}@device.invalid`;
    let account = accounts.find(x => x.user.email === email);
    if (!account) { account = { user: makeUser(email), salt: "", passwordHash: "", proofs: [], withdrawals: {} }; accounts.push(account); save(accounts); }
    localStorage.setItem(SESSION, account.user.id); return { user: publicUser(account) };
  }
  if (path === "/auth/password/reset-request") {
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!validAccountEmail(email)) throw new AccountError("invalid");
    let account = accounts.find(x => x.user.email === email);
    if (!account) { account = { user: makeUser(email), salt: "", passwordHash: "", proofs: [], withdrawals: {} }; accounts.push(account); }
    account.reset = { token: crypto.randomUUID(), expiresAt: Date.now() + 15 * 60000 }; save(accounts);
    return { accepted: true };
  }
  if (path === "/auth/password/reset") {
    const account = accounts.find(x => body.token ? x.reset?.token === body.token : x.user.email === String(body.email).trim().toLowerCase());
    if (!account?.reset || account.reset.expiresAt <= Date.now() || (!body.token && !codeAccepted()) || !validAccountPassword(String(body.password ?? ""))) throw new AccountError("invalid");
    account.salt = crypto.randomUUID(); account.passwordHash = await passwordHash(String(body.password), account.salt); account.reset = undefined; save(accounts);
    return { updated: true };
  }
  if (path === "/auth/logout") { localStorage.removeItem(SESSION); return { loggedOut: true }; }
  const account = accounts.find(x => x.user.id === localStorage.getItem(SESSION));
  if (!account) throw new AccountError("credentials");
  const persist = () => {
    try { save(accounts); }
    catch (cause) {
      if (path.startsWith("/account/profile")) throw new ProfileError("storage_unavailable");
      throw cause;
    }
  };
  if (path.startsWith("/account/profile") && body.accountId !== undefined && body.accountId !== account.user.id) throw new AccountError("credentials");
  if (path === "/account/closure") {
    if (!body.password || body.confirm !== true) throw new AccountError("invalid");
    save(accounts.filter(x => x !== account)); localStorage.removeItem(SESSION);
    return { deleted: true };
  }
  if (path === "/auth/session") return { user: publicUser(account) };
  if (path === "/account/profile" || path === "/account/profile/nickname/check") {
    const nickname = normalizeNickname(String(body.nickname ?? ""));
    const issue = nicknameIssue(String(body.nickname ?? ""));
    if (issue) throw new ProfileError(issue);
    const taken = accounts.some(x => x.user.id !== account.user.id && x.user.nickname && nicknameKey(x.user.nickname) === nicknameKey(nickname));
    if (path.endsWith("/check")) return { nickname, available: !taken };
    if (nickname === account.user.nickname) return { user: publicUser(account) };
    const next = nextNicknameChangeAt(account.user);
    if (next && Date.parse(next) > Date.now()) throw new ProfileError("nickname_cooldown", next);
    if (taken) throw new ProfileError("nickname_taken");
    const now = Date.now();
    account.user = { ...account.user, nickname, nicknameChangedAt: new Date(now).toISOString(), nextNicknameChangeAt: new Date(now + NICKNAME_CHANGE_INTERVAL_MS).toISOString() };
    persist(); return { user: publicUser(account) };
  }
  if (path === "/account/profile/avatar") {
    if (body.avatar !== null && !validAvatarData(body.avatar)) throw new ProfileError("avatar_invalid");
    account.user.avatarUrl = body.avatar as string | null;
    persist(); return { user: publicUser(account) };
  }
  const security = () => ({ twoFactorEnabled: Boolean(account.secret), enabledAt: account.enabledAt ?? null });
  if (path === "/account/security") return security();
  if (path === "/account/security/totp/setup") {
    account.setup = { id: crypto.randomUUID(), secret: newTotpSecret(16) }; persist();
    return { setupId: account.setup.id, secret: account.setup.secret };
  }
  if (path === "/account/security/totp/enable") {
    if (!account.setup || body.setupId !== account.setup.id || !codeAccepted()) throw new AccountError("credentials");
    account.secret = account.setup.secret; account.setup = undefined; account.enabledAt = new Date().toISOString(); persist(); return security();
  }
  if (path === "/account/security/totp/disable") {
    if (!account.secret || !codeAccepted()) throw new AccountError("credentials");
    account.secret = undefined; account.enabledAt = undefined; account.proofs = []; persist(); return security();
  }
  const proof = (method: string) => {
    const result: Proof = { authorization: crypto.randomUUID(), method, draft: signature(body), expiresAt: Date.now() + 5 * 60000,
      ...(method === "EMAIL_72H_HOLD" ? { unlockAt: Date.now() + HOLD_MS, emailMasked: maskEmail(account.user.email) } : {}) };
    account.proofs = [...account.proofs.filter(x => x.expiresAt > Date.now()), result]; persist();
    return { ...result };
  };
  if (path === "/account/security/withdrawal/otp") {
    if ((account.lockedUntil ?? 0) > Date.now()) throw new AccountError("rateLimit");
    if (!account.secret || !codeAccepted()) {
      account.otpFailures = (account.otpFailures ?? 0) + 1;
      if (account.otpFailures >= 3) { account.lockedUntil = Date.now() + 30000; account.otpFailures = 0; }
      persist(); throw new AccountError("credentials");
    }
    account.otpFailures = 0; return proof("2FA_OTP");
  }
  if (path === "/account/security/withdrawal/email") {
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
    account.challenge = { id: crypto.randomUUID(), code, expiresAt: Date.now() + 5 * 60000, draft: signature(body), attempts: 0 }; persist();
    return { challengeId: account.challenge.id, emailMasked: maskEmail(account.user.email), expiresAt: account.challenge.expiresAt, browserCode: code };
  }
  if (path === "/account/security/withdrawal/email/verify") {
    const c = account.challenge;
    if (!c || c.id !== body.challengeId || c.expiresAt <= Date.now() || c.draft !== signature(body) || c.attempts >= 5) throw new AccountError("invalid");
    if (!codeAccepted()) { c.attempts++; persist(); throw new AccountError("credentials"); }
    account.challenge = undefined; return proof("EMAIL_72H_HOLD");
  }
  if (path === "/withdraw") {
    const previous = Object.values(account.withdrawals).find(x => x.requestId === body.requestId);
    if (previous) return { ...previous };
    const authorization = account.proofs.find(x => x.authorization === body.authorization && x.method === body.authMethod && x.draft === signature(body) && x.expiresAt > Date.now());
    if (!authorization || typeof body.requestId !== "string") throw new AccountError("credentials");
    const result = { id: `browser_withdraw_${crypto.randomUUID()}`, requestId: body.requestId, status: authorization.method === "EMAIL_72H_HOLD" ? "PENDING_72H_HOLD" : "PENDING", ...(authorization.unlockAt ? { unlockAt: authorization.unlockAt } : {}) };
    account.withdrawals[result.id] = result; account.proofs = account.proofs.filter(x => x !== authorization); persist(); return result;
  }
  const withdrawal = path.match(/^\/withdraw\/([^/]+)(\/cancel)?$/);
  if (withdrawal) {
    const record = account.withdrawals[decodeURIComponent(withdrawal[1])];
    if (!record) throw new AccountError("invalid");
    if (withdrawal[2]) {
      if (!["PENDING", "PENDING_72H_HOLD", "CANCELLED"].includes(record.status)) throw new AccountError("conflict");
      record.status = "CANCELLED";
    } else if (record.status === "PENDING_72H_HOLD" && record.unlockAt! <= Date.now()) record.status = "PENDING";
    persist(); return { ...record };
  }
  throw new AccountError("unavailable");
}
let queue = Promise.resolve();
export function browserAccountRequest(path: string, input?: unknown) {
  // Serialize across tabs as well as within this module: check + save is one critical section.
  const result = queue.then(async () => typeof navigator !== "undefined" && navigator.locks
    ? await navigator.locks.request(KEY, () => request(path, input)) : await request(path, input));
  queue = result.then(() => undefined, () => undefined);
  return result;
}
