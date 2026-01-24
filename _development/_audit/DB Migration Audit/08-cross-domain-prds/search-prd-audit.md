# Cross-Domain PRD Audit — Search

## PRD Summary
- Global full-text search across customers, orders, quotes, jobs, products, contacts.
- `search_index` + `recent_items` tables with triggers and GIN index.
- Performance targets: <500ms search, 1M+ entities.

## Schema Expectations (from PRD)
- `search_index` table (tsvector, entity metadata, indexes).
- `recent_items` table (per-user recent items, unique + capped at 50).
- Triggers to keep index updated.

## Current Model Alignment
- No dedicated search tables in Drizzle schema.
- Full-text indexing exists for some domains (e.g., customers) but not unified.

## Gaps / Mismatches
- Missing `search_index` and `recent_items` tables.
- Missing trigger-based indexing pipeline.
- No RLS policies for search tables.

## RLS / Security Notes
- `search_index` must be org-scoped; `recent_items` must be org + user scoped.
- Avoid leaking cross-tenant entities via search.

## Recommendations
- Add `search_index` and `recent_items` tables in shared/cross-domain schema.
- Implement triggers or async indexing job with retry.
- Add RLS policies for org/user scoping.
