# Suppliers Maintainer Sprint 4

## Status

Closed in commit-ready state.

## Issue 1: Purchase Order Creation Wizard Contract Extraction

### Problem

The purchase-order creation wizard is a large supplier-to-order workflow component. It owned UI rendering, initial form modeling, supplier step selection, line-item validation, submit validation, blank line creation, and review totals in one file. That made ordering behavior harder to test directly and left the submit path validating line items without explicitly validating supplier selection.

### Workflow Spine

Purchase-order create route
-> contextual supplier/product preload
-> `POCreationWizard`
-> supplier selection
-> line-item entry
-> review totals
-> `useCreatePurchaseOrder`
-> purchase-order server create
-> purchase-order detail navigation.

### Touched Domains

- Supplier purchase-order creation wizard.
- Supplier purchase-order creation workflow contract helper.
- Supplier purchase-order wizard contract tests.

### Business Value Protected

Purchase-order creation is the start of procurement, receiving, landed cost, inventory availability, and supplier performance tracking. The wizard should make supplier selection, line-item validity, and review totals explicit and testable so ordering errors are caught before server mutation and review amounts stay aligned with shared GST policy.

### Scope Constraints

- Do not change purchase-order create route search behavior, contextual product seeding, preferred supplier lookup, server create mutation, schemas, database writes, tenant predicates, query keys, cache invalidation, navigation, or mutation feedback.
- Preserve existing line-item validation copy.
- Preserve existing contextual launch behavior: only start on line items when a supplier id is known.
- Keep review totals display-only; server persistence remains authoritative for PO totals.

### Changes

- Added `po-creation-wizard-contracts.ts` for wizard-facing types and pure workflow helpers.
- Moved initial form modeling, contextual starting-step selection, blank line-item creation, supplier validation, line-item validation, submit validation, and review total calculation out of the UI component.
- Aligned review GST display math with shared `GST_RATE` from `order-calculations` instead of an inline `0.1`.
- Made the wizard step state explicitly cover all three steps.
- Added focused tests for contextual starting step, cloned initial form data, supplier/line validation, submission validation, shared GST total calculation, and source-contract wiring.

### Standards Checked

- Domain ownership: the contract helper stays in the supplier domain beside the wizard because this is a supplier-to-purchase-order UI contract.
- Route -> container/page -> hook -> server -> schema/database -> query key/cache policy: preserved. This sprint only changed the wizard UI contract boundary.
- Query/cache policy: no query keys, stale times, invalidations, optimistic updates, or cache writes changed.
- Tenant isolation/data integrity: no server function, auth boundary, organization predicate, database write, inventory transaction, finance persistence, or serialized lineage behavior changed.
- Finance integrity: review totals now use the shared GST constant and currency rounding; persisted totals remain server-owned.
- UI states/error handling: submit validation now checks supplier selection and line items through one tested helper.
- Reviewability: the diff is limited to one helper extraction, one wizard integration, one focused test file, and this closeout note.

### Smells Removed

- Inline PO wizard form initialization.
- Inline blank line-item factory.
- Inline wizard starting-step logic.
- Inline hardcoded review GST rate.
- Inline submit validation that only checked line items.
- Untested PO wizard validation and review-total contract.

### Deferred

- `po-creation-wizard.tsx` remains large and still contains supplier selection, line-item entry, review UI, and navigation rendering. Further extraction should be workflow-sliced, not a generic file split.
- Line-item row keys still use array indexes; that should be handled separately if row-local UI state becomes a practical operator issue.
- Browser QA was not selected because this slice extracted/tested workflow contract behavior without intended layout or interaction changes.

### Gates

- Passed: focused wizard/create-page/query normalization set, `./node_modules/.bin/vitest run tests/unit/suppliers/po-creation-wizard-contracts.test.ts tests/unit/purchase-orders/purchase-order-create-page-context.test.tsx tests/unit/suppliers/query-normalization-wave7c.test.tsx tests/unit/suppliers/query-normalization-wave3b.test.tsx` - 4 files, 16 tests.
- Passed: broader supplier/procurement/purchase-order/approval suite, `./node_modules/.bin/vitest run tests/unit/suppliers tests/unit/procurement tests/unit/purchase-orders tests/unit/approvals` - 73 files, 216 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Passed: targeted source scan for removed inline GST rate, wizard contract wiring, and remaining validation references.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is a pure contract extraction with no intended visual change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, finance persistence, document generation, release packaging, or repair scripts.

### Goal Adaptation

Declined. The standing maintainer goal already covers modular domain ownership, route-to-server workflow mapping, finance integrity judgment, meaningful tests, and risk-selected evidence. The conditional serialized-gate policy still applies and was not reopened for this UI contract slice.

### Residual Risk

Low for PO wizard validation and review-total contract behavior. Moderate structural risk remains in the wizard because rendering is still monolithic; the next useful slice should target a concrete operator workflow inside the wizard rather than broad component splitting.
