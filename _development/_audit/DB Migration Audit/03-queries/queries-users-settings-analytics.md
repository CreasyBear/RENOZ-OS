# Queries — Users, Settings, Analytics

## Users & Access
- Users by role/status with org filter.
- Invitations by status and expiration.
- Group membership by group/user.
- Delegations active by date range.

## Settings
- Organization settings by org.
- System settings by category/key.
- Custom fields by entityType and isActive.
- Data exports by status/requestedBy.

## Analytics (Dashboard/Reports)
- Daily metrics/pipeline/jobs/warranty rollups.
- Scheduled reports by frequency/nextRunAt.
- Custom reports saved by user/org.

## Notes on query patterns
- Settings lookups are key-based with unique `(organizationId, category, key)`.
- Analytics queries depend on materialized views or aggregates.
