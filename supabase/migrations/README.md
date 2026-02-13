# Supabase Migrations

## Performance remediation waves (0015+)

| Migration | Wave | Purpose |
|-----------|------|---------|
| `0015_rls_initplan_wave1.sql` | RLS initplan | Wrap auth.uid() / get_organization_context() in (select …) for per-query caching |
| `0016_fk_indexes_wave1.sql` | FK indexes | Add indexes on unindexed foreign key columns |
| `0017_rls_initplan_wave2.sql` | RLS initplan | job_assignments, recent_items |
| `0018_fk_indexes_wave2.sql` | FK indexes | job_assignments, order_shipments, order_payments, opportunity_activities, return_authorizations, api_tokens, ai_approvals, ai_cost_tracking, credit_notes, job_tasks, job_checklist_items, warranty_items, purchase_order_amendments, oauth_states, warranty_claims |
| `0019_rls_initplan_phase3_bulk.sql` | RLS initplan | Bulk rewrite for remaining unwrapped `auth.*` / `current_setting()` calls |
| `0020_rls_current_setting_canonical_form.sql` | RLS initplan | Normalize legacy `current_setting` policy expression shape |
| `0021_rls_user_sessions_initplan_fix.sql` | RLS initplan | Final `user_sessions` policy fix (removes last `auth_rls_initplan` findings) |
| `0022_fk_indexes_wave4_bulk.sql` | FK indexes | Bulk add all remaining missing FK indexes (67 -> 0) |

Run validation after each wave: see [performance-remediation-validation-runbook.md](../../docs/performance-remediation-validation-runbook.md).

## Rollout order

1. Apply `0015_rls_initplan_wave1.sql`
2. Run validation checks (perf + security)
3. Apply `0016_fk_indexes_wave1.sql`
4. Run validation checks
5. Proceed to Wave 2 when go/no-go passes
