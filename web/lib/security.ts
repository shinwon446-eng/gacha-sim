import { AccountError, accountRequest } from "./account";
import type { Network } from "./depositAddress";

export interface SecurityStatus { twoFactorEnabled: boolean; enabledAt: string | null }
export interface WithdrawalDraft { network: Network; address: string; amountUsdt: number }
export interface WithdrawalProof { authorization: string; method: "2FA_OTP" | "EMAIL_72H_HOLD"; unlockAt?: number; emailMasked?: string }
function statusFrom(data: Record<string, unknown>): SecurityStatus {
  if (typeof data.twoFactorEnabled !== "boolean" || (data.twoFactorEnabled && (typeof data.enabledAt !== "string" || !Number.isFinite(Date.parse(data.enabledAt))))) throw new AccountError("invalid");
  return { twoFactorEnabled: data.twoFactorEnabled, enabledAt: data.twoFactorEnabled ? data.enabledAt as string : null };
}
export async function getSecurityStatus() { return statusFrom(await accountRequest("/account/security")); }
export async function beginTotpSetup() {
  const data = await accountRequest("/account/security/totp/setup", {});
  if (typeof data.setupId !== "string" || !data.setupId || typeof data.secret !== "string" || !/^[A-Z2-7]{32,128}$/.test(data.secret)) throw new AccountError("invalid");
  return { setupId: data.setupId, secret: data.secret };
}
export async function confirmTotpSetup(setupId: string, code: string) {
  if (!/^\d{6}$/.test(code)) throw new AccountError("invalid");
  const result = statusFrom(await accountRequest("/account/security/totp/enable", { setupId, code }));
  if (!result.twoFactorEnabled) throw new AccountError("invalid");
  return result;
}
export async function disableTotp(code: string) {
  if (!/^\d{6}$/.test(code)) throw new AccountError("invalid");
  const result = statusFrom(await accountRequest("/account/security/totp/disable", { code }));
  if (result.twoFactorEnabled) throw new AccountError("invalid");
  return result;
}
function proofFrom(data: Record<string, unknown>, method: WithdrawalProof["method"]): WithdrawalProof {
  if (typeof data.authorization !== "string" || !data.authorization || data.method !== method) throw new AccountError("invalid");
  if (method === "EMAIL_72H_HOLD" && (typeof data.unlockAt !== "number" || !Number.isFinite(data.unlockAt) || typeof data.emailMasked !== "string")) throw new AccountError("invalid");
  return { authorization: data.authorization, method, ...(method === "EMAIL_72H_HOLD" ? { unlockAt: data.unlockAt as number, emailMasked: data.emailMasked as string } : {}) };
}
export async function verifyWithdrawalOtp(draft: WithdrawalDraft, code: string) {
  if (!/^\d{6}$/.test(code)) throw new AccountError("invalid");
  return proofFrom(await accountRequest("/account/security/withdrawal/otp", { ...draft, code }), "2FA_OTP");
}
export async function sendWithdrawalEmail(draft: WithdrawalDraft) {
  // Backend sends only to the account's previously verified email, never an arbitrary address.
  const data = await accountRequest("/account/security/withdrawal/email", draft);
  if (typeof data.challengeId !== "string" || !data.challengeId || typeof data.emailMasked !== "string" || typeof data.expiresAt !== "number" || !Number.isFinite(data.expiresAt)) throw new AccountError("invalid");
  return { challengeId: data.challengeId, emailMasked: data.emailMasked, expiresAt: data.expiresAt, browserCode: typeof data.browserCode === "string" ? data.browserCode : undefined };
}
export async function verifyWithdrawalEmail(draft: WithdrawalDraft, challengeId: string, code: string) {
  if (!/^\d{6}$/.test(code)) throw new AccountError("invalid");
  return proofFrom(await accountRequest("/account/security/withdrawal/email/verify", { ...draft, challengeId, code }), "EMAIL_72H_HOLD");
}
