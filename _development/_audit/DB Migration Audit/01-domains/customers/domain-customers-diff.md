# Domain: Customers — Diff

## PRD vs Drizzle (renoz-v3)
- `customers` uses `text` for many fields where PRD specifies `varchar(N)`; length constraints are not enforced.
- `customers.tags`: PRD expects `text[]`, Drizzle uses `jsonb` string array.
- `customers` adds `email`, `phone`, and `warrantyExpiryAlertOptOut` fields not in PRD.
- `healthScoreUpdatedAt`, `contacts.lastContactedAt`, `customerActivities.scheduledAt/completedAt`: PRD expects timestamps; Drizzle stores these as ISO `text`.
- `createdBy`/`updatedBy`: PRD requires `NOT NULL`; Drizzle audit columns are nullable (no FK yet).
- `currency` defaults: PRD defaults `lifetimeValue` and `totalOrderValue` to 0; Drizzle leaves them nullable with no defaults.
- `customerCode`: PRD requires unique, Drizzle auto-generates with `CUST-` default (still unique per org).

## PRD vs Supabase (renoz-website)
- Supabase `public.customers` is minimal (`company_name`, `status`, `notes`) and lacks most PRD fields (`customerCode`, credit fields, health metrics, tags, customFields).
- Supabase `public.contacts` lacks organizationId, decision flags, department, opt-in tracking, and lastContactedAt.
- Supabase `public.addresses` uses `street/city/state/postal_code` with `type` as free text and no geo fields.
- Supabase `public.customer_activities` is simplified (`type`, `description`, `metadata`) and lacks enums, scheduling fields, direction, and assignedTo.
- No Supabase tables for `customerTags`, `customerTagAssignments`, `customerHealthMetrics`, `customerPriorities`, or `customerMergeAudit`.

## Drizzle vs Supabase
- Column naming diverges (`customers.name` vs `customers.company_name`, `contacts.department` vs `contacts.role`).
- Drizzle includes organization scoping on all tables; Supabase only has organization_id on `customers`.
- Drizzle adds tags, health metrics, priorities, and merge audit infrastructure absent in Supabase.
- Drizzle activity model is richer (direction, scheduling, assignment) vs minimal Supabase activity logging.

## Open Questions
- Is `tags` intended to remain JSONB for flexibility, or move to `text[]` to match PRD?
- Should activity and contact timestamps be `timestamp with time zone` instead of ISO `text`?
- Should audit columns (`createdBy`, `updatedBy`) be required to match PRD?
