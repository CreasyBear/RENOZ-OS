# Domain: Activities — Diff (PRD vs Drizzle)

## activities
- PRD defines `createdAt` as `timestamptz NOT NULL DEFAULT now()`; Drizzle uses `timestampColumns.createdAt` (matches) and omits an explicit DESC in indexes.
- PRD requires `userId` and `createdBy` to reference users with `ON DELETE SET NULL`; Drizzle does not declare FK references on `userId`/`createdBy` in the schema.
- PRD does not list `description`, `source`, or `sourceRef`; Drizzle adds all three fields.
- PRD index definitions include `createdAt DESC`; Drizzle indexes are defined without DESC ordering.
- PRD calls for append-only enforcement and partitioning; Drizzle notes partitioning in comments (migration 0010) but does not enforce append-only in schema.

## Open Questions
- Should we add explicit FKs for `userId` and `createdBy` to match PRD semantics?
- Do we need explicit DESC ordering in indexes to match PRD intent, or rely on planner default?
