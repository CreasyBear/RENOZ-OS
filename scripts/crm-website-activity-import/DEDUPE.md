# Dedupe and idempotency (Phase 2)

## Hard idempotency

- Set `activities.source_ref` = **CRM** `lead_activities.id` (UUID).
- Before insert: `SELECT 1 FROM activities WHERE organization_id = $org AND source_ref = $lead_activity_id`.
- If found, **skip** the row (safe re-run).

`activities` has no unique constraint on `source_ref` in the current schema — enforcement is **application/SQL guard only**.

## Soft dedupe (same story twice)

When CRM text duplicates an existing website comms log (e.g. same day, same customer, overlapping body):

- Query existing rows for `entity_id = website_customer_id` and `created_at::date = activity_date::date` (in agreed TZ).
- Compare `description` or `metadata->>'fullNotes'` with normalized whitespace.
- If similarity is high, **skip** or **manual review** — do not insert.

## March 2026 scope

- Only compare against website rows in the **same month** as `activity_date` plus adjacent days if TZ boundary risk.

## Rollback (if needed after bad import)

```sql
-- After review: delete only imported rows for a batch
DELETE FROM activities
WHERE organization_id = :website_org_id
  AND source = 'import'
  AND source_ref IN (/* list of CRM lead_activity ids */);
```

Run only with explicit `source_ref` list to avoid deleting non-import rows.
