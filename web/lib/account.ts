/** Shared account contract; browser and HTTP transports use the same routes. */
export class AccountError extends Error {
  constructor(public readonly code: "unavailable" | "network" | "invalid" | "credentials" | "rateLimit" | "conflict") { super(code); }
}

export function validAuthBase(raw: string): string {
  try {
    const url = new URL(raw);
    if (url.username || url.password || url.search || url.hash) return "";
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) return "";
    return url.href.replace(/\/+$/, "");
  } catch { return ""; }
}
export const AUTH_API_BASE = validAuthBase(process.env.NEXT_PUBLIC_AUTH_API_BASE ?? "");
export const browserAccountsEnabled = () => !AUTH_API_BASE && !process.env.NEXT_PUBLIC_API_BASE;
export const accountConfigured = () => Boolean(AUTH_API_BASE) || browserAccountsEnabled();
export const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) && value.length <= 254;
export const validPassword = (value: string) => value.length >= 12 && value.length <= 128;
export const validAccountEmail = (value: string) => browserAccountsEnabled() ? value.trim().length > 0 && value.length <= 254 : validEmail(value);
export const validAccountPassword = (value: string) => browserAccountsEnabled() ? value.length > 0 && value.length <= 128 : validPassword(value);

export const normalizeNickname = (value: string) => value.normalize("NFC").trim();
const nicknamePattern = new RegExp("^[\\p{L}\\p{N}_-]{2,20}$", "u");
export const validNickname = (value: string) => nicknamePattern.test(normalizeNickname(value));
export interface ServerAccount { id: string; email: string; createdAt: string; emailVerified: boolean; nickname?: string; local?: boolean }
function accountFrom(data: unknown): ServerAccount {
  const user = (data as { user?: ServerAccount })?.user;
  if (!user || typeof user.id !== "string" || !user.id || typeof user.email !== "string" || !(browserAccountsEnabled() && user.local === true ? validAccountEmail(user.email) : validEmail(user.email)) || typeof user.createdAt !== "string" || !Number.isFinite(Date.parse(user.createdAt)) || (user.emailVerified !== true && !(browserAccountsEnabled() && user.local === true))) throw new AccountError("invalid");
  if (user.nickname !== undefined && (typeof user.nickname !== "string" || !validNickname(user.nickname))) throw new AccountError("invalid");
  return user;
}

export async function updateAccountNickname(nickname: string) {
  if (!validNickname(nickname)) throw new AccountError("invalid");
  return accountFrom(await accountRequest("/account/profile", { nickname: normalizeNickname(nickname) }));
}

/** Cookie session + server-issued CSRF token. Backend must enforce Origin, rate limits and current asset balances. */
export async function accountRequest(path: string, body?: unknown, base = AUTH_API_BASE): Promise<Record<string, unknown>> {
  if (!base && browserAccountsEnabled() && typeof window !== "undefined") return (await import("./browserAccount")).browserAccountRequest(path, body);
  if (!validAuthBase(base)) throw new AccountError("unavailable");
  const request = async (route: string, init: RequestInit = {}) => {
    let response: Response;
    try { response = await fetch(`${base}${route}`, { ...init, credentials: "include", cache: "no-store", signal: AbortSignal.timeout(15000) }); }
    catch { throw new AccountError("network"); }
    if (!response.ok) throw new AccountError(response.status === 429 ? "rateLimit" : response.status === 409 ? "conflict" : response.status === 401 || response.status === 403 ? "credentials" : "network");
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
