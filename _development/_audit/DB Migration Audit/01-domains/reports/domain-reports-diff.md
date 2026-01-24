# Domain: Reports — Diff (PRD vs Drizzle)

## PRD vs Drizzle
- PRD requires `scheduled_reports`, `report_favorites`, and `custom_reports` schema; no corresponding Drizzle tables found.
- PRD allows `report_favorites` to live in `user_preferences`; no evidence of either schema path in Drizzle.

## Open Questions
## Resolutions
- `scheduled_reports` is owned by the **reports** domain.
- `report_favorites` uses a dedicated table (not `user_preferences` JSON).
