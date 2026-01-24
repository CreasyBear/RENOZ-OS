# Domain: Dashboard — Cleanup & Refinement

## Findings
- Validate PRD composite indexes (orders/opportunities/warranty_claims with createdAt DESC).
- Confirm MV definitions and refresh jobs still align after recent changes.

## Required Fixes (Atomic)
- [x] Add any missing composite DESC indexes required by dashboard PRD.
- [x] Reconcile MV SQL with target schema (columns, joins).

## Validation
- [x] MV refresh success
- [x] Index ordering matches PRD

