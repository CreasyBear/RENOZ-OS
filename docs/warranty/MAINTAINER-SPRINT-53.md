# Warranty Maintainer Sprint 53

## Status

Closed in commit-ready state.

## Issue 1: Warranty Mutation Implementation-Message Boundary

### Problem

Warranty mutation hooks already centralize operator toasts through `formatWarrantyMutationError`, but the formatter still allowed 4xx messages through when they did not match the older backend-leak patterns. If a warranty claim, policy, entitlement, certificate, or bulk-import endpoint incorrectly returned JavaScript runtime text or SQL-shaped details as a client error, operators could see implementation copy instead of action-specific recovery guidance.

### Workflow Spine

Warranty mutation caller
-> warranty workflow hook
-> `formatWarrantyMutationError` or action-specific wrapper
-> warranty server function and schema failure
-> action-specific fallback or safe validation copy
-> operator toast and retry/correction decision.

### Touched Domains

- Warranty mutation feedback formatting.
- Warranty claim mutation feedback.
- Warranty bulk-import mutation feedback.
- Warranty mutation feedback tests.
- Warranty maintainer closeout docs.

### Business Value Protected

Warranty workflows protect battery coverage, claim resolution, ownership, certificates, and bulk registration. Operators need clear validation or retry guidance when those mutations fail, not JavaScript runtime text, SQL details, or stack-shaped implementation clues.

### Scope Constraints

- Do not change warranty hooks, server functions, schemas, database queries, tenant predicates, cache invalidation, mutation behavior, transactions, or UI layout.
- Preserve safe warranty validation messages, known code mappings, and action-specific fallback copy.
- Treat implementation-shaped messages as unsafe even when a server layer reports them with a 4xx status.

### Changes

- Extended the warranty unsafe-message classifier to include SQL phrases, JavaScript runtime error names, `not a function`, `Cannot read/set properties of undefined/null`, and stack-frame-shaped text.
- Added focused coverage for claim mutation runtime-error fallback behavior.
- Added focused coverage for bulk-import validation-field SQL fallback behavior.
- Kept existing safe validation, code mapping, and action-specific fallback tests intact.

### Standards Checked

- Domain ownership: warranty mutation feedback remains owned by the warranty formatter and action-specific wrappers.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only the client feedback formatter after existing mutation failures.
- Query/cache policy: unchanged. No warranty query keys, invalidations, stale behavior, or cache rollback contracts changed.
- Tenant isolation/data integrity: unchanged. No organization predicates, warranty records, claim transitions, entitlement activation, certificate records, import persistence, or transaction behavior changed.
- UI states/error handling: strengthened. Warranty mutation toasts no longer pass through implementation-shaped 4xx messages.
- Reviewability: one formatter branch, one focused test expansion, and this closeout note.

### Smells Removed

- Permissive 4xx raw-message pass-through for implementation-shaped warranty mutation errors.
- Missing tests for JavaScript runtime and SQL-shaped warranty mutation feedback.

### Deferred

- Broader non-warranty mutation formatter adoption remains a cross-domain future slice.
- Server-side bulk import row-result wording remains separate from hook-level mutation feedback.
- Browser QA was deferred because this is formatter behavior with no intended visual layout change.

### Gates

- Passed: focused warranty mutation formatter set, `./node_modules/.bin/vitest run tests/unit/warranty/warranty-mutation-errors.test.ts tests/unit/warranty/warranty-bulk-import-dialog-action-contract.test.ts tests/unit/warranty/warranty-policy-form-dialog-action-contract.test.ts` - 3 files, 13 tests.
- Passed: broader warranty suite, `./node_modules/.bin/vitest run tests/unit/warranty` - 50 files, 154 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, finance, document, release, and deploy gates because this slice does not change visual layout, financial persistence behavior, document generation, release packaging, or deployment.

### Goal Adaptation

Declined. The standing maintainer process already treats retired gate packs as non-routine and asks for risk-selected evidence. This sprint uses focused warranty formatter evidence plus the broader warranty/code-quality gates.

### Residual Risk

Low for warranty mutation formatter safety. Moderate across the repo because other domains may still have formatter-internal raw-message pass-through rules or uneven mutation feedback adoption.
