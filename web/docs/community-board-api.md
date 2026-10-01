# Community board contract

The community UI uses the configured account/API origin and cookie session. No API origin uses the browser adapter with the same command validator and persistence; it does not provide cross-device publication. There are no seeded posts or automatically privileged accounts.

## Routes

- `GET /community/board`: `{ posts: BoardPost[], canPublishNotice: boolean }`. Public reading is allowed. Permissions belong to the current authenticated session, never a submitted user ID.
- `POST /community/board/commands`: accepts `BoardCommand` from `lib/board.ts` and returns the same snapshot after an atomic successful commit. Uses the existing `/auth/csrf` token, credentialed requests, and account API origin.
- Commands: `create`, `edit`, `delete`, `comment`, `editComment`, `deleteComment`. Edits and deletions carry the displayed post `revision`. Reject stale versions with HTTP 409. Increment the post revision for every mutation, including comments.
- Failures: 400/422 invalid input, 401 unauthenticated, 403 unauthorized, 404 removed, 409 revision conflict, 429 rate limit. Never return a success snapshot before committing.

## Server invariants

Use verified session identity for author ID and nickname. Do not expose account email or shipping details. Enforce the limits and ownership rules in `applyBoardCommand` on the server as well. `canPublishNotice` must come from an operator role in server-controlled account data. Only operators may publish notices, pin notices, or moderate others' content. Normal users may manage only their own posts and comments. Removing a post removes its comments transactionally. Apply server rate limits, moderation and durable backups before operating at scale.

Content is plain text; the frontend never interprets it as HTML. Titles: 2–100 characters; bodies: 5–10,000; comments: 1–1,000, up to 500 per post. The browser adapter uses Web Locks and a fresh storage read before each mutation to avoid stale-tab overwrites. It intentionally does not grant notice publication rights; connect an operator-capable API for publishing notices.

Links use `/[locale]/community/board?post=<id>`, and announcements use `?category=notice`. Drafts are isolated by account and post in session storage. Failed submissions preserve the draft. Browser persistence is not a substitute for server authorization or a shared database.
