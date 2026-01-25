-- Force Row Level Security on All Tables with RLS Enabled
-- This ensures RLS policies apply to table owners and superusers as well
-- Security hardening per Supabase best practices

-- Organizations & Settings
ALTER TABLE "organizations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "system_settings" FORCE ROW LEVEL SECURITY;
ALTER TABLE "custom_fields" FORCE ROW LEVEL SECURITY;
ALTER TABLE "custom_field_values" FORCE ROW LEVEL SECURITY;
ALTER TABLE "data_exports" FORCE ROW LEVEL SECURITY;

-- Users & Authentication
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
ALTER TABLE "user_sessions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "user_invitations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "user_delegations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "user_groups" FORCE ROW LEVEL SECURITY;
ALTER TABLE "user_group_members" FORCE ROW LEVEL SECURITY;
ALTER TABLE "api_tokens" FORCE ROW LEVEL SECURITY;

-- Audit & Activities
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "activities" FORCE ROW LEVEL SECURITY;

-- Orders Domain
ALTER TABLE "orders" FORCE ROW LEVEL SECURITY;
ALTER TABLE "order_line_items" FORCE ROW LEVEL SECURITY;
ALTER TABLE "order_shipments" FORCE ROW LEVEL SECURITY;
ALTER TABLE "shipment_items" FORCE ROW LEVEL SECURITY;
ALTER TABLE "order_templates" FORCE ROW LEVEL SECURITY;
ALTER TABLE "order_template_items" FORCE ROW LEVEL SECURITY;
ALTER TABLE "order_amendments" FORCE ROW LEVEL SECURITY;

-- Customers & Contacts
ALTER TABLE "customer_tag_assignments" FORCE ROW LEVEL SECURITY;

-- Pipeline & Sales
ALTER TABLE "opportunities" FORCE ROW LEVEL SECURITY;
ALTER TABLE "opportunity_activities" FORCE ROW LEVEL SECURITY;
ALTER TABLE "quotes" FORCE ROW LEVEL SECURITY;
ALTER TABLE "quote_versions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "win_loss_reasons" FORCE ROW LEVEL SECURITY;

-- Products
ALTER TABLE "product_relations" FORCE ROW LEVEL SECURITY;

-- Communications
ALTER TABLE "email_campaigns" FORCE ROW LEVEL SECURITY;
ALTER TABLE "campaign_recipients" FORCE ROW LEVEL SECURITY;
ALTER TABLE "email_history" FORCE ROW LEVEL SECURITY;
ALTER TABLE "email_signatures" FORCE ROW LEVEL SECURITY;
ALTER TABLE "email_templates" FORCE ROW LEVEL SECURITY;
ALTER TABLE "email_suppression" FORCE ROW LEVEL SECURITY;
ALTER TABLE "scheduled_calls" FORCE ROW LEVEL SECURITY;
ALTER TABLE "scheduled_emails" FORCE ROW LEVEL SECURITY;

-- Jobs & Assignments
ALTER TABLE "job_assignments" FORCE ROW LEVEL SECURITY;

-- Files
ALTER TABLE "attachments" FORCE ROW LEVEL SECURITY;

-- Support
ALTER TABLE "rma_line_items" FORCE ROW LEVEL SECURITY;

-- Search
ALTER TABLE "search_index" FORCE ROW LEVEL SECURITY;
ALTER TABLE "search_index_outbox" FORCE ROW LEVEL SECURITY;
ALTER TABLE "recent_items" FORCE ROW LEVEL SECURITY;

-- Portal
ALTER TABLE "customer_portal_sessions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "portal_identities" FORCE ROW LEVEL SECURITY;

-- OAuth Integration
ALTER TABLE "oauth_connections" FORCE ROW LEVEL SECURITY;
ALTER TABLE "oauth_sync_logs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "oauth_service_permissions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "oauth_states" FORCE ROW LEVEL SECURITY;
ALTER TABLE "oauth_calendar_events" FORCE ROW LEVEL SECURITY;
ALTER TABLE "oauth_email_messages" FORCE ROW LEVEL SECURITY;
ALTER TABLE "oauth_contacts" FORCE ROW LEVEL SECURITY;
ALTER TABLE "oauth_sync_states" FORCE ROW LEVEL SECURITY;
