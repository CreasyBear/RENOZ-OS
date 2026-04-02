# CRM `lead_activities` → renoz-website `activities`

Implements the agreed **schema mapping** and operational steps (Phase 1 map, Phase 2 load).  
**2026 extract (MCP-filled):** see [Y2026-MAPPED-PREVIEW.md](./Y2026-MAPPED-PREVIEW.md). (March-only preview was empty — [MARCH-2026-MAPPED-PREVIEW.md](./MARCH-2026-MAPPED-PREVIEW.md) redirects there.)

## Layout

| File | Purpose |
|------|---------|
| [extract-lead-activities-by-month.sql](./extract-lead-activities-by-month.sql) | Phase 1 — CRM export (edit month bounds as needed). |
| [resolve-customer-on-website.sql](./resolve-customer-on-website.sql) | Candidate lookup on website by email / id / fuzzy name. |
| [lead-to-website-customer-overrides.json](./lead-to-website-customer-overrides.json) | Human-approved `crm_lead_id` → `website_customer_id` when IDs/names diverge. |
| [user-mapping.sql](./user-mapping.sql) | Document actor mapping CRM `users.id` → website `users.id` via **email**. |
| [action-metadata-mapping.ts](./action-metadata-mapping.ts) | CRM `type` → `activities.action` + `metadata` shape (for scripts/tests). |
| [DEDUPE.md](./DEDUPE.md) | `source_ref` idempotency + soft dedupe + rollback sketch. |
| [insert-activities.template.sql](./insert-activities.template.sql) | Phase 2 — single-row insert template (`source = import`). |

## Customer resolution order (do not assume IDs match)

1. **Email:** `lower(trim(leads.contact_email))` → `customers.email` on website.
2. **Name:** normalized `company_name` / `lead_name` → fuzzy match on `customers.name` (**manual sign-off** if not exact).
3. **UUID shortcut:** `crm_lead_id` = `customers.id` **only if** email or name also agrees; otherwise **flag**.
4. **Overrides:** apply [lead-to-website-customer-overrides.json](./lead-to-website-customer-overrides.json).
5. **Quarantine:** unresolved rows — no insert.

## Website constants (set per environment)

- `website_organization_id` — production org UUID for renoz-website (not the CRM org id).
- Map users by email (see [user-mapping.sql](./user-mapping.sql)).

## Phase 2 execution

1. Complete mapped preview table for each CRM row (Phase 1).
2. For each row: verify customer exists; check `source_ref` not already present.
3. Fill [insert-activities.template.sql](./insert-activities.template.sql) placeholders or generate from [action-metadata-mapping.ts](./action-metadata-mapping.ts).
4. Run against renoz-website with a role that satisfies RLS (typically **service role** in Supabase SQL editor, or a migration).

**Security:** never commit service-role keys; run SQL manually or via CI secrets.

## Tests

```bash
npx vitest run tests/crm-website-activity-import/action-metadata-mapping.test.ts
```
