# Cleanup & Refinement (Post‑Implementation)

Purpose: comprehensive sanity pass across all Drizzle schemas after the main implementation.
This folder mirrors the domain structure of `01-domains` and captures residual issues,
inconsistencies, and refinements required to keep the DB clean and intuitive.

## Scope
- FK/constraint gaps
- PRD index order mismatches (DESC/composites)
- RLS/org-scoping consistency
- Type normalization (currency/count/quantity)
- Naming/ownership inconsistencies
- Orphaned or redundant schemas

## Cross‑Domain Themes to Review
- Explicit `organizationId` FK coverage
- PRD-generated columns vs stored columns
- Composite DESC indexes for list/timeline queries
- Naming alignment between PRDs and Drizzle schemas

## How to use
1. Review each domain file and record findings with explicit fix steps.
2. Mark items as done when addressed in schema/migrations.
3. Update cross‑domain notes in `11-cleanup-and-refinement/cross-domain/`.
