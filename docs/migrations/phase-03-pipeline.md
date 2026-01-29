# Phase 03 — Sales Pipeline (Opportunities + Quotes)

## Target Tables (new DB)

- `opportunities`
- `opportunity_activities`
- `quote_versions`
- `quotes` (backward-compatible “current quote”)
- `win_loss_reasons`

Schema reference:

- `drizzle/schema/pipeline/pipeline.ts`

## Source Tables (old DB)

- `leads`
- `lead_contacts`
- `lead_activities`
- `quotes` (shared table)
- Any legacy `opportunities`/`pipeline` tables if present

## Transform Rules (summary)

- Opportunities:
  - Preserve IDs where possible.
  - Map status/stage to `opportunity_stage` enum (`new`, `qualified`, `quoted`, `pending`, `won`, `lost`).
  - Keep `customer_id` and optional `contact_id` aligned with Phase 01.
- Leads:
  - `leads` -> `opportunities` (one per lead).
  - Create customers only if no email match and no converted customer; otherwise reuse.
  - Stage defaults to `new`.
  - Lead fields stored in `opportunities.metadata`.
- Quotes:
  - Old `quotes` → new `quotes` (current snapshot).
  - If old system has quote history, map to `quote_versions`.
- Quote items:
  - Use JSONB line items on `quotes.line_items` and `quote_versions.items`.

## Load Order

1) `customers` (for leads without matches)
2) `contacts` (from lead_contacts)
3) `opportunities`
4) `opportunity_activities`
5) `quotes`
6) `quote_versions`

## Validation Queries

```sql
-- Row counts
select count(*) from public.leads where organization_id = '<OLD_ORG_ID>';
select count(*) from public.opportunities where organization_id = '<NEW_ORG_ID>';

-- Lead activities -> opportunity activities
select count(*) from public.lead_activities where organization_id = '<OLD_ORG_ID>';
select count(*) from public.opportunity_activities where organization_id = '<NEW_ORG_ID>';

-- Lead contacts -> contacts
select count(*) from public.lead_contacts where organization_id = '<OLD_ORG_ID>';
select count(*) from public.contacts where organization_id = '<NEW_ORG_ID>';

-- Quote counts
select count(*) from public.quotes where organization_id = '<OLD_ORG_ID>';
select count(*) from public.quotes where organization_id = '<NEW_ORG_ID>';

-- Spot check recent opportunities
select id, title, stage, customer_id
from public.opportunities
where organization_id = '<NEW_ORG_ID>'
order by created_at desc
limit 10;
```

## Backfill Notes

- Link quotes to opportunities and customers after customer migration.
- Ensure any order created from a quote references the correct customer/opportunity.
