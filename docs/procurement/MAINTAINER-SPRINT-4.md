# Procurement Maintainer Sprint 4

## Status

Closed in commit-ready state.

## Issue 1: Receiving Serial CSV Parse Feedback

### Problem

`SerialNumberBatchEntry` surfaced CSV upload failures with `err.message` directly. The local parser emits useful operator guidance for known CSV problems, but the upload boundary could also leak implementation-shaped failures if a parsing bug, browser read issue, or unexpected exception reached the toast.

### Workflow Spine

Procurement receiving flow
-> `BulkReceivingDialog`
-> `SerialNumberBatchEntry`
-> `parseSerialNumberCSV`
-> serial-number review text input
-> `onSerialNumbersChange`
-> purchase-order receiving mutation path.

### Touched Domains

- Procurement receiving serial-number batch entry.
- Procurement receiving CSV feedback helper.
- Focused procurement feedback contract tests.

### Business Value Protected

Receiving serialized battery stock is an inventory accuracy checkpoint. Operators need clear CSV recovery guidance without seeing database, JavaScript, or stack-shaped failures while preparing serial lineage for receipt.

### Scope Constraints

- Do not change CSV parsing behavior, accepted headers, duplicate validation, serial format validation, entry method state, upload template, or receiving mutation behavior.
- Preserve known parser guidance for empty files, empty CSVs, missing serial numbers, read failures, and generic parser failures.
- Suppress unknown/system-shaped parser failures behind receiving-owned recovery copy.

### Changes

- Added `receiving-feedback-messages.ts` with a strict serial CSV parse feedback formatter.
- Routed CSV upload toast failures through `formatSerialBatchParseError`.
- Added focused coverage for safe parser messages, unsafe/system-shaped suppression, and source wiring.

### Standards Checked

- Domain ownership: serial CSV feedback now lives beside the procurement receiving component that owns the workflow.
- Route -> container/page -> hook -> server flow: preserved; this slice stays at the upload feedback boundary before server mutation.
- Query/cache policy: no query keys, stale times, invalidations, or cache behavior changed.
- Tenant isolation/data integrity: no server functions, organization predicates, database writes, inventory movements, or serialized lineage persistence changed.
- UI states/error handling: upload failure toast now uses receiving-owned operator-safe copy.
- Reviewability: the diff is limited to one helper, one call site, one focused test file, and this closeout note.

### Smells Removed

- Direct `err.message` rendering in the receiving CSV upload toast.
- Missing regression coverage around receiving serial CSV parse feedback.

### Deferred

- CSV parsing robustness and quoted/comma-containing CSV support remain unchanged.
- Bulk receiving mutation contracts and serialized inventory persistence were not touched.
- Browser QA was not selected because this was source-covered feedback formatting with no intended layout or interaction change.

### Gates

- Passed: focused procurement feedback contract, `bun run test:vitest tests/unit/procurement/serial-number-batch-entry-feedback-contract.test.ts` - 1 file, 2 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for direct `err.message` CSV upload feedback in `SerialNumberBatchEntry`.
- Passed: helper wiring scan for `formatSerialBatchParseError`, fallback copy, and regression assertions.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. Serialized lineage remains important to RENOZ-V3, but the old serialized gate pack is closed work and is not routine sprint evidence for this feedback-only receiving slice.

### Residual Risk

Low for CSV upload feedback. The parser still uses a simple comma split and was not hardened in this sprint.
