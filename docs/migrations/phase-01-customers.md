# Phase 01 — Customers + Contacts

## Target Tables (new DB)

- `customers`
- `contacts`
- `addresses` (skipped for now)
- `customer_activities` (optional history)
- `customer_tags` (optional if tag taxonomy exists)

Schema reference:

- `drizzle/schema/customers/customers.ts`

## Source Tables (old DB)

- `customers`
- `customer_activities` (if used)
- `customer_addresses`
- `customer_contact_persons`

## Extract (old DB)

```sql
select * from public.customers where organization_id = '<OLD_ORG_ID>';

select * from public.customer_activities where organization_id = '<OLD_ORG_ID>';
```

Optional existence checks:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name like 'customer%';
```

## Transform Rules (summary)

- Preserve `customers.id` if possible to simplify downstream references.
- Map status:
  - old active/draft → `status = 'active'` or `status = 'prospect'` (choose based on business meaning).
- Default values:
  - `customer_code` can use default; do not set unless old has a stable code.
  - `type` default to `business` if missing.
  - `currency`/`timezone` inherit org defaults.
- Addresses:
  - Map `customer_addresses` to `addresses`.
  - `address_type`: BILLING -> billing, SHIPPING -> shipping, OTHER -> service.
  - `street` -> `street1`, `state_province` -> `state`, `postal_code` -> `postcode`.
- Contacts:
  - Map `customer_contact_persons` to `contacts` (split `name` on first space).
  - If no contact persons exist for a customer, synthesize a primary contact when email or phone exists.
  - Fallback name: `first_name = 'Primary'`, `last_name = customer name`.
- End customers:
  - If old `customer_type = END_CUSTOMER`, set `status = 'inactive'` and set `custom_fields.customer_segment = 'end_customer'`.
- Activities:
  - Map old activity notes into `customer_activities.description`.

## Load Order

1) `customers`
2) `addresses`
3) `contacts`
4) `customer_activities` (optional)
5) `customer_tags` (optional)

## Validation Queries

```sql
-- Count parity
select count(*) from public.customers where organization_id = '<OLD_ORG_ID>';
select count(*) from public.customers where organization_id = '<NEW_ORG_ID>';

-- Spot check 10 customers

select c.id, c.name, c.email
from public.customers c
where c.organization_id = '<NEW_ORG_ID>'
order by c.created_at desc
limit 10;

-- Contacts count (customers with email or phone)
select count(*)
from public.contacts
where organization_id = '<NEW_ORG_ID>';

-- Addresses count
select count(*)
from public.addresses
where organization_id = '<NEW_ORG_ID>';
```

## Backfill Notes

- If orders/quotes are migrated later, ensure `customer_id` references remain intact.
