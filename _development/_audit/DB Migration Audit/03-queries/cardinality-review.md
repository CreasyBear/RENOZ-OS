# Cardinality Review

Assumptions and risks for cross-domain relationships.

## Assumptions
- One organization has many users, customers, orders, products, suppliers, issues.
- One customer has many orders, contacts, addresses, opportunities, warranties.
- One order has many line items, shipments, amendments, and financial records.
- One product has many price tiers, images, attributes, inventory rows.
- One supplier has many purchase orders and price lists.
- One issue has many SLA events, escalation history, CSAT responses.
- One warranty has many claims and extensions.

## Risks / Edge Cases
- `orderLineItems.productId` nullable → items may be ad-hoc; impacts joins and analytics.
- `rma_line_items` missing orgId → tenant scoping depends on join integrity.
- Polymorphic tables (`activities`, `custom_field_values`, `sla_tracking`) depend on `entityType` correctness; no FK enforcement.
- `customerId` nullable in some comms tables → customer reporting may be incomplete.
- `job_assignments.orderId` nullable → job-to-order analytics must handle null linkage.

## Validation Needs
- Confirm whether invoices are separate from orders (financial cardinality).
- Decide if `warranty_claims.issueId` is required to enforce 1:many linkage.
