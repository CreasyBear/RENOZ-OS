# Domain: Users — Diff (PRD vs Drizzle)

## users
- PRD expects firstName/lastName/avatarUrl and various security fields (password reset tokens, email verification flags, lastLoginAt/lastActiveAt); Drizzle stores `name` and a `profile` JSONB and does not include those security fields.
- PRD requires email unique (global); Drizzle enforces unique `(organizationId, email)` and adds an `authId` link to Supabase Auth.
- Drizzle stores `preferences` JSONB on users plus a separate `user_preferences` table; PRD only specifies a preferences table.

## user_sessions
- PRD expects `ipAddress` as inet and constraint `expiresAt > createdAt`; Drizzle uses text for `ipAddress` and no explicit check constraint.
- Drizzle includes `lastActiveAt` and optimistic locking fields not specified in PRD.

## user_groups / user_group_members
- PRD requires `createdBy` on userGroups; Drizzle uses audit columns but does not enforce required creator.
- Drizzle adds soft delete on userGroups.

## user_delegations
- PRD aligns on core fields and constraints; Drizzle adds soft delete and audit columns.

## user_invitations
- PRD aligns; Drizzle adds audit columns and RLS policies.

## user_onboarding
- PRD aligns; Drizzle adds detailed metadata fields beyond PRD.

## api_tokens
- Not specified in Users PRD (defined in auth foundation PRD); Drizzle includes `api_tokens` table in this domain.

## Missing in Drizzle (PRD expects)
- `audit_logs` table (PRD describes user audit logs). Drizzle uses `activities` in a separate domain but does not define a dedicated audit_logs table here.

## Open Questions
- Should user security fields (email verification, reset tokens, lastLoginAt) be modeled in Drizzle, or are they intentionally delegated to Supabase Auth?
- Do we want global-unique user emails or organization-scoped uniqueness?
# Domain: Users & Organizations — Diff

## PRD vs Drizzle (renoz-v3)
- Organizations: PRD requires `domain`, `timezone`, `locale`, `currency`, `createdBy`, `updatedBy`, `version`. Drizzle `organizations` includes `slug`, `abn`, `branding`, `plan`, `stripeCustomerId` but **omits** several PRD fields.
- Users: PRD expects `firstName`/`lastName` at top level and password reset fields. Drizzle uses `name` plus JSONB `profile`, and does **not** include password reset tokens or email verification fields.
- Users: PRD email is globally unique; Drizzle enforces unique per org (`organizationId + email`) plus `authId` uniqueness.
- UserPreferences: Drizzle matches PRD category/key/value with unique constraint; PRD uses `id` PK whereas Drizzle uses UUID PK (aligned).
- UserSessions: PRD uses `inet` for `ipAddress`; Drizzle uses `text` for IPv6 compatibility.
- RLS: PRD requires org isolation; Drizzle defines RLS on `users` but not shown for all related tables in this file set.

## PRD vs Supabase (renoz-website)
- Supabase `public.users` has `first_name`/`last_name`, `role`, `user_type`, `status`, but **no** `authId`, `user_sessions`, `user_invitations`, or `user_groups`.
- Supabase `public.organizations` uses address fields + `xero_*` and `status`, but **no** `domain`, `timezone`, `locale`, `currency`, or audit fields.
- Supabase `public.user_preferences` stores JSONB fields (`notification_settings`, `dashboard_layout`) rather than category/key/value rows.
- Supabase relies on `auth` schema for sessions; PRD requires app-level `user_sessions`.

## Drizzle vs Supabase
- Table coverage mismatch: Drizzle includes `user_groups`, `user_group_members`, `user_delegations`, `user_invitations`, `user_onboarding`, `user_sessions`; Supabase does not.
- `users` shape differs (`auth_id` in Drizzle vs none in Supabase).
- `organizations` shape differs (Drizzle product/CRM fields vs Supabase website fields).

## Open Questions
- Should `users.email` be unique per organization or globally?
- Is `authId` required in public `users` or kept only in app metadata?
- Which org fields are canonical: PRD fields vs Drizzle vs existing Supabase?
