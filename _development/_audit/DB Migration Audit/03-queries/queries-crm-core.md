# Queries — CRM Core

## Customers
- List customers by status/type/industry with search and tag filters.
- Customer detail: profile, contacts, addresses, activities, tags, priorities, health metrics.
- Customer timeline: activities ordered by time, with assigned user filter.
- Merge audit lookup by primary/merged customer id.

## Pipeline
- Open opportunities by stage/owner/date range with value rollups.
- Opportunity detail: activities, quotes, quote versions.
- Win/loss analysis by reason and time window.

## Notes on query patterns
- Most queries are scoped by `organizationId` and optionally `customerId` or `assignedTo`.
- Search queries use full-text or tags JSONB where available.
