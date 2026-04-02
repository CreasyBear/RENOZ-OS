# 2026 — mapped preview (Phase 1)

**Source:** renoz-crm `lead_activities` joined to `leads`, window **`2026-01-01Z` ≤ `activity_date` < `2027-01-01Z`** (UTC).

**MCP extract row count:** **3** (all actor `jeremy.e@renoz.energy`).

**Website import:** All three rows present under `activities.source_ref` = CRM `lead_activity_id`. Website row ids: `01501e6d-a601-418b-811c-777bd93000a2` (Get Greener — pre-existing, `source` = `system`), `a9f2f7d0-dcaf-48cf-81d7-76e2547cab66` (Exide — `import`), `c4873cc6-82bd-4515-b006-d79575999f60` (Volta — `import`).

**Website user (actor):** `30c86010-2f2d-41e6-8bbe-4f6f0538ffcd` — `jeremy.e@renoz.energy`

Resolution uses [lead-to-website-customer-overrides.json](./lead-to-website-customer-overrides.json) where CRM `lead_id` ≠ canonical website `customers.id`, else **id_shortcut_verified** when UUID exists on website with matching email.

| lead_activity_id | activity_date (UTC) | actor | CRM type | CRM subject | crm_lead_id | resolution_method | website_customer_id | website_customer_name | `activities.action` | description preview | notes |
|------------------|---------------------|-------|----------|-------------|-------------|-------------------|---------------------|----------------------|---------------------|----------------------|-------|
| `4884a1f6-bd4e-4615-a68f-ba1c52362d9e` | 2026-01-05 16:00:00 | jeremy.e@renoz.energy | MEETING | Plan for 2026 - | `a6fd6047-02d8-49c9-b228-a93b59fcb005` | **override** (+ email would match same row) | `386d7ce6-8087-464b-9776-23e5e155a55c` | Get Greener NRG | `note_added` | Meeting: Plan for 2026 - Meeting to discuss ramping up sales activity for 2026 and also RENOZ planned Fulfilment Offer | `metadata.logType` = `meeting`. CRM lead id ≠ website id; canonical customer via override / `gary@getgreenernrg.com.au`. |
| `1206517b-1173-4884-aef4-6c43f3de993c` | 2026-02-05 06:34:45 | jeremy.e@renoz.energy | MEETING | Site Visit | `c7e1f8c9-f060-49ce-a49b-8b652bda7d72` | **id_shortcut_verified** | `c7e1f8c9-f060-49ce-a49b-8b652bda7d72` | Exide Technologies | `note_added` | Meeting: Site Visit Jeremy met Jack and had a good 'deep' discussion around both LV and HV Battery modules… | `metadata.logType` = `meeting`. Same UUID on website; email aligns with `jeremy.newman@exidegroup.com`. |
| `43d9245d-08fd-4a87-91fa-cac7db8ce8c8` | 2026-02-25 07:21:53 | jeremy.e@renoz.energy | NOTE | _(empty)_ | `6958b15c-8d0c-4dd0-b571-059e02a2c25e` | **override** | `ba08a733-21fc-4fab-9fee-16ef613e6159` | Volta Energy | `note_added` | Note: Trevor Fraser - Volt Energy : had a good conversation this morning. Trevor would like to catch up next week… | `metadata.logType` = `note`. Volt (CRM) → Volta (website). **Also on timeline:** same-day manual `call_logged` (~07:25 UTC) overlaps this narrative; delete `c4873cc6-82bd-4515-b006-d79575999f60` if you want a single card. |

## Proposed `metadata` shape (all rows)

- `fullNotes` — `subject` + newline + `details` (full text from CRM).
- `logType` — `meeting` / `note` per CRM type mapping.
- `subject` — CRM subject when present.
- `customerId` — website `customers.id` (for generated `customer_id_from_metadata`).
- `crmImport` — `{ leadActivityId, leadId, crmOrganizationId, outcome, version, crmCreatedAt, crmUpdatedAt, updatedByUserId, crmCreatedByUserId }` per [insert-activities.template.sql](./insert-activities.template.sql).

## Phase 2

Use [insert-activities.template.sql](./insert-activities.template.sql) with `source = import`, `source_ref = lead_activity_id`, `created_at = activity_date`, after dedupe per [DEDUPE.md](./DEDUPE.md).
