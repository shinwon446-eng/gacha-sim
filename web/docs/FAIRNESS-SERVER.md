# Fairness: requirements before paid operation

Updated: 2026-09-29. This document concerns the current implementation, not a certification of the operator or its service.

## What the current verifier proves

`components/fairness/verifyRecord.ts` recomputes the saved seed hash and draw number, then checks the received item against the exact ordered odds snapshot saved at opening. Missing historical snapshots produce a partial result; the verifier never substitutes the latest catalogue. A match establishes consistency of the supplied record. It does not establish when the commitment was published or whether the entire record was replaced.

`SHA-256(seed)` commits only to the seed. It does not commit to an odds table, price, client input, draw counter, operator identity or publication time. Browser storage and a downloadable JSON file are editable evidence, not authenticated receipts.

## Blocking engineering requirements

| Current evidence | Requirement before paid openings |
| --- | --- |
| `stores/fairStore.ts` generates and persists `serverSeed` in browser storage. | Generate and retain unrevealed seeds on the trusted backend. Never send an active secret seed to the browser, logs, analytics or client bundles. |
| The current session seed is revealed in results and may be reused; `setClientSeed` resets the local counter. | Give every opening a unique, server-assigned `(seedId, nonce)` pair. Retire a seed before revealing it, and reject all future purchases against that seed. Keep counters monotonic within the seed lifecycle, including client-input changes and concurrent requests. |
| A locally displayed hash has no independent publication timestamp. | Issue an authenticated commitment receipt before accepting the purchase. Bind seed hash, immutable odds-table hash/version, algorithm version, box, price and expiry. Record the user-selected client input after the commitment, then include it in the accepted order. Retain an append-only audit log and provide independent timestamp or publication evidence. |
| The browser holds the values used to reproduce outcomes. | Calculate and authorize paid outcomes on the server. Accept no client-supplied winner, roll, balance, refund amount, counter or proof as authoritative. Validate account, availability, funding source and idempotency before resolving an opening. |
| Debit, inventory and opening data are represented in client stores. | Commit order, debit, outcomes, odds snapshot and inventory/credit entries in one durable database transaction. A repeated request must return the same order and never charge or award twice. Closing an animation must have no effect on this transaction. |
| `lib/fairness.ts` maps the first 32 HMAC bits with `% 1_000_000`. | Keep this mapping for historical receipts. Before selecting a production RNG algorithm, remove modulo bias using a reviewed rejection-sampling procedure, assign a new algorithm version, and preserve old verification paths. Do not silently reinterpret existing receipts. |

### Exact mapping issue

`2^32 = 4,294 × 1,000,000 + 967,296`. Under a uniform 32-bit input, numbers `0–967,295` each have 4,295 input representations; numbers `967,296–999,999` each have 4,294. Therefore the current modulo mapping is not perfectly uniform over one million positions. A valid probability table summing to 100% does not remove this bias. Historical repeatability and statistical fairness are separate checks.

### Minimum authoritative receipt

Store and export: order ID, opening ID, authenticated account reference, seed ID, commitment receipt/signature and timestamp, revealed retired seed, client input, nonce, RNG algorithm version, exact ordered item IDs and probabilities, odds-table version and hash, box price/currency, roll, awarded item/value, ledger references and resolution timestamp. Product metadata used for an old award must not be overwritten by a later catalogue revision. Do not include personal shipping data or authentication secrets in a public proof.

## Release tests

- Verify fixed independent known-answer vectors for hashing, HMAC, mapping and every supported algorithm version. Exhaustively test item-range boundaries and probability resolution.
- Confirm an unrevealed seed cannot be retrieved through browser state, APIs, logs, source maps or result receipts. A revealed seed must be unusable for a new paid request.
- Run concurrent purchases and retries across tabs/devices. Every opening must have one unique counter, one debit and one outcome; timeouts must recover the same committed order.
- Verify old receipts after catalogue and algorithm upgrades. Missing or unsupported evidence must remain partial/unsupported, never silently pass.
- Change a seed, client input, nonce, probability, item, price and receipt signature independently. Each relevant check must reject the changed evidence.
- Review entropy generation, seed selection/rotation, selective request rejection, refunds and publication ordering independently. Hash agreement alone cannot rule out outcome selection before commitment or selective cancellation.

The current UI intentionally reports “comparisons match” rather than “operator certified fair.” Hash terminology follows the [NIST Secure Hash Standard](https://csrc.nist.gov/pubs/fips/180-4/upd1/final), which describes message digests as a way to detect changes to content.
