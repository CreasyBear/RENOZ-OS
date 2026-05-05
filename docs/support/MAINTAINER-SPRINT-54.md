# Support Maintainer Sprint 54

This sprint follows Sprint 53's public CSAT feedback cleanup into the authenticated CSAT feedback-link control. The target is `CsatDisplayCard`: feedback-link generation failures should be operator-safe, and generated links should remain available even when clipboard copy is blocked.

Status: Closed after Issue 1.

## Business Value

CSAT feedback links are how operators request post-resolution support feedback from customers. If generation or copy fails with raw infrastructure detail, operators lose confidence. If the link is generated but clipboard access is blocked, the operator should still be able to copy it manually.

## Workflow Spine

Authenticated support issue context
-> `CsatDisplayCard`
-> `onGenerateFeedbackLink`
-> `useGenerateFeedbackToken`
-> `generateFeedbackToken` server function and schema
-> generated public feedback URL
-> safe operator feedback, clipboard copy, and manual-copy fallback.

## Architecture Constraints

- Keep this sprint to authenticated CSAT feedback-link generation/copy feedback.
- Do not change CSAT server functions, token lifecycle, token schema, issue resolution rules, query keys, or mutation side effects.
- Keep the component callback contract intact.
- Do not touch public `/feedback/$token`, which was closed in Sprint 53.
- Do not run serialized gates for this slice; serialized lineage is closed baseline unless a future diff touches serialized lineage or inventory identity.

## Issue Ledger

### 1. Authenticated CSAT Feedback Link Boundary

Problem:

- `CsatDisplayCard` imported `sonner` directly.
- Link generation failures displayed raw `Error.message` text.
- If token generation succeeded but clipboard copy failed, the operator had no visible generated link to copy manually.

Workflow protected:

CSAT display card -> `onGenerateFeedbackLink(issueId)` -> feedback-token mutation hook -> token generation server function/schema -> generated URL -> clipboard copy or manual-copy fallback.

Implemented slice:

- Moved `CsatDisplayCard` to the shared toast adapter.
- Added local CSAT link error formatting through the shared support formatter with link-specific copy.
- Routed link-generation failures through the formatter.
- Preserved the generated feedback URL in component state before attempting clipboard copy.
- Added a read-only manual-copy field and copy button for generated feedback links.
- Added a source contract to protect the feedback-link boundary.

Out of scope:

- Internal CSAT entry dialog mutation feedback.
- Wiring `CsatDisplayCard` into an issue detail surface if it is currently dormant.
- CSAT token generation server behavior.
- Public CSAT feedback route behavior.
- CSAT metrics/dashboard read states.

Closeout:

- Touched domains: support CSAT display card, feedback-link generation/copy feedback, support tests, support sprint evidence.
- Workflow protected: authenticated issue context -> `CsatDisplayCard` -> `onGenerateFeedbackLink` -> `useGenerateFeedbackToken` -> `generateFeedbackToken` server function/schema -> generated feedback URL -> safe generation feedback and copy/manual-copy behavior.
- Business value protected: operators do not lose generated feedback links when clipboard access fails, and generation failures no longer leak raw error text.
- Architecture standards checked: component/hook/server/schema/query-key flow unchanged; component callback contract unchanged; server functions, token lifecycle, issue status rules, and query keys unchanged.
- Tenant isolation and data integrity checked: no organization predicate, issue lookup, token insert, rate-limit behavior, database write path, or public-feedback boundary changed.
- Query/cache contract checked: `useGenerateFeedbackToken` mutation behavior remains unchanged and still owns no cache writes.
- Smells removed: direct `sonner` import in `CsatDisplayCard`; raw feedback-link generation failure display; generated-link loss when clipboard copy fails.
- Smells deferred: `CsatEntryDialog` still owns raw internal-feedback mutation failure copy; `CsatDisplayCard` appears exported but not currently referenced by a route; CSAT dashboard read states still need review.
- Gates run: `./node_modules/.bin/vitest run tests/unit/support/csat-feedback-link-contract.test.ts tests/unit/support/public-feedback-error-contract.test.ts tests/unit/support/support-mutation-errors.test.ts` (3 files, 7 tests); source scan for `CsatDisplayCard` raw-toast/raw-error/generated-link-loss patterns; `./node_modules/.bin/vitest run tests/unit/support` (54 files, 188 tests); `bun run typecheck`; `bun run lint`; `git diff --check`.
- Gates skipped: browser QA, because this component appears dormant in current route usage and the slice is contract-covered; serialized gates, by maintainer direction, because serialized lineage is closed baseline and this slice did not touch serialized lineage or inventory identity.
- Goal adaptations: declined. The existing maintainer process and risk-selected gate policy fit this slice.
- Residual risk: the next support CSAT slice should either wire/review `CsatDisplayCard` in the active issue detail workflow or clean `CsatEntryDialog` mutation feedback, depending on which path is live.
