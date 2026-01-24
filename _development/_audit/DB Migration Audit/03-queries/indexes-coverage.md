# Index Coverage — Queries vs Indexes

This mapping flags likely coverage and gaps based on domain constraints.

## Covered (existing indexes likely sufficient)
- Customers list by status/type: indexed by `(organizationId, status)` and tags/full-text.
- Opportunities by stage/owner: `(organizationId, stage)` and `assignedTo`.
- Orders by status/date: `(organizationId, status, orderDate)`.
- Inventory by product/location: indexes on `productId`, `locationId`.
- Purchase orders by status/supplier: `(organizationId, status)` and supplier indexes.
- Warranty by status/expiry: `(organizationId, status)` and `(organizationId, expiryDate, expiryAlertOptOut)`.
- SLA by due dates: `(organizationId, responseDueAt, resolutionDueAt)`.
- Email campaigns by status: `status` and `organizationId` indexes.

## Partially Covered (verify sort order / composite needs)
- Activities feed: indexes exist but PRD expects DESC ordering; consider explicit DESC index.
- Email history: campaign/template lookup lacks explicit composite indexes.
- Statements by customer and endDate: coverage exists but review ordering.

## Gaps / Missing Indexes
- Dashboard/reporting tables missing entirely (no indexes).
- `campaign_recipients` unique constraints for `(campaignId, email)` not enforced.
- `rma_line_items` lacks organizationId index (join-based only).
- Polymorphic tables (`activities`, `custom_field_values`, `sla_tracking`) need composite indexes by `organizationId` + `entityType`.

## Follow-up Checks
- Confirm index coverage for list queries with date sorting across domains.
- Validate composite indexes for multi-tenant filtering + status/sort columns.
