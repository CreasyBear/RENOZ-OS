# Queries — Support & Warranty

## Support
- Issues by status/priority/assignee/customer/date.
- SLA tracking by due dates and breach status.
- Knowledge base articles by status/category/search.
- Return authorizations by status/customer/order.

## Warranty
- Warranties by status/expiry/customer/product.
- Warranty claims by status/type/assignee.
- Warranty extensions by warrantyId/date.

## Notes on query patterns
- SLA tables are shared across support/jobs/warranty, with polymorphic `entityType`.
- Many queries are time-ordered for SLA deadlines and expiry alerts.
