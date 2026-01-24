# Domain: Settings — Diff (PRD vs Drizzle)

## organizations
- PRD expects `domain`, `timezone`, `locale`, `currency`, and `version` fields; Drizzle stores these in `settings` JSONB and uses `slug`/`abn`/branding fields instead.
- PRD expects unique `domain`; Drizzle enforces unique `slug` and optional `abn` instead.
- Drizzle adds soft delete (`deletedAt`) and billing fields (`plan`, `stripeCustomerId`) not in PRD.

## system_settings
- PRD matches Drizzle for core fields and unique `(organizationId, category, key)` constraint.
- Drizzle adds `metadata` and RLS policies; PRD does not mention these.

## custom_fields
- PRD allowed field types limited to `text|number|date|select|checkbox|textarea`; Drizzle adds `email|url|phone|multiselect`.
- Drizzle adds `label`, `metadata`, and `validationRules` structure beyond PRD's minimal definition.
- PRD expects indexes on `organizationId`, `entityType`, `isActive`, `sortOrder`; Drizzle matches plus a unique `(organizationId, entityType, name)` constraint.

## custom_field_values
- PRD expects unique `(customFieldId, entityId)` and indexes on `customFieldId`, `entityId`; Drizzle matches.

## data_exports
- PRD status enum: `pending|processing|completed|failed`; Drizzle adds `cancelled` and `expired`.
- PRD requires `array_length(entities, 1) > 0`; Drizzle does not enforce a check constraint.
- PRD does not include `fileName`, `startedAt`, `metadata`, or `updatedAt`; Drizzle adds all.

## Missing in Drizzle (PRD expects)
- `user_preferences` table (PRD defines detailed preferences).
- `business_hours` table (canonical ownership in settings; currently implemented under support).
- `holidays` table (canonical ownership in settings; currently implemented under support).
- `audit_logs` table (distinct from `activities`) is implemented under `_shared/audit-logs`.

## Resolutions
- `audit_logs` uses a dedicated table (keep `activities` for timeline).
- Business hours/holidays are canonicalized under settings; SLA references settings.

## Open Questions
- Should `organizations.domain` be modeled as first-class column instead of `slug`?
- Should `data_exports.entities` enforce a non-empty array constraint to match PRD?
