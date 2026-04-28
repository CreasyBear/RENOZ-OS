# TODOs

## Phase 4: Revenue Recognition And Xero Invoice Sync Split

What: split `src/server/functions/financial/revenue-recognition.ts` and `src/server/functions/financial/xero-invoice-sync.ts` into thin ServerFn facades plus shared read/write/provider-sync helpers.

Why: these files still contain mixed auth, validation, database state changes, and Xero provider state machines. They were deliberately deferred from Finance Separation Phase 3 because they need behavior tests around provider state transitions, not just source-shape checks.

Context: preserve existing public ServerFn exports, Xero webhook/payment reconciliation re-exports, normalized query keys, and schema contracts. Add tests for disconnected Xero, missing revenue accounts, existing journal idempotency, retry threshold/manual override, sync readiness persistence, and invoice sync re-export compatibility.

Depends on: Finance Separation Phase 3 facade/helper boundary tests landing cleanly.
