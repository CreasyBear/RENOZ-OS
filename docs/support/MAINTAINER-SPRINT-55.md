# Support Maintainer Sprint 55

This sprint follows Sprint 54's CSAT feedback-link cleanup into internal CSAT entry. The target is `CsatEntryDialog`: internal feedback submit failures should be formatted before display while preserving the dialog's pending-state guards and retry behavior.

Status: Closed after Issue 1.

## Business Value

Operators may record customer satisfaction feedback gathered by phone or direct conversation. If that save fails, the operator needs safe, action-oriented copy and the dialog should remain open for retry without leaking raw server or database detail.

## Workflow Spine

Authenticated support issue context
-> `CsatDisplayCard`
-> `CsatEntryDialog`
-> `onSubmit`
-> `useSubmitInternalFeedback`
-> `submitInternalFeedback` server function and schema
-> `queryKeys.support.csatDetail`, `queryKeys.support.csatList`, and `queryKeys.support.csatMetrics`
-> safe dialog feedback and retryable form state.

## Architecture Constraints

- Keep this sprint to internal CSAT entry submit feedback.
- Do not change CSAT server functions, schemas, rating/comment fields, pending dialog guards, query keys, cache updates, or success behavior.
- Keep the dialog open on failed submit.
- Do not run serialized gates for this slice; serialized lineage is closed baseline unless a future diff touches serialized lineage or inventory identity.

## Issue Ledger

### 1. Internal CSAT Entry Feedback Boundary

Problem:

- `CsatEntryDialog` imported `sonner` directly.
- Submit failures displayed raw `Error.message` text.
- Duplicate submission, missing issue, permission, auth, and rate-limit failures had no CSAT-specific operator copy.

Workflow protected:

CSAT display card -> internal entry dialog -> submit callback -> internal feedback mutation hook -> CSAT server function/schema -> issue feedback/list/metrics cache updates -> safe dialog feedback and retryable state.

Implemented slice:

- Moved `CsatEntryDialog` to the shared toast adapter.
- Added local CSAT entry error formatting through the shared support formatter with entry-specific copy.
- Routed failed internal feedback submissions through the formatter.
- Added a source contract to protect the dialog feedback boundary.

Out of scope:

- CSAT display card wiring into live issue detail surfaces.
- CSAT feedback-link behavior, closed in Sprint 54.
- Public CSAT feedback route behavior, closed in Sprint 53.
- CSAT server function behavior, query keys, cache policy, and dashboard read states.

Closeout:

- Touched domains: support CSAT entry dialog, internal feedback submit feedback, support tests, support sprint evidence.
- Workflow protected: authenticated issue context -> `CsatDisplayCard` -> `CsatEntryDialog` -> `onSubmit` -> `useSubmitInternalFeedback` -> `submitInternalFeedback` server function/schema -> existing CSAT detail/list/metrics cache policy -> safe dialog feedback and retryable form state.
- Business value protected: operators can retry failed internal CSAT saves without raw infrastructure messages or losing the dialog state.
- Architecture standards checked: component/callback/hook/server/schema/query-key flow unchanged; pending dialog guards unchanged; success close/refresh behavior unchanged; CSAT server functions, schemas, and query keys unchanged.
- Tenant isolation and data integrity checked: no organization predicate, issue lookup, duplicate-feedback check, transaction, rating/comment write path, or permission boundary changed.
- Query/cache contract checked: `useSubmitInternalFeedback` still writes the issue feedback detail cache and invalidates CSAT list/metrics keys as before.
- Smells removed: direct `sonner` import in `CsatEntryDialog`; raw internal CSAT submit failure display; missing CSAT-specific copy for common mutation failure codes.
- Smells deferred: `CsatDisplayCard` appears exported but not currently referenced by a route; CSAT dashboard read states still need review; broader support read-state raw query messages remain.
- Gates run: `./node_modules/.bin/vitest run tests/unit/support/csat-entry-feedback-contract.test.ts tests/unit/support/csat-feedback-link-contract.test.ts tests/unit/support/public-feedback-error-contract.test.ts tests/unit/support/support-mutation-errors.test.ts` (4 files, 8 tests); source scan for `CsatEntryDialog` raw-toast/raw-error patterns; `./node_modules/.bin/vitest run tests/unit/support` (55 files, 189 tests); `bun run typecheck`; `bun run lint`; `git diff --check`.
- Gates skipped: browser QA, because this was a mutation feedback contract slice and the component appears dormant in current route usage; serialized gates, by maintainer direction, because serialized lineage is closed baseline and this slice did not touch serialized lineage or inventory identity.
- Goal adaptations: declined. The existing maintainer process and risk-selected gate policy fit this slice.
- Residual risk: the next CSAT slice should verify whether CSAT components are wired into issue detail, then clean dashboard/support read-state copy if live.
