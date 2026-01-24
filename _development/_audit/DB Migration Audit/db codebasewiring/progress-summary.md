# Schema Alignment Progress Summary

**Date:** 2026-01-22  
**Status:** In Progress

## Completed Domains ✅

### 1. Customers Domain - 100% Complete
- All 9 tables aligned
- Added missing `customerMergeAudit` schema
- Fixed currency, percentage, date, and integer precision
- Updated server functions

### 2. Orders Domain - 100% Complete
- All 5 tables aligned (`orders`, `order_line_items`, `order_amendments`, `order_shipments`, `order_templates`)
- Added missing enums (`orderLineItemPickStatus`, `xeroSyncStatus`)
- Fixed date handling (input strings, output Date objects)
- Fixed currency and quantity precision

### 3. Products Domain - 100% Complete
- All 9 tables aligned (`products`, `categories`, `product_attributes`, `product_attribute_values`, `product_bundles`, `product_images`, `product_pricing`, `customer_product_prices`, `product_relations`)
- Fixed weight precision (numeric 8,3)
- Added missing `warrantyPolicyId` and `pricing` fields
- Fixed quantity precision in bundles
- Fixed nullable fields in price tiers and customer prices

## Remaining Domains

### Jobs Domain
- Tables: `jobs`, `job_assignments`, `job_tasks`, `job_materials`, `job_time_entries`, `job_templates`, `checklists`
- Key checks: Date fields, currency fields, JSONB metadata

### Inventory Domain
- Tables: `inventory`, `warehouse_locations`
- Key checks: Quantity fields, cost fields

### Pipeline Domain
- Tables: `opportunities`, `opportunity_activities`
- Key checks: Enum alignment

### Financial Domain
- Tables: `credit_notes`, `payment_reminders`, `payment_schedules`, `revenue_recognition`, `statement_history`
- Key checks: Currency fields, date fields, enum alignment

### Support Domain
- Tables: `issues`, `sla_tracking`, `sla_configurations`, `knowledge_base`, etc.
- Key checks: Enum alignment, date fields

### Warranty Domain
- Tables: `warranties`, `warranty_claims`, `warranty_policies`, `warranty_extensions`
- Key checks: Date fields, currency fields

### Other Domains
- Activities, Communications, Files, Portal, Reports, Search, Settings, Suppliers, Users, OAuth

## Patterns Established

- **Currency (numeric 12,2):** `currencySchema`
- **Percentage (numeric 5,2):** `percentageSchema`
- **Quantity (numeric 10,3):** `quantitySchema`
- **Weight (numeric 8,3):** `.multipleOf(0.001)`
- **Date-only fields:**
  - Input: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)`
  - Output: `z.coerce.date()`
- **ISO timestamps:** `z.string().datetime()`
- **Integer fields:** `z.number().int().positive()` or `.nonnegative()`

## Next Steps

Continue with remaining domains systematically, applying established patterns.
