# Profile API contract

The profile UI uses the existing cookie session and CSRF transport in `web/lib/account.ts`.
When `NEXT_PUBLIC_AUTH_API_BASE` is configured, all calls below go to that server;
server errors never fall back to browser acceptance. Without a configured server,
the browser transport implements the same routes and persists changes per account.
Browser nickname uniqueness applies to accounts stored in that browser. Global
uniqueness requires the server database described below.

## Routes

All mutations are POST requests with `credentials: include`, JSON bodies and the
`X-CSRF-Token` obtained from `GET /auth/csrf`.

| Route | Request | Success |
| --- | --- | --- |
| `/account/profile/nickname/check` | `{ nickname }` | `{ nickname: normalizedNickname, available: boolean }` |
| `/account/profile` | `{ nickname, accountId? }` | `{ user: ServerAccount }` |
| `/account/profile/avatar` | `{ avatar: rasterDataUrlOrNull, accountId? }` | `{ user: ServerAccount }` |
| `/auth/session` | GET | `{ user: ServerAccount }` including profile fields |

`ServerAccount` includes `nickname`, `nicknameChangedAt`,
`nextNicknameChangeAt`, and `avatarUrl` (HTTPS URL or null). A nickname save must
return both ISO-8601 UTC timestamps. Avatar upload must return the resulting URL;
removal must return `avatarUrl: null`. Return the entire current account so a photo
change does not erase nickname dates. A supplied `accountId` must match the session;
it is an account-switch guard, never authorization by itself.

## Nickname integrity

- Use the shared NFKC normalization and lowercase key from `profilePolicy.ts`.
- Enforce 2–20 Unicode characters; letters, numbers, `_`, `-` only. Reject control,
  invisible, prohibited and staff-impersonating expressions. Maintain and expand
  the server moderation dictionary; a small static dictionary cannot detect every
  contextual insult or new evasion. Do not reject a whole language or nationality.
- Availability checks do not reserve a name. On save, atomically check the session,
  cooldown and unique nickname key. A database unique constraint must arbitrate
  simultaneous writes. Do not rely on client checks or a preflight response.
- First assignment and each actual change record server time and start a 14 × 24-hour
  interval. An identical no-op does not extend the interval. Legacy accounts without
  a change timestamp may change once; migration must preserve known historical dates.
- Return `409 { code: "nickname_taken" }` or
  `409 { code: "nickname_cooldown", nextNicknameChangeAt: ISODate }`.
- Return 400/422 with `code` equal to `nickname_length`, `nickname_format`,
  `nickname_prohibited`, `nickname_reserved`, or `avatar_invalid` for those failures.
- Apply rate limits to checks and mutations; retain existing 401/403/429 behavior.

## Images

The UI accepts JPEG/PNG/WebP up to 5 MB, provides zoom and position controls,
and re-encodes a 384 × 384 JPEG (metadata removed) before upload. The transport
limits data URLs to 350,000 characters and rejects SVG/HTML/arbitrary URL uploads.
The server must independently decode the image, enforce dimensions and byte limits,
re-encode it, apply content moderation as required, and store under an opaque account
asset key. Return a trusted HTTPS asset URL. Replace/remove only that account's old
asset after committing the replacement. Never fetch an arbitrary user-supplied URL.
