-- Phase 1 — renoz-crm: export lead_activities for a calendar month (UTC).
-- Replace :year_month with bounds, e.g. March 2026:
--   start: 2026-03-01T00:00:00Z
--   end:   2026-04-01T00:00:00Z
--
-- Run against renoz-crm Postgres (Supabase SQL editor or psql).

SELECT
  la.id AS lead_activity_id,
  la.organization_id AS crm_organization_id,
  la.lead_id AS crm_lead_id,
  la.created_by_user_id AS crm_created_by_user_id,
  la.type::text AS activity_type,
  la.activity_date,
  la.subject,
  la.details,
  la.outcome,
  la.version,
  la.created_at AS crm_row_created_at,
  la.updated_at AS crm_row_updated_at,
  la.updated_by_user_id AS crm_updated_by_user_id,
  l.company_name,
  l.lead_name,
  l.contact_email,
  l.status::text AS lead_status
FROM lead_activities la
INNER JOIN leads l ON l.id = la.lead_id
WHERE la.activity_date >= TIMESTAMPTZ '2026-03-01 00:00:00+00'
  AND la.activity_date < TIMESTAMPTZ '2026-04-01 00:00:00+00'
ORDER BY la.activity_date ASC, la.id ASC;
