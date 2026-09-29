/** Shared account contract; browser and HTTP transports use the same routes. */
import { normalizeNickname, nicknameIssue, validAvatarData, validAvatarUrl, type NicknameIssue } from "./profilePolicy";
import { validateNewNickname } from "./nicknameRules";
export { normalizeNickname, validNickname } from "./profilePolicy";
export type ProfileErrorReason = NicknameIssue | "nickname_taken" | "nickname_cooldown" | "avatar_invalid" | "storage_unavailable";
export class AccountError extends Error {
  constructor(public readonly code: "unavailable" | "network" | "invalid" | "credentials" | "rateLimit" | "conflict") { super(code); }
}
export class ProfileError extends AccountError {
  constructor(public readonly reason: ProfileErrorReason, public readonly nextChangeAt?: string) {
    super(reason === "nickname_taken" || reason === "nickname_cooldown" ? "conflict" : "invalid");
  }
}

/** Shared account contract for password, nickname and account-closure flows. */
export type AccountProvider = "email" | "google" | "apple" | "microsoft" | "phone";
export const isSocialAccount = (provider: AccountProvider = "email") => ["google", "apple", "microsoft"].includes(provider);
export const PASSWORD_FAILURE_LIMIT = 5;
export interface PasswordVerificationResult {
  accountId: string; matched: boolean; failures: number; locked: boolean; twoFactorEnabled: boolean;
}
export interface AccountVerificationCode {
  accountId: string; expiresAt: number; resendAt: number; emailMasked: string;
  /** Present only in the browser transport; HTTP responses may never supply this field. */
  browserCode?: string;
}
export type AccountActionReason = "social_account" | "password_locked" | "password_mismatch" | "password_reused" | "password_invalid" | "verification_required" | "code_invalid" | "code_expired" | "code_attempts_exceeded" | "resend_wait" | "assets_remaining";
export class AccountActionError extends AccountError {
  constructor(public readonly reason: AccountActionReason, public readonly failures?: number, public readonly retryAt?: number) {
    super(reason === "assets_remaining" || reason === "password_reused" || reason === "social_account" ? "conflict" : reason === "resend_wait" ? "rateLimit" : "credentials");
  }
}

export function validAuthBase(raw: string): string {
  try {
    const url = new URL(raw);
    if (url.username || url.password || url.search || url.hash) return "";
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) return "";
    return url.href.replace(/\/+$/, "");
  } catch { return ""; }
}
// A single API origin is sufficient; an explicit auth origin can override it.
export function resolveAccountApiBase(authBase: string | undefined, apiBase: string | undefined): string {
  return validAuthBase(authBase?.trim() || apiBase?.trim() || "");
}
export const AUTH_API_BASE = resolveAccountApiBase(process.env.NEXT_PUBLIC_AUTH_API_BASE, process.env.NEXT_PUBLIC_API_BASE);
export const browserAccountsEnabled = () => !process.env.NEXT_PUBLIC_AUTH_API_BASE?.trim() && !process.env.NEXT_PUBLIC_API_BASE?.trim();
export const accountConfigured = () => Boolean(AUTH_API_BASE) || browserAccountsEnabled();
export const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) && value.length <= 254;
export const validPassword = (value: string) => value.length >= 12 && value.length <= 128;
export const validAccountEmail = (value: string) => browserAccountsEnabled() ? value.trim().length > 0 && value.length <= 254 : validEmail(value);
export const validAccountPassword = (value: string) => browserAccountsEnabled() ? value.length > 0 && value.length <= 128 : validPassword(value);

export interface ServerAccount { id: string; email: string; createdAt: string; emailVerified: boolean; provider?: AccountProvider; nickname?: string; nicknameUpdatedAt?: string; nicknameChangedAt?: string; nextNicknameChangeAt?: string; avatarUrl?: string | null; local?: boolean; passwordFailures?: number; passwordChangedAt?: string; sessionVersion?: number; twoFactorEnabled?: boolean }
export type NicknameAvailability = { available: boolean; reason?: "format" | "same" | "forbidden" | "taken" };
function accountFrom(data: unknown): ServerAccount {
  const user = (data as { user?: ServerAccount })?.user;
  if (!user || typeof user.id !== "string" || !user.id || typeof user.email !== "string" || !(browserAccountsEnabled() && user.local === true ? validAccountEmail(user.email) : validEmail(user.email)) || typeof user.createdAt !== "string" || !Number.isFinite(Date.parse(user.createdAt)) || (user.emailVerified !== true && !(browserAccountsEnabled() && user.local === true))) throw new AccountError("invalid");
  // Existing names may predate the moderation policy; do not lock those users out of their account.
  if (user.nickname !== undefined && (typeof user.nickname !== "string" || user.nickname.length > 100)) throw new AccountError("invalid");
  for (const value of [user.nicknameChangedAt, user.nextNicknameChangeAt]) if (value !== undefined && !Number.isFinite(Date.parse(value))) throw new AccountError("invalid");
  if (user.avatarUrl != null && !validAvatarUrl(user.avatarUrl)) throw new AccountError("invalid");
  if (user.provider !== undefined && !["email", "google", "apple", "microsoft", "phone"].includes(user.provider)) throw new AccountError("invalid");
  for (const value of [user.nicknameUpdatedAt, user.passwordChangedAt]) if (value !== undefined && (typeof value !== "string" || !Number.isFinite(Date.parse(value)))) throw new AccountError("invalid");
  if (user.passwordFailures !== undefined && (!Number.isInteger(user.passwordFailures) || user.passwordFailures < 0 || user.passwordFailures > PASSWORD_FAILURE_LIMIT)) throw new AccountError("invalid");
  if (user.sessionVersion !== undefined && (!Number.isInteger(user.sessionVersion) || user.sessionVersion < 0)) throw new AccountError("invalid");
  if (user.twoFactorEnabled !== undefined && typeof user.twoFactorEnabled !== "boolean") throw new AccountError("invalid");
  const nicknameAt = [user.nicknameUpdatedAt, user.nicknameChangedAt].filter((value): value is string => !!value).sort((a, b) => Date.parse(b) - Date.parse(a))[0];
  return { ...user, provider: user.provider ?? "email", nicknameUpdatedAt: nicknameAt, nicknameChangedAt: nicknameAt };
}

export async function updateAccountNickname(nickname: string, accountId?: string) {
  const validation = validateNewNickname(nickname);
  if (!validation.valid && validation.reason === "format") throw new ProfileError("nickname_format");
  if (!validation.valid && validation.reason === "forbidden") throw new ProfileError("nickname_prohibited");
  const issue = nicknameIssue(nickname);
  if (issue) throw new ProfileError(issue);
  const user = accountFrom(await accountRequest("/account/profile", { nickname: normalizeNickname(nickname), ...(accountId ? { accountId } : {}) }));
  if (user.nickname !== normalizeNickname(nickname) || !user.nicknameChangedAt || !user.nextNicknameChangeAt) throw new AccountError("invalid");
  return user;
}
export async function checkNicknameAvailability(nickname: string, currentUserId?: string): Promise<NicknameAvailability> {
  const normalized = normalizeNickname(nickname);
  const validation = validateNewNickname(normalized);
  if (!validation.valid) return { available: false, reason: validation.reason };
  const result = await accountRequest("/account/profile/nickname/check", { nickname: normalized, ...(currentUserId ? { accountId: currentUserId } : {}) });
  if (typeof result.available !== "boolean" || result.nickname !== normalized) throw new AccountError("invalid");
  if (result.available) return { available: true };
  const reason = result.reason;
  if (reason === "format" || reason === "same" || reason === "forbidden" || reason === "taken") return { available: false, reason };
  return { available: false, reason: "taken" };
}
export async function checkAccountNickname(nickname: string, currentUserId?: string) {
  const availability = await checkNicknameAvailability(nickname, currentUserId);
  if (availability.available) return true;
  if (availability.reason === "format") throw new ProfileError("nickname_format");
  if (availability.reason === "forbidden") throw new ProfileError("nickname_prohibited");
  if (availability.reason === "taken") throw new ProfileError("nickname_taken");
  return false;
}
export async function updateAccountAvatar(avatar: string | null, accountId?: string) {
  if (avatar !== null && !validAvatarData(avatar)) throw new ProfileError("avatar_invalid");
  const user = accountFrom(await accountRequest("/account/profile/avatar", { avatar, ...(accountId ? { accountId } : {}) }));
  if (avatar === null ? user.avatarUrl !== null : !user.avatarUrl) throw new AccountError("invalid");
  return user;
}

/** Cookie session + server-issued CSRF token. Backend must enforce Origin, rate limits and current asset balances. */
export async function accountRequest(path: string, body?: unknown, base = AUTH_API_BASE): Promise<Record<string, unknown>> {
  if (!base && browserAccountsEnabled() && typeof window !== "undefined") return (await import("./browserAccount")).browserAccountRequest(path, body);
  if (!validAuthBase(base)) throw new AccountError("unavailable");
  const request = async (route: string, init: RequestInit = {}) => {
    let response: Response;
    try { response = await fetch(`${base}${route}`, { ...init, credentials: "include", cache: "no-store", signal: AbortSignal.timeout(15000) }); }
    catch { throw new AccountError("network"); }
    if (!response.ok) {
      if (route.startsWith("/account/password/") || route.startsWith("/account/closure/")) {
        const detail = await response.json().catch(() => ({})) as { code?: AccountActionReason; failures?: number; retryAt?: number };
        const reasons: AccountActionReason[] = ["social_account", "password_locked", "password_mismatch", "password_reused", "password_invalid", "verification_required", "code_invalid", "code_expired", "code_attempts_exceeded", "resend_wait", "assets_remaining"];
        if (detail.code && reasons.includes(detail.code)) throw new AccountActionError(detail.code,
          Number.isInteger(detail.failures) && detail.failures! >= 0 && detail.failures! <= 5 ? detail.failures : undefined,
          typeof detail.retryAt === "number" && Number.isFinite(detail.retryAt) ? detail.retryAt : undefined);
      }
      if (route.startsWith("/account/profile") && [400, 409, 422].includes(response.status)) {
        const detail = await response.json().catch(() => ({})) as { code?: ProfileErrorReason; nextNicknameChangeAt?: string };
        if (detail.code && ["nickname_length", "nickname_format", "nickname_prohibited", "nickname_reserved", "nickname_taken", "nickname_cooldown", "avatar_invalid"].includes(detail.code)) {
          throw new ProfileError(detail.code, typeof detail.nextNicknameChangeAt === "string" && Number.isFinite(Date.parse(detail.nextNicknameChangeAt)) ? detail.nextNicknameChangeAt : undefined);
        }
      }
      throw new AccountError(response.status === 429 ? "rateLimit" : response.status === 409 ? "conflict" : response.status === 401 || response.status === 403 ? "credentials" : "network");
    }
    try {
      const data: unknown = await response.json();
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new AccountError("invalid");
      return data as Record<string, unknown>;
    } catch { throw new AccountError("invalid"); }
  };
  if (body === undefined) return request(path);
  const csrf = await request("/auth/csrf");
  if (typeof csrf.token !== "string" || csrf.token.length < 16) throw new AccountError("invalid");
  return request(path, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf.token }, body: JSON.stringify(body) });
}
export async function loginAccount(email: string, password: string) {
  if (!validAccountEmail(email) || !password) throw new AccountError("invalid");
  return accountFrom(await accountRequest("/auth/login", { email: email.trim(), password }));
}
export async function signupAccount(email: string, password: string, locale: string) {
  if (!validAccountEmail(email) || !validAccountPassword(password)) throw new AccountError("invalid");
  const result = await accountRequest("/auth/signup", { email: email.trim(), password, locale, acceptedTerms: true });
  if (browserAccountsEnabled() && result.user) return accountFrom(result);
  if (result.verificationRequired !== true) throw new AccountError("invalid");
  return null;
}
export async function recoverAccount(email: string, locale: string) {
  if (!validAccountEmail(email)) throw new AccountError("invalid");
  if ((await accountRequest("/auth/password/reset-request", { email: email.trim(), locale })).accepted !== true) throw new AccountError("invalid");
}
export async function resetAccountPassword(token: string, password: string) {
  if (!token || !validAccountPassword(password)) throw new AccountError("invalid");
  if ((await accountRequest("/auth/password/reset", { token, password })).updated !== true) throw new AccountError("invalid");
}
export async function getAccountSession() { return accountFrom(await accountRequest("/auth/session")); }
export async function verifyAccountEmail(email: string, code: string) {
  if (!validAccountEmail(email) || !/^\d{6}$/.test(code)) throw new AccountError("invalid");
  return accountFrom(await accountRequest("/auth/email/verify", { email: email.trim(), code }));
}
export async function resendAccountEmail(email: string, locale: string) {
  if (!validAccountEmail(email)) throw new AccountError("invalid");
  if ((await accountRequest("/auth/email/resend", { email: email.trim(), locale })).accepted !== true) throw new AccountError("invalid");
}
export async function completePasswordRecovery(email: string, code: string, password: string) {
  if (!validAccountEmail(email) || !/^\d{6}$/.test(code) || !validAccountPassword(password)) throw new AccountError("invalid");
  if ((await accountRequest("/auth/password/reset", { email: email.trim(), code, password })).updated !== true) throw new AccountError("invalid");
}
export type SocialProvider = "google" | "apple" | "microsoft";
export async function beginSocialLogin(provider: SocialProvider, returnTo: string): Promise<{ user?: ServerAccount; redirectUrl?: string }> {
  const result = await accountRequest("/auth/oauth/start", { provider, returnTo });
  if (browserAccountsEnabled() && result.user) return { user: accountFrom(result) };
  if (typeof result.redirectUrl !== "string") throw new AccountError("invalid");
  let url: URL;
  try { url = new URL(result.redirectUrl); } catch { throw new AccountError("invalid"); }
  const hosts: Record<SocialProvider, string[]> = { google: ["accounts.google.com"], apple: ["appleid.apple.com"], microsoft: ["login.microsoftonline.com", "login.live.com"] };
  if (url.protocol !== "https:" || url.username || url.password || !hosts[provider].includes(url.hostname)) throw new AccountError("invalid");
  return { redirectUrl: url.href };
}
export async function logoutAccount() {
  if ((await accountRequest("/auth/logout", {})).loggedOut !== true) throw new AccountError("invalid");
}
export async function deleteAccount(password: string) {
  if (!password) throw new AccountError("invalid");
  if ((await accountRequest("/account/closure", { password, confirm: true })).deleted !== true) throw new AccountError("invalid");
}

/**
 * Password API (all POSTs use the common cookie + CSRF transport):
 * GET /account/password/status -> { accountId, provider, failures, locked, twoFactorEnabled }
 * POST verify-current { currentPassword, accountId } -> PasswordVerificationResult
 * POST unlock/send, otp/send { accountId } -> AccountVerificationCode
 * POST unlock { code, accountId } -> { accountId, unlocked:true, failures:0, locked:false }
 * POST change { currentPassword, newPassword, otpCode, accountId }
 *   -> { accountId, changed:true, sessionsRevoked:true, passwordChangedAt:ISO }
 * Server must compare hashes, count failures atomically, validate TOTP or the issued code,
 * reject reuse and expired/replayed challenges, and revoke ALL sessions/reset grants/proofs
 * in the same transaction. Passwords, codes and hash material must never enter logs.
 * Browser transport implements this contract on the device. It does not send real email.
 */
async function actionAccountId(expected?: string) { return expected ?? (await getAccountSession()).id; }
function announceSessionRevocation(accountId: string) {
  // The issuing tab shows the completion dialog; other tabs clear their sessions immediately.
  if (typeof window === "undefined") return;
  try { localStorage.setItem("voila.account-revocation.v1", JSON.stringify({ accountId, at: Date.now(), nonce: crypto.randomUUID() })); } catch { /* Server revocation already succeeded. */ }
}
function passwordResult(data: Record<string, unknown>, accountId: string): PasswordVerificationResult {
  if (data.accountId !== accountId || typeof data.matched !== "boolean" || !Number.isInteger(data.failures) || Number(data.failures) < 0 || Number(data.failures) > 5
    || typeof data.locked !== "boolean" || data.locked !== (Number(data.failures) >= 5) || typeof data.twoFactorEnabled !== "boolean"
    || (data.matched && (data.failures !== 0 || data.locked))) throw new AccountError("invalid");
  return data as unknown as PasswordVerificationResult;
}
export async function getPasswordChangeStatus(accountId?: string) {
  const id = await actionAccountId(accountId);
  const data = await accountRequest("/account/password/status");
  const result = passwordResult({ ...data, matched: false }, id);
  if (!["email", "google", "apple", "microsoft", "phone"].includes(String(data.provider))) throw new AccountError("invalid");
  return { ...result, provider: data.provider as AccountProvider };
}
export async function verifyCurrentPassword(currentPassword: string, accountId?: string): Promise<PasswordVerificationResult> {
  if (!currentPassword || currentPassword.length > 128) throw new AccountError("invalid");
  const id = await actionAccountId(accountId);
  return passwordResult(await accountRequest("/account/password/verify-current", { currentPassword, accountId: id }), id);
}
async function sendAccountCode(path: string, accountId?: string): Promise<AccountVerificationCode> {
  const id = await actionAccountId(accountId);
  const data = await accountRequest(path, { accountId: id });
  if (data.accountId !== id || typeof data.expiresAt !== "number" || !Number.isFinite(data.expiresAt) || data.expiresAt <= Date.now()
    || typeof data.resendAt !== "number" || !Number.isFinite(data.resendAt) || typeof data.emailMasked !== "string" || !data.emailMasked
    || (data.browserCode !== undefined && (!browserAccountsEnabled() || typeof data.browserCode !== "string" || !/^\d{6}$/.test(data.browserCode)))) throw new AccountError("invalid");
  return data as unknown as AccountVerificationCode;
}
export const sendPasswordUnlockCode = (accountId?: string) => sendAccountCode("/account/password/unlock/send", accountId);
export const sendPasswordChangeOtpCode = (accountId?: string) => sendAccountCode("/account/password/otp/send", accountId);
export async function unlockPasswordChangeWithCode(code: string, accountId?: string) {
  if (!/^\d{6}$/.test(code)) throw new AccountError("invalid");
  const id = await actionAccountId(accountId);
  const data = await accountRequest("/account/password/unlock", { code, accountId: id });
  if (data.accountId !== id || data.unlocked !== true || data.failures !== 0 || data.locked !== false) throw new AccountError("invalid");
  return { accountId: id, unlocked: true as const, failures: 0, locked: false as const };
}
export async function changeAccountPasswordWithOtp(currentPassword: string, newPassword: string, otpCode: string, accountId?: string) {
  if (!validPassword(newPassword)) throw new AccountActionError("password_invalid");
  if (currentPassword === newPassword) throw new AccountActionError("password_reused");
  if (!currentPassword || currentPassword.length > 128 || !/^\d{6}$/.test(otpCode)) throw new AccountError("invalid");
  const id = await actionAccountId(accountId);
  const data = await accountRequest("/account/password/change", { currentPassword, newPassword, otpCode, accountId: id });
  if (data.accountId !== id || data.changed !== true || data.sessionsRevoked !== true || typeof data.passwordChangedAt !== "string" || !Number.isFinite(Date.parse(data.passwordChangedAt))) throw new AccountError("invalid");
  announceSessionRevocation(id);
  return { accountId: id, changed: true as const, sessionsRevoked: true as const, passwordChangedAt: data.passwordChangedAt };
}
/** Closure: challenge is purpose/account-bound; both send and confirm must recheck authoritative assets. */
export const sendClosureVerificationCode = (accountId?: string) => sendAccountCode("/account/closure/code/send", accountId);
export async function confirmAccountClosureWithCode(code: string, accountId?: string) {
  if (!/^\d{6}$/.test(code)) throw new AccountError("invalid");
  const id = await actionAccountId(accountId);
  const data = await accountRequest("/account/closure/confirm", { code, accountId: id });
  if (data.accountId !== id || data.deleted !== true || data.sessionsRevoked !== true) throw new AccountError("invalid");
  announceSessionRevocation(id);
  return { accountId: id, deleted: true as const, sessionsRevoked: true as const };
}

export interface ClosureInput {
  cryptoBalance: number; cardBalance: number;
  items: readonly { status: string }[];
  transactions: readonly { status?: string; type: string }[];
}
export function closureReadiness(input: ClosureInput) {
  const held = input.items.filter(item => item.status === "IN_STORAGE").length;
  const shipping = input.items.filter(item => item.status === "SHIPPING_REQUESTED" || item.status === "SHIPPING").length;
  const pending = input.transactions.filter(tx => tx.status && !["COMPLETED", "CANCELLED", "FAILED", "REJECTED"].includes(tx.status)).length;
  // Unknown states and non-finite balances are not assumed settled.
  const unknown = input.items.some(item => !["IN_STORAGE", "SHIPPING_REQUESTED", "SHIPPING", "DELIVERED", "SOLD", "CANCELLED"].includes(item.status));
  const balance = input.cryptoBalance + input.cardBalance;
  const hasBalance = !Number.isFinite(balance) || input.cryptoBalance !== 0 || input.cardBalance !== 0;
  return { held, shipping, pending, hasBalance, unknown, eligible: !held && !shipping && !pending && !hasBalance && !unknown };
}
