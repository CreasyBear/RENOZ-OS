# Cross-Domain PRD Audit — Timeline

## PRD Summary
- Unified activity timeline aggregated across domains.
- Requires `unified_activities` table or view with polymorphic entity references.
- Auto-capture email events, quick logging of calls/notes.

## Schema Expectations (from PRD)
- `unified_activities` table/view with `customerId`, `entityType`, `entityId`, `activityType`, indexes.
- Activity type enum includes emails, calls, notes, status changes, quote/order/job/ticket events.

## Current Model Alignment
- `activities` table exists but is generic.
- No `unified_activities` table/view.
- Email history exists but no event-to-activity pipeline.

## Gaps / Mismatches
- Missing `unified_activities` table/view with customer denormalization.
- Missing activityType enum and indexes for timeline querying.
- No guaranteed auto-capture for email events or support tickets.

## RLS / Security Notes
- Timeline must be org-scoped with customerId filtering.
- Polymorphic entity references require allowlists.

## Recommendations
- Build `unified_activities` as a view or materialized view over `activities`, `email_history`, and domain events.
- Ensure indexes for `(organizationId, customerId, createdAt DESC)`.
- Implement email event ingestion to timeline.
