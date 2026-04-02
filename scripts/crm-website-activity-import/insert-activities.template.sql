-- Phase 2 — renoz-website: insert one activity from a resolved CRM lead_activity row.
-- Run with a role that bypasses RLS (e.g. service role) or appropriate migration role.
-- Replace all :placeholders. Do not run blindly — complete Phase 1 map first.

-- Preconditions:
--   EXISTS (SELECT 1 FROM customers WHERE id = :website_customer_id AND deleted_at IS NULL)
--   NOT EXISTS (SELECT 1 FROM activities WHERE organization_id = :website_org_id AND source_ref = :crm_lead_activity_id)

INSERT INTO activities (
  id,
  organization_id,
  user_id,
  entity_type,
  entity_id,
  action,
  changes,
  metadata,
  ip_address,
  user_agent,
  description,
  source,
  source_ref,
  created_at,
  created_by,
  entity_name
)
SELECT
  gen_random_uuid(),
  :website_org_id::uuid,
  :website_user_id::uuid,
  'customer'::activity_entity_type,
  :website_customer_id::uuid,
  :activity_action::activity_action,
  NULL,
  jsonb_build_object(
    'fullNotes', :full_notes_text,
    'logType', :log_type_text,
    'subject', to_jsonb(:subject_text::text),
    'customerId', to_jsonb(:website_customer_id::text),
    'crmImport', jsonb_build_object(
      'leadActivityId', :crm_lead_activity_id::text,
      'leadId', :crm_lead_id::text,
      'crmOrganizationId', :crm_org_id::text,
      'outcome', to_jsonb(:outcome_text::text),
      'version', :version_int,
      'crmCreatedAt', to_jsonb(:crm_created_at::text),
      'crmUpdatedAt', to_jsonb(:crm_updated_at::text),
      'crmUpdatedByUserId', to_jsonb(:crm_updated_by_user_id::text),
      'crmCreatedByUserId', to_jsonb(:crm_created_by_user_id::text)
    )
  ),
  NULL,
  NULL,
  :description_line::text,
  'import'::activity_source,
  :crm_lead_activity_id::uuid,
  :activity_date::timestamptz,
  :website_user_id::uuid,
  :website_customer_name::text
WHERE NOT EXISTS (
  SELECT 1 FROM activities a
  WHERE a.organization_id = :website_org_id::uuid
    AND a.source_ref = :crm_lead_activity_id::uuid
);

-- :activity_action — use call_logged | note_added (see action-metadata-mapping.ts)
-- :log_type_text — call | meeting | email | note
-- :full_notes_text — combine subject + details from CRM with newlines
