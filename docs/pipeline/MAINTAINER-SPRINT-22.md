# Pipeline Maintainer Sprint 22

## Status

Closed in commit-ready state.

## Issue 1: Extended Opportunity Detail Hook Read Fallbacks Were Still Inline

### Problem

After the Pipeline opportunity, metrics, quote, and activity hook fallback cleanups, `use-opportunity-detail-extended` still normalized alerts and active-items read failures with inline fallback strings. These reads feed the opportunity detail 5-zone layout and should use the same Pipeline read-state map as the rest of the opportunity read spine.

### Workflow Spine

Opportunity detail extended hooks
-> opportunity alert/active-item server functions
-> `requireReadResult` / `normalizeReadQueryError`
-> Pipeline read-state message map
-> opportunity detail alerts and overview active-items presenters.

### Touched Domains

- Pipeline extended opportunity detail read hooks.
- Pipeline read-error message helper.
- Pipeline read-state/read-error contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Alerts and active items keep operators focused on expiring quotes, overdue follow-ups, stale deals, and pending next steps. Their read failures should remain auditable and consistent with the Pipeline read-error contract.

### Scope Constraints

- Do not change alert or active-item query keys, query options, server functions, schemas, limits, warning thresholds, result shapes, cache policy, loading behavior, or UI rendering.
- Keep this as extended detail hook read-normalization copy only.

### Changes

- Added Pipeline read fallback copy for opportunity alerts.
- Added Pipeline read fallback copy for opportunity active items.
- Routed `useOpportunityAlerts` read normalization fallbacks through `PIPELINE_READ_MESSAGES.opportunityAlerts`.
- Routed `useOpportunityActiveItems` read normalization fallbacks through `PIPELINE_READ_MESSAGES.opportunityActiveItems`.
- Extended focused Pipeline source contracts so `use-opportunity-detail-extended` cannot reintroduce literal `fallbackMessage` copy.

### Standards Checked

- Domain ownership: extended opportunity detail read-normalization copy now lives in the Pipeline read-error helper.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: improved the extended detail hook -> read-error contract; server functions, schemas, database predicates, query keys, and cache policy stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicates, schemas, or writes touched.
- Query/cache contract: unchanged; query keys, stale times, refetch-on-focus behavior, enabled conditions, and result contracts stayed unchanged.
- Transactional inventory and finance integrity: unchanged; no inventory, fulfillment, order conversion, finance, or costing path touched.
- Honest UI states/operator-safe errors: improved by removing duplicated hook fallback copy that could drift from the Pipeline read-state map.
- Reviewability: bounded diff across one helper, one hook file, focused tests, and this closeout.

### Smells Removed

- Inline opportunity alerts fallback strings inside extended opportunity detail hooks.
- Inline opportunity active-items fallback strings inside extended opportunity detail hooks.
- Missing source contract preventing hook-level literal `fallbackMessage` copy from returning in `use-opportunity-detail-extended`.

### Deferred

- Browser QA remains deferred because this source-covered slice changes hook fallback constants, not layout or browser interaction.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/pipeline-read-error-messages.test.ts tests/unit/pipeline/pipeline-read-state-contract.test.ts` - 2 files, 6 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: full Pipeline hook source scan for literal `fallbackMessage` read copy and literal unavailable/not-found read copy.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The serialized-gates adaptation from Sprint 18 stands: serialized gates are conditional, not routine, and this sprint did not touch serial identity or inventory lineage.

### Residual Risk

Low for the targeted extended opportunity detail hook fallback copy. Pipeline hook-level literal read fallback strings are now removed from the scanned Pipeline hook set; future Pipeline read states can still drift if new hooks are added without extending the source contracts.
