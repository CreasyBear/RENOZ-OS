# Operations Maintainer Sprint 87

## Slice

Shared async loading and undoable-action hooks should use the central mutation feedback sanitizer instead of raw `error.message` fallback expressions.

## Business Value

These hooks are generic infrastructure used across operator workflows. Keeping their fallback behavior safe prevents future UI surfaces from inheriting backend, storage, or implementation details through shared helpers.

## Workflow Spine

```text
shared async/upload/undo action
  -> shared hook error handling
  -> central mutation feedback sanitizer
  -> toast/loading error state
  -> operator recovery copy
```

## Triage Findings

- `useAsyncLoading` displayed raw caught error messages in loading state and toast descriptions.
- `useFileUploadLoading` did the same for upload failures.
- `useUndoableAction` displayed raw caught error messages in the failure toast description.
- The central `formatMutationError` helper already provides safe fallback behavior and infrastructure-message suppression.

## Implementation

- Routed shared async, upload, and undoable-action feedback through `formatMutationError`.
- Preserved callback delivery of an `Error` object while avoiding unsafe non-Error casts.
- Added a focused shared hook feedback contract test.

## Closeout

Touched domains: shared hooks / operations infrastructure.

Workflow protected: generic async loading, file upload loading, and undoable action failure feedback.

Business value: shared infrastructure no longer spreads raw implementation messages into operator workflows.

Standards checked: shared helper ownership, safe mutation feedback, operator-safe errors, meaningful tests, reviewable diff.

Smells removed: final targeted raw `error instanceof Error ? error.message` patterns in shared hooks.

Deferred: domain-specific callback consumers may still choose how to handle the `Error` object they receive; this slice only owns shared hook feedback.

Verification: `bun run test:vitest tests/unit/shared/shared-hook-feedback-contract.test.ts`, `bun run typecheck`, `bun run lint`, full targeted raw-pattern scan across `src/components/domain` and `src/hooks`, `git diff --check`.

Goal adaptation: none.

Residual risk: low; this is a feedback-boundary cleanup with no intended control-flow change.
