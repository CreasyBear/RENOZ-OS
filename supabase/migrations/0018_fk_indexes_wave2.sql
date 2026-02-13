-- ============================================================================
-- FK Indexes Wave 2: Fix unindexed_foreign_keys (0001)
-- Migration: 0018_fk_indexes_wave2.sql
--
-- Wave 2: job_assignments, order_shipments, order_payments, opportunity_activities,
-- return_authorizations, api_tokens, ai_approvals, ai_cost_tracking, credit_notes,
-- job_tasks, job_checklist_items, warranty_items, purchase_order_amendments,
-- oauth_states, warranty_claims
-- ============================================================================

-- job_assignments
CREATE INDEX IF NOT EXISTS idx_job_assignments_migrated_to_project
  ON public.job_assignments (migrated_to_project_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_sla_tracking
  ON public.job_assignments (sla_tracking_id);

-- order_shipments
CREATE INDEX IF NOT EXISTS idx_order_shipments_shipped_by
  ON public.order_shipments (shipped_by);

-- order_payments
CREATE INDEX IF NOT EXISTS idx_order_payments_recorded_by
  ON public.order_payments (recorded_by);
CREATE INDEX IF NOT EXISTS idx_order_payments_related_payment
  ON public.order_payments (related_payment_id);

-- opportunity_activities
CREATE INDEX IF NOT EXISTS idx_opportunity_activities_created_by
  ON public.opportunity_activities (created_by);

-- return_authorizations
CREATE INDEX IF NOT EXISTS idx_return_authorizations_approved_by
  ON public.return_authorizations (approved_by);
CREATE INDEX IF NOT EXISTS idx_return_authorizations_processed_by
  ON public.return_authorizations (processed_by);
CREATE INDEX IF NOT EXISTS idx_return_authorizations_received_by
  ON public.return_authorizations (received_by);
CREATE INDEX IF NOT EXISTS idx_return_authorizations_rejected_by
  ON public.return_authorizations (rejected_by);

-- api_tokens
CREATE INDEX IF NOT EXISTS idx_api_tokens_revoked_by
  ON public.api_tokens (revoked_by);

-- ai_approvals
CREATE INDEX IF NOT EXISTS idx_ai_approvals_approved_by
  ON public.ai_approvals (approved_by);
CREATE INDEX IF NOT EXISTS idx_ai_approvals_conversation_id
  ON public.ai_approvals (conversation_id);

-- ai_cost_tracking
CREATE INDEX IF NOT EXISTS idx_ai_cost_tracking_conversation_id
  ON public.ai_cost_tracking (conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_cost_tracking_task_id
  ON public.ai_cost_tracking (task_id);

-- credit_notes
CREATE INDEX IF NOT EXISTS idx_credit_notes_applied_to_order
  ON public.credit_notes (applied_to_order_id);

-- job_tasks
CREATE INDEX IF NOT EXISTS idx_job_tasks_assignee
  ON public.job_tasks (assignee_id);

-- job_checklist_items
CREATE INDEX IF NOT EXISTS idx_job_checklist_items_completed_by
  ON public.job_checklist_items (completed_by);

-- warranty_items
CREATE INDEX IF NOT EXISTS idx_warranty_items_inventory
  ON public.warranty_items (inventory_id);

-- purchase_order_amendments
CREATE INDEX IF NOT EXISTS idx_po_amendments_applied_by
  ON public.purchase_order_amendments (applied_by);
CREATE INDEX IF NOT EXISTS idx_po_amendments_approved_by
  ON public.purchase_order_amendments (approved_by);
CREATE INDEX IF NOT EXISTS idx_po_amendments_rejected_by
  ON public.purchase_order_amendments (rejected_by);

-- oauth_states
CREATE INDEX IF NOT EXISTS idx_oauth_states_user_id
  ON public.oauth_states (user_id);

-- warranty_claims
CREATE INDEX IF NOT EXISTS idx_warranty_claims_approved_by
  ON public.warranty_claims (approved_by_user_id);
