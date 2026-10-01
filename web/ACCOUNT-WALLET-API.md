# Account and wallet integration

The default GitHub Pages flow now includes browser accounts, password signup/login,
nickname settings, Google Authenticator enrollment, and an account-scoped virtual
wallet. There is no separate mode switch. Login/signup use a centered, step-based
screen: email, password, then a six-digit email code for signup. The password field
supports show/hide; the email can be edited; recovery and resend stay in the same flow.
Google, Apple and Microsoft buttons share the OAuth-start contract below.

As explicitly requested, the browser transport accepts arbitrary nonempty email
identifiers and passwords, including short values and previously unseen accounts.
Any six digits work for signup, password recovery, OTP enrollment/removal, OTP
withdrawals, and email hold verification. No hidden switch or fixed code is needed.
These responses remain marked local and never claim verified email ownership.
Records and OTP secrets stay on the device. This is not an authentication boundary.
No email, real payment, or on-chain transfer occurs. Entered passwords are never
stored in plaintext.

Without API configuration, USDT/card inputs explicitly record virtual funds in the
ordinary wallet screens. Source balances remain separate. The email recovery screen
accepts any six-digit confirmation code. Nonempty withdrawal addresses may also
contain arbitrary values in the browser flow; amount/balance checks still apply.
Successful confirmation starts a real 72-hour local hold; expiry changes the request
to pending processing, never a fabricated transfer or transaction hash. Reconnecting
a production backend bypasses these browser services; local accounts and wallet
namespaces are not promoted to verified server identities or real balances.

Set `NEXT_PUBLIC_AUTH_API_BASE` and `NEXT_PUBLIC_API_BASE` at build time. The former
serves the account/security endpoints below; the latter serves the wallet endpoints.
The Pages workflow reads repository Actions variables with these exact names;
set them once the backend is ready and rebuild. Empty variables use browser accounts.
Both services must share authenticated sessions (or securely exchange identity on
the server). Never use a browser-supplied user ID as authentication.

Account and withdrawal requests use `credentials: include`, `cache: no-store`, a
15-second timeout, and `X-CSRF-Token` for mutations. Each service exposes
`GET /auth/csrf -> { token }`. Allow credentials only from the exact deployed origin,
enforce Origin/CSRF checks, and configure secure cookies for the deployment topology.
Errors: 401/403 authentication or invalid verification code, 409 conflict,
429 rate limit, other non-2xx network/service failure. Return JSON on success.

## Account and OTP

Existing login/session responses remain `{ user: { id, email, emailVerified: true,
createdAt, nickname? } }`. Nicknames are NFC-normalized, trimmed, 2–20 Unicode letters
or numbers, `_` or `-`. Enforce the same validation and uniqueness rules server-side.

| Method / path | Request | Response |
| --- | --- | --- |
| POST `/auth/signup` | `{ email, password, locale, acceptedTerms: true }` | `{ verificationRequired: true }` |
| POST `/auth/email/verify` | `{ email, code }` | `{ user }` and authenticated session cookie |
| POST `/auth/email/resend` | `{ email, locale }` | `{ accepted: true }` |
| POST `/auth/login` | `{ email, password }` | `{ user }` and authenticated session cookie |
| GET `/auth/session` | — | `{ user }` |
| POST `/auth/logout` | `{}` | `{ loggedOut: true }`, session invalidated |
| POST `/auth/password/reset-request` | `{ email, locale }` | `{ accepted: true }`; deliver a six-digit code |
| POST `/auth/password/reset` | `{ email, code, password }` or existing `{ token, password }` | `{ updated: true }`, one-use reset consumed |
| POST `/auth/oauth/start` | `{ provider: "google"\|"apple"\|"microsoft", returnTo }` | `{ redirectUrl }` |
| POST `/account/profile` | `{ nickname }` | `{ user }` with the saved nickname |
| GET `/account/security` | — | `{ twoFactorEnabled, enabledAt: ISO-string-or-null }` |
| POST `/account/security/totp/setup` | `{}` | `{ setupId, secret }` (16-character Base32 key for new setups; existing longer keys remain supported) |
| POST `/account/security/totp/enable` | `{ setupId, code }` | `{ twoFactorEnabled: true, enabledAt }` |
| POST `/account/security/totp/disable` | `{ code }` | `{ twoFactorEnabled: false, enabledAt: null }` |

The OAuth backend generates state/nonce and PKCE, validates an allowlisted return
URL, exchanges the provider code in its callback, sets the session cookie, then
redirects back. The client only accepts HTTPS redirects to accounts.google.com,
appleid.apple.com, login.microsoftonline.com, or login.live.com. Provider secrets
never enter the browser bundle. On return, /auth/session restores the identity.
The browser transport instead creates a persistent local provider identity.

Configuring either API base disables all arbitrary-value browser behavior, including
direct browser-service calls. Failed remote requests never fall back to local success.
Remote signup/recovery require a valid email and a 12–128-character password;
the backend must independently validate credentials/codes and expiry.

`tests/accountHttp.test.ts` exercises these clients against an actual local HTTP
server (no fetch interception): signup, verification/resend, login/session/logout,
reset, OAuth redirect validation, profile, OTP rejection, email hold, withdrawals,
cancellation and deposit confirmation. This verifies the integration contract,
not credentials or delivery by an external identity/mail/payment provider.

With a remote backend, the setup secret is held only in the mounted enrollment screen; the active secret
and OTP codes are never persisted to browser storage or displayed as an autofill.
QR codes use `otpauth://totp/`, SHA-1, six digits, and a 30-second period.
Implement [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238), encrypt secrets at rest,
expire pending setups, reject replayed codes, and rate-limit enrollment/verification.
Account switching/logout clears the in-memory security state. Legacy device-wide
`voila-security-v1` data is ignored and removed on startup.

## Withdrawal authorization

Every authorization is bound to the current cookie session and the exact immutable
draft `{ network, address, amountUsdt }`. A proof is short-lived and single-use.
Changing a draft requires verification again. Server rate limits persist across
closing/reopening a modal; three failed attempts lead the UI to email recovery.

| Method / path | Request | Response |
| --- | --- | --- |
| POST `/account/security/withdrawal/otp` | `{ ...draft, code }` | `{ authorization, method: "2FA_OTP" }` |
| POST `/account/security/withdrawal/email` | draft | `{ challengeId, emailMasked, expiresAt: epochMs }` |
| POST `/account/security/withdrawal/email/verify` | `{ ...draft, challengeId, code }` | `{ authorization, method: "EMAIL_72H_HOLD", emailMasked, unlockAt: epochMs }` |

Send email **only to the account's previously verified address**, never an address
chosen in the withdrawal form. Resending invalidates the previous challenge.
Set `unlockAt` to server verification time + 72 hours. Rate-limit sends and code
attempts, expire challenges, and consume each verification once.

## Wallet

| Method / path | Request | Response |
| --- | --- | --- |
| POST `/withdraw` | `{ ...draft, authorization, authMethod, requestId }` | `{ id, status, txHash?, unlockAt? }` |
| GET `/withdraw/:id` | — | `{ id, status, txHash?, unlockAt? }` |
| POST `/withdraw/:id/cancel` | `{}` | `{ id, status: "CANCELLED" }` after reservation release |

Accept only a valid, unconsumed authorization for the draft and account. Atomically
validate the authoritative crypto balance, reserve funds, create the withdrawal,
and consume the proof. Deduplicate requests by `(account, requestId)`. An ambiguous
network timeout must not create a second transfer on retry.

Statuses: `PENDING`, `PENDING_ADMIN_REVIEW`, `PENDING_72H_HOLD`, `BROADCASTING`,
`COMPLETED`, `CANCELLED`, `FAILED`. Email-authorized requests must initially be
`PENDING_72H_HOLD` with `unlockAt`. A server worker releases eligible requests only
after that timestamp and any required risk review. The client countdown never
triggers a transfer. Notify the account owner and support cancellation while funds
remain reserved. Cancellation and broadcasting must be mutually exclusive atomic
transitions. Refund reserved funds exactly once on cancellation/failure.

The history screen resumes polling nonterminal withdrawals after navigation or
reload and applies server-confirmed cancellation before showing returned funds.
Browser balances/history remain a display cache, not an authoritative ledger.
Production must supply authoritative balance/history synchronization across devices.

USDT `/deposit/check` must return a stable `txHash` for confirmed deposits, the
actual credited `amountUsdt`, and confirmation count. The client stores a pending
entry first, then settles that entry atomically and deduplicates by network + hash.
Server-side deduplication must additionally handle token transfer/log indexes when
multiple deposits occur in one transaction. Never trust the requested amount as a
confirmed amount. Card adapters must return a stable provider transaction ID only
after server/webhook confirmation; unsuccessful requests remain `FAILED` in history.
Card funds remain separate from crypto funds and cannot be withdrawn on chain.

Stripe/PortOne adapters are existing unimplemented provider stubs; their checkout
integration, merchant configuration, and authoritative ledger are separate backend
work. No payment credentials or real card details are needed for UI verification.
