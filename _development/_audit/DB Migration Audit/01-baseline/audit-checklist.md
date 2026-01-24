# DB Design Audit Checklist

Use this for domain-by-domain and cross-domain validation.

## Foreign Keys & Ownership

- [ ] Every table has explicit FK relationships for entity references.
- [ ] FK `onDelete` behavior matches domain lifecycle expectations.
- [ ] No FK cycles that block deletes or archival workflows.
- [ ] Cross-domain references clearly identify owning domain.
- [ ] Polymorphic references have guardrails (enum, check, or join table).

## Constraints & Data Integrity

- [ ] Required fields are `NOT NULL` where business rules demand.
- [ ] Unique constraints match business uniqueness rules.
- [ ] Check constraints enforce valid ranges/statuses.
- [ ] Generated columns or computed fields are implemented where specified.

## Indexing & Query Fit

- [ ] All list/detail queries have supporting indexes.
- [ ] Composite indexes match common filters + sort orders.
- [ ] Partial indexes exist for filtered subsets (status, soft delete).
- [ ] No redundant or unused indexes.

## Multi-Tenancy & RLS

- [ ] Every business table has `organizationId`.
- [ ] RLS policies enforce org isolation for all tables.
- [ ] Cross-domain joins do not bypass RLS expectations.
- [ ] System tables (auth/storage) are treated as external dependencies.

## Naming & Consistency

- [ ] `organizationId` naming is consistent (no `orgId` drift).
- [ ] Column naming uses snake_case in DB, consistent camelCase mapping.
- [ ] Enum names/values match PRD intent and shared enums.

## Types & Precision

- [ ] Monetary fields consistently use currency rules (AUD cents vs decimals).
- [ ] Timestamp fields use `timestamp with time zone` where required.
- [ ] JSONB fields are used only for flexible/non-relational data.

## Audit & Activity Logging

- [ ] Audit tables are append-only and immutable.
- [ ] Activity log structure matches PRD change schema.
- [ ] Retention/partitioning requirements addressed.

## Latest Audit Pass (2026-01-22)
- RLS remediation applied; policies normalized and FORCE RLS enabled.
- MV exposure locked down (revoked API `SELECT` for public MVs).
- Post-flight sanity inserts verified for `organizations`, `users`, `orders`.
