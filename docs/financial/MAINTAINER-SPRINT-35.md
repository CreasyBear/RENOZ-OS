# Financial Maintainer Sprint 35: Read-State Safety

This sprint follows the financial reporting freshness work into read-state presentation. Financial hooks already normalize read failures, but several presenters still rendered raw `error.message` text for hard failures. That left payment-plan, credit-note, and dashboard screens vulnerable to leaking backend detail if an unnormalized error reached the presenter.

## Business Value

Financial screens drive collection, credit, and closeout decisions. When a read fails, operators need stable recovery guidance and a retry path, not database, provider, or stack detail.

Protected value:

- payment schedule reads fail with safe retry copy
- credit-note list reads fail with safe retry copy in both legacy and table presenters
- dashboard hard failures fail with stable operator copy
- hook/server/schema/query-key behavior remains unchanged

## Workflow Spine

```text
financial route/container
  -> financial presenter read-state branch
  -> financial hook
  -> financial server function
  -> financial schema/database
  -> financial query key/cache policy
  -> operator-safe unavailable copy and retry where available
```

## Changes

- Replaced financial dashboard raw `error.message` display with stable unavailable copy.
- Replaced payment-plan read-state raw error display with stable unavailable copy.
- Replaced credit-note list read-state raw error display in both presenters with stable unavailable copy.
- Added source contract coverage preventing these presenters from rendering raw `error.message` again.

## Closeout

Touched domains: Financial dashboard, payment-plan presentation, credit-note presentation, financial source contracts.

Workflow protected: financial read failure -> presenter hard-error branch -> operator-safe unavailable copy -> retry path where the presenter owns one.

Business value: finance operators no longer see raw backend details when dashboard, payment schedule, or credit-note reads fail.

Standards checked: route/container/hook/server/schema/database/query-key flow preserved; query/cache policy unchanged; tenant isolation unchanged; finance mutation and transaction behavior unchanged; UI state remains honest hard-error presentation.

Smells removed: direct raw `error.message` rendering in financial dashboard, payment schedule, credit-note legacy list, and credit-note table presenter read states.

Deferred: broader non-financial domains still have independent raw read-state/mutation feedback debt. Browser QA was skipped because this slice changes fixed error copy and is covered by source contracts, with no layout, interaction, query, or server behavior changes.

Verification:

- `./node_modules/.bin/vitest run tests/unit/financial/separation-contract.test.ts tests/unit/financial/payment-plan-feedback-contract.test.ts tests/unit/financial/credit-note-feedback-contract.test.ts tests/unit/finance-dashboard/query-normalization-wave6f.test.tsx` passed, 4 files, 19 tests.
- `./node_modules/.bin/vitest run tests/unit/financial tests/unit/finance tests/unit/finance-dashboard` passed, 19 files, 80 tests.
- `bun run typecheck` passed.
- `bun run lint` passed.
- `git diff --check` passed.

Goal adaptation: declined. The standing maintainer goal already covers honest UI states, operator-safe errors, reviewable diffs, meaningful tests, and evidence-based closeout. The retired serialized gate posture remains unchanged and is not part of this read-state slice.

Residual risk: financial read-state copy is safer on these core presenters, but a full repo-wide read-state audit remains a separate domain-by-domain effort.
