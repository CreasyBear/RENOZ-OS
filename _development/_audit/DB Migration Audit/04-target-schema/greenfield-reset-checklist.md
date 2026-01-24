# Greenfield Reset Checklist (Supabase)

This checklist is for wiping the `public` schema and applying the fresh baseline migration.
It assumes we keep system schemas intact (`auth`, `storage`, `realtime`, `vault`).

## Pre-flight (Safety Gates)
- [x] Confirm Supabase project id + host match `renoz-website`.
- [ ] Export or snapshot the current DB (schema + data) before destructive reset.
- [x] Confirm which schemas are safe to keep (do NOT drop system schemas).
- [x] Record timestamp and operator for audit trail.

## Destructive Reset (Public Schema)
- [x] Drop all `public` tables (and the `drizzle.__drizzle_migrations` table).
- [x] Verify `public` is empty (`information_schema.tables`).

## Apply Baseline Migration
- [x] Apply `drizzle/migrations/0000_common_magneto.sql`.
- [x] Confirm baseline migration recorded in drizzle journal.

## Post-flight Verification
- [x] Run `bun run validate:portal-rls`.
- [x] Refresh analytics MVs (manual or job) and confirm success.
- [x] Sanity check core tables (`organizations`, `users`, `orders`) exist and accept inserts.
- [x] Confirm RLS policies exist for portal + core tables.

## Notes
- If any step fails, stop and rollback to snapshot.
- Post-flight remediation applied:
  - RLS remediation + policy normalization completed (Security Advisor clean for RLS).
  - MV access locked down (revoked `SELECT` for `anon`/`authenticated`).
  - MV refresh completed; zero-row counts expected for greenfield.
  - Leaked password protection enabled in Supabase Auth settings (user confirmed).
