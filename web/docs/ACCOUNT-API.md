# Account service contract

The web app does not manufacture accounts, OTP codes, email delivery or deletion acknowledgments. Set `NEXT_PUBLIC_AUTH_API_BASE` only to a service implementing this contract. It is a public HTTPS endpoint, not a secret. localhost HTTP is allowed for development. Missing configuration disables authentication submissions.

Requests include cookie credentials and use `Cache-Control: no-store` semantics. Every mutation first requests `GET /auth/csrf`; the JSON response must contain a server-issued `token` of at least 16 characters. The mutation sends it as `X-CSRF-Token`. The server must validate the token and Origin, use secure HttpOnly session cookies, configure CORS for the actual frontend origin, rate-limit authentication/recovery, and verify email ownership. Cross-site cookies may be blocked by browsers: use a same-site account service for production. Do not place passwords or tokens in logs.

| Endpoint | Request JSON | Required response |
| --- | --- | --- |
| `GET /auth/session` | — | `{ "user": { "id": "…", "email": "…", "createdAt": "ISO timestamp", "emailVerified": true } }` |
| `POST /auth/login` | `email`, `password` | Same user response and server session cookie |
| `POST /auth/signup` | `email`, `password`, `locale`, `acceptedTerms: true` | `{ "verificationRequired": true }` after accepting the verification workflow |
| `POST /auth/password/reset-request` | `email`, `locale` | `{ "accepted": true }`, with identical response for nonexistent accounts |
| `POST /auth/password/reset` | `token`, `password` | `{ "updated": true }` only after validating a single-use, expiring token and changing the password |
| `POST /auth/logout` | `{}` | `{ "loggedOut": true }` after revoking the session |
| `POST /account/closure` | `password`, `confirm: true` | `{ "deleted": true }` only after successful closure |

Verification email links must terminate at the server to confirm ownership, then redirect to the requested language's profile page. Recovery emails link to `/{locale}/profile/#reset_token=…` under the frontend's configured base path. The page immediately removes the token from the address bar and keeps it only in component memory. Tokens must be single-use and expire; do not accept an email address as a token. Server password validation must enforce the same 12–128 character boundary and secure password hashing. Changing passwords must revoke other sessions.

Error handling: `401`/`403` → credentials/verification error, `409` → unresolved assets or transactions, `429` → retry later, other failure responses → service error. Never send an HTML success page or an empty response for these endpoints; the client rejects malformed acknowledgments.

Closure must authenticate and reauthenticate the user, atomically lock new transactions, re-check authoritative crypto/card balances, stored items, unfulfilled deliveries, pending deposits/withdrawals, refunds, disputes and legal holds, and only then perform the deletion/retention workflow. Browser readiness checks are advisory, not authorization. Do not erase assets or force a user to buy more to settle an account. Provide a manual residual-balance/card-refund resolution channel before enabling closure for real accounts. Completed deliveries and sold items alone do not prevent closure. Preserve legally required transaction history with the documented retention controls.

The current wallet and inventory stores remain browser storage and are not evidence of server ownership. Connecting this auth contract alone does not turn them into an account ledger. Production deployment must connect the authenticated ledger/inventory/orders and enforce authorization on every corresponding endpoint before financial or fulfillment operations are enabled. Never share one browser's local funds across multiple authenticated users.
