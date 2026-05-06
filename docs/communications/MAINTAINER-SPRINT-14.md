# Communications Maintainer Sprint 14

## Status

Closed in commit-ready state.

## Issue 1: Template And Signature Cached Read-State Copy

### Problem

Email template and signature pages still rendered direct `error.message` text in cached-degraded states. Their hooks already normalize list read failures, but the route display boundary bypassed the communications-owned read-state formatter. That left reusable customer communication content surfaces trusting raw error shape while showing cached data.

### Workflow Spine

Communications templates/signatures routes
-> `TemplatesPage` and `SignaturesPage`
-> `useTemplates` and `useSignatures`
-> email template/signature server functions
-> template/signature schemas and database records
-> centralized template/signature list query keys
-> normalized read-query error
-> communications-owned read-state formatter
-> operator-safe cached-degraded copy.

### Touched Domains

- Communications template route read-state UI.
- Communications signature route read-state UI.
- Communications read-state copy helper.
- Communications read-state tests.
- Communications query normalization tests.
- Communications maintainer closeout docs.

### Business Value Protected

Templates and signatures are reusable communication assets for campaigns, sales, orders, warranty, support, and customer follow-up. Operators should be able to keep working from cached template/signature data during refresh failures without seeing backend, provider, or database details.

### Scope Constraints

- Do not change template/signature routes, filters, list rendering, editors, delete/default actions, mutation failure copy, success copy, hook normalization behavior, server functions, tenant predicates, query keys, cache invalidation, template versioning, signature persistence, or cold-load ErrorState behavior.
- Preserve the existing read contracts: template and signature list reads remain `always-shaped`.
- Keep this as cached read-state copy only.
- Serialized gates remain retired from routine closeout evidence and were not run for this communications slice because it does not touch serial lineage, inventory identity, warranty/RMA continuity, serialized movement, or repair scripts.

### Changes

- Added template and signature fallbacks to `COMMUNICATION_READ_MESSAGES`.
- Routed cached template degradation copy through `formatCommunicationReadError`.
- Routed cached signature degradation copy through `formatCommunicationReadError`.
- Extended focused read-state source coverage so template and signature read states stay behind communications-owned copy.

### Standards Checked

- Domain ownership: template and signature cached read-state copy now uses the communications read formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only the UI display boundary after the existing list reads fail with cached data available.
- Query/cache policy: unchanged. Template/signature query keys, stale times, cache behavior, and invalidation behavior were not changed.
- Tenant isolation/data integrity: unchanged. Template/signature reads still flow through existing server functions and tenant predicates.
- UI states/error handling: strengthened. Cached template and signature states no longer render direct `error.message` text.
- Reviewability: the diff is limited to fallback constants, two alert message call sites, focused tests, and this closeout note.

### Smells Removed

- Direct `<span>{error.message}</span>` rendering for cached template degradation.
- Direct `<span>{error.message}</span>` rendering for cached signature degradation.
- Missing source coverage that template/signature cached read states use communications-owned copy.

### Deferred

- Template/signature cold-load ErrorState copy remains generic but does not expose raw error text; it can be reviewed separately if product copy needs refinement.
- Other communications read-state surfaces still render normalized query messages directly and need separate review: inbox list/detail, scheduled emails, scheduled calls, analytics, campaign preview, email history, and email preview.
- Template filters, template version actions, editors, signature editor, delete/default actions, and list rendering were not changed.
- Browser QA was not run because this is cached read-state copy behavior with no intended route or visual layout change.

### Gates

- Passed: focused communication read-state tests, `./node_modules/.bin/vitest run tests/unit/communications/communication-read-error-messages.test.ts tests/unit/communications/query-normalization-wave4d.test.tsx` - 2 files, 9 tests.
- Passed: targeted source scan for template/signature read formatter wiring, fallback constants, query keys, normalization, and removed direct template/signature cached `<span>{error.message}</span>` rendering.
- Passed: broader communications suite, `./node_modules/.bin/vitest run tests/unit/communications` - 13 files, 59 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is cached read-state copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, and deploy gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, or production release paths.
- Retired for routine closeout: serialized gate evidence. It remains relevant only for direct serial lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair-script work.

### Goal Adaptation

Declined. The standing maintainer goal already covers honest UI states, operator-safe errors, query/cache contracts, tenant isolation, meaningful tests, and risk-selected evidence.

### Residual Risk

Low for template and signature cached read-state copy. Remaining communications read-state risk is broader and should continue as small surface-specific slices rather than a large communications sweep.
