# Migration Readiness Checklist

## Scope Alignment

- [x] All PRD-required tables exist in target schema.
- [x] Cross-domain ownership decisions documented and accepted.
- [x] Role PRD requirements mapped to schema and RLS policies.

## Data Integrity

- [x] Explicit FKs added for all cross-domain references required by PRD.
- [x] Polymorphic tables have org-scoped RLS and index coverage.
- [x] Money and count fields standardized (precision + types).
- [x] Required check constraints implemented.

## Performance

- [x] Index coverage validated for primary list/detail queries.
- [x] Analytics tables/materialized views defined.
- [x] Hot paths (orders, customers, issues) verified for composite indexes.

## Security & RLS

- [x] Every tenant table includes `organizationId` or equivalent join-based policy.
- [x] RLS policies validated for cross-domain query paths.
- [x] Audit logging strategy finalized (`activities` vs `audit_logs`).

## Implementation Readiness

- [x] Migration order defined for dependencies (org/users → core → edges).
- [x] Backfill strategy documented for any new required fields.
- [x] Supabase schema snapshot reconciled with target schema.
- [x] Greenfield reset checklist completed (`04-target-schema/greenfield-reset-checklist.md`).

## Rollout Template (Add → Backfill → Constrain)

- [x] Add new tables/columns as nullable or with safe defaults.
- [x] Backfill data in controlled batches with validation queries.
- [x] Enforce constraints (NOT NULL, UNIQUE, FK, CHECK) after backfill verified.
- [x] Monitor for errors before removing deprecated columns.

## Migration Sequence Cleanup (Not Yet Run)

We have not run migrations yet, so we can normalize the sequence before first deploy:

- Consolidate related changes into coherent migration batches (schemas, FKs/constraints, indexes, RLS).
- Prefer a stable dependency order: settings/users → core entities → cross‑domain edges → analytics/portal/search.
- Ensure any column type changes (e.g., `email_history.template_id` now UUID FK) are grouped with FK constraints.
- Keep add/backfill/constrain steps within the same batch where safe; split if any data backfill is needed.

## Post-Flight Security Status (renoz-website)
- RLS enabled + policy normalization applied; Security Advisor clean for RLS.
- MV access revoked for `anon`/`authenticated`; MVs refreshed successfully.
- Leaked password protection enabled in Supabase Auth settings (user confirmed).
