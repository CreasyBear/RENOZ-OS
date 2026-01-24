# Queries — Fulfillment (Orders, Jobs, Inventory)

## Orders
- Order list by status/paymentStatus/date with customer filter.
- Order detail: line items, shipments, amendments.
- Shipment tracking by status/carrier/date.

## Jobs
- Job assignments by date/status/installer/customer.
- Job detail: tasks, materials, time entries, photos, checklists.
- SLA due/overdue views across jobs.

## Inventory
- Inventory by product/location/status.
- Stock movement history by product/location/date range.
- Stock counts by status/location with variance review.
- Alerts by product/location/alertType.

## Notes on query patterns
- Frequent joins: orders ↔ customers ↔ line items; jobs ↔ orders/customers/users.
- Inventory queries often filter by productId + locationId with range ordering.
