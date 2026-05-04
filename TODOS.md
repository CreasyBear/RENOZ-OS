# TODOs

## Phase 6: Optional Finance + Communications DB Smoke Hardening

What: add a small real-database smoke layer for the highest-risk helper flows that Phase 5 now covers with deterministic stateful unit tests: Xero payment application, scheduled-email claim/finalize, and campaign send partial-failure accounting.

Why: Phase 5 added behavior coverage without requiring `DATABASE_URL`. The remaining confidence gap is SQL/transaction fidelity for the few flows where mocked Drizzle chains cannot prove constraint behavior, row locks, or transaction rollback semantics.

Context: preserve existing public ServerFn exports, compatibility shims, normalized query keys, and schema contracts. Keep this to a tiny integration-smoke lake with seeded rows and provider mocks; do not expand into a full test database harness unless repeated regressions justify it.

Depends on: Phase 5 behavior hardening landing cleanly and a reliable local/CI test database strategy.
