-- ============================================================================
-- FK Indexes Wave 4 (Bulk)
-- Migration: 0022_fk_indexes_wave4_bulk.sql
--
-- Creates indexes for all remaining unindexed foreign keys reported by
-- Supabase advisors at the time of generation (67 constraints).
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_csat_responses_submitted_by_customer_id_fk ON csat_responses (submitted_by_customer_id);
CREATE INDEX IF NOT EXISTS idx_csat_responses_submitted_by_user_id_fk ON csat_responses (submitted_by_user_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_created_by_fk ON custom_field_values (created_by);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_updated_by_fk ON custom_field_values (updated_by);
CREATE INDEX IF NOT EXISTS idx_custom_fields_created_by_fk ON custom_fields (created_by);
CREATE INDEX IF NOT EXISTS idx_custom_fields_updated_by_fk ON custom_fields (updated_by);
CREATE INDEX IF NOT EXISTS idx_customer_portal_sessions_customer_id_fk ON customer_portal_sessions (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_portal_sessions_job_assignment_id_fk ON customer_portal_sessions (job_assignment_id);
CREATE INDEX IF NOT EXISTS idx_customer_product_prices_customer_id_fk ON customer_product_prices (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_product_prices_product_id_fk ON customer_product_prices (product_id);
CREATE INDEX IF NOT EXISTS idx_customer_tag_assignments_organization_id_fk ON customer_tag_assignments (organization_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user_id_fk ON dashboard_layouts (user_id);
CREATE INDEX IF NOT EXISTS idx_email_suppression_deleted_by_fk ON email_suppression (deleted_by);
CREATE INDEX IF NOT EXISTS idx_escalation_history_organization_id_fk ON escalation_history (organization_id);
CREATE INDEX IF NOT EXISTS idx_installer_certifications_verified_by_fk ON installer_certifications (verified_by);
CREATE INDEX IF NOT EXISTS idx_inventory_forecasts_product_id_fk ON inventory_forecasts (product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_location_id_fk ON inventory_movements (location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id_fk ON inventory_movements (product_id);
CREATE INDEX IF NOT EXISTS idx_issue_templates_default_assignee_id_fk ON issue_templates (default_assignee_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_customer_id_fk ON job_assignments (customer_id);
CREATE INDEX IF NOT EXISTS idx_job_checklist_items_checklist_id_fk ON job_checklist_items (checklist_id);
CREATE INDEX IF NOT EXISTS idx_job_checklists_job_id_fk ON job_checklists (job_id);
CREATE INDEX IF NOT EXISTS idx_job_checklists_template_id_fk ON job_checklists (template_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_job_id_fk ON job_materials (job_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_product_id_fk ON job_materials (product_id);
CREATE INDEX IF NOT EXISTS idx_job_templates_checklist_template_id_fk ON job_templates (checklist_template_id);
CREATE INDEX IF NOT EXISTS idx_job_templates_sla_configuration_id_fk ON job_templates (sla_configuration_id);
CREATE INDEX IF NOT EXISTS idx_job_time_entries_job_id_fk ON job_time_entries (job_id);
CREATE INDEX IF NOT EXISTS idx_job_time_entries_user_id_fk ON job_time_entries (user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_connections_user_id_fk ON oauth_connections (user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_service_permissions_connection_id_fk ON oauth_service_permissions (connection_id);
CREATE INDEX IF NOT EXISTS idx_oauth_sync_logs_connection_id_fk ON oauth_sync_logs (connection_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_assigned_to_fk ON opportunities (assigned_to);
CREATE INDEX IF NOT EXISTS idx_order_templates_default_customer_id_fk ON order_templates (default_customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminder_settings_default_template_id_fk ON payment_reminder_settings (default_template_id);
CREATE INDEX IF NOT EXISTS idx_portal_identities_auth_user_id_fk ON portal_identities (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_portal_identities_customer_id_fk ON portal_identities (customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_identities_job_assignment_id_fk ON portal_identities (job_assignment_id);
CREATE INDEX IF NOT EXISTS idx_price_agreements_rejected_by_fk ON price_agreements (rejected_by);
CREATE INDEX IF NOT EXISTS idx_price_change_history_applied_by_fk ON price_change_history (applied_by);
CREATE INDEX IF NOT EXISTS idx_price_change_history_approved_by_fk ON price_change_history (approved_by);
CREATE INDEX IF NOT EXISTS idx_price_change_history_rejected_by_fk ON price_change_history (rejected_by);
CREATE INDEX IF NOT EXISTS idx_price_history_product_id_fk ON price_history (product_id);
CREATE INDEX IF NOT EXISTS idx_product_attribute_values_attribute_id_fk ON product_attribute_values (attribute_id);
CREATE INDEX IF NOT EXISTS idx_product_attribute_values_product_id_fk ON product_attribute_values (product_id);
CREATE INDEX IF NOT EXISTS idx_product_bundles_component_product_id_fk ON product_bundles (component_product_id);
CREATE INDEX IF NOT EXISTS idx_product_relations_related_product_id_fk ON product_relations (related_product_id);
CREATE INDEX IF NOT EXISTS idx_project_bom_approved_by_fk ON project_bom (approved_by);
CREATE INDEX IF NOT EXISTS idx_project_bom_project_id_fk ON project_bom (project_id);
CREATE INDEX IF NOT EXISTS idx_project_bom_items_bom_id_fk ON project_bom_items (bom_id);
CREATE INDEX IF NOT EXISTS idx_project_bom_items_product_id_fk ON project_bom_items (product_id);
CREATE INDEX IF NOT EXISTS idx_project_bom_items_project_id_fk ON project_bom_items (project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_project_id_fk ON project_files (project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id_fk ON project_members (user_id);
CREATE INDEX IF NOT EXISTS idx_projects_customer_id_fk ON projects (customer_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_approvals_delegated_from_fk ON purchase_order_approvals (delegated_from);
CREATE INDEX IF NOT EXISTS idx_purchase_order_approvals_escalated_to_fk ON purchase_order_approvals (escalated_to);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id_fk ON quotes (customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_opportunity_id_fk ON quotes (opportunity_id);
CREATE INDEX IF NOT EXISTS idx_recent_items_user_id_fk ON recent_items (user_id);
CREATE INDEX IF NOT EXISTS idx_report_favorites_user_id_fk ON report_favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_supplier_price_history_product_id_fk ON supplier_price_history (product_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_created_by_fk ON system_settings (created_by);
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by_fk ON system_settings (updated_by);
CREATE INDEX IF NOT EXISTS idx_user_group_members_added_by_fk ON user_group_members (added_by);
CREATE INDEX IF NOT EXISTS idx_warranties_project_id_fk ON warranties (project_id);
CREATE INDEX IF NOT EXISTS idx_warranty_items_product_id_fk ON warranty_items (product_id);

