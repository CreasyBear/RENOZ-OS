# Domain: Jobs — Diff (PRD vs Drizzle)

## job_tasks
- PRD schema omits `priority`, `estimatedHours`, and `actualHours`; Drizzle adds all three.
- PRD index calls for `(organization_id, created_at DESC)`; Drizzle uses `(organizationId, createdAt)` without explicit DESC.

## job_materials
- PRD expects `quantityRequired`/`quantityUsed` as `numeric(10,2)`; Drizzle uses `quantityColumn` (`numeric(10,3)`) with default 0 for both.
- PRD expects `unitCost` as `numeric(10,4)`; Drizzle uses `currencyColumn` (`numeric(12,2)`).
- PRD does not mention `version`; Drizzle adds optimistic locking.
- PRD index calls for `(organization_id, created_at DESC)`; Drizzle uses `(organizationId, createdAt)` without explicit DESC.

## job_time_entries
- Schema aligns with PRD (timestamptz, billable flag, version, audit columns).
- PRD index calls for `(organization_id, start_time DESC)`; Drizzle uses `(organizationId, startTime)` without explicit DESC.

## checklist_templates
- PRD does not specify `description`; Drizzle adds it.
- Drizzle stores `items` as JSONB array with default empty list; PRD does not define a default.

## job_checklists
- PRD does not specify `templateName`; Drizzle stores a snapshot of template name on apply.
- PRD index calls for `(organization_id, created_at DESC)`; Drizzle uses `(organizationId, createdAt)` without explicit DESC.

## job_checklist_items
- PRD does not specify `itemDescription`, `requiresPhoto`, or `position`; Drizzle adds all three.

## job_templates
- PRD expects `defaultTasks`/`defaultBOM` JSONB (required); Drizzle provides defaults of empty arrays.
- PRD does not specify `description`; Drizzle adds it.
- Drizzle defaults `estimatedDuration` to 120 minutes; PRD does not define a default.
- PRD index calls for `(organization_id, created_at DESC)`; Drizzle uses `(organizationId, createdAt)` without explicit DESC.

## job_assignments
- PRD does not define a base `job_assignments` schema (only requires adding `sla_tracking_id`); Drizzle defines the full assignment model (scheduling, location tracking, sign-off tokens, confirmation, metadata).
- Drizzle stores `startedAt`/`completedAt` as text; PRD does not specify timestamp fields for assignments.

## job_photos
- Not specified in PRD; Drizzle adds `job_photos` for before/during/after/issue/signature capture.

## jobs (background job tracking)
- Not specified in PRD; Drizzle includes a `jobs` table for async/background processing with status/progress/metadata.

## Cross-domain alignment
- PRD references `inventory_items`; Drizzle inventory domain uses `inventory`. Ensure job material reservation and costing logic align with the actual inventory table naming and keys.

## Open Questions
- Should `job_assignments.startedAt/completedAt` be `timestamptz` instead of `text` for consistent time semantics?
- Is the `jobs` background-job table intended to live in the Jobs domain, or should it be separated to avoid naming collision with field jobs?
- Do we want to standardize numeric precision for `unitCost` and material quantities to match PRD (10,4/10,2), or keep the Drizzle defaults?
