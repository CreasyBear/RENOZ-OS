# Phase 05 — Suppliers + Purchasing

## Target Tables (new DB)
- `suppliers`
- `purchase_orders`
- `purchase_order_items`
- `purchase_order_receipts`
- `purchase_order_receipt_items`
- Optional: `purchase_order_costs`, `purchase_order_approvals`, `purchase_order_amendments`

Schema reference:
- `drizzle/schema/suppliers/suppliers.ts`
- `drizzle/schema/suppliers/purchase-orders.ts`
- `drizzle/schema/suppliers/purchase-order-items.ts`
- `drizzle/schema/suppliers/purchase-order-receipts.ts`

## Source Tables (old DB)
- `suppliers`
- `purchase_orders`
- `purchase_order_items`
- Any legacy receipts / goods receipt tables

## Transform Rules (summary)
- Suppliers:
  - Preserve IDs where possible.
  - Map primary contact fields if old schema had nested contacts.
- Purchase orders:
  - Preserve IDs.
  - Map statuses to `purchase_order_status` enum.
  - Ensure total calculation matches constraint.
- PO items:
  - Populate `quantity_pending = quantity - quantity_received`.
  - Line totals must match `quantity * unit_price`.
- Receipts:
  - Map goods receipts (if old `goods_receipts` exists) to `purchase_order_receipts` and `purchase_order_receipt_items`.

## Mapping Evaluation (shipments → receipts)
### Source tables (old DB)
- `suppliers`
- `purchase_orders`
- `purchase_order_line_items`
- `purchase_order_additional_costs`
- `shipments`
- `shipment_items`
- `shipment_po_allocations`
- `goods_receipts` + `goods_receipt_line_items` (optional fallback)

### Target tables (new DB)
- `suppliers`
- `purchase_orders`
- `purchase_order_items`
- `purchase_order_costs`
- `purchase_order_receipts`
- `purchase_order_receipt_items`

### Key decision
Shipments can bundle multiple POs, but `purchase_order_receipts` requires a single `purchase_order_id`.
**Approach:** create a receipt per `(shipment_id, purchase_order_id)` using allocations, and link all receipt items under that PO.

### Status mappings
- Old `suppliers.status` (`ACTIVE`) → `suppliers.status = active`
- Old `purchase_orders.status`:
  - `ORDERED` → `ordered`
  - `RECEIVED` → `received`
  - `CLOSED` → `closed`
- Old `shipments.status` / `goods_receipts.status`:
  - `COMPLETED` → `receipt_status = accepted`
  - `PENDING` → `receipt_status = pending_inspection`

### Suppliers
- `id` preserved.
- `name`, `email`, `phone` → direct.
- `contact_name` → `primary_contact_name`.
- Address fields → `billing_address` (JSON), leave `shipping_address` null unless a separate ship-to exists.
- `default_currency` → `currency` (fallback `AUD`).
- `payment_terms` → `payment_terms` (map to enum; unknown → `net_30`).
- `status` → `active` (if only ACTIVE values present).

### Purchase Orders
- `id` preserved.
- `purchase_order_number` → `po_number`.
- `status` mapped above.
- `order_date` → `order_date` (date).
- `expected_delivery_date` → `expected_delivery_date`.
- `notes`, `terms` → `notes` / `internal_notes` (as appropriate).
- `subtotal_amount` → `subtotal`.
- `total_additional_costs_estimated` → `shipping_amount` (if used as freight) else add to `purchase_order_costs`.
- `grand_total_amount_estimated` → `total_amount`.
- `currency` → `currency`.
- `created_by_user_id` / `updated_by_user_id` → `created_by` / `updated_by`.

### PO Items
- `purchase_order_line_items.id` preserved (becomes `purchase_order_items.id`).
- `purchase_order_id` preserved.
- `product_id` preserved when exists in new products.
- `product_name` / `product_sku`: derive from products table; fallback to `Unknown product` and populate `description`.
- `quantity_ordered` → `quantity`.
- `unit_cost` → `unit_price`.
- `line_total` → `line_total`.
- `quantity_received_overall` → `quantity_received`.
- `quantity_pending = quantity - quantity_received`.
- `expected_delivery_date` → `expected_delivery_date`.

### Additional Costs
- Old `purchase_order_additional_costs` → `purchase_order_costs`.
- Map `type` to `cost_type` when possible:
  - `freight`, `customs`, `insurance` → same
  - otherwise → `other` + copy `type` into `description`.
- `estimated_amount` / `actual_amount` → `amount` (prefer actual if present).
- `allocation_method` default `by_value`.

### Shipments → Receipts
- For each `shipment`, group `shipment_po_allocations` by `purchase_order_id`.
- Create `purchase_order_receipts` per group:
  - `receipt_number`: use existing default.
  - `purchase_order_id`: group key.
  - `received_by` → `received_by_user_id`.
  - `received_at` → `arrival_date`.
  - `carrier`/`tracking_number` → shipment fields.
  - `delivery_reference` → `shipment_reference`.
  - `status` from shipment status mapping.
  - Totals (`total_items_expected/received/accepted`) = sum of allocated quantities.
- Create `purchase_order_receipt_items` from allocations:
  - `purchase_order_item_id` → allocation’s PO line item (preserve id).
  - `quantity_expected/received/accepted` → `quantity_allocated`.
  - `serial_numbers` → from linked `shipment_items.serial_numbers`.
  - `warehouse_location` / `bin_number` → from shipment or leave null.

### Goods Receipts (fallback)
If shipments are missing for a PO, map `goods_receipts` → receipts and `goods_receipt_line_items` → receipt items using:
- `receipt_number`, `receipt_date`, `received_by_user_id`, `status` mapping.
- `serials_received` → `serial_numbers`.

## Load Order
1) `suppliers`
2) `purchase_orders`
3) `purchase_order_items`
4) `purchase_order_receipts`
5) `purchase_order_receipt_items`
6) Optional supporting tables

## Validation Queries
```sql
select count(*) from public.suppliers where organization_id = '<OLD_ORG_ID>';
select count(*) from public.suppliers where organization_id = '<NEW_ORG_ID>';

select count(*) from public.purchase_orders where organization_id = '<OLD_ORG_ID>';
select count(*) from public.purchase_orders where organization_id = '<NEW_ORG_ID>';
```

## Inventory Movement Backfill
- Backfill `inventory_movements.reference_type = 'purchase_order'` for inbound events.
