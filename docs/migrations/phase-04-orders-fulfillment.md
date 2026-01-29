# Phase 04 — Orders + Fulfillment

## Target Tables (new DB)
- `orders`
- `order_line_items`
- Note: `order_shipments` / `shipment_items` are procurement-adjacent and handled in Phase 05.
- Note: `order_amendments` / `order_templates` exist in new DB but have no source tables.

Schema reference:
- `drizzle/schema/orders/orders.ts`

## Source Tables (old DB)
- `orders`
- `order_line_items`
- Note: old `shipments` / `shipment_items` are inbound PO receipts (Phase 05).
- Note: old `invoices` / `invoice_line_items` have no direct target table and are deferred.

## Transform Rules (summary)
- Preserve order IDs to keep references stable.
- Map status + payment status to enums in new DB.
- Map address data into JSONB `billing_address` / `shipping_address`.
- Map missing fields (legacy status, discount type/value, shipping method, tracking, contact snapshots) into `orders.metadata.legacy`.
- Line items:
  - Keep `product_id` where matched; otherwise set null and keep description/sku.

## Load Order
1) `orders`
2) `order_line_items`

## Validation Queries
```sql
-- Count parity
select count(*) from public.orders where organization_id = '<OLD_ORG_ID>';
select count(*) from public.orders where organization_id = '<NEW_ORG_ID>';

-- Line item parity
select count(*) from public.order_line_items where organization_id = '<OLD_ORG_ID>';
select count(*) from public.order_line_items where organization_id = '<NEW_ORG_ID>';
```

## Inventory Movement Backfill
- After orders are migrated, backfill `inventory_movements.reference_type/reference_id`:
  - `reference_type = 'order'` for movements originating from orders.
