# Public product review API contract

The published review feed is shared across visitors through the configured account API. When `NEXT_PUBLIC_AUTH_API_BASE` / `NEXT_PUBLIC_API_BASE` is absent, the browser adapter remains private to that browser profile and cannot publish to other people; a static GitHub Pages site has no shared database of its own.

## Routes

- `GET /community/reviews`: public, read-only response `{ reviews: MyReview[] }`, ordered newest first. Include only published records. Return the current author's display nickname and avatar URL, never account email, shipping details, or private item data.
- `POST /community/reviews/commands`: cookie-authenticated and CSRF-protected. Accept `create` (`clientReviewId`, `ownedId`, `text`, `rating`, optional `photo`), `update` (`id`, `text`, `rating`, optional `photo`), or `delete` (`id`). Return `{ reviews: MyReview[] }` after the transaction commits.
- The server derives author ID, nickname and avatar from the verified session. It validates that the owned item belongs to that account, is an eligible non-cash win worth at least 100 USDT, and has no existing review. The client-provided review ID is only an idempotency key, never proof of ownership.
- Enforce 5–1200 text characters, integer rating 1–5, safe raster image limits, per-account ownership for edit/delete, CSRF/origin checks, rate limits, and durable storage. Apply create/update/delete atomically; do not report success until committed.
- Return 401/403 for session or ownership failures, 404 for removed reviews, 409 for duplicate/stale mutations, 422 for invalid content, and 429 for rate limits.

The frontend refreshes the public feed on entry, window focus, and every 30 seconds. It also updates the currently open feed immediately after its own successful mutation. Profile pictures come from the member's saved account avatar; no synthetic people or review records are generated.
