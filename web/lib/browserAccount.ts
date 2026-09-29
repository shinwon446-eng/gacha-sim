import { AccountError, AccountActionError, ProfileError, browserAccountsEnabled, normalizeNickname, validAccountEmail, validAccountPassword, validPassword, isSocialAccount, closureReadiness, type AccountProvider, type ServerAccount } from "./account";
import { nicknameIssue, nicknameKey, nextNicknameChangeAt, validAvatarData, NICKNAME_CHANGE_INTERVAL_MS } from "./profilePolicy";
import { validateNewNickname } from "./nicknameRules";
import { newTotpSecret, verifyTotp } from "./totp";
import { HOLD_MS, maskEmail } from "./withdrawHold";
import { NETWORKS, resolveDepositAddress, validDepositReceipt, type DepositReceipt, type DepositNetwork } from "./depositAddress";
import { DEPOSIT_ADDRESSES } from "./runtime";

const KEY = "voila.browser-accounts.v1";
const SESSION = "voila.browser-session.v1";
const RESERVED_COMMUNITY_NICKNAMES = ["GuideTeam", "EventHost", "NoticeTeam"];
type Proof = { authorization: string; method: string; unlockAt?: number; emailMasked?: string; draft: string; expiresAt: number };
type CodePurpose = "password_unlock" | "password_otp" | "closure";
type AccountCode = { code: string; expiresAt: number; resendAt: number; attempts: number; sessionVersion: number };
type Account = {
  user: ServerAccount; salt: string; passwordHash: string; quick?: boolean;
  signupPending?: boolean; reset?: { token: string; expiresAt: number };
  secret?: string; setup?: { id: string; secret: string }; enabledAt?: string;
  challenge?: { id: string; code: string; expiresAt: number; draft: string; attempts: number };
  otpFailures?: number; lockedUntil?: number;
  passwordFailures?: number; passwordVerifiedUntil?: number; strictPassword?: boolean;
  passwordOtpFailures?: number; passwordOtpLockedUntil?: number;
  accountCodes?: Partial<Record<CodePurpose, AccountCode>>;
  deposits?: DepositReceipt[];
  proofs: Proof[]; withdrawals: Record<string, { id: string; requestId: string; status: string; unlockAt?: number }>;
};
const read = (): Account[] => JSON.parse(localStorage.getItem(KEY) || "[]");
const save = (accounts: Account[]) => localStorage.setItem(KEY, JSON.stringify(accounts));
function providerOf(account: Account): AccountProvider {
  if (account.user.provider) return account.user.provider;
  // Migrate only the exact identities produced by the former browser OAuth adapter.
  const legacy = /^(google|apple|microsoft)@device\.invalid$/.exec(account.user.email)?.[1];
  return legacy && !account.passwordHash && !account.quick ? legacy as AccountProvider : "email";
}
const nicknameTimestamp = (user: ServerAccount) => [user.nicknameUpdatedAt, user.nicknameChangedAt].filter((value): value is string => !!value).sort((a, b) => Date.parse(b) - Date.parse(a))[0];
const publicUser = (account: Account): ServerAccount => ({ ...account.user, provider: providerOf(account),
  nicknameUpdatedAt: nicknameTimestamp(account.user), nicknameChangedAt: nicknameTimestamp(account.user),
  passwordFailures: account.passwordFailures ?? 0, twoFactorEnabled: Boolean(account.secret), sessionVersion: account.user.sessionVersion ?? 0,
  local: true, emailVerified: false });
const signature = (body: Record<string, unknown>) => JSON.stringify([body.network, body.address, body.amountUsdt]);
async function passwordHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bytes = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 210000 }, key, 256);
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
}
function makeUser(email: string, provider: AccountProvider = "email"): ServerAccount {
  return { id: `browser_${crypto.randomUUID()}`, email, provider, sessionVersion: 0, createdAt: new Date().toISOString(), emailVerified: false, local: true };
}
function invalidateAccess(account: Account) {
  account.proofs = []; account.reset = undefined; account.challenge = undefined; account.setup = undefined;
  account.signupPending = false;
  account.accountCodes = {}; account.passwordVerifiedUntil = undefined;
  account.passwordFailures = 0; account.otpFailures = 0; account.lockedUntil = undefined;
  account.passwordOtpFailures = 0; account.passwordOtpLockedUntil = undefined;
  account.user.sessionVersion = (account.user.sessionVersion ?? 0) + 1;
}
function checkClosureAssets(account: Account) {
  const wallet = JSON.parse(localStorage.getItem(`voila.browser-wallet.${account.user.id}`) || "{}").state ?? {};
  const inventory = JSON.parse(localStorage.getItem(`voila.browser-inventory.${account.user.id}`) || "{}").state ?? {};
  if ((inventory.items !== undefined && !Array.isArray(inventory.items)) || (wallet.transactions !== undefined && !Array.isArray(wallet.transactions))) throw new AccountError("invalid");
  const assets = closureReadiness({ cryptoBalance: wallet.cryptoBalance ?? wallet.balance ?? 0, cardBalance: wallet.cardBalance ?? 0,
    items: inventory.items ?? [], transactions: [...(wallet.transactions ?? []), ...Object.values(account.withdrawals).map(w => ({ ...w, type: "withdraw" }))] });
  if (!assets.eligible || (wallet.balance !== undefined && wallet.balance !== 0)) throw new AccountActionError("assets_remaining");
}
export async function startBrowserAccount(): Promise<ServerAccount> {
  if (!browserAccountsEnabled()) throw new AccountError("unavailable");
  const accounts = read();
  let account = accounts.find(x => x.quick);
  if (!account) {
    account = { user: makeUser("member@device.invalid"), salt: "", passwordHash: "", quick: true, proofs: [], withdrawals: {} };
    accounts.push(account); save(accounts);
  }
  if (account.strictPassword) throw new AccountError("credentials");
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
    // After a real password change, the former password must no longer log in.
    if (account.strictPassword && (path === "/auth/signup" || await passwordHash(password, account.salt) !== account.passwordHash)) throw new AccountError("credentials");
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
    if (!account) { account = { user: makeUser(email, body.provider as AccountProvider), salt: "", passwordHash: "", proofs: [], withdrawals: {} }; accounts.push(account); }
    account.user.provider = body.provider as AccountProvider; save(accounts);
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
    account.salt = crypto.randomUUID(); account.passwordHash = await passwordHash(String(body.password), account.salt); invalidateAccess(account); save(accounts);
    if (localStorage.getItem(SESSION) === account.user.id) localStorage.removeItem(SESSION);
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
  if (path.startsWith("/account/") && body.accountId !== undefined && body.accountId !== account.user.id) throw new AccountError("credentials");
  if (path === "/account/closure") {
    // Legacy password-only closure cannot bypass the new identity-code and asset checks.
    throw new AccountActionError("verification_required");
  }
  if (path === "/auth/session") return { user: publicUser(account) };
  if (path.startsWith("/deposit/")) {
    if (body.userKey !== account.user.id) throw new AccountError("credentials");
    const network = body.network as DepositNetwork;
    if (!NETWORKS.some(n => n.key === network)) throw new AccountError("invalid");
    const address = resolveDepositAddress(network, DEPOSIT_ADDRESSES[network]);
    if (path === "/deposit/address") {
      if (!address) throw new AccountError("invalid");
      return { address, network };
    }
    if (!address || body.address !== address) throw new AccountError("invalid");
    // The adapter consumes transfer receipts; it never creates deposits just because
    // a user opens the wallet or polls an address. Receipt delivery is idempotent.
    if (path === "/deposit/receipt") {
      const receipt = body as unknown as DepositReceipt;
      if (!validDepositReceipt(receipt)) throw new AccountError("invalid");
      const existing = account.deposits?.find(r => r.network === network && r.txHash === receipt.txHash);
      if (existing) {
        if (existing.amountUsdt !== receipt.amountUsdt || existing.address !== receipt.address) throw new AccountError("conflict");
        existing.confirmations = Math.max(existing.confirmations, receipt.confirmations);
      } else account.deposits = [...(account.deposits ?? []), { network, address, txHash: receipt.txHash, amountUsdt: receipt.amountUsdt, confirmations: receipt.confirmations }];
      persist(); return { accepted: true };
    }
    if (path === "/deposit/check") {
      const wallet = JSON.parse(localStorage.getItem(`voila.browser-wallet.${account.user.id}`) || "{}").state ?? {};
      const receipts = (account.deposits ?? []).filter(r => r.network === network && r.address === address);
      const uncredited = receipts.filter(r => !(wallet.settledDepositRefs ?? []).includes(`deposit_usdt:${network}:${r.txHash}`));
      const required = NETWORKS.find(n => n.key === network)!.confirmations;
      const receipt = uncredited.find(r => r.confirmations >= required) ?? uncredited[0] ?? receipts.at(-1);
      return receipt ? { ...receipt, status: receipt.confirmations >= required ? "confirmed" : "pending" } : { status: "pending", confirmations: 0 };
    }
  }
  const passwordState = (matched = false) => ({ accountId: account.user.id, matched, failures: account.passwordFailures ?? 0,
    locked: (account.passwordFailures ?? 0) >= 5, twoFactorEnabled: Boolean(account.secret) });
  const requirePasswordAccount = () => { if (isSocialAccount(providerOf(account))) throw new AccountActionError("social_account"); };
  const issueCode = (purpose: CodePurpose) => {
    const old = account.accountCodes?.[purpose];
    if (old && old.resendAt > Date.now()) throw new AccountActionError("resend_wait", undefined, old.resendAt);
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
    const challenge = { code, expiresAt: Date.now() + 5 * 60_000, resendAt: Date.now() + 60_000, attempts: 0, sessionVersion: account.user.sessionVersion ?? 0 };
    account.accountCodes = { ...account.accountCodes, [purpose]: challenge }; persist();
    return { accountId: account.user.id, expiresAt: challenge.expiresAt, resendAt: challenge.resendAt, emailMasked: maskEmail(account.user.email), browserCode: code };
  };
  const consumeCode = (purpose: CodePurpose, code: unknown) => {
    const c = account.accountCodes?.[purpose];
    if (!c || c.sessionVersion !== (account.user.sessionVersion ?? 0)) throw new AccountActionError("verification_required");
    if (c.expiresAt <= Date.now()) throw new AccountActionError("code_expired");
    if (c.attempts >= 5) throw new AccountActionError("code_attempts_exceeded");
    if (typeof code !== "string" || !/^\d{6}$/.test(code) || c.code !== code) { c.attempts++; persist(); throw new AccountActionError(c.attempts >= 5 ? "code_attempts_exceeded" : "code_invalid"); }
    delete account.accountCodes![purpose];
  };
  const verifyPassword = async (value: unknown) => {
    requirePasswordAccount();
    if ((account.passwordFailures ?? 0) >= 5) return passwordState();
    if (typeof value !== "string" || !value || value.length > 128) throw new AccountError("invalid");
    const matched = !!account.passwordHash && await passwordHash(value, account.salt) === account.passwordHash;
    account.passwordFailures = matched ? 0 : Math.min(5, (account.passwordFailures ?? 0) + 1);
    account.passwordVerifiedUntil = matched ? Date.now() + 5 * 60_000 : undefined;
    if (!matched) delete account.accountCodes?.password_otp;
    persist(); return passwordState(matched);
  };
  if (path === "/account/password/status") return { ...passwordState(), provider: providerOf(account) };
  if (path === "/account/password/verify-current") return verifyPassword(body.currentPassword);
  if (path === "/account/password/unlock/send") {
    requirePasswordAccount();
    if ((account.passwordFailures ?? 0) < 5) throw new AccountActionError("verification_required");
    return issueCode("password_unlock");
  }
  if (path === "/account/password/unlock") {
    requirePasswordAccount(); consumeCode("password_unlock", body.code);
    account.passwordFailures = 0; account.passwordVerifiedUntil = undefined; persist();
    return { accountId: account.user.id, unlocked: true, failures: 0, locked: false };
  }
  if (path === "/account/password/otp/send") {
    requirePasswordAccount();
    if ((account.passwordFailures ?? 0) >= 5) throw new AccountActionError("password_locked", 5);
    if (!account.passwordVerifiedUntil || account.passwordVerifiedUntil <= Date.now() || account.secret) throw new AccountActionError("verification_required");
    return issueCode("password_otp");
  }
  if (path === "/account/password/change") {
    requirePasswordAccount();
    if ((account.passwordFailures ?? 0) >= 5) throw new AccountActionError("password_locked", 5);
    if (!account.passwordVerifiedUntil || account.passwordVerifiedUntil <= Date.now()) throw new AccountActionError("verification_required");
    if (typeof body.newPassword !== "string" || !validPassword(body.newPassword)) throw new AccountActionError("password_invalid");
    const verified = await verifyPassword(body.currentPassword);
    if (!verified.matched) throw new AccountActionError(verified.locked ? "password_locked" : "password_mismatch", verified.failures);
    if (await passwordHash(body.newPassword, account.salt) === account.passwordHash) throw new AccountActionError("password_reused");
    if (account.secret) {
      if ((account.passwordOtpLockedUntil ?? 0) > Date.now()) throw new AccountActionError("resend_wait", undefined, account.passwordOtpLockedUntil);
      if (typeof body.otpCode !== "string" || !/^\d{6}$/.test(body.otpCode) || !await verifyTotp(account.secret, body.otpCode)) {
        account.passwordOtpFailures = (account.passwordOtpFailures ?? 0) + 1;
        if (account.passwordOtpFailures >= 5) { account.passwordOtpLockedUntil = Date.now() + 60_000; account.passwordOtpFailures = 0; }
        persist(); throw new AccountActionError("code_invalid");
      }
    } else consumeCode("password_otp", body.otpCode);
    account.salt = crypto.randomUUID(); account.passwordHash = await passwordHash(body.newPassword, account.salt);
    account.strictPassword = true; account.user.passwordChangedAt = new Date().toISOString(); invalidateAccess(account);
    persist(); localStorage.removeItem(SESSION);
    return { accountId: account.user.id, changed: true, sessionsRevoked: true, passwordChangedAt: account.user.passwordChangedAt };
  }
  if (path === "/account/closure/code/send") { checkClosureAssets(account); return issueCode("closure"); }
  if (path === "/account/closure/confirm") {
    checkClosureAssets(account); consumeCode("closure", body.code);
    save(accounts.filter(x => x.user.id !== account.user.id)); localStorage.removeItem(SESSION);
    return { accountId: account.user.id, deleted: true, sessionsRevoked: true };
  }
  if (path === "/account/profile" || path === "/account/profile/nickname/check") {
    const nickname = normalizeNickname(String(body.nickname ?? ""));
    const availability = validateNewNickname(nickname, path.endsWith("/check") ? account.user.nickname : undefined);
    if (path.endsWith("/check") && !availability.valid) return { nickname, available: false, reason: availability.reason };
    if (!path.endsWith("/check") && !availability.valid && availability.reason === "format") throw new ProfileError("nickname_format");
    if (!path.endsWith("/check") && !availability.valid && availability.reason === "forbidden") throw new ProfileError("nickname_prohibited");
    const issue = nicknameIssue(String(body.nickname ?? ""));
    if (issue) throw new ProfileError(issue);
    const taken = accounts.some(x => x.user.id !== account.user.id && x.user.nickname && nicknameKey(x.user.nickname) === nicknameKey(nickname))
      || RESERVED_COMMUNITY_NICKNAMES.some(name => nicknameKey(name) === nicknameKey(nickname));
    if (path.endsWith("/check")) return { nickname, available: !taken, ...(!taken ? {} : { reason: "taken" }) };
    if (nickname === account.user.nickname) return { user: publicUser(account) };
    const next = nextNicknameChangeAt({ ...account.user, nicknameChangedAt: nicknameTimestamp(account.user) });
    if (next && Date.parse(next) > Date.now()) throw new ProfileError("nickname_cooldown", next);
    if (taken) throw new ProfileError("nickname_taken");
    const now = Date.now();
    account.user = { ...account.user, nickname, nicknameUpdatedAt: new Date(now).toISOString(), nicknameChangedAt: new Date(now).toISOString(), nextNicknameChangeAt: new Date(now + NICKNAME_CHANGE_INTERVAL_MS).toISOString() };
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
