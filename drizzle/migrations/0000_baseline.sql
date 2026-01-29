CREATE TYPE "public"."activity_action" AS ENUM('created', 'updated', 'deleted', 'viewed', 'exported', 'shared', 'assigned', 'commented', 'email_sent', 'email_opened', 'email_clicked', 'call_logged', 'note_added');--> statement-breakpoint
CREATE TYPE "public"."activity_direction" AS ENUM('inbound', 'outbound', 'internal');--> statement-breakpoint
CREATE TYPE "public"."activity_entity_type" AS ENUM('customer', 'contact', 'order', 'opportunity', 'product', 'inventory', 'supplier', 'warranty', 'issue', 'user', 'email', 'call');--> statement-breakpoint
CREATE TYPE "public"."activity_source" AS ENUM('manual', 'email', 'webhook', 'system', 'import');--> statement-breakpoint
CREATE TYPE "public"."address_type" AS ENUM('billing', 'shipping', 'service', 'headquarters');--> statement-breakpoint
CREATE TYPE "public"."allocation_method" AS ENUM('equal', 'by_value', 'by_weight', 'by_quantity');--> statement-breakpoint
CREATE TYPE "public"."amendment_status" AS ENUM('requested', 'approved', 'rejected', 'applied', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."api_token_scope" AS ENUM('read', 'write', 'admin');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected', 'escalated');--> statement-breakpoint
CREATE TYPE "public"."attribute_type" AS ENUM('text', 'number', 'boolean', 'select', 'multiselect', 'date');--> statement-breakpoint
CREATE TYPE "public"."bounce_type" AS ENUM('hard', 'soft');--> statement-breakpoint
CREATE TYPE "public"."campaign_recipient_status" AS ENUM('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'unsubscribed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."condition" AS ENUM('new', 'refurbished', 'used', 'damaged');--> statement-breakpoint
CREATE TYPE "public"."cost_layer_reference_type" AS ENUM('purchase_order', 'adjustment', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."cost_type" AS ENUM('freight', 'duty', 'insurance', 'handling', 'customs', 'other');--> statement-breakpoint
CREATE TYPE "public"."credit_note_status" AS ENUM('draft', 'issued', 'applied', 'voided');--> statement-breakpoint
CREATE TYPE "public"."customer_activity_type" AS ENUM('call', 'email', 'meeting', 'note', 'quote', 'order', 'complaint', 'feedback', 'website_visit', 'social_interaction');--> statement-breakpoint
CREATE TYPE "public"."customer_priority_level" AS ENUM('low', 'medium', 'high', 'vip');--> statement-breakpoint
CREATE TYPE "public"."customer_size" AS ENUM('micro', 'small', 'medium', 'large', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."customer_status" AS ENUM('prospect', 'active', 'inactive', 'suspended', 'blacklisted');--> statement-breakpoint
CREATE TYPE "public"."customer_type" AS ENUM('individual', 'business', 'government', 'non_profit');--> statement-breakpoint
CREATE TYPE "public"."deferred_revenue_status" AS ENUM('deferred', 'partially_recognized', 'fully_recognized');--> statement-breakpoint
CREATE TYPE "public"."email_status" AS ENUM('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed');--> statement-breakpoint
CREATE TYPE "public"."empty_state_type" AS ENUM('no_data', 'filtered_empty', 'search_empty', 'permission_denied', 'error');--> statement-breakpoint
CREATE TYPE "public"."forecast_period" AS ENUM('daily', 'weekly', 'monthly', 'quarterly');--> statement-breakpoint
CREATE TYPE "public"."installment_status" AS ENUM('pending', 'due', 'paid', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."inventory_alert_type" AS ENUM('low_stock', 'out_of_stock', 'overstock', 'expiry', 'slow_moving', 'forecast_deviation');--> statement-breakpoint
CREATE TYPE "public"."inventory_status" AS ENUM('available', 'allocated', 'sold', 'damaged', 'returned', 'quarantined');--> statement-breakpoint
CREATE TYPE "public"."issue_priority" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."issue_status" AS ENUM('open', 'in_progress', 'pending', 'on_hold', 'escalated', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."issue_type" AS ENUM('hardware_fault', 'software_firmware', 'installation_defect', 'performance_degradation', 'connectivity', 'other');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."job_time_category" AS ENUM('work', 'travel', 'break');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('import', 'export', 'bulk_update', 'report_generation', 'data_sync', 'cleanup', 'other');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('receive', 'allocate', 'deallocate', 'pick', 'ship', 'adjust', 'return', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'read', 'dismissed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('quote', 'order', 'issue', 'warranty', 'shipment', 'payment', 'customer', 'product', 'inventory', 'user', 'system', 'call_reminder', 'call_overdue');--> statement-breakpoint
CREATE TYPE "public"."opportunity_activity_type" AS ENUM('call', 'email', 'meeting', 'note', 'follow_up');--> statement-breakpoint
CREATE TYPE "public"."opportunity_stage" AS ENUM('new', 'qualified', 'proposal', 'negotiation', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."order_line_item_pick_status" AS ENUM('not_picked', 'picking', 'picked');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('draft', 'confirmed', 'picking', 'picked', 'shipped', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_plan_type" AS ENUM('fifty_fifty', 'thirds', 'monthly', 'custom');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'partial', 'paid', 'refunded', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."payment_terms" AS ENUM('net_15', 'net_30', 'net_45', 'net_60', 'cod', 'prepaid');--> statement-breakpoint
CREATE TYPE "public"."portal_identity_status" AS ENUM('active', 'revoked', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."portal_scope" AS ENUM('customer', 'subcontractor');--> statement-breakpoint
CREATE TYPE "public"."price_change_type" AS ENUM('base_price', 'cost_price', 'tier_created', 'tier_updated', 'tier_deleted', 'customer_price', 'bulk_update');--> statement-breakpoint
CREATE TYPE "public"."product_relation_type" AS ENUM('accessory', 'alternative', 'upgrade', 'compatible', 'bundle');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('active', 'inactive', 'discontinued');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('physical', 'service', 'digital', 'bundle');--> statement-breakpoint
CREATE TYPE "public"."purchase_order_status" AS ENUM('draft', 'pending_approval', 'approved', 'ordered', 'partial_received', 'received', 'cancelled', 'closed');--> statement-breakpoint
CREATE TYPE "public"."quality_status" AS ENUM('good', 'damaged', 'expired', 'quarantined');--> statement-breakpoint
CREATE TYPE "public"."receipt_status" AS ENUM('pending_inspection', 'accepted', 'partially_accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."recognition_state" AS ENUM('pending', 'recognized', 'syncing', 'synced', 'sync_failed', 'manual_override');--> statement-breakpoint
CREATE TYPE "public"."recognition_type" AS ENUM('on_delivery', 'milestone', 'time_based');--> statement-breakpoint
CREATE TYPE "public"."rejection_reason" AS ENUM('damaged', 'wrong_item', 'quality_issue', 'short_shipment', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_format" AS ENUM('pdf', 'csv', 'xlsx', 'html');--> statement-breakpoint
CREATE TYPE "public"."report_frequency" AS ENUM('daily', 'weekly', 'biweekly', 'monthly', 'quarterly');--> statement-breakpoint
CREATE TYPE "public"."scheduled_call_status" AS ENUM('pending', 'completed', 'cancelled', 'rescheduled');--> statement-breakpoint
CREATE TYPE "public"."scheduled_email_status" AS ENUM('pending', 'sent', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."service_level" AS ENUM('standard', 'premium', 'platinum');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('pending', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned');--> statement-breakpoint
CREATE TYPE "public"."sla_domain" AS ENUM('support', 'warranty', 'jobs');--> statement-breakpoint
CREATE TYPE "public"."sla_event_type" AS ENUM('started', 'paused', 'resumed', 'response_due_warning', 'response_breached', 'responded', 'resolution_due_warning', 'resolution_breached', 'resolved', 'escalated', 'config_changed');--> statement-breakpoint
CREATE TYPE "public"."sla_target_unit" AS ENUM('minutes', 'hours', 'business_hours', 'days', 'business_days');--> statement-breakpoint
CREATE TYPE "public"."sla_tracking_status" AS ENUM('active', 'paused', 'responded', 'resolved', 'breached');--> statement-breakpoint
CREATE TYPE "public"."stock_count_status" AS ENUM('draft', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."stock_count_type" AS ENUM('full', 'cycle', 'spot', 'annual');--> statement-breakpoint
CREATE TYPE "public"."supplier_status" AS ENUM('active', 'inactive', 'suspended', 'blacklisted');--> statement-breakpoint
CREATE TYPE "public"."supplier_type" AS ENUM('manufacturer', 'distributor', 'retailer', 'service', 'raw_materials');--> statement-breakpoint
CREATE TYPE "public"."suppression_reason" AS ENUM('bounce', 'complaint', 'unsubscribe', 'manual');--> statement-breakpoint
CREATE TYPE "public"."target_metric" AS ENUM('revenue', 'kwh_deployed', 'quote_win_rate', 'active_installations', 'warranty_claims', 'pipeline_value', 'customer_count', 'orders_count', 'average_order_value');--> statement-breakpoint
CREATE TYPE "public"."target_period" AS ENUM('weekly', 'monthly', 'quarterly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."tax_type" AS ENUM('gst', 'gst_free', 'input_taxed', 'export');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('owner', 'admin', 'manager', 'sales', 'operations', 'support', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'invited', 'suspended', 'deactivated');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('staff', 'installer');--> statement-breakpoint
CREATE TYPE "public"."win_loss_reason_type" AS ENUM('win', 'loss');--> statement-breakpoint
CREATE TYPE "public"."xero_sync_status" AS ENUM('pending', 'syncing', 'synced', 'error');--> statement-breakpoint
CREATE TYPE "public"."amendment_type" AS ENUM('quantity_change', 'item_add', 'item_remove', 'price_change', 'discount_change', 'shipping_change', 'address_change', 'date_change', 'cancel_order', 'other');--> statement-breakpoint
CREATE TYPE "public"."setting_type" AS ENUM('string', 'number', 'boolean', 'json');--> statement-breakpoint
CREATE TYPE "public"."custom_field_entity_type" AS ENUM('customer', 'contact', 'order', 'product', 'supplier', 'opportunity', 'issue', 'job');--> statement-breakpoint
CREATE TYPE "public"."custom_field_type" AS ENUM('text', 'number', 'date', 'select', 'checkbox', 'textarea', 'email', 'url', 'phone', 'multiselect');--> statement-breakpoint
CREATE TYPE "public"."export_format" AS ENUM('csv', 'json', 'xlsx');--> statement-breakpoint
CREATE TYPE "public"."export_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."group_role" AS ENUM('member', 'lead', 'manager');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."template_category" AS ENUM('quotes', 'orders', 'installations', 'warranty', 'support', 'marketing', 'follow_up', 'custom');--> statement-breakpoint
CREATE TYPE "public"."job_assignment_status" AS ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold');--> statement-breakpoint
CREATE TYPE "public"."job_assignment_type" AS ENUM('installation', 'service', 'warranty', 'inspection', 'commissioning');--> statement-breakpoint
CREATE TYPE "public"."job_photo_type" AS ENUM('before', 'during', 'after', 'issue', 'signature');--> statement-breakpoint
CREATE TYPE "public"."job_task_status" AS ENUM('pending', 'in_progress', 'completed', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."rma_reason" AS ENUM('defective', 'damaged_in_shipping', 'wrong_item', 'not_as_described', 'performance_issue', 'installation_failure', 'other');--> statement-breakpoint
CREATE TYPE "public"."rma_resolution" AS ENUM('refund', 'replacement', 'repair', 'credit', 'no_action');--> statement-breakpoint
CREATE TYPE "public"."rma_status" AS ENUM('requested', 'approved', 'received', 'processed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."csat_source" AS ENUM('email_link', 'internal_entry', 'public_form');--> statement-breakpoint
CREATE TYPE "public"."kb_article_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."warranty_status" AS ENUM('active', 'expiring_soon', 'expired', 'voided', 'transferred');--> statement-breakpoint
CREATE TYPE "public"."warranty_claim_resolution_type" AS ENUM('repair', 'replacement', 'refund', 'warranty_extension');--> statement-breakpoint
CREATE TYPE "public"."warranty_claim_status" AS ENUM('submitted', 'under_review', 'approved', 'denied', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."warranty_claim_type" AS ENUM('cell_degradation', 'bms_fault', 'inverter_failure', 'installation_defect', 'other');--> statement-breakpoint
CREATE TYPE "public"."warranty_extension_type" AS ENUM('paid_extension', 'promotional', 'loyalty_reward', 'goodwill');--> statement-breakpoint
CREATE TYPE "public"."warranty_policy_type" AS ENUM('battery_performance', 'inverter_manufacturer', 'installation_workmanship');--> statement-breakpoint
CREATE TYPE "public"."price_agreement_status" AS ENUM('draft', 'pending', 'approved', 'rejected', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."price_change_status" AS ENUM('pending', 'approved', 'rejected', 'applied', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."ai_agent_name" AS ENUM('triage', 'customer', 'order', 'analytics', 'quote', 'jobs', 'communications', 'inventory', 'warranty', 'purchasing');--> statement-breakpoint
CREATE TYPE "public"."ai_agent_task_status" AS ENUM('queued', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ai_approval_status" AS ENUM('pending', 'approved', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."ai_message_role" AS ENUM('user', 'assistant', 'system', 'tool');--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "job_type" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"external_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"failure_reason" text,
	"data" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" text,
	"user_agent" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"type" "address_type" DEFAULT 'billing' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"street1" text NOT NULL,
	"street2" text,
	"city" text NOT NULL,
	"state" text,
	"postcode" text NOT NULL,
	"country" text DEFAULT 'AU' NOT NULL,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "addresses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"title" text,
	"email" text,
	"phone" text,
	"mobile" text,
	"department" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"decision_maker" boolean DEFAULT false NOT NULL,
	"influencer" boolean DEFAULT false NOT NULL,
	"email_opt_in" boolean DEFAULT true NOT NULL,
	"sms_opt_in" boolean DEFAULT false NOT NULL,
	"email_opt_in_at" text,
	"sms_opt_in_at" text,
	"last_contacted_at" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "customer_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"contact_id" uuid,
	"activity_type" "customer_activity_type" NOT NULL,
	"direction" "activity_direction",
	"subject" text,
	"description" text NOT NULL,
	"outcome" text,
	"duration" integer,
	"scheduled_at" text,
	"completed_at" text,
	"assigned_to" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" text DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_health_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"metric_date" date NOT NULL,
	"recency_score" numeric(5, 2),
	"frequency_score" numeric(5, 2),
	"monetary_score" numeric(5, 2),
	"engagement_score" numeric(5, 2),
	"overall_score" numeric(5, 2),
	"created_at" text DEFAULT now() NOT NULL,
	CONSTRAINT "recency_score_range" CHECK ("customer_health_metrics"."recency_score" IS NULL OR ("customer_health_metrics"."recency_score" >= 0 AND "customer_health_metrics"."recency_score" <= 100)),
	CONSTRAINT "frequency_score_range" CHECK ("customer_health_metrics"."frequency_score" IS NULL OR ("customer_health_metrics"."frequency_score" >= 0 AND "customer_health_metrics"."frequency_score" <= 100)),
	CONSTRAINT "monetary_score_range" CHECK ("customer_health_metrics"."monetary_score" IS NULL OR ("customer_health_metrics"."monetary_score" >= 0 AND "customer_health_metrics"."monetary_score" <= 100)),
	CONSTRAINT "engagement_score_range" CHECK ("customer_health_metrics"."engagement_score" IS NULL OR ("customer_health_metrics"."engagement_score" >= 0 AND "customer_health_metrics"."engagement_score" <= 100)),
	CONSTRAINT "overall_score_range" CHECK ("customer_health_metrics"."overall_score" IS NULL OR ("customer_health_metrics"."overall_score" >= 0 AND "customer_health_metrics"."overall_score" <= 100))
);
--> statement-breakpoint
CREATE TABLE "customer_merge_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"primary_customer_id" uuid NOT NULL,
	"merged_customer_id" uuid,
	"action" text NOT NULL,
	"reason" text,
	"performed_by" uuid NOT NULL,
	"performed_at" text DEFAULT now() NOT NULL,
	"merged_data" jsonb DEFAULT '{}'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "customer_priorities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"priority_level" "customer_priority_level" DEFAULT 'medium' NOT NULL,
	"account_manager" uuid,
	"service_level" "service_level" DEFAULT 'standard' NOT NULL,
	"contract_value" numeric(12, 2),
	"contract_start_date" date,
	"contract_end_date" date,
	"special_terms" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contract_dates_valid" CHECK ("customer_priorities"."contract_end_date" IS NULL OR "customer_priorities"."contract_start_date" IS NULL OR "customer_priorities"."contract_end_date" > "customer_priorities"."contract_start_date")
);
--> statement-breakpoint
CREATE TABLE "customer_tag_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"assigned_by" uuid NOT NULL,
	"assigned_at" text DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "customer_tag_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "customer_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#6B7280' NOT NULL,
	"category" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"customer_code" text DEFAULT 'CUST-' || substr(gen_random_uuid()::text, 1, 8) NOT NULL,
	"name" text NOT NULL,
	"legal_name" text,
	"email" text,
	"phone" text,
	"website" text,
	"status" "customer_status" DEFAULT 'prospect' NOT NULL,
	"type" "customer_type" DEFAULT 'business' NOT NULL,
	"size" "customer_size",
	"industry" text,
	"tax_id" text,
	"registration_number" text,
	"parent_id" uuid,
	"credit_limit" numeric(12, 2),
	"credit_hold" boolean DEFAULT false NOT NULL,
	"credit_hold_reason" text,
	"health_score" integer,
	"health_score_updated_at" text,
	"lifetime_value" numeric(12, 2),
	"first_order_date" date,
	"last_order_date" date,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"total_order_value" numeric(12, 2),
	"average_order_value" numeric(12, 2),
	"tags" jsonb DEFAULT '[]'::jsonb,
	"custom_fields" jsonb DEFAULT '{}'::jsonb,
	"warranty_expiry_alert_opt_out" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "health_score_range" CHECK ("customers"."health_score" IS NULL OR ("customers"."health_score" >= 0 AND "customers"."health_score" <= 100)),
	CONSTRAINT "parent_not_self" CHECK ("customers"."parent_id" IS NULL OR "customers"."parent_id" != "customers"."id")
);
--> statement-breakpoint
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"parent_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"default_warranty_policy_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_parent_not_self" CHECK ("categories"."parent_id" IS NULL OR "categories"."parent_id" != "categories"."id")
);
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"sku" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"barcode" text,
	"category_id" uuid,
	"type" "product_type" DEFAULT 'physical' NOT NULL,
	"status" "product_status" DEFAULT 'active' NOT NULL,
	"is_serialized" boolean DEFAULT false NOT NULL,
	"track_inventory" boolean DEFAULT true NOT NULL,
	"base_price" numeric(12, 2) DEFAULT 0 NOT NULL,
	"cost_price" numeric(12, 2),
	"tax_type" "tax_type" DEFAULT 'gst' NOT NULL,
	"weight" numeric(8, 3),
	"dimensions" jsonb DEFAULT '{}'::jsonb,
	"specifications" jsonb DEFAULT '{}'::jsonb,
	"seo_title" varchar(255),
	"seo_description" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"xero_item_id" varchar(255),
	"pricing" jsonb DEFAULT '{}'::jsonb,
	"reorder_point" numeric(10, 3) DEFAULT 0 NOT NULL,
	"reorder_qty" numeric(10, 3) DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"warranty_policy_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_sellable" boolean DEFAULT true NOT NULL,
	"is_purchasable" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "product_base_price_non_negative" CHECK ("products"."base_price" >= 0),
	CONSTRAINT "product_cost_price_non_negative" CHECK ("products"."cost_price" IS NULL OR "products"."cost_price" >= 0)
);
--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_attribute_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"attribute_id" uuid NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_attribute_values" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_attributes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"attribute_type" "attribute_type" NOT NULL,
	"description" text,
	"options" jsonb DEFAULT '{}'::jsonb,
	"is_required" boolean DEFAULT false NOT NULL,
	"is_filterable" boolean DEFAULT false NOT NULL,
	"is_searchable" boolean DEFAULT false NOT NULL,
	"category_ids" jsonb DEFAULT '[]'::jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_attributes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_bundles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"bundle_product_id" uuid NOT NULL,
	"component_product_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"is_optional" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bundle_quantity_positive" CHECK ("product_bundles"."quantity" > 0),
	CONSTRAINT "bundle_not_self_reference" CHECK ("product_bundles"."bundle_product_id" != "product_bundles"."component_product_id")
);
--> statement-breakpoint
ALTER TABLE "product_bundles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"alt_text" varchar(255),
	"caption" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"file_size" integer,
	"dimensions" jsonb,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "image_file_size_positive" CHECK ("product_images"."file_size" IS NULL OR "product_images"."file_size" >= 0)
);
--> statement-breakpoint
ALTER TABLE "product_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "customer_product_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"price" numeric(12, 2) DEFAULT 0 NOT NULL,
	"discount_percent" numeric(5, 2),
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_to" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_price_valid_to_after_from" CHECK ("customer_product_prices"."valid_to" IS NULL OR "customer_product_prices"."valid_to" > "customer_product_prices"."valid_from"),
	CONSTRAINT "customer_price_non_negative" CHECK ("customer_product_prices"."price" >= 0),
	CONSTRAINT "customer_price_discount_range" CHECK ("customer_product_prices"."discount_percent" IS NULL OR ("customer_product_prices"."discount_percent" >= 0 AND "customer_product_prices"."discount_percent" <= 100))
);
--> statement-breakpoint
ALTER TABLE "customer_product_prices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"change_type" "price_change_type" NOT NULL,
	"previous_price" numeric(12, 2) DEFAULT 0 NOT NULL,
	"new_price" numeric(12, 2) DEFAULT 0 NOT NULL,
	"previous_discount_percent" numeric(5, 2),
	"new_discount_percent" numeric(5, 2),
	"tier_id" uuid,
	"customer_id" uuid,
	"reason" text,
	"changed_by" uuid NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "price_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_price_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"min_quantity" integer NOT NULL,
	"max_quantity" integer,
	"price" numeric(12, 2) DEFAULT 0 NOT NULL,
	"discount_percent" numeric(5, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_tier_min_qty_positive" CHECK ("product_price_tiers"."min_quantity" > 0),
	CONSTRAINT "price_tier_max_qty_valid" CHECK ("product_price_tiers"."max_quantity" IS NULL OR "product_price_tiers"."max_quantity" > "product_price_tiers"."min_quantity"),
	CONSTRAINT "price_tier_price_non_negative" CHECK ("product_price_tiers"."price" >= 0),
	CONSTRAINT "price_tier_discount_range" CHECK ("product_price_tiers"."discount_percent" IS NULL OR ("product_price_tiers"."discount_percent" >= 0 AND "product_price_tiers"."discount_percent" <= 100))
);
--> statement-breakpoint
ALTER TABLE "product_price_tiers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"related_product_id" uuid NOT NULL,
	"relation_type" "product_relation_type" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_not_self_relation" CHECK ("product_relations"."product_id" != "product_relations"."related_product_id")
);
--> statement-breakpoint
ALTER TABLE "product_relations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "order_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"line_number" text NOT NULL,
	"sku" text,
	"description" text NOT NULL,
	"quantity" numeric(10, 3) DEFAULT 0 NOT NULL,
	"unit_price" numeric(12, 2) DEFAULT 0 NOT NULL,
	"discount_percent" numeric(5, 2),
	"discount_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"tax_type" "tax_type" DEFAULT 'gst' NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"line_total" numeric(12, 2) DEFAULT 0 NOT NULL,
	"pick_status" "order_line_item_pick_status" DEFAULT 'not_picked' NOT NULL,
	"picked_at" timestamp with time zone,
	"picked_by" uuid,
	"qty_picked" numeric(10, 3) DEFAULT 0 NOT NULL,
	"qty_shipped" numeric(10, 3) DEFAULT 0 NOT NULL,
	"qty_delivered" numeric(10, 3) DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_line_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_number" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"status" "order_status" DEFAULT 'draft' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"order_date" date DEFAULT now() NOT NULL,
	"due_date" date,
	"shipped_date" date,
	"delivered_date" date,
	"billing_address" jsonb,
	"shipping_address" jsonb,
	"subtotal" numeric(12, 2) DEFAULT 0 NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"discount_percent" numeric(5, 2),
	"tax_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"shipping_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"total" numeric(12, 2) DEFAULT 0 NOT NULL,
	"paid_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"balance_due" numeric(12, 2) DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"internal_notes" text,
	"customer_notes" text,
	"quote_pdf_url" text,
	"invoice_pdf_url" text,
	"xero_invoice_id" text,
	"xero_sync_status" "xero_sync_status" DEFAULT 'pending',
	"xero_sync_error" text,
	"last_xero_sync_at" text,
	"xero_invoice_url" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "order_amendments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"amendment_type" "amendment_type" NOT NULL,
	"reason" text NOT NULL,
	"changes" jsonb NOT NULL,
	"status" "amendment_status" DEFAULT 'requested' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"requested_by" uuid NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"approval_notes" jsonb,
	"applied_at" timestamp with time zone,
	"applied_by" uuid,
	"order_version_before" integer,
	"order_version_after" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "order_amendments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "order_shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"shipment_number" text NOT NULL,
	"status" "shipment_status" DEFAULT 'pending' NOT NULL,
	"carrier" text,
	"carrier_service" text,
	"tracking_number" text,
	"tracking_url" text,
	"shipping_address" jsonb,
	"return_address" jsonb,
	"weight" integer,
	"length" integer,
	"width" integer,
	"height" integer,
	"package_count" integer DEFAULT 1,
	"shipped_at" timestamp with time zone,
	"estimated_delivery_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"delivery_confirmation" jsonb,
	"tracking_events" jsonb,
	"shipped_by" uuid,
	"notes" text,
	"carrier_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "order_shipments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "shipment_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"shipment_id" uuid NOT NULL,
	"order_line_item_id" uuid NOT NULL,
	"quantity" numeric(10, 3) DEFAULT 0 NOT NULL,
	"serial_numbers" jsonb,
	"lot_number" text,
	"expiry_date" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shipment_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "order_template_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"line_number" text NOT NULL,
	"sort_order" text DEFAULT '0' NOT NULL,
	"product_id" uuid,
	"sku" text,
	"description" text NOT NULL,
	"default_quantity" numeric(10, 3) DEFAULT 1 NOT NULL,
	"fixed_unit_price" numeric(12, 2) DEFAULT 0 NOT NULL,
	"use_current_price" boolean DEFAULT true NOT NULL,
	"discount_percent" numeric(5, 2),
	"discount_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"tax_type" "tax_type" DEFAULT 'gst',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_template_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "order_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_global" boolean DEFAULT false NOT NULL,
	"default_customer_id" uuid,
	"default_values" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "order_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "credit_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"credit_note_number" text NOT NULL,
	"order_id" uuid,
	"customer_id" uuid NOT NULL,
	"amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"gst_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"reason" text NOT NULL,
	"status" "credit_note_status" DEFAULT 'draft' NOT NULL,
	"applied_to_order_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"internal_notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "credit_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payment_reminder_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"default_template_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "payment_reminder_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reminder_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"template_id" uuid,
	"template_name" text,
	"days_overdue" integer,
	"subject_sent" text,
	"body_sent" text,
	"recipient_email" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivery_status" text DEFAULT 'sent',
	"delivery_error" text,
	"is_manual_send" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "reminder_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reminder_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"days_overdue" integer NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "reminder_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payment_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"plan_type" "payment_plan_type" DEFAULT 'fifty_fifty' NOT NULL,
	"installment_no" integer NOT NULL,
	"description" text,
	"due_date" date NOT NULL,
	"amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"gst_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"status" "installment_status" DEFAULT 'pending' NOT NULL,
	"paid_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"paid_at" timestamp with time zone,
	"payment_reference" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "payment_schedules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "deferred_revenue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"original_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"remaining_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"recognized_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"deferral_date" date NOT NULL,
	"expected_recognition_date" date,
	"status" "deferred_revenue_status" DEFAULT 'deferred' NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deferred_revenue" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "revenue_recognition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"recognition_type" "recognition_type" NOT NULL,
	"milestone_name" text,
	"recognized_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"recognition_date" date NOT NULL,
	"state" "recognition_state" DEFAULT 'pending' NOT NULL,
	"xero_sync_attempts" integer DEFAULT 0 NOT NULL,
	"xero_sync_error" text,
	"last_xero_sync_at" timestamp with time zone,
	"xero_journal_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "revenue_recognition" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "statement_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"opening_balance" numeric(12, 2) DEFAULT 0 NOT NULL,
	"closing_balance" numeric(12, 2) DEFAULT 0 NOT NULL,
	"invoice_count" integer DEFAULT 0 NOT NULL,
	"payment_count" integer DEFAULT 0 NOT NULL,
	"credit_note_count" integer DEFAULT 0 NOT NULL,
	"total_invoiced" numeric(12, 2) DEFAULT 0 NOT NULL,
	"total_payments" numeric(12, 2) DEFAULT 0 NOT NULL,
	"total_credits" numeric(12, 2) DEFAULT 0 NOT NULL,
	"total_gst" numeric(12, 2) DEFAULT 0 NOT NULL,
	"pdf_path" text,
	"sent_at" timestamp with time zone,
	"sent_to_email" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "statement_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"customer_id" uuid NOT NULL,
	"contact_id" uuid,
	"assigned_to" uuid,
	"stage" "opportunity_stage" DEFAULT 'new' NOT NULL,
	"probability" numeric(5, 2) DEFAULT 10,
	"value" numeric(12, 2) DEFAULT 0 NOT NULL,
	"weighted_value" numeric(12, 2),
	"expected_close_date" date,
	"actual_close_date" date,
	"follow_up_date" date,
	"quote_expires_at" timestamp with time zone,
	"quote_pdf_url" text,
	"win_loss_reason_id" uuid,
	"lost_reason" text,
	"lost_notes" text,
	"competitor_name" varchar(100),
	"days_in_stage" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "actual_close_date_required" CHECK ("opportunities"."stage" NOT IN ('won', 'lost') OR "opportunities"."actual_close_date" IS NOT NULL),
	CONSTRAINT "probability_range" CHECK ("opportunities"."probability" IS NULL OR ("opportunities"."probability" >= 0 AND "opportunities"."probability" <= 100))
);
--> statement-breakpoint
ALTER TABLE "opportunities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "opportunity_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"type" "opportunity_activity_type" NOT NULL,
	"description" text NOT NULL,
	"outcome" text,
	"scheduled_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "opportunity_activities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "quote_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT 0 NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"total" numeric(12, 2) DEFAULT 0 NOT NULL,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "version_number_positive" CHECK ("quote_versions"."version_number" > 0),
	CONSTRAINT "subtotal_non_negative" CHECK ("quote_versions"."subtotal" >= 0),
	CONSTRAINT "tax_amount_non_negative" CHECK ("quote_versions"."tax_amount" >= 0),
	CONSTRAINT "total_non_negative" CHECK ("quote_versions"."total" >= 0)
);
--> statement-breakpoint
ALTER TABLE "quote_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"quote_number" text NOT NULL,
	"opportunity_id" uuid,
	"customer_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"quote_date" date DEFAULT now() NOT NULL,
	"valid_until" date,
	"accepted_at" date,
	"line_items" jsonb DEFAULT '[]'::jsonb,
	"subtotal" numeric(12, 2) DEFAULT 0 NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"total" numeric(12, 2) DEFAULT 0 NOT NULL,
	"terms" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "quotes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "win_loss_reasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" "win_loss_reason_type" NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "win_loss_reasons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"status" "inventory_status" DEFAULT 'available' NOT NULL,
	"quantity_on_hand" numeric(10, 3) DEFAULT 0 NOT NULL,
	"quantity_allocated" numeric(10, 3) DEFAULT 0 NOT NULL,
	"quantity_available" numeric(10, 3) GENERATED ALWAYS AS (quantity_on_hand - quantity_allocated) STORED NOT NULL,
	"unit_cost" numeric(12, 2) DEFAULT 0 NOT NULL,
	"total_value" numeric(12, 2) DEFAULT 0 NOT NULL,
	"lot_number" text,
	"serial_number" text,
	"expiry_date" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "inventory_allocation_max" CHECK ("inventory"."quantity_allocated" <= "inventory"."quantity_on_hand")
);
--> statement-breakpoint
ALTER TABLE "inventory" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventory_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"alert_type" "inventory_alert_type" NOT NULL,
	"product_id" uuid,
	"location_id" uuid,
	"threshold" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notification_channels" text[] DEFAULT '{}'::text[],
	"escalation_users" uuid[] DEFAULT '{}'::uuid[],
	"last_triggered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_alerts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventory_cost_layers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"inventory_id" uuid NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"quantity_received" integer NOT NULL,
	"quantity_remaining" integer NOT NULL,
	"unit_cost" numeric(10, 4) NOT NULL,
	"reference_type" "cost_layer_reference_type",
	"reference_id" uuid,
	"expiry_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_cost_layers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventory_forecasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"forecast_date" date NOT NULL,
	"forecast_period" "forecast_period" NOT NULL,
	"demand_quantity" numeric(10, 2) NOT NULL,
	"forecast_accuracy" numeric(5, 2),
	"confidence_level" numeric(5, 2),
	"safety_stock_level" integer,
	"reorder_point" integer,
	"recommended_order_quantity" integer,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_forecasts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"inventory_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"movement_type" "movement_type" NOT NULL,
	"quantity" numeric(10, 3) DEFAULT 0 NOT NULL,
	"previous_quantity" numeric(10, 3) DEFAULT 0 NOT NULL,
	"new_quantity" numeric(10, 3) DEFAULT 0 NOT NULL,
	"unit_cost" numeric(12, 2) DEFAULT 0 NOT NULL,
	"total_cost" numeric(12, 2) DEFAULT 0 NOT NULL,
	"reference_type" text,
	"reference_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
ALTER TABLE "inventory_movements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "stock_count_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stock_count_id" uuid NOT NULL,
	"inventory_id" uuid NOT NULL,
	"expected_quantity" integer NOT NULL,
	"counted_quantity" integer,
	"variance_reason" varchar(255),
	"counted_by" uuid,
	"counted_at" timestamp with time zone,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_counts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"count_code" varchar(20) NOT NULL,
	"status" "stock_count_status" DEFAULT 'draft' NOT NULL,
	"count_type" "stock_count_type" DEFAULT 'cycle' NOT NULL,
	"location_id" uuid,
	"assigned_to" uuid,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"variance_threshold" numeric(5, 2) DEFAULT '5.00',
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stock_counts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "warehouse_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"location_type" varchar(20) NOT NULL,
	"parent_id" uuid,
	"capacity" integer,
	"is_active" boolean DEFAULT true,
	"is_pickable" boolean DEFAULT true,
	"is_receivable" boolean DEFAULT true,
	"attributes" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "warehouse_locations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"domain" text,
	"abn" text,
	"email" text,
	"phone" text,
	"website" text,
	"address" jsonb DEFAULT '{}'::jsonb,
	"timezone" text DEFAULT 'Australia/Sydney' NOT NULL,
	"locale" text DEFAULT 'en-AU' NOT NULL,
	"currency" text DEFAULT 'AUD' NOT NULL,
	"settings" jsonb DEFAULT '{"timezone":"Australia/Sydney","locale":"en-AU","currency":"AUD","dateFormat":"DD/MM/YYYY","portalBranding":{}}'::jsonb,
	"branding" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"stripe_customer_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"category" varchar(50) NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb NOT NULL,
	"type" "setting_type" DEFAULT 'string' NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "system_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "custom_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_type" "custom_field_entity_type" NOT NULL,
	"name" varchar(100) NOT NULL,
	"label" varchar(100) NOT NULL,
	"field_type" "custom_field_type" NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb,
	"is_required" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"validation_rules" jsonb DEFAULT '{}'::jsonb,
	"default_value" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_by" uuid,
	"updated_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "custom_fields" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "custom_field_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"custom_field_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"value" jsonb,
	"created_by" uuid,
	"updated_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "custom_field_values" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "data_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"entities" text[] NOT NULL,
	"format" "export_format" NOT NULL,
	"status" "export_status" DEFAULT 'pending' NOT NULL,
	"file_url" text,
	"file_name" varchar(255),
	"file_size" bigint,
	"record_count" integer,
	"expires_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "data_exports_entities_nonempty" CHECK (array_length("data_exports"."entities", 1) > 0)
);
--> statement-breakpoint
ALTER TABLE "data_exports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "business_hours_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text DEFAULT 'Standard Hours' NOT NULL,
	"weekly_schedule" jsonb NOT NULL,
	"timezone" text DEFAULT 'Australia/Sydney' NOT NULL,
	"is_default" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_hours_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "organization_holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"date" date NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_holidays" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_token" text NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"expires_at" timestamp with time zone NOT NULL,
	"last_active_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"profile" jsonb DEFAULT '{}'::jsonb,
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"status" "user_status" DEFAULT 'invited' NOT NULL,
	"type" "user_type",
	"preferences" jsonb DEFAULT '{"theme":"system","notifications":{"email":true,"push":true}}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_delegations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"delegator_id" uuid NOT NULL,
	"delegate_id" uuid NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"reason" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "user_delegations_valid_dates" CHECK (start_date < end_date),
	CONSTRAINT "user_delegations_different_users" CHECK (delegator_id != delegate_id)
);
--> statement-breakpoint
ALTER TABLE "user_delegations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_group_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "group_role" DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"added_by" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "user_group_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"color" varchar(7),
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "user_groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "user_role" NOT NULL,
	"invited_by" uuid NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"personal_message" text,
	"token" varchar(255) NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "user_invitations_valid_expiry" CHECK (expires_at > invited_at)
);
--> statement-breakpoint
ALTER TABLE "user_invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_onboarding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"step_key" varchar(50) NOT NULL,
	"step_name" varchar(100) NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" varchar(50) NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "api_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"hashed_token" text NOT NULL,
	"token_prefix" text NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"scopes" jsonb DEFAULT '["read"]'::jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"last_used_ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid,
	"revoked_reason" text
);
--> statement-breakpoint
ALTER TABLE "api_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid,
	"entity_type" "activity_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" "activity_action" NOT NULL,
	"changes" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"description" text,
	"source" "activity_source" DEFAULT 'manual' NOT NULL,
	"source_ref" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "campaign_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"contact_id" uuid,
	"email" text NOT NULL,
	"name" text,
	"recipient_data" jsonb DEFAULT '{}'::jsonb,
	"status" "campaign_recipient_status" DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"opened_at" timestamp with time zone,
	"clicked_at" timestamp with time zone,
	"bounced_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"error_message" text,
	"email_history_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_recipients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "email_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"template_type" text NOT NULL,
	"template_data" jsonb DEFAULT '{}'::jsonb,
	"recipient_criteria" jsonb DEFAULT '{}'::jsonb,
	"scheduled_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"delivered_count" integer DEFAULT 0 NOT NULL,
	"open_count" integer DEFAULT 0 NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"bounce_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"unsubscribe_count" integer DEFAULT 0 NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_campaigns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "email_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"sender_id" uuid,
	"from_address" text NOT NULL,
	"to_address" text NOT NULL,
	"customer_id" uuid,
	"subject" text NOT NULL,
	"body_html" text,
	"body_text" text,
	"status" "email_status" DEFAULT 'pending' NOT NULL,
	"resend_message_id" text,
	"campaign_id" uuid,
	"template_id" uuid,
	"opened_at" timestamp with time zone,
	"clicked_at" timestamp with time zone,
	"link_clicks" jsonb,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"bounced_at" timestamp with time zone,
	"bounce_reason" text,
	"bounce_type" "bounce_type",
	"complained_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "email_signatures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_company_wide" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "email_signatures" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "email_suppression" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"reason" "suppression_reason" NOT NULL,
	"bounce_type" "bounce_type",
	"bounce_count" integer DEFAULT 0 NOT NULL,
	"source" text,
	"resend_event_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"deleted_reason" text
);
--> statement-breakpoint
ALTER TABLE "email_suppression" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" "template_category" DEFAULT 'custom' NOT NULL,
	"subject" text NOT NULL,
	"body_html" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"parent_template_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "email_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "scheduled_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"assignee_id" uuid NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"reminder_at" timestamp with time zone,
	"purpose" text DEFAULT 'general' NOT NULL,
	"notes" text,
	"status" "scheduled_call_status" DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"outcome" text,
	"outcome_notes" text,
	"rescheduled_to_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scheduled_calls" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "scheduled_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"recipient_email" text NOT NULL,
	"recipient_name" text,
	"customer_id" uuid,
	"subject" text NOT NULL,
	"template_type" text NOT NULL,
	"template_data" jsonb DEFAULT '{}'::jsonb,
	"scheduled_at" timestamp with time zone NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"status" "scheduled_email_status" DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"email_history_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scheduled_emails" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"email_id" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" jsonb,
	"error_message" text,
	"result" jsonb
);
--> statement-breakpoint
CREATE TABLE "oauth_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"service_type" text NOT NULL,
	"external_account_id" text,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oauth_connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "oauth_service_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"service_type" text NOT NULL,
	"scope" text NOT NULL,
	"is_granted" boolean DEFAULT false NOT NULL,
	"granted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oauth_service_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "oauth_sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"service_type" text NOT NULL,
	"operation" text NOT NULL,
	"status" text NOT NULL,
	"record_count" integer,
	"error_message" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oauth_sync_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "oauth_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"services" jsonb NOT NULL,
	"redirect_url" text NOT NULL,
	"state" text NOT NULL,
	"pkce_verifier" text,
	"pkce_challenge" text,
	"pkce_method" text DEFAULT 'S256' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"is_consumed" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oauth_states" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "oauth_email_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"thread_id" text,
	"subject" text,
	"from" jsonb,
	"to" jsonb DEFAULT '[]'::jsonb,
	"received_at" timestamp with time zone,
	"raw" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oauth_email_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "oauth_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"full_name" text,
	"emails" jsonb DEFAULT '[]'::jsonb,
	"phones" jsonb DEFAULT '[]'::jsonb,
	"raw" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oauth_contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "oauth_calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"timezone" text NOT NULL,
	"location" text,
	"status" text NOT NULL,
	"is_all_day" boolean DEFAULT false NOT NULL,
	"raw" jsonb DEFAULT '{}'::jsonb,
	"last_synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oauth_calendar_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "oauth_sync_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"service_type" text NOT NULL,
	"sync_token" text,
	"last_synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oauth_sync_states" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "job_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_id" uuid,
	"customer_id" uuid NOT NULL,
	"installer_id" uuid NOT NULL,
	"job_type" "job_assignment_type" DEFAULT 'installation' NOT NULL,
	"job_number" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"scheduled_date" date NOT NULL,
	"scheduled_time" time,
	"estimated_duration" integer,
	"status" "job_assignment_status" DEFAULT 'scheduled' NOT NULL,
	"started_at" text,
	"completed_at" text,
	"start_location" jsonb,
	"complete_location" jsonb,
	"signature_url" text,
	"signed_by_name" text,
	"sign_off_token" text,
	"sign_off_token_expires_at" text,
	"confirmation_status" text,
	"confirmation_token" text,
	"internal_notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"sla_tracking_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "job_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "job_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"job_assignment_id" uuid NOT NULL,
	"type" "job_photo_type" NOT NULL,
	"photo_url" text NOT NULL,
	"caption" text,
	"location" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "job_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity_required" numeric(10, 3) DEFAULT 0 NOT NULL,
	"quantity_used" numeric(10, 3) DEFAULT 0 NOT NULL,
	"unit_cost" numeric(12, 2) DEFAULT 0 NOT NULL,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "job_materials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "job_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" "job_task_status" DEFAULT 'pending' NOT NULL,
	"assignee_id" uuid,
	"due_date" date,
	"priority" text DEFAULT 'normal' NOT NULL,
	"estimated_hours" integer,
	"actual_hours" integer,
	"position" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "job_tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "job_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"default_tasks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_bom" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"checklist_template_id" uuid,
	"estimated_duration" integer DEFAULT 120 NOT NULL,
	"sla_configuration_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "job_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "job_time_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone,
	"description" text,
	"category" "job_time_category" DEFAULT 'work' NOT NULL,
	"is_billable" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "job_time_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "checklist_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "checklist_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "job_checklist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"checklist_id" uuid NOT NULL,
	"item_text" varchar(500) NOT NULL,
	"item_description" text,
	"requires_photo" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"completed_by" uuid,
	"notes" text,
	"photo_url" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "job_checklist_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "job_checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"template_id" uuid,
	"template_name" varchar(255),
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "job_checklists" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"filename" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"bucket" text DEFAULT 'attachments' NOT NULL,
	"entity_type" text,
	"entity_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "attachments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sla_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"domain" "sla_domain" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"response_target_value" integer,
	"response_target_unit" "sla_target_unit",
	"resolution_target_value" integer,
	"resolution_target_unit" "sla_target_unit",
	"at_risk_threshold_percent" integer DEFAULT 25 NOT NULL,
	"escalate_on_breach" boolean DEFAULT false NOT NULL,
	"escalate_to_user_id" uuid,
	"business_hours_config_id" uuid,
	"is_default" boolean DEFAULT false NOT NULL,
	"priority_order" integer DEFAULT 100 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sla_configurations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sla_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"domain" "sla_domain" NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"sla_configuration_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"response_due_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"response_breached" boolean DEFAULT false NOT NULL,
	"resolution_due_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"resolution_breached" boolean DEFAULT false NOT NULL,
	"response_time_seconds" bigint,
	"resolution_time_seconds" bigint,
	"is_paused" boolean DEFAULT false NOT NULL,
	"paused_at" timestamp with time zone,
	"pause_reason" text,
	"total_paused_duration_seconds" bigint DEFAULT 0 NOT NULL,
	"status" "sla_tracking_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sla_tracking_entity_type_check" CHECK ("sla_tracking"."entity_type" IN ('issue','warranty_claim','job_assignment'))
);
--> statement-breakpoint
ALTER TABLE "sla_tracking" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sla_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"sla_tracking_id" uuid NOT NULL,
	"event_type" "sla_event_type" NOT NULL,
	"event_data" jsonb,
	"triggered_by_user_id" uuid,
	"triggered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sla_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"issue_number" text DEFAULT 'ISS-' || substr(gen_random_uuid()::text, 1, 8) NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "issue_type" DEFAULT 'other' NOT NULL,
	"priority" "issue_priority" DEFAULT 'medium' NOT NULL,
	"status" "issue_status" DEFAULT 'open' NOT NULL,
	"customer_id" uuid,
	"assigned_to_user_id" uuid,
	"sla_tracking_id" uuid,
	"hold_reason" text,
	"escalated_at" timestamp with time zone,
	"escalated_by" uuid,
	"escalation_reason" text,
	"resolved_at" timestamp with time zone,
	"resolution_notes" text,
	"metadata" jsonb,
	"tags" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "issues" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "escalation_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"action" text NOT NULL,
	"performed_by_user_id" uuid NOT NULL,
	"reason" text,
	"escalation_rule_id" uuid,
	"escalated_to_user_id" uuid,
	"previous_assignee_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "escalation_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "escalation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"condition" jsonb NOT NULL,
	"action" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"escalate_to_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "escalation_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "return_authorizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"rma_number" text NOT NULL,
	"issue_id" uuid,
	"customer_id" uuid,
	"order_id" uuid,
	"status" "rma_status" DEFAULT 'requested' NOT NULL,
	"reason" "rma_reason" NOT NULL,
	"reason_details" text,
	"resolution" "rma_resolution",
	"resolution_details" jsonb,
	"inspection_notes" jsonb,
	"internal_notes" text,
	"customer_notes" text,
	"approved_at" text,
	"approved_by" uuid,
	"received_at" text,
	"received_by" uuid,
	"processed_at" text,
	"processed_by" uuid,
	"rejected_at" text,
	"rejected_by" uuid,
	"rejection_reason" text,
	"sequence_number" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "rma_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rma_id" uuid NOT NULL,
	"order_line_item_id" uuid NOT NULL,
	"quantity_returned" integer DEFAULT 1 NOT NULL,
	"item_reason" text,
	"item_condition" text,
	"serial_number" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rma_line_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "issue_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" "issue_type" NOT NULL,
	"default_priority" "issue_priority" DEFAULT 'medium',
	"default_assignee_id" uuid,
	"title_template" text,
	"description_prompt" text,
	"required_fields" jsonb,
	"defaults" jsonb,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "issue_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "csat_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"source" "csat_source" NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_by_user_id" uuid,
	"submitted_by_customer_id" uuid,
	"submitted_by_email" text,
	"token" text,
	"token_expires_at" timestamp with time zone,
	"token_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "csat_responses_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "csat_responses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "kb_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"summary" text,
	"content" text NOT NULL,
	"category_id" uuid,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"status" "kb_article_status" DEFAULT 'draft' NOT NULL,
	"published_at" text,
	"view_count" integer DEFAULT 0 NOT NULL,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"not_helpful_count" integer DEFAULT 0 NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "kb_articles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "kb_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"parent_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "kb_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "warranties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"warranty_number" varchar(50) NOT NULL,
	"customer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_serial" varchar(255),
	"warranty_policy_id" uuid NOT NULL,
	"order_id" uuid,
	"registration_date" timestamp with time zone DEFAULT now() NOT NULL,
	"expiry_date" timestamp with time zone NOT NULL,
	"current_cycle_count" integer,
	"last_cycle_update" timestamp with time zone,
	"status" "warranty_status" DEFAULT 'active' NOT NULL,
	"assigned_user_id" uuid,
	"original_customer_id" uuid,
	"transferred_at" timestamp with time zone,
	"expiry_alert_opt_out" boolean DEFAULT false NOT NULL,
	"last_expiry_alert_sent" timestamp with time zone,
	"certificate_url" text,
	"notes" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "warranties" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "warranty_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"claim_number" varchar(50) NOT NULL,
	"warranty_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"issue_id" uuid,
	"claim_type" "warranty_claim_type" NOT NULL,
	"description" text NOT NULL,
	"status" "warranty_claim_status" DEFAULT 'submitted' NOT NULL,
	"resolution_type" "warranty_claim_resolution_type",
	"resolution_notes" text,
	"approved_by_user_id" uuid,
	"approved_at" timestamp with time zone,
	"denial_reason" text,
	"cost" numeric(12, 2),
	"cycle_count_at_claim" integer,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"assigned_user_id" uuid,
	"sla_tracking_id" uuid,
	"notes" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "warranty_claims" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "warranty_extensions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"warranty_id" uuid NOT NULL,
	"extension_type" "warranty_extension_type" NOT NULL,
	"extension_months" integer NOT NULL,
	"previous_expiry_date" timestamp with time zone NOT NULL,
	"new_expiry_date" timestamp with time zone NOT NULL,
	"price" numeric(12, 2),
	"notes" text,
	"approved_by_id" uuid,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "warranty_extensions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "warranty_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" "warranty_policy_type" NOT NULL,
	"duration_months" integer NOT NULL,
	"cycle_limit" integer,
	"terms" jsonb DEFAULT '{}'::jsonb,
	"sla_configuration_id" uuid,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "warranty_policies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "supplier_price_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"supplier_name" text,
	"product_name" text,
	"product_sku" text,
	"base_price" numeric(12, 2) DEFAULT 0 NOT NULL,
	"price" numeric(12, 2) DEFAULT 0 NOT NULL,
	"effective_price" numeric(12, 2) DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'AUD' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"min_quantity" integer DEFAULT 1 NOT NULL,
	"max_quantity" integer,
	"min_order_qty" integer,
	"max_order_qty" integer,
	"last_updated" timestamp with time zone,
	"discount_percent" numeric(5, 2),
	"discount_type" text,
	"discount_value" numeric(12, 2) DEFAULT 0 NOT NULL,
	"effective_date" date DEFAULT CURRENT_DATE NOT NULL,
	"expiry_date" date,
	"is_preferred_price" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"supplier_product_code" text,
	"supplier_product_name" text,
	"lead_time_days" integer,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "supplier_price_lists_price_non_negative" CHECK ("supplier_price_lists"."price" >= 0),
	CONSTRAINT "supplier_price_lists_min_quantity_positive" CHECK ("supplier_price_lists"."min_quantity" > 0),
	CONSTRAINT "supplier_price_lists_quantity_range" CHECK ("supplier_price_lists"."max_quantity" IS NULL OR "supplier_price_lists"."max_quantity" >= "supplier_price_lists"."min_quantity"),
	CONSTRAINT "supplier_price_lists_date_range" CHECK ("supplier_price_lists"."expiry_date" IS NULL OR "supplier_price_lists"."expiry_date" > "supplier_price_lists"."effective_date"),
	CONSTRAINT "supplier_price_lists_discount_range" CHECK ("supplier_price_lists"."discount_percent" IS NULL OR ("supplier_price_lists"."discount_percent" >= 0 AND "supplier_price_lists"."discount_percent" <= 100)),
	CONSTRAINT "supplier_price_lists_lead_time_non_negative" CHECK ("supplier_price_lists"."lead_time_days" IS NULL OR "supplier_price_lists"."lead_time_days" >= 0)
);
--> statement-breakpoint
ALTER TABLE "supplier_price_lists" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "supplier_performance_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"metric_month" date NOT NULL,
	"total_orders_delivered" integer DEFAULT 0 NOT NULL,
	"on_time_deliveries" integer DEFAULT 0 NOT NULL,
	"late_deliveries" integer DEFAULT 0 NOT NULL,
	"average_delivery_days" numeric(5, 2),
	"total_items_received" integer DEFAULT 0 NOT NULL,
	"accepted_items" integer DEFAULT 0 NOT NULL,
	"rejected_items" integer DEFAULT 0 NOT NULL,
	"defect_rate" numeric(5, 2),
	"total_spend" numeric(12, 2),
	"average_order_value" numeric(12, 2),
	"average_response_time_hours" numeric(6, 2),
	"delivery_score" numeric(5, 2),
	"quality_score" numeric(5, 2),
	"overall_score" numeric(5, 2),
	"created_at" text DEFAULT now() NOT NULL,
	CONSTRAINT "supplier_metrics_delivery_score_range" CHECK ("supplier_performance_metrics"."delivery_score" IS NULL OR ("supplier_performance_metrics"."delivery_score" >= 0 AND "supplier_performance_metrics"."delivery_score" <= 100)),
	CONSTRAINT "supplier_metrics_quality_score_range" CHECK ("supplier_performance_metrics"."quality_score" IS NULL OR ("supplier_performance_metrics"."quality_score" >= 0 AND "supplier_performance_metrics"."quality_score" <= 100)),
	CONSTRAINT "supplier_metrics_overall_score_range" CHECK ("supplier_performance_metrics"."overall_score" IS NULL OR ("supplier_performance_metrics"."overall_score" >= 0 AND "supplier_performance_metrics"."overall_score" <= 100)),
	CONSTRAINT "supplier_metrics_defect_rate_range" CHECK ("supplier_performance_metrics"."defect_rate" IS NULL OR ("supplier_performance_metrics"."defect_rate" >= 0 AND "supplier_performance_metrics"."defect_rate" <= 100))
);
--> statement-breakpoint
ALTER TABLE "supplier_performance_metrics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"supplier_code" text DEFAULT 'SUPP-' || substr(gen_random_uuid()::text, 1, 8) NOT NULL,
	"name" text NOT NULL,
	"legal_name" text,
	"email" text,
	"phone" text,
	"website" text,
	"status" "supplier_status" DEFAULT 'active' NOT NULL,
	"supplier_type" "supplier_type",
	"tax_id" text,
	"registration_number" text,
	"primary_contact_name" text,
	"primary_contact_email" text,
	"primary_contact_phone" text,
	"billing_address" jsonb,
	"shipping_address" jsonb,
	"payment_terms" "payment_terms" DEFAULT 'net_30',
	"currency" text DEFAULT 'AUD' NOT NULL,
	"lead_time_days" integer,
	"minimum_order_value" numeric(12, 2),
	"maximum_order_value" numeric(12, 2),
	"quality_rating" numeric(3, 1),
	"delivery_rating" numeric(3, 1),
	"communication_rating" numeric(3, 1),
	"overall_rating" numeric(3, 1) GENERATED ALWAYS AS ((quality_rating + delivery_rating + communication_rating) / 3) STORED,
	"rating_updated_at" text,
	"total_purchase_orders" integer DEFAULT 0 NOT NULL,
	"total_purchase_value" numeric(12, 2),
	"average_order_value" numeric(12, 2),
	"first_order_date" date,
	"last_order_date" date,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"custom_fields" jsonb DEFAULT '{}'::jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "suppliers_quality_rating_range" CHECK ("suppliers"."quality_rating" IS NULL OR ("suppliers"."quality_rating" >= 0 AND "suppliers"."quality_rating" <= 5)),
	CONSTRAINT "suppliers_delivery_rating_range" CHECK ("suppliers"."delivery_rating" IS NULL OR ("suppliers"."delivery_rating" >= 0 AND "suppliers"."delivery_rating" <= 5)),
	CONSTRAINT "suppliers_communication_rating_range" CHECK ("suppliers"."communication_rating" IS NULL OR ("suppliers"."communication_rating" >= 0 AND "suppliers"."communication_rating" <= 5)),
	CONSTRAINT "suppliers_overall_rating_range" CHECK ("suppliers"."overall_rating" IS NULL OR ("suppliers"."overall_rating" >= 0 AND "suppliers"."overall_rating" <= 5)),
	CONSTRAINT "suppliers_order_value_range" CHECK ("suppliers"."minimum_order_value" IS NULL OR "suppliers"."maximum_order_value" IS NULL OR "suppliers"."maximum_order_value" >= "suppliers"."minimum_order_value")
);
--> statement-breakpoint
ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"po_number" text DEFAULT 'PO-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6) NOT NULL,
	"supplier_id" uuid NOT NULL,
	"status" "purchase_order_status" DEFAULT 'draft' NOT NULL,
	"order_date" date DEFAULT CURRENT_DATE NOT NULL,
	"required_date" date,
	"expected_delivery_date" date,
	"actual_delivery_date" date,
	"ship_to_address" jsonb,
	"bill_to_address" jsonb,
	"subtotal" numeric(12, 2) DEFAULT 0 NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"shipping_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'AUD' NOT NULL,
	"payment_terms" text,
	"ordered_by" uuid,
	"ordered_at" timestamp with time zone,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"approval_notes" text,
	"closed_by" uuid,
	"closed_at" timestamp with time zone,
	"closed_reason" text,
	"supplier_reference" text,
	"internal_reference" text,
	"notes" text,
	"internal_notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "purchase_orders_total_calc" CHECK ("purchase_orders"."total_amount" = "purchase_orders"."subtotal" + "purchase_orders"."tax_amount" + "purchase_orders"."shipping_amount" - "purchase_orders"."discount_amount"),
	CONSTRAINT "purchase_orders_approved_status" CHECK (("purchase_orders"."approved_at" IS NULL AND "purchase_orders"."approved_by" IS NULL) OR
          ("purchase_orders"."approved_at" IS NOT NULL AND "purchase_orders"."approved_by" IS NOT NULL)),
	CONSTRAINT "purchase_orders_closed_status" CHECK (("purchase_orders"."closed_at" IS NULL AND "purchase_orders"."closed_by" IS NULL) OR
          ("purchase_orders"."closed_at" IS NOT NULL AND "purchase_orders"."closed_by" IS NOT NULL)),
	CONSTRAINT "purchase_orders_date_order" CHECK ("purchase_orders"."required_date" IS NULL OR "purchase_orders"."required_date" >= "purchase_orders"."order_date")
);
--> statement-breakpoint
ALTER TABLE "purchase_orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"product_id" uuid,
	"line_number" integer NOT NULL,
	"product_name" text NOT NULL,
	"product_sku" text,
	"description" text,
	"quantity" integer NOT NULL,
	"unit_of_measure" text DEFAULT 'each',
	"unit_price" numeric(12, 2) DEFAULT 0 NOT NULL,
	"discount_percent" integer DEFAULT 0,
	"tax_rate" integer DEFAULT 10,
	"line_total" numeric(12, 2) DEFAULT 0 NOT NULL,
	"quantity_received" integer DEFAULT 0 NOT NULL,
	"quantity_rejected" integer DEFAULT 0 NOT NULL,
	"quantity_pending" integer DEFAULT 0 NOT NULL,
	"expected_delivery_date" date,
	"actual_delivery_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_order_items_quantity_positive" CHECK ("purchase_order_items"."quantity" > 0),
	CONSTRAINT "purchase_order_items_unit_price_non_negative" CHECK ("purchase_order_items"."unit_price" >= 0),
	CONSTRAINT "purchase_order_items_line_total_calc" CHECK ("purchase_order_items"."line_total" = "purchase_order_items"."quantity" * "purchase_order_items"."unit_price"),
	CONSTRAINT "purchase_order_items_received_max" CHECK ("purchase_order_items"."quantity_received" <= "purchase_order_items"."quantity"),
	CONSTRAINT "purchase_order_items_rejected_max" CHECK ("purchase_order_items"."quantity_rejected" <= "purchase_order_items"."quantity_received"),
	CONSTRAINT "purchase_order_items_pending_calc" CHECK ("purchase_order_items"."quantity_pending" = "purchase_order_items"."quantity" - "purchase_order_items"."quantity_received"),
	CONSTRAINT "purchase_order_items_discount_range" CHECK ("purchase_order_items"."discount_percent" >= 0 AND "purchase_order_items"."discount_percent" <= 100),
	CONSTRAINT "purchase_order_items_tax_rate_range" CHECK ("purchase_order_items"."tax_rate" >= 0 AND "purchase_order_items"."tax_rate" <= 100)
);
--> statement-breakpoint
ALTER TABLE "purchase_order_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "purchase_order_approval_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"min_amount" numeric(12, 2),
	"max_amount" numeric(12, 2),
	"requires_approval" boolean DEFAULT true NOT NULL,
	"auto_approve_under" numeric(12, 2),
	"approver_roles" text[] DEFAULT '{}'::text[] NOT NULL,
	"escalation_hours" integer DEFAULT 24,
	"escalation_approver_roles" text[] DEFAULT '{}'::text[],
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "purchase_order_approval_rules_amount_range" CHECK ("purchase_order_approval_rules"."min_amount" IS NULL OR "purchase_order_approval_rules"."max_amount" IS NULL OR "purchase_order_approval_rules"."max_amount" >= "purchase_order_approval_rules"."min_amount"),
	CONSTRAINT "purchase_order_approval_rules_escalation_hours_positive" CHECK ("purchase_order_approval_rules"."escalation_hours" IS NULL OR "purchase_order_approval_rules"."escalation_hours" > 0),
	CONSTRAINT "purchase_order_approval_rules_priority_non_negative" CHECK ("purchase_order_approval_rules"."priority" >= 0)
);
--> statement-breakpoint
ALTER TABLE "purchase_order_approval_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "purchase_order_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"approver_id" uuid NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"status" "approval_status" DEFAULT 'pending' NOT NULL,
	"comments" text,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"escalated_to" uuid,
	"escalated_at" timestamp with time zone,
	"escalation_reason" text,
	"delegated_from" uuid,
	"due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "purchase_order_approvals_level_positive" CHECK ("purchase_order_approvals"."level" > 0),
	CONSTRAINT "purchase_order_approvals_approved_status" CHECK (("purchase_order_approvals"."status" = 'approved' AND "purchase_order_approvals"."approved_at" IS NOT NULL) OR
          ("purchase_order_approvals"."status" != 'approved' AND "purchase_order_approvals"."approved_at" IS NULL)),
	CONSTRAINT "purchase_order_approvals_rejected_status" CHECK (("purchase_order_approvals"."status" = 'rejected' AND "purchase_order_approvals"."rejected_at" IS NOT NULL) OR
          ("purchase_order_approvals"."status" != 'rejected' AND "purchase_order_approvals"."rejected_at" IS NULL)),
	CONSTRAINT "purchase_order_approvals_escalated_consistency" CHECK (("purchase_order_approvals"."escalated_to" IS NULL AND "purchase_order_approvals"."escalated_at" IS NULL) OR
          ("purchase_order_approvals"."escalated_to" IS NOT NULL AND "purchase_order_approvals"."escalated_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "purchase_order_approvals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "purchase_order_receipt_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"receipt_id" uuid NOT NULL,
	"purchase_order_item_id" uuid NOT NULL,
	"line_number" integer NOT NULL,
	"quantity_expected" integer NOT NULL,
	"quantity_received" integer NOT NULL,
	"quantity_accepted" integer DEFAULT 0 NOT NULL,
	"quantity_rejected" integer DEFAULT 0 NOT NULL,
	"condition" "condition" DEFAULT 'new',
	"rejection_reason" "rejection_reason",
	"quality_notes" text,
	"warehouse_location" text,
	"bin_number" text,
	"lot_number" text,
	"serial_numbers" text[] DEFAULT '{}'::text[],
	"expiry_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_order_receipt_items_qty_expected_non_negative" CHECK ("purchase_order_receipt_items"."quantity_expected" >= 0),
	CONSTRAINT "purchase_order_receipt_items_qty_received_non_negative" CHECK ("purchase_order_receipt_items"."quantity_received" >= 0),
	CONSTRAINT "purchase_order_receipt_items_qty_accepted_non_negative" CHECK ("purchase_order_receipt_items"."quantity_accepted" >= 0),
	CONSTRAINT "purchase_order_receipt_items_qty_rejected_non_negative" CHECK ("purchase_order_receipt_items"."quantity_rejected" >= 0),
	CONSTRAINT "purchase_order_receipt_items_qty_balance" CHECK ("purchase_order_receipt_items"."quantity_accepted" + "purchase_order_receipt_items"."quantity_rejected" = "purchase_order_receipt_items"."quantity_received"),
	CONSTRAINT "purchase_order_receipt_items_rejection_reason" CHECK ("purchase_order_receipt_items"."quantity_rejected" = 0 OR "purchase_order_receipt_items"."rejection_reason" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "purchase_order_receipt_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "purchase_order_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"receipt_number" text DEFAULT 'GRN-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6) NOT NULL,
	"received_by" uuid NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"carrier" text,
	"tracking_number" text,
	"delivery_reference" text,
	"total_items_expected" integer DEFAULT 0 NOT NULL,
	"total_items_received" integer DEFAULT 0 NOT NULL,
	"total_items_accepted" integer DEFAULT 0 NOT NULL,
	"total_items_rejected" integer DEFAULT 0 NOT NULL,
	"status" "receipt_status" DEFAULT 'pending_inspection' NOT NULL,
	"inspection_required" text DEFAULT 'no' NOT NULL,
	"inspection_completed_at" timestamp with time zone,
	"inspection_completed_by" uuid,
	"quality_notes" text,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "purchase_order_receipts_items_expected_non_negative" CHECK ("purchase_order_receipts"."total_items_expected" >= 0),
	CONSTRAINT "purchase_order_receipts_items_received_non_negative" CHECK ("purchase_order_receipts"."total_items_received" >= 0),
	CONSTRAINT "purchase_order_receipts_items_accepted_non_negative" CHECK ("purchase_order_receipts"."total_items_accepted" >= 0),
	CONSTRAINT "purchase_order_receipts_items_rejected_non_negative" CHECK ("purchase_order_receipts"."total_items_rejected" >= 0),
	CONSTRAINT "purchase_order_receipts_items_balance" CHECK ("purchase_order_receipts"."total_items_accepted" + "purchase_order_receipts"."total_items_rejected" <= "purchase_order_receipts"."total_items_received"),
	CONSTRAINT "purchase_order_receipts_inspection_consistency" CHECK (("purchase_order_receipts"."inspection_completed_at" IS NULL AND "purchase_order_receipts"."inspection_completed_by" IS NULL) OR
          ("purchase_order_receipts"."inspection_completed_at" IS NOT NULL AND "purchase_order_receipts"."inspection_completed_by" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "purchase_order_receipts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "purchase_order_amendments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"amendment_number" integer NOT NULL,
	"status" "amendment_status" DEFAULT 'requested' NOT NULL,
	"requested_by" uuid NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"rejected_by" uuid,
	"rejected_at" timestamp with time zone,
	"rejection_reason" text,
	"applied_by" uuid,
	"applied_at" timestamp with time zone,
	"changes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"original_values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"new_values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"internal_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "purchase_order_amendments_number_positive" CHECK ("purchase_order_amendments"."amendment_number" > 0),
	CONSTRAINT "purchase_order_amendments_approved_status" CHECK (("purchase_order_amendments"."status" = 'approved' AND "purchase_order_amendments"."approved_at" IS NOT NULL AND "purchase_order_amendments"."approved_by" IS NOT NULL) OR
          ("purchase_order_amendments"."status" != 'approved' AND "purchase_order_amendments"."approved_at" IS NULL AND "purchase_order_amendments"."approved_by" IS NULL)),
	CONSTRAINT "purchase_order_amendments_rejected_status" CHECK (("purchase_order_amendments"."status" = 'rejected' AND "purchase_order_amendments"."rejected_at" IS NOT NULL AND "purchase_order_amendments"."rejected_by" IS NOT NULL) OR
          ("purchase_order_amendments"."status" != 'rejected' AND "purchase_order_amendments"."rejected_at" IS NULL AND "purchase_order_amendments"."rejected_by" IS NULL)),
	CONSTRAINT "purchase_order_amendments_applied_status" CHECK (("purchase_order_amendments"."status" = 'applied' AND "purchase_order_amendments"."applied_at" IS NOT NULL AND "purchase_order_amendments"."applied_by" IS NOT NULL) OR
          ("purchase_order_amendments"."status" != 'applied' AND "purchase_order_amendments"."applied_at" IS NULL AND "purchase_order_amendments"."applied_by" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "purchase_order_amendments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "purchase_order_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"cost_type" "cost_type" NOT NULL,
	"description" text,
	"amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'AUD' NOT NULL,
	"allocation_method" "allocation_method" DEFAULT 'equal' NOT NULL,
	"is_included_in_total" boolean DEFAULT true NOT NULL,
	"supplier_invoice_number" text,
	"reference_number" text,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "purchase_order_costs_amount_non_negative" CHECK ("purchase_order_costs"."amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "purchase_order_costs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "supplier_price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"price_list_id" uuid,
	"previous_price" numeric(12, 2) DEFAULT 0 NOT NULL,
	"new_price" numeric(12, 2) DEFAULT 0 NOT NULL,
	"price_change" numeric(12, 2) DEFAULT 0 NOT NULL,
	"change_percent" numeric(5, 2),
	"change_reason" text,
	"effective_date" date NOT NULL,
	"changed_by" uuid,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "supplier_price_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "price_agreements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"supplier_name" text,
	"agreement_number" text DEFAULT 'PA-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6) NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"effective_date" date NOT NULL,
	"expiry_date" date,
	"status" "price_agreement_status" DEFAULT 'draft' NOT NULL,
	"currency" text DEFAULT 'AUD' NOT NULL,
	"discount_percent" integer,
	"minimum_order_value" numeric(12, 2),
	"total_items" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"rejected_by" uuid,
	"rejected_at" timestamp with time zone,
	"rejection_reason" text,
	"notes" text,
	"terms_and_conditions" text,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "price_agreements_date_range" CHECK ("price_agreements"."expiry_date" IS NULL OR "price_agreements"."expiry_date" > "price_agreements"."effective_date"),
	CONSTRAINT "price_agreements_discount_range" CHECK ("price_agreements"."discount_percent" IS NULL OR ("price_agreements"."discount_percent" >= 0 AND "price_agreements"."discount_percent" <= 100)),
	CONSTRAINT "price_agreements_approval_consistency" CHECK (("price_agreements"."approved_at" IS NULL AND "price_agreements"."approved_by" IS NULL) OR
          ("price_agreements"."approved_at" IS NOT NULL AND "price_agreements"."approved_by" IS NOT NULL)),
	CONSTRAINT "price_agreements_rejection_consistency" CHECK (("price_agreements"."rejected_at" IS NULL AND "price_agreements"."rejected_by" IS NULL) OR
          ("price_agreements"."rejected_at" IS NOT NULL AND "price_agreements"."rejected_by" IS NOT NULL)),
	CONSTRAINT "price_agreements_total_items_non_negative" CHECK ("price_agreements"."total_items" >= 0)
);
--> statement-breakpoint
ALTER TABLE "price_agreements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "price_change_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"price_list_id" uuid,
	"agreement_id" uuid,
	"supplier_id" uuid,
	"previous_price" numeric(12, 2),
	"new_price" numeric(12, 2) DEFAULT 0 NOT NULL,
	"price_change" numeric(12, 2),
	"change_percent" numeric(5, 2),
	"change_reason" text,
	"effective_date" timestamp with time zone,
	"status" "price_change_status" DEFAULT 'pending' NOT NULL,
	"requested_by" uuid NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"rejected_by" uuid,
	"rejected_at" timestamp with time zone,
	"rejection_reason" text,
	"applied_by" uuid,
	"applied_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_change_history_approval_consistency" CHECK (("price_change_history"."approved_at" IS NULL AND "price_change_history"."approved_by" IS NULL) OR
          ("price_change_history"."approved_at" IS NOT NULL AND "price_change_history"."approved_by" IS NOT NULL)),
	CONSTRAINT "price_change_history_rejection_consistency" CHECK (("price_change_history"."rejected_at" IS NULL AND "price_change_history"."rejected_by" IS NULL) OR
          ("price_change_history"."rejected_at" IS NOT NULL AND "price_change_history"."rejected_by" IS NOT NULL)),
	CONSTRAINT "price_change_history_application_consistency" CHECK (("price_change_history"."applied_at" IS NULL AND "price_change_history"."applied_by" IS NULL) OR
          ("price_change_history"."applied_at" IS NOT NULL AND "price_change_history"."applied_by" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "price_change_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "search_index" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"description" text,
	"url" text,
	"search_text" text NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', search_text)) STORED,
	"rank_boost" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "search_index_entity_type_check" CHECK ("search_index"."entity_type" IN ('customer', 'contact', 'order', 'opportunity', 'product', 'inventory', 'supplier', 'warranty', 'issue', 'user', 'email', 'call', 'job', 'job_assignment', 'warranty_claim', 'quote', 'shipment'))
);
--> statement-breakpoint
ALTER TABLE "search_index" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "recent_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"url" text,
	"last_accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recent_items_entity_type_check" CHECK ("recent_items"."entity_type" IN ('customer', 'contact', 'order', 'opportunity', 'product', 'inventory', 'supplier', 'warranty', 'issue', 'user', 'email', 'call', 'job', 'job_assignment', 'warranty_claim', 'quote', 'shipment'))
);
--> statement-breakpoint
ALTER TABLE "recent_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "search_index_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "search_outbox_action_check" CHECK ("search_index_outbox"."action" IN ('upsert','delete')),
	CONSTRAINT "search_outbox_entity_type_check" CHECK ("search_index_outbox"."entity_type" IN ('customer', 'contact', 'order', 'opportunity', 'product', 'inventory', 'supplier', 'warranty', 'issue', 'user', 'email', 'call', 'job', 'job_assignment', 'warranty_claim', 'quote', 'shipment')),
	CONSTRAINT "search_outbox_status_check" CHECK ("search_index_outbox"."status" IN ('pending','processing','failed','completed'))
);
--> statement-breakpoint
ALTER TABLE "search_index_outbox" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "custom_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_shared" boolean DEFAULT false NOT NULL,
	"definition" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "custom_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "report_favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"report_type" text NOT NULL,
	"report_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_favorites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"metric" "target_metric" NOT NULL,
	"period" "target_period" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"target_value" numeric(12, 2) DEFAULT 0 NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "targets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "scheduled_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"frequency" "report_frequency" NOT NULL,
	"format" "report_format" DEFAULT 'pdf' NOT NULL,
	"schedule_cron" text NOT NULL,
	"timezone" text DEFAULT 'Australia/Sydney' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"next_run_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"last_error_at" timestamp with time zone,
	"last_error" text,
	"consecutive_failures" text DEFAULT '0',
	"recipients" jsonb DEFAULT '{"emails":[],"userIds":[]}'::jsonb NOT NULL,
	"metrics" jsonb DEFAULT '{"metrics":[],"includeCharts":true,"includeTrends":true,"comparisonPeriod":"previous_period"}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "scheduled_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "dashboard_layouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"role_default" "user_role",
	"layout" jsonb DEFAULT '{"widgets":[],"gridColumns":12,"theme":"system","compactMode":false}'::jsonb NOT NULL,
	"filters" jsonb DEFAULT '{"dateRangeStart":null,"dateRangeEnd":null,"dateRangePreset":"30d","comparisonEnabled":false,"comparisonType":null}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dashboard_layouts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "customer_portal_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"scope" text DEFAULT 'customer' NOT NULL,
	"token_hash" text NOT NULL,
	"customer_id" uuid,
	"contact_id" uuid,
	"job_assignment_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"last_ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_portal_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "portal_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"scope" "portal_scope" NOT NULL,
	"status" "portal_identity_status" DEFAULT 'active' NOT NULL,
	"customer_id" uuid,
	"contact_id" uuid,
	"job_assignment_id" uuid,
	"last_seen_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portal_identities_customer_scope_check" CHECK ("portal_identities"."scope" != 'customer' OR ("portal_identities"."customer_id" IS NOT NULL AND "portal_identities"."job_assignment_id" IS NULL)),
	CONSTRAINT "portal_identities_subcontractor_scope_check" CHECK ("portal_identities"."scope" != 'subcontractor' OR "portal_identities"."job_assignment_id" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "portal_identities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ai_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"active_agent" "ai_agent_name",
	"agent_history" jsonb DEFAULT '[]'::jsonb,
	"last_message_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_conversations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ai_conversation_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "ai_message_role" NOT NULL,
	"content" text NOT NULL,
	"tool_calls" jsonb,
	"tool_results" jsonb,
	"tokens_used" integer,
	"agent_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_conversation_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ai_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"action" text NOT NULL,
	"agent" "ai_agent_name" NOT NULL,
	"action_data" jsonb NOT NULL,
	"status" "ai_approval_status" DEFAULT 'pending' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"rejection_reason" text,
	"executed_at" timestamp with time zone,
	"execution_result" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"last_attempt_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "ai_approvals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ai_approval_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"approval_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_approval_entities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ai_agent_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"task_type" text NOT NULL,
	"agent" "ai_agent_name" NOT NULL,
	"input" jsonb NOT NULL,
	"context" jsonb,
	"status" "ai_agent_task_status" DEFAULT 'queued' NOT NULL,
	"progress" integer DEFAULT 0,
	"current_step" text,
	"result" jsonb,
	"error" jsonb,
	"tokens_used" integer DEFAULT 0,
	"cost_cents" integer DEFAULT 0,
	"queued_at" timestamp with time zone DEFAULT now(),
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	CONSTRAINT "ai_agent_tasks_progress_check" CHECK (progress >= 0 AND progress <= 100)
);
--> statement-breakpoint
ALTER TABLE "ai_agent_tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ai_cost_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid,
	"conversation_id" uuid,
	"task_id" uuid,
	"model" text NOT NULL,
	"feature" text,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"cache_read_tokens" integer DEFAULT 0,
	"cache_write_tokens" integer DEFAULT 0,
	"cost_cents" integer NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ai_cost_tracking" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "generated_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"storage_url" text NOT NULL,
	"file_size" integer,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"generated_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generated_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "document_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"logo_url" text,
	"primary_color" text DEFAULT '#1f2937',
	"secondary_color" text DEFAULT '#6b7280',
	"font_family" text DEFAULT 'inter',
	"paper_size" text DEFAULT 'a4',
	"include_qr" boolean DEFAULT false,
	"footer_text" text,
	"terms_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_document_templates_org_doc_type" UNIQUE("organization_id","document_type")
);
--> statement-breakpoint
ALTER TABLE "document_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_activities" ADD CONSTRAINT "customer_activities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_activities" ADD CONSTRAINT "customer_activities_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_activities" ADD CONSTRAINT "customer_activities_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_health_metrics" ADD CONSTRAINT "customer_health_metrics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_health_metrics" ADD CONSTRAINT "customer_health_metrics_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_merge_audit" ADD CONSTRAINT "customer_merge_audit_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_merge_audit" ADD CONSTRAINT "customer_merge_audit_primary_customer_id_customers_id_fk" FOREIGN KEY ("primary_customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_merge_audit" ADD CONSTRAINT "customer_merge_audit_merged_customer_id_customers_id_fk" FOREIGN KEY ("merged_customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_priorities" ADD CONSTRAINT "customer_priorities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_priorities" ADD CONSTRAINT "customer_priorities_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_tag_assignments" ADD CONSTRAINT "customer_tag_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_tag_assignments" ADD CONSTRAINT "customer_tag_assignments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_tag_assignments" ADD CONSTRAINT "customer_tag_assignments_tag_id_customer_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."customer_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_parent_id_customers_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_warranty_policy_id_warranty_policies_id_fk" FOREIGN KEY ("warranty_policy_id") REFERENCES "public"."warranty_policies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_attribute_id_product_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."product_attributes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_bundles" ADD CONSTRAINT "product_bundles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_bundles" ADD CONSTRAINT "product_bundles_bundle_product_id_products_id_fk" FOREIGN KEY ("bundle_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_bundles" ADD CONSTRAINT "product_bundles_component_product_id_products_id_fk" FOREIGN KEY ("component_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_product_prices" ADD CONSTRAINT "customer_product_prices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_product_prices" ADD CONSTRAINT "customer_product_prices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_product_prices" ADD CONSTRAINT "customer_product_prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_price_tiers" ADD CONSTRAINT "product_price_tiers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_price_tiers" ADD CONSTRAINT "product_price_tiers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_related_product_id_products_id_fk" FOREIGN KEY ("related_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_picked_by_users_id_fk" FOREIGN KEY ("picked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_amendments" ADD CONSTRAINT "order_amendments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_amendments" ADD CONSTRAINT "order_amendments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_amendments" ADD CONSTRAINT "order_amendments_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_amendments" ADD CONSTRAINT "order_amendments_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_amendments" ADD CONSTRAINT "order_amendments_applied_by_users_id_fk" FOREIGN KEY ("applied_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_shipments" ADD CONSTRAINT "order_shipments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_shipments" ADD CONSTRAINT "order_shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_shipments" ADD CONSTRAINT "order_shipments_shipped_by_users_id_fk" FOREIGN KEY ("shipped_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_shipment_id_order_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."order_shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_order_line_item_id_order_line_items_id_fk" FOREIGN KEY ("order_line_item_id") REFERENCES "public"."order_line_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_template_items" ADD CONSTRAINT "order_template_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_template_items" ADD CONSTRAINT "order_template_items_template_id_order_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."order_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_template_items" ADD CONSTRAINT "order_template_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_templates" ADD CONSTRAINT "order_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_templates" ADD CONSTRAINT "order_templates_default_customer_id_customers_id_fk" FOREIGN KEY ("default_customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_applied_to_order_id_orders_id_fk" FOREIGN KEY ("applied_to_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reminder_settings" ADD CONSTRAINT "payment_reminder_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reminder_settings" ADD CONSTRAINT "payment_reminder_settings_default_template_id_reminder_templates_id_fk" FOREIGN KEY ("default_template_id") REFERENCES "public"."reminder_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_history" ADD CONSTRAINT "reminder_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_history" ADD CONSTRAINT "reminder_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_history" ADD CONSTRAINT "reminder_history_template_id_reminder_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."reminder_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_templates" ADD CONSTRAINT "reminder_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deferred_revenue" ADD CONSTRAINT "deferred_revenue_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deferred_revenue" ADD CONSTRAINT "deferred_revenue_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_recognition" ADD CONSTRAINT "revenue_recognition_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_recognition" ADD CONSTRAINT "revenue_recognition_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_history" ADD CONSTRAINT "statement_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_history" ADD CONSTRAINT "statement_history_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_win_loss_reason_id_win_loss_reasons_id_fk" FOREIGN KEY ("win_loss_reason_id") REFERENCES "public"."win_loss_reasons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_activities" ADD CONSTRAINT "opportunity_activities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_activities" ADD CONSTRAINT "opportunity_activities_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_activities" ADD CONSTRAINT "opportunity_activities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "win_loss_reasons" ADD CONSTRAINT "win_loss_reasons_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_location_id_warehouse_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."warehouse_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_alerts" ADD CONSTRAINT "inventory_alerts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_alerts" ADD CONSTRAINT "inventory_alerts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_alerts" ADD CONSTRAINT "inventory_alerts_location_id_warehouse_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."warehouse_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_cost_layers" ADD CONSTRAINT "inventory_cost_layers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_cost_layers" ADD CONSTRAINT "inventory_cost_layers_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_forecasts" ADD CONSTRAINT "inventory_forecasts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_forecasts" ADD CONSTRAINT "inventory_forecasts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_location_id_warehouse_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."warehouse_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_stock_count_id_stock_counts_id_fk" FOREIGN KEY ("stock_count_id") REFERENCES "public"."stock_counts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_location_id_warehouse_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."warehouse_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_custom_field_id_custom_fields_id_fk" FOREIGN KEY ("custom_field_id") REFERENCES "public"."custom_fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_exports" ADD CONSTRAINT "data_exports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_exports" ADD CONSTRAINT "data_exports_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_hours_config" ADD CONSTRAINT "business_hours_config_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_holidays" ADD CONSTRAINT "organization_holidays_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_delegations" ADD CONSTRAINT "user_delegations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_delegations" ADD CONSTRAINT "user_delegations_delegator_id_users_id_fk" FOREIGN KEY ("delegator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_delegations" ADD CONSTRAINT "user_delegations_delegate_id_users_id_fk" FOREIGN KEY ("delegate_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_group_members" ADD CONSTRAINT "user_group_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_group_members" ADD CONSTRAINT "user_group_members_group_id_user_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."user_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_group_members" ADD CONSTRAINT "user_group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_group_members" ADD CONSTRAINT "user_group_members_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_onboarding" ADD CONSTRAINT "user_onboarding_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaign_id_email_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."email_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_history" ADD CONSTRAINT "email_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_history" ADD CONSTRAINT "email_history_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_history" ADD CONSTRAINT "email_history_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_history" ADD CONSTRAINT "email_history_campaign_id_email_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."email_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_history" ADD CONSTRAINT "email_history_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_signatures" ADD CONSTRAINT "email_signatures_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_signatures" ADD CONSTRAINT "email_signatures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_suppression" ADD CONSTRAINT "email_suppression_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_suppression" ADD CONSTRAINT "email_suppression_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_calls" ADD CONSTRAINT "scheduled_calls_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_calls" ADD CONSTRAINT "scheduled_calls_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_calls" ADD CONSTRAINT "scheduled_calls_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_emails" ADD CONSTRAINT "scheduled_emails_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_emails" ADD CONSTRAINT "scheduled_emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_emails" ADD CONSTRAINT "scheduled_emails_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_service_permissions" ADD CONSTRAINT "oauth_service_permissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_service_permissions" ADD CONSTRAINT "oauth_service_permissions_connection_id_oauth_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."oauth_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_sync_logs" ADD CONSTRAINT "oauth_sync_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_sync_logs" ADD CONSTRAINT "oauth_sync_logs_connection_id_oauth_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."oauth_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_states" ADD CONSTRAINT "oauth_states_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_states" ADD CONSTRAINT "oauth_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_email_messages" ADD CONSTRAINT "oauth_email_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_email_messages" ADD CONSTRAINT "oauth_email_messages_connection_id_oauth_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."oauth_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_contacts" ADD CONSTRAINT "oauth_contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_contacts" ADD CONSTRAINT "oauth_contacts_connection_id_oauth_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."oauth_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_calendar_events" ADD CONSTRAINT "oauth_calendar_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_calendar_events" ADD CONSTRAINT "oauth_calendar_events_connection_id_oauth_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."oauth_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_sync_states" ADD CONSTRAINT "oauth_sync_states_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_sync_states" ADD CONSTRAINT "oauth_sync_states_connection_id_oauth_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."oauth_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_installer_id_users_id_fk" FOREIGN KEY ("installer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_sla_tracking_id_sla_tracking_id_fk" FOREIGN KEY ("sla_tracking_id") REFERENCES "public"."sla_tracking"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_photos" ADD CONSTRAINT "job_photos_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_photos" ADD CONSTRAINT "job_photos_job_assignment_id_job_assignments_id_fk" FOREIGN KEY ("job_assignment_id") REFERENCES "public"."job_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_materials" ADD CONSTRAINT "job_materials_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_materials" ADD CONSTRAINT "job_materials_job_id_job_assignments_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_materials" ADD CONSTRAINT "job_materials_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_tasks" ADD CONSTRAINT "job_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_tasks" ADD CONSTRAINT "job_tasks_job_id_job_assignments_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_tasks" ADD CONSTRAINT "job_tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_templates" ADD CONSTRAINT "job_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_templates" ADD CONSTRAINT "job_templates_checklist_template_id_checklist_templates_id_fk" FOREIGN KEY ("checklist_template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_templates" ADD CONSTRAINT "job_templates_sla_configuration_id_sla_configurations_id_fk" FOREIGN KEY ("sla_configuration_id") REFERENCES "public"."sla_configurations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_time_entries" ADD CONSTRAINT "job_time_entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_time_entries" ADD CONSTRAINT "job_time_entries_job_id_job_assignments_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_time_entries" ADD CONSTRAINT "job_time_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_checklist_items" ADD CONSTRAINT "job_checklist_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_checklist_items" ADD CONSTRAINT "job_checklist_items_checklist_id_job_checklists_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "public"."job_checklists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_checklist_items" ADD CONSTRAINT "job_checklist_items_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_checklists" ADD CONSTRAINT "job_checklists_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_checklists" ADD CONSTRAINT "job_checklists_job_id_job_assignments_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_checklists" ADD CONSTRAINT "job_checklists_template_id_checklist_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_configurations" ADD CONSTRAINT "sla_configurations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_tracking" ADD CONSTRAINT "sla_tracking_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_events" ADD CONSTRAINT "sla_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_sla_tracking_id_sla_tracking_id_fk" FOREIGN KEY ("sla_tracking_id") REFERENCES "public"."sla_tracking"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalation_history" ADD CONSTRAINT "escalation_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalation_rules" ADD CONSTRAINT "escalation_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_authorizations" ADD CONSTRAINT "return_authorizations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_authorizations" ADD CONSTRAINT "return_authorizations_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_authorizations" ADD CONSTRAINT "return_authorizations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_authorizations" ADD CONSTRAINT "return_authorizations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_authorizations" ADD CONSTRAINT "return_authorizations_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_authorizations" ADD CONSTRAINT "return_authorizations_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_authorizations" ADD CONSTRAINT "return_authorizations_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_authorizations" ADD CONSTRAINT "return_authorizations_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rma_line_items" ADD CONSTRAINT "rma_line_items_rma_id_return_authorizations_id_fk" FOREIGN KEY ("rma_id") REFERENCES "public"."return_authorizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rma_line_items" ADD CONSTRAINT "rma_line_items_order_line_item_id_order_line_items_id_fk" FOREIGN KEY ("order_line_item_id") REFERENCES "public"."order_line_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_templates" ADD CONSTRAINT "issue_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_templates" ADD CONSTRAINT "issue_templates_default_assignee_id_users_id_fk" FOREIGN KEY ("default_assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csat_responses" ADD CONSTRAINT "csat_responses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csat_responses" ADD CONSTRAINT "csat_responses_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csat_responses" ADD CONSTRAINT "csat_responses_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csat_responses" ADD CONSTRAINT "csat_responses_submitted_by_customer_id_customers_id_fk" FOREIGN KEY ("submitted_by_customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_articles" ADD CONSTRAINT "kb_articles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_articles" ADD CONSTRAINT "kb_articles_category_id_kb_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."kb_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_categories" ADD CONSTRAINT "kb_categories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_categories" ADD CONSTRAINT "kb_categories_parent_id_kb_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."kb_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_warranty_id_warranties_id_fk" FOREIGN KEY ("warranty_id") REFERENCES "public"."warranties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_sla_tracking_id_sla_tracking_id_fk" FOREIGN KEY ("sla_tracking_id") REFERENCES "public"."sla_tracking"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_extensions" ADD CONSTRAINT "warranty_extensions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_policies" ADD CONSTRAINT "warranty_policies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_price_lists" ADD CONSTRAINT "supplier_price_lists_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_price_lists" ADD CONSTRAINT "supplier_price_lists_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_price_lists" ADD CONSTRAINT "supplier_price_lists_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_performance_metrics" ADD CONSTRAINT "supplier_performance_metrics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_performance_metrics" ADD CONSTRAINT "supplier_performance_metrics_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_ordered_by_users_id_fk" FOREIGN KEY ("ordered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_approval_rules" ADD CONSTRAINT "purchase_order_approval_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_approvals" ADD CONSTRAINT "purchase_order_approvals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_approvals" ADD CONSTRAINT "purchase_order_approvals_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_approvals" ADD CONSTRAINT "purchase_order_approvals_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_approvals" ADD CONSTRAINT "purchase_order_approvals_escalated_to_users_id_fk" FOREIGN KEY ("escalated_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_approvals" ADD CONSTRAINT "purchase_order_approvals_delegated_from_users_id_fk" FOREIGN KEY ("delegated_from") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_receipt_items" ADD CONSTRAINT "purchase_order_receipt_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_receipt_items" ADD CONSTRAINT "purchase_order_receipt_items_receipt_id_purchase_order_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."purchase_order_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_receipt_items" ADD CONSTRAINT "purchase_order_receipt_items_purchase_order_item_id_purchase_order_items_id_fk" FOREIGN KEY ("purchase_order_item_id") REFERENCES "public"."purchase_order_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_receipts" ADD CONSTRAINT "purchase_order_receipts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_receipts" ADD CONSTRAINT "purchase_order_receipts_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_receipts" ADD CONSTRAINT "purchase_order_receipts_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_receipts" ADD CONSTRAINT "purchase_order_receipts_inspection_completed_by_users_id_fk" FOREIGN KEY ("inspection_completed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_amendments" ADD CONSTRAINT "purchase_order_amendments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_amendments" ADD CONSTRAINT "purchase_order_amendments_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_amendments" ADD CONSTRAINT "purchase_order_amendments_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_amendments" ADD CONSTRAINT "purchase_order_amendments_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_amendments" ADD CONSTRAINT "purchase_order_amendments_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_amendments" ADD CONSTRAINT "purchase_order_amendments_applied_by_users_id_fk" FOREIGN KEY ("applied_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_costs" ADD CONSTRAINT "purchase_order_costs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_costs" ADD CONSTRAINT "purchase_order_costs_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_price_history" ADD CONSTRAINT "supplier_price_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_price_history" ADD CONSTRAINT "supplier_price_history_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_price_history" ADD CONSTRAINT "supplier_price_history_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_price_history" ADD CONSTRAINT "supplier_price_history_price_list_id_supplier_price_lists_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."supplier_price_lists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_agreements" ADD CONSTRAINT "price_agreements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_agreements" ADD CONSTRAINT "price_agreements_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_agreements" ADD CONSTRAINT "price_agreements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_agreements" ADD CONSTRAINT "price_agreements_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_agreements" ADD CONSTRAINT "price_agreements_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_change_history" ADD CONSTRAINT "price_change_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_change_history" ADD CONSTRAINT "price_change_history_price_list_id_supplier_price_lists_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."supplier_price_lists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_change_history" ADD CONSTRAINT "price_change_history_agreement_id_price_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."price_agreements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_change_history" ADD CONSTRAINT "price_change_history_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_change_history" ADD CONSTRAINT "price_change_history_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_change_history" ADD CONSTRAINT "price_change_history_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_change_history" ADD CONSTRAINT "price_change_history_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_change_history" ADD CONSTRAINT "price_change_history_applied_by_users_id_fk" FOREIGN KEY ("applied_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_index" ADD CONSTRAINT "search_index_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recent_items" ADD CONSTRAINT "recent_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recent_items" ADD CONSTRAINT "recent_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_index_outbox" ADD CONSTRAINT "search_index_outbox_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_reports" ADD CONSTRAINT "custom_reports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_favorites" ADD CONSTRAINT "report_favorites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_favorites" ADD CONSTRAINT "report_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "targets" ADD CONSTRAINT "targets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_layouts" ADD CONSTRAINT "dashboard_layouts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_layouts" ADD CONSTRAINT "dashboard_layouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_portal_sessions" ADD CONSTRAINT "customer_portal_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_portal_sessions" ADD CONSTRAINT "customer_portal_sessions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_portal_sessions" ADD CONSTRAINT "customer_portal_sessions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_portal_sessions" ADD CONSTRAINT "customer_portal_sessions_job_assignment_id_job_assignments_id_fk" FOREIGN KEY ("job_assignment_id") REFERENCES "public"."job_assignments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_identities" ADD CONSTRAINT "portal_identities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_identities" ADD CONSTRAINT "portal_identities_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_identities" ADD CONSTRAINT "portal_identities_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_identities" ADD CONSTRAINT "portal_identities_job_assignment_id_job_assignments_id_fk" FOREIGN KEY ("job_assignment_id") REFERENCES "public"."job_assignments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversation_messages" ADD CONSTRAINT "ai_conversation_messages_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_approvals" ADD CONSTRAINT "ai_approvals_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_approvals" ADD CONSTRAINT "ai_approvals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_approvals" ADD CONSTRAINT "ai_approvals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_approvals" ADD CONSTRAINT "ai_approvals_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_approval_entities" ADD CONSTRAINT "ai_approval_entities_approval_id_ai_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."ai_approvals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_tasks" ADD CONSTRAINT "ai_agent_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_tasks" ADD CONSTRAINT "ai_agent_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_cost_tracking" ADD CONSTRAINT "ai_cost_tracking_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_cost_tracking" ADD CONSTRAINT "ai_cost_tracking_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_cost_tracking" ADD CONSTRAINT "ai_cost_tracking_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_cost_tracking" ADD CONSTRAINT "ai_cost_tracking_task_id_ai_agent_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."ai_agent_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_generated_by_id_users_id_fk" FOREIGN KEY ("generated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_jobs_user_status" ON "jobs" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_jobs_user_active" ON "jobs" USING btree ("user_id","status","created_at");--> statement-breakpoint
CREATE INDEX "idx_jobs_org_user" ON "jobs" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_jobs_external_id" ON "jobs" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_status" ON "notifications" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_notifications_org_user" ON "notifications" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_created" ON "notifications" USING btree ("user_id","created_at","id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_org" ON "audit_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_timestamp" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_org_timestamp" ON "audit_logs" USING btree ("organization_id","timestamp");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_org_action" ON "audit_logs" USING btree ("organization_id","action");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_org_user_timestamp" ON "audit_logs" USING btree ("organization_id","user_id","timestamp");--> statement-breakpoint
CREATE INDEX "idx_addresses_customer" ON "addresses" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_addresses_org_customer" ON "addresses" USING btree ("organization_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_addresses_type" ON "addresses" USING btree ("customer_id","type");--> statement-breakpoint
CREATE INDEX "idx_addresses_postcode" ON "addresses" USING btree ("postcode");--> statement-breakpoint
CREATE INDEX "idx_addresses_primary" ON "addresses" USING btree ("customer_id","is_primary");--> statement-breakpoint
CREATE INDEX "idx_contacts_customer" ON "contacts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_contacts_org_customer" ON "contacts" USING btree ("organization_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_contacts_email" ON "contacts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_contacts_primary" ON "contacts" USING btree ("customer_id","is_primary");--> statement-breakpoint
CREATE INDEX "idx_customer_activities_customer" ON "customer_activities" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_customer_activities_org_customer" ON "customer_activities" USING btree ("organization_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_customer_activities_contact" ON "customer_activities" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_customer_activities_type" ON "customer_activities" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX "idx_customer_activities_scheduled" ON "customer_activities" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_customer_activities_completed" ON "customer_activities" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "idx_customer_activities_assigned" ON "customer_activities" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "idx_customer_activities_org_customer_created" ON "customer_activities" USING btree ("organization_id","customer_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_customer_health_metrics_unique" ON "customer_health_metrics" USING btree ("customer_id","metric_date");--> statement-breakpoint
CREATE INDEX "idx_customer_health_metrics_customer" ON "customer_health_metrics" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_customer_health_metrics_org_customer" ON "customer_health_metrics" USING btree ("organization_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_customer_health_metrics_date" ON "customer_health_metrics" USING btree ("metric_date");--> statement-breakpoint
CREATE INDEX "idx_customer_health_metrics_overall" ON "customer_health_metrics" USING btree ("overall_score");--> statement-breakpoint
CREATE INDEX "idx_customer_merge_audit_org" ON "customer_merge_audit" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_customer_merge_audit_primary" ON "customer_merge_audit" USING btree ("primary_customer_id");--> statement-breakpoint
CREATE INDEX "idx_customer_merge_audit_merged" ON "customer_merge_audit" USING btree ("merged_customer_id");--> statement-breakpoint
CREATE INDEX "idx_customer_merge_audit_action" ON "customer_merge_audit" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_customer_merge_audit_performed_at" ON "customer_merge_audit" USING btree ("performed_at");--> statement-breakpoint
CREATE INDEX "idx_customer_merge_audit_org_performed" ON "customer_merge_audit" USING btree ("organization_id","performed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_customer_priorities_customer_unique" ON "customer_priorities" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_customer_priorities_org_customer" ON "customer_priorities" USING btree ("organization_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_customer_priorities_level" ON "customer_priorities" USING btree ("priority_level");--> statement-breakpoint
CREATE INDEX "idx_customer_priorities_manager" ON "customer_priorities" USING btree ("account_manager");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_customer_tag_assignments_unique" ON "customer_tag_assignments" USING btree ("customer_id","tag_id");--> statement-breakpoint
CREATE INDEX "idx_customer_tag_assignments_customer" ON "customer_tag_assignments" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_customer_tag_assignments_tag" ON "customer_tag_assignments" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_customer_tags_name_org_unique" ON "customer_tags" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "idx_customer_tags_org_category" ON "customer_tags" USING btree ("organization_id","category");--> statement-breakpoint
CREATE INDEX "idx_customer_tags_active" ON "customer_tags" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_customer_tags_usage" ON "customer_tags" USING btree ("usage_count");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_customers_code_org_unique" ON "customers" USING btree ("organization_id","customer_code") WHERE "customers"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_customers_email_org_unique" ON "customers" USING btree ("organization_id","email") WHERE "customers"."email" IS NOT NULL AND "customers"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_customers_org_status" ON "customers" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_customers_org_type" ON "customers" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "idx_customers_org_health_score" ON "customers" USING btree ("organization_id","health_score");--> statement-breakpoint
CREATE INDEX "idx_customers_org_last_order" ON "customers" USING btree ("organization_id","last_order_date");--> statement-breakpoint
CREATE INDEX "idx_customers_parent" ON "customers" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_customers_org_created_id" ON "customers" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_customers_name_search" ON "customers" USING gin (to_tsvector('english', "name"));--> statement-breakpoint
CREATE INDEX "idx_customers_tags_gin" ON "customers" USING gin ("tags");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_categories_name_parent_org" ON "categories" USING btree ("organization_id","parent_id","name") WHERE "categories"."parent_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_categories_name_root_org" ON "categories" USING btree ("organization_id","name") WHERE "categories"."parent_id" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_categories_org_active" ON "categories" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_categories_parent" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_categories_org_sort" ON "categories" USING btree ("organization_id","sort_order");--> statement-breakpoint
CREATE INDEX "idx_categories_warranty_policy" ON "categories" USING btree ("default_warranty_policy_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_products_sku_org_unique" ON "products" USING btree ("organization_id","sku") WHERE "products"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_products_barcode_org_unique" ON "products" USING btree ("organization_id","barcode") WHERE "products"."barcode" IS NOT NULL AND "products"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_products_org_status" ON "products" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_products_org_active" ON "products" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_products_org_category" ON "products" USING btree ("organization_id","category_id");--> statement-breakpoint
CREATE INDEX "idx_products_org_type" ON "products" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "idx_products_category" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_products_warranty_policy" ON "products" USING btree ("warranty_policy_id");--> statement-breakpoint
CREATE INDEX "idx_products_org_created_id" ON "products" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_products_name_search" ON "products" USING gin (to_tsvector('english', "name"));--> statement-breakpoint
CREATE INDEX "idx_products_sku_search" ON "products" USING gin (to_tsvector('english', "sku"));--> statement-breakpoint
CREATE INDEX "idx_products_tags_gin" ON "products" USING gin ("tags");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_product_attribute_values_unique" ON "product_attribute_values" USING btree ("organization_id","product_id","attribute_id");--> statement-breakpoint
CREATE INDEX "idx_product_attribute_values_org_product" ON "product_attribute_values" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_product_attribute_values_org_attribute" ON "product_attribute_values" USING btree ("organization_id","attribute_id");--> statement-breakpoint
CREATE INDEX "idx_product_attribute_values_value" ON "product_attribute_values" USING gin ("value");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_product_attributes_name_org" ON "product_attributes" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "idx_product_attributes_org_active" ON "product_attributes" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_product_attributes_org_type" ON "product_attributes" USING btree ("organization_id","attribute_type");--> statement-breakpoint
CREATE INDEX "idx_product_attributes_org_filterable" ON "product_attributes" USING btree ("organization_id","is_filterable");--> statement-breakpoint
CREATE INDEX "idx_product_attributes_org_sort" ON "product_attributes" USING btree ("organization_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_bundles_bundle_component_org" ON "product_bundles" USING btree ("organization_id","bundle_product_id","component_product_id");--> statement-breakpoint
CREATE INDEX "idx_bundles_org_bundle" ON "product_bundles" USING btree ("organization_id","bundle_product_id");--> statement-breakpoint
CREATE INDEX "idx_bundles_org_component" ON "product_bundles" USING btree ("organization_id","component_product_id");--> statement-breakpoint
CREATE INDEX "idx_bundles_bundle_sort" ON "product_bundles" USING btree ("bundle_product_id","sort_order");--> statement-breakpoint
CREATE INDEX "idx_product_images_org_product" ON "product_images" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_product_images_product_sort" ON "product_images" USING btree ("product_id","sort_order");--> statement-breakpoint
CREATE INDEX "idx_product_images_product_primary" ON "product_images" USING btree ("product_id","is_primary");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_customer_prices_unique" ON "customer_product_prices" USING btree ("organization_id","customer_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_customer_prices_org_customer" ON "customer_product_prices" USING btree ("organization_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_customer_prices_org_product" ON "customer_product_prices" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_customer_prices_valid_from" ON "customer_product_prices" USING btree ("valid_from");--> statement-breakpoint
CREATE INDEX "idx_customer_prices_valid_to" ON "customer_product_prices" USING btree ("valid_to");--> statement-breakpoint
CREATE INDEX "idx_price_history_org_product" ON "price_history" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_price_history_changed_at" ON "price_history" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "idx_price_history_change_type" ON "price_history" USING btree ("change_type");--> statement-breakpoint
CREATE INDEX "idx_price_history_org_customer" ON "price_history" USING btree ("organization_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_price_tiers_org_product" ON "product_price_tiers" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_price_tiers_product_qty" ON "product_price_tiers" USING btree ("product_id","min_quantity");--> statement-breakpoint
CREATE INDEX "idx_price_tiers_org_active" ON "product_price_tiers" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_product_relations_unique" ON "product_relations" USING btree ("organization_id","product_id","related_product_id","relation_type");--> statement-breakpoint
CREATE INDEX "idx_product_relations_org_product" ON "product_relations" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_product_relations_org_related" ON "product_relations" USING btree ("organization_id","related_product_id");--> statement-breakpoint
CREATE INDEX "idx_product_relations_org_type" ON "product_relations" USING btree ("organization_id","relation_type");--> statement-breakpoint
CREATE INDEX "idx_product_relations_product_sort" ON "product_relations" USING btree ("product_id","sort_order");--> statement-breakpoint
CREATE INDEX "idx_order_items_order" ON "order_line_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_product" ON "order_line_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_org_order" ON "order_line_items" USING btree ("organization_id","order_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_org_pick_status" ON "order_line_items" USING btree ("organization_id","pick_status");--> statement-breakpoint
CREATE INDEX "idx_order_items_org_created" ON "order_line_items" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_orders_number_org_unique" ON "orders" USING btree ("organization_id","order_number") WHERE "orders"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_orders_org_status" ON "orders" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_orders_org_payment" ON "orders" USING btree ("organization_id","payment_status");--> statement-breakpoint
CREATE INDEX "idx_orders_org_customer" ON "orders" USING btree ("organization_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_orders_org_date" ON "orders" USING btree ("organization_id","order_date");--> statement-breakpoint
CREATE INDEX "idx_orders_org_created" ON "orders" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_orders_customer" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_orders_xero_sync" ON "orders" USING btree ("organization_id","xero_sync_status");--> statement-breakpoint
CREATE INDEX "order_amendments_org_idx" ON "order_amendments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "order_amendments_order_idx" ON "order_amendments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_amendments_status_idx" ON "order_amendments" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "order_amendments_requested_idx" ON "order_amendments" USING btree ("organization_id","requested_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "order_amendments_org_created_idx" ON "order_amendments" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "order_shipments_order_id_idx" ON "order_shipments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_shipments_status_idx" ON "order_shipments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "order_shipments_org_status_idx" ON "order_shipments" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "order_shipments_org_created_idx" ON "order_shipments" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "order_shipments_tracking_number_idx" ON "order_shipments" USING btree ("tracking_number");--> statement-breakpoint
CREATE INDEX "order_shipments_shipped_at_idx" ON "order_shipments" USING btree ("shipped_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "order_shipments_org_delivered_idx" ON "order_shipments" USING btree ("organization_id","delivered_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "shipment_items_shipment_id_idx" ON "shipment_items" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "shipment_items_line_item_id_idx" ON "shipment_items" USING btree ("order_line_item_id");--> statement-breakpoint
CREATE INDEX "shipment_items_org_created_idx" ON "shipment_items" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "order_template_items_template_idx" ON "order_template_items" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "order_template_items_product_idx" ON "order_template_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "order_template_items_org_created_idx" ON "order_template_items" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "order_templates_org_idx" ON "order_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "order_templates_org_active_idx" ON "order_templates" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "order_templates_org_created_idx" ON "order_templates" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "order_templates_name_idx" ON "order_templates" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_credit_notes_org_status" ON "credit_notes" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_credit_notes_org_customer" ON "credit_notes" USING btree ("organization_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_credit_notes_customer" ON "credit_notes" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_credit_notes_order" ON "credit_notes" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_payment_reminder_settings_org" ON "payment_reminder_settings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_payment_reminder_settings_org_enabled" ON "payment_reminder_settings" USING btree ("organization_id","is_enabled");--> statement-breakpoint
CREATE INDEX "idx_reminder_history_org_order" ON "reminder_history" USING btree ("organization_id","order_id");--> statement-breakpoint
CREATE INDEX "idx_reminder_history_org_date" ON "reminder_history" USING btree ("organization_id","sent_at");--> statement-breakpoint
CREATE INDEX "idx_reminder_history_order" ON "reminder_history" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_reminder_history_template" ON "reminder_history" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_reminder_templates_org_active" ON "reminder_templates" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_reminder_templates_org_days" ON "reminder_templates" USING btree ("organization_id","days_overdue");--> statement-breakpoint
CREATE INDEX "idx_payment_schedules_org_order" ON "payment_schedules" USING btree ("organization_id","order_id");--> statement-breakpoint
CREATE INDEX "idx_payment_schedules_org_status" ON "payment_schedules" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_payment_schedules_org_due" ON "payment_schedules" USING btree ("organization_id","due_date");--> statement-breakpoint
CREATE INDEX "idx_payment_schedules_order" ON "payment_schedules" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_payment_schedules_status_due" ON "payment_schedules" USING btree ("status","due_date");--> statement-breakpoint
CREATE INDEX "idx_deferred_revenue_order" ON "deferred_revenue" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_deferred_revenue_status" ON "deferred_revenue" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_deferred_revenue_date" ON "deferred_revenue" USING btree ("organization_id","deferral_date");--> statement-breakpoint
CREATE INDEX "idx_revenue_recognition_order" ON "revenue_recognition" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_revenue_recognition_state" ON "revenue_recognition" USING btree ("organization_id","state");--> statement-breakpoint
CREATE INDEX "idx_revenue_recognition_date" ON "revenue_recognition" USING btree ("organization_id","recognition_date");--> statement-breakpoint
CREATE INDEX "idx_revenue_recognition_sync_failed" ON "revenue_recognition" USING btree ("state","xero_sync_attempts");--> statement-breakpoint
CREATE INDEX "idx_statement_history_org_customer" ON "statement_history" USING btree ("organization_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_statement_history_org_date" ON "statement_history" USING btree ("organization_id","end_date");--> statement-breakpoint
CREATE INDEX "idx_statement_history_org_created" ON "statement_history" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_statement_history_customer" ON "statement_history" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_statement_history_customer_date" ON "statement_history" USING btree ("customer_id","end_date");--> statement-breakpoint
CREATE INDEX "idx_opportunities_org_stage" ON "opportunities" USING btree ("organization_id","stage");--> statement-breakpoint
CREATE INDEX "idx_opportunities_org_customer" ON "opportunities" USING btree ("organization_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_opportunities_org_assigned" ON "opportunities" USING btree ("organization_id","assigned_to");--> statement-breakpoint
CREATE INDEX "idx_opportunities_org_expected_close" ON "opportunities" USING btree ("organization_id","expected_close_date");--> statement-breakpoint
CREATE INDEX "idx_opportunities_org_follow_up" ON "opportunities" USING btree ("organization_id","follow_up_date");--> statement-breakpoint
CREATE INDEX "idx_opportunities_org_probability" ON "opportunities" USING btree ("organization_id","probability");--> statement-breakpoint
CREATE INDEX "idx_opportunities_org_created" ON "opportunities" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_opportunities_customer" ON "opportunities" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_opportunities_contact" ON "opportunities" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_opportunities_win_loss_reason" ON "opportunities" USING btree ("win_loss_reason_id");--> statement-breakpoint
CREATE INDEX "idx_opportunities_quote_expires" ON "opportunities" USING btree ("quote_expires_at");--> statement-breakpoint
CREATE INDEX "idx_opportunity_activities_org_opportunity" ON "opportunity_activities" USING btree ("organization_id","opportunity_id");--> statement-breakpoint
CREATE INDEX "idx_opportunity_activities_org_type" ON "opportunity_activities" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "idx_opportunity_activities_org_created" ON "opportunity_activities" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_opportunity_activities_opportunity" ON "opportunity_activities" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "idx_opportunity_activities_scheduled" ON "opportunity_activities" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_opportunity_activities_completed" ON "opportunity_activities" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "idx_opportunity_activities_timeline" ON "opportunity_activities" USING btree ("opportunity_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_quote_versions_opportunity_version_unique" ON "quote_versions" USING btree ("opportunity_id","version_number");--> statement-breakpoint
CREATE INDEX "idx_quote_versions_org_opportunity" ON "quote_versions" USING btree ("organization_id","opportunity_id");--> statement-breakpoint
CREATE INDEX "idx_quote_versions_org_created" ON "quote_versions" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_quote_versions_opportunity" ON "quote_versions" USING btree ("opportunity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_quotes_number_org_unique" ON "quotes" USING btree ("organization_id","quote_number");--> statement-breakpoint
CREATE INDEX "idx_quotes_org_status" ON "quotes" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_quotes_org_customer" ON "quotes" USING btree ("organization_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_quotes_org_opportunity" ON "quotes" USING btree ("organization_id","opportunity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_win_loss_reasons_name_org_type_unique" ON "win_loss_reasons" USING btree ("organization_id","type","name");--> statement-breakpoint
CREATE INDEX "idx_win_loss_reasons_org_type" ON "win_loss_reasons" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "idx_win_loss_reasons_org_active" ON "win_loss_reasons" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_win_loss_reasons_sort_order" ON "win_loss_reasons" USING btree ("organization_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_inventory_product_location_unique" ON "inventory" USING btree ("organization_id","product_id","location_id","lot_number") WHERE "inventory"."lot_number" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_inventory_org_product" ON "inventory" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_org_location" ON "inventory" USING btree ("organization_id","location_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_org_status" ON "inventory" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_inventory_org_created" ON "inventory" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_inventory_product" ON "inventory" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_location" ON "inventory" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_alerts_org_type" ON "inventory_alerts" USING btree ("organization_id","alert_type");--> statement-breakpoint
CREATE INDEX "idx_alerts_org_active" ON "inventory_alerts" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_alerts_org_created" ON "inventory_alerts" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_alerts_product" ON "inventory_alerts" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_alerts_location" ON "inventory_alerts" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_alerts_triggered" ON "inventory_alerts" USING btree ("last_triggered_at");--> statement-breakpoint
CREATE INDEX "idx_cost_layers_org_inventory" ON "inventory_cost_layers" USING btree ("organization_id","inventory_id");--> statement-breakpoint
CREATE INDEX "idx_cost_layers_received" ON "inventory_cost_layers" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "idx_cost_layers_remaining" ON "inventory_cost_layers" USING btree ("quantity_remaining");--> statement-breakpoint
CREATE INDEX "idx_cost_layers_inventory" ON "inventory_cost_layers" USING btree ("inventory_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_forecasts_unique" ON "inventory_forecasts" USING btree ("organization_id","product_id","forecast_date","forecast_period");--> statement-breakpoint
CREATE INDEX "idx_forecasts_org_product" ON "inventory_forecasts" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_forecasts_date" ON "inventory_forecasts" USING btree ("forecast_date");--> statement-breakpoint
CREATE INDEX "idx_forecasts_period" ON "inventory_forecasts" USING btree ("forecast_period");--> statement-breakpoint
CREATE INDEX "idx_movements_org_product" ON "inventory_movements" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_movements_org_location" ON "inventory_movements" USING btree ("organization_id","location_id");--> statement-breakpoint
CREATE INDEX "idx_movements_org_type" ON "inventory_movements" USING btree ("organization_id","movement_type");--> statement-breakpoint
CREATE INDEX "idx_movements_org_created" ON "inventory_movements" USING btree ("organization_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_movements_reference" ON "inventory_movements" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_stock_count_items_unique" ON "stock_count_items" USING btree ("stock_count_id","inventory_id");--> statement-breakpoint
CREATE INDEX "idx_stock_count_items_count" ON "stock_count_items" USING btree ("stock_count_id");--> statement-breakpoint
CREATE INDEX "idx_stock_count_items_inventory" ON "stock_count_items" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "idx_stock_count_items_counted_by" ON "stock_count_items" USING btree ("counted_by");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_stock_counts_code_org" ON "stock_counts" USING btree ("organization_id","count_code");--> statement-breakpoint
CREATE INDEX "idx_stock_counts_org_status" ON "stock_counts" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_stock_counts_org_type" ON "stock_counts" USING btree ("organization_id","count_type");--> statement-breakpoint
CREATE INDEX "idx_stock_counts_org_created" ON "stock_counts" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_stock_counts_assigned" ON "stock_counts" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "idx_stock_counts_location" ON "stock_counts" USING btree ("location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_warehouse_locations_code_org" ON "warehouse_locations" USING btree ("organization_id","location_code");--> statement-breakpoint
CREATE INDEX "idx_warehouse_locations_parent_fk" ON "warehouse_locations" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_warehouse_locations_org_type_fk" ON "warehouse_locations" USING btree ("organization_id","location_type");--> statement-breakpoint
CREATE INDEX "idx_warehouse_locations_org_created" ON "warehouse_locations" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_organizations_slug_unique" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_organizations_domain_unique" ON "organizations" USING btree ("domain") WHERE "organizations"."domain" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_organizations_abn_unique" ON "organizations" USING btree ("abn") WHERE "organizations"."abn" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_organizations_active" ON "organizations" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_system_settings_unique" ON "system_settings" USING btree ("organization_id","category","key");--> statement-breakpoint
CREATE INDEX "idx_system_settings_org" ON "system_settings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_system_settings_org_category" ON "system_settings" USING btree ("organization_id","category");--> statement-breakpoint
CREATE INDEX "idx_system_settings_public" ON "system_settings" USING btree ("organization_id","is_public") WHERE "system_settings"."is_public" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_custom_fields_unique" ON "custom_fields" USING btree ("organization_id","entity_type","name");--> statement-breakpoint
CREATE INDEX "idx_custom_fields_org" ON "custom_fields" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_custom_fields_org_entity" ON "custom_fields" USING btree ("organization_id","entity_type");--> statement-breakpoint
CREATE INDEX "idx_custom_fields_org_entity_active" ON "custom_fields" USING btree ("organization_id","entity_type","is_active");--> statement-breakpoint
CREATE INDEX "idx_custom_fields_sort" ON "custom_fields" USING btree ("organization_id","entity_type","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_custom_field_values_unique" ON "custom_field_values" USING btree ("custom_field_id","entity_id");--> statement-breakpoint
CREATE INDEX "idx_custom_field_values_field" ON "custom_field_values" USING btree ("custom_field_id");--> statement-breakpoint
CREATE INDEX "idx_custom_field_values_entity" ON "custom_field_values" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "idx_custom_field_values_field_entity" ON "custom_field_values" USING btree ("custom_field_id","entity_id");--> statement-breakpoint
CREATE INDEX "idx_data_exports_org" ON "data_exports" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_data_exports_user" ON "data_exports" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "idx_data_exports_org_user" ON "data_exports" USING btree ("organization_id","requested_by");--> statement-breakpoint
CREATE INDEX "idx_data_exports_status" ON "data_exports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_data_exports_org_status" ON "data_exports" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_data_exports_expires" ON "data_exports" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_data_exports_created" ON "data_exports" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_business_hours_org_default" ON "business_hours_config" USING btree ("organization_id","is_default") WHERE "business_hours_config"."is_default" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_holidays_org_date" ON "organization_holidays" USING btree ("organization_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sessions_token_unique" ON "user_sessions" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "idx_sessions_user" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_user_expires" ON "user_sessions" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX "idx_sessions_expires" ON "user_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_auth_id_unique" ON "users" USING btree ("auth_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_email_org_unique" ON "users" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "idx_users_org_role" ON "users" USING btree ("organization_id","role");--> statement-breakpoint
CREATE INDEX "idx_users_org_status" ON "users" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_user_delegations_org" ON "user_delegations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_user_delegations_delegator" ON "user_delegations" USING btree ("delegator_id");--> statement-breakpoint
CREATE INDEX "idx_user_delegations_delegate" ON "user_delegations" USING btree ("delegate_id");--> statement-breakpoint
CREATE INDEX "idx_user_delegations_active_dates" ON "user_delegations" USING btree ("is_active","start_date","end_date");--> statement-breakpoint
CREATE INDEX "idx_user_delegations_delegator_active" ON "user_delegations" USING btree ("delegator_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_group_members_unique" ON "user_group_members" USING btree ("group_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_user_group_members_org" ON "user_group_members" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_user_group_members_group" ON "user_group_members" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_user_group_members_user" ON "user_group_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_group_members_group_role" ON "user_group_members" USING btree ("group_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_groups_name_org_unique" ON "user_groups" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "idx_user_groups_org" ON "user_groups" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_user_groups_org_active" ON "user_groups" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_invitations_token_unique" ON "user_invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_user_invitations_org" ON "user_invitations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_user_invitations_email" ON "user_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_user_invitations_org_status" ON "user_invitations" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_user_invitations_expires" ON "user_invitations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_user_invitations_invited_by" ON "user_invitations" USING btree ("invited_by");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_onboarding_user_step_unique" ON "user_onboarding" USING btree ("user_id","step_key");--> statement-breakpoint
CREATE INDEX "idx_user_onboarding_user" ON "user_onboarding" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_onboarding_user_completed" ON "user_onboarding" USING btree ("user_id","is_completed");--> statement-breakpoint
CREATE INDEX "idx_user_onboarding_step_key" ON "user_onboarding" USING btree ("step_key");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_preferences_unique" ON "user_preferences" USING btree ("user_id","category","key");--> statement-breakpoint
CREATE INDEX "idx_user_preferences_user" ON "user_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_preferences_user_category" ON "user_preferences" USING btree ("user_id","category");--> statement-breakpoint
CREATE INDEX "api_tokens_hashed_token_idx" ON "api_tokens" USING btree ("hashed_token");--> statement-breakpoint
CREATE INDEX "api_tokens_user_id_idx" ON "api_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_tokens_organization_id_idx" ON "api_tokens" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "api_tokens_active_idx" ON "api_tokens" USING btree ("organization_id","revoked_at","expires_at");--> statement-breakpoint
CREATE INDEX "api_tokens_prefix_idx" ON "api_tokens" USING btree ("token_prefix");--> statement-breakpoint
CREATE INDEX "idx_activities_org_entity" ON "activities" USING btree ("organization_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_activities_org_created" ON "activities" USING btree ("organization_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_activities_user" ON "activities" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_activities_action" ON "activities" USING btree ("organization_id","action","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_activities_entity_type" ON "activities" USING btree ("organization_id","entity_type","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_activities_source" ON "activities" USING btree ("organization_id","source","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_campaign_recipients_campaign" ON "campaign_recipients" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_campaign_recipients_campaign_status" ON "campaign_recipients" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE INDEX "idx_campaign_recipients_contact" ON "campaign_recipients" USING btree ("contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_campaign_recipients_campaign_email_unique" ON "campaign_recipients" USING btree ("campaign_id","email");--> statement-breakpoint
CREATE INDEX "idx_campaign_recipients_campaign_email" ON "campaign_recipients" USING btree ("campaign_id","email");--> statement-breakpoint
CREATE INDEX "idx_campaign_recipients_org" ON "campaign_recipients" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_email_campaigns_org_status" ON "email_campaigns" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_email_campaigns_scheduled_at" ON "email_campaigns" USING btree ("scheduled_at","status");--> statement-breakpoint
CREATE INDEX "idx_email_campaigns_creator" ON "email_campaigns" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "idx_email_history_campaign" ON "email_history" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_email_history_template" ON "email_history" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_email_history_org_status" ON "email_history" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_email_history_org_created_id" ON "email_history" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_email_history_customer" ON "email_history" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_email_history_sender" ON "email_history" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "idx_email_history_resend_message" ON "email_history" USING btree ("resend_message_id");--> statement-breakpoint
CREATE INDEX "idx_email_signatures_user" ON "email_signatures" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_email_signatures_org" ON "email_signatures" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_email_signatures_default" ON "email_signatures" USING btree ("organization_id","user_id","is_default");--> statement-breakpoint
CREATE UNIQUE INDEX "email_suppression_unique_idx" ON "email_suppression" USING btree ("organization_id","email") WHERE "email_suppression"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "email_suppression_email_idx" ON "email_suppression" USING btree ("email");--> statement-breakpoint
CREATE INDEX "email_suppression_reason_idx" ON "email_suppression" USING btree ("reason");--> statement-breakpoint
CREATE INDEX "email_suppression_org_reason_idx" ON "email_suppression" USING btree ("organization_id","reason");--> statement-breakpoint
CREATE INDEX "email_suppression_org_created_id_idx" ON "email_suppression" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_email_templates_org" ON "email_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_email_templates_category" ON "email_templates" USING btree ("organization_id","category");--> statement-breakpoint
CREATE INDEX "idx_email_templates_active" ON "email_templates" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_email_templates_parent" ON "email_templates" USING btree ("parent_template_id");--> statement-breakpoint
CREATE INDEX "idx_scheduled_calls_assignee" ON "scheduled_calls" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "idx_scheduled_calls_scheduled_at" ON "scheduled_calls" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_scheduled_calls_status" ON "scheduled_calls" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_scheduled_calls_assignee_status" ON "scheduled_calls" USING btree ("assignee_id","status");--> statement-breakpoint
CREATE INDEX "idx_scheduled_calls_customer" ON "scheduled_calls" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_scheduled_calls_org_status" ON "scheduled_calls" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_scheduled_emails_org_status" ON "scheduled_emails" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_scheduled_emails_scheduled_at" ON "scheduled_emails" USING btree ("scheduled_at","status");--> statement-breakpoint
CREATE INDEX "idx_scheduled_emails_user" ON "scheduled_emails" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_scheduled_emails_customer" ON "scheduled_emails" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_scheduled_emails_org_created" ON "scheduled_emails" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_unique_idx" ON "webhook_events" USING btree ("event_id","event_type");--> statement-breakpoint
CREATE INDEX "webhook_events_email_idx" ON "webhook_events" USING btree ("email_id");--> statement-breakpoint
CREATE INDEX "webhook_events_processed_at_idx" ON "webhook_events" USING btree ("processed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_oauth_connections_org_user_provider_service" ON "oauth_connections" USING btree ("organization_id","user_id","provider","service_type");--> statement-breakpoint
CREATE INDEX "idx_oauth_connections_last_synced" ON "oauth_connections" USING btree ("last_synced_at");--> statement-breakpoint
CREATE INDEX "idx_oauth_service_permissions_org_connection_service" ON "oauth_service_permissions" USING btree ("organization_id","connection_id","service_type");--> statement-breakpoint
CREATE INDEX "idx_oauth_sync_logs_org_connection_service" ON "oauth_sync_logs" USING btree ("organization_id","connection_id","service_type");--> statement-breakpoint
CREATE INDEX "idx_oauth_sync_logs_org_started" ON "oauth_sync_logs" USING btree ("organization_id","started_at");--> statement-breakpoint
CREATE INDEX "idx_oauth_sync_logs_status" ON "oauth_sync_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_oauth_states_org_provider" ON "oauth_states" USING btree ("organization_id","provider");--> statement-breakpoint
CREATE INDEX "idx_oauth_states_state" ON "oauth_states" USING btree ("state");--> statement-breakpoint
CREATE INDEX "idx_oauth_states_expires" ON "oauth_states" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_oauth_email_messages_org_conn" ON "oauth_email_messages" USING btree ("organization_id","connection_id");--> statement-breakpoint
CREATE INDEX "idx_oauth_email_messages_external" ON "oauth_email_messages" USING btree ("connection_id","external_id");--> statement-breakpoint
CREATE INDEX "idx_oauth_contacts_org_conn" ON "oauth_contacts" USING btree ("organization_id","connection_id");--> statement-breakpoint
CREATE INDEX "idx_oauth_contacts_external" ON "oauth_contacts" USING btree ("connection_id","external_id");--> statement-breakpoint
CREATE INDEX "idx_oauth_calendar_events_org_conn" ON "oauth_calendar_events" USING btree ("organization_id","connection_id");--> statement-breakpoint
CREATE INDEX "idx_oauth_calendar_events_external" ON "oauth_calendar_events" USING btree ("connection_id","external_id");--> statement-breakpoint
CREATE INDEX "idx_oauth_sync_states_org_conn" ON "oauth_sync_states" USING btree ("organization_id","connection_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_oauth_sync_states_conn_service_unique" ON "oauth_sync_states" USING btree ("connection_id","service_type");--> statement-breakpoint
CREATE INDEX "idx_job_assignments_org_status" ON "job_assignments" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_job_assignments_org_installer" ON "job_assignments" USING btree ("organization_id","installer_id");--> statement-breakpoint
CREATE INDEX "idx_job_assignments_org_scheduled" ON "job_assignments" USING btree ("organization_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_job_assignments_org_customer" ON "job_assignments" USING btree ("organization_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_job_assignments_installer_date" ON "job_assignments" USING btree ("installer_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_job_assignments_order" ON "job_assignments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_job_photos_job" ON "job_photos" USING btree ("job_assignment_id");--> statement-breakpoint
CREATE INDEX "idx_job_photos_org_job" ON "job_photos" USING btree ("organization_id","job_assignment_id");--> statement-breakpoint
CREATE INDEX "idx_job_materials_org_job" ON "job_materials" USING btree ("organization_id","job_id");--> statement-breakpoint
CREATE INDEX "idx_job_materials_org_product" ON "job_materials" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_job_materials_org_created" ON "job_materials" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_job_tasks_org_job" ON "job_tasks" USING btree ("organization_id","job_id");--> statement-breakpoint
CREATE INDEX "idx_job_tasks_org_status" ON "job_tasks" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_job_tasks_org_created" ON "job_tasks" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_job_tasks_job_position" ON "job_tasks" USING btree ("job_id","position");--> statement-breakpoint
CREATE INDEX "idx_job_templates_org_name" ON "job_templates" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "idx_job_templates_org_active" ON "job_templates" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_job_templates_org_created" ON "job_templates" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_job_time_entries_org_job" ON "job_time_entries" USING btree ("organization_id","job_id");--> statement-breakpoint
CREATE INDEX "idx_job_time_entries_org_user" ON "job_time_entries" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_job_time_entries_org_start_time" ON "job_time_entries" USING btree ("organization_id","start_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_job_time_entries_org_category" ON "job_time_entries" USING btree ("organization_id","category");--> statement-breakpoint
CREATE INDEX "idx_checklist_templates_org_name" ON "checklist_templates" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "idx_checklist_templates_org_active" ON "checklist_templates" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_job_checklist_items_org_checklist" ON "job_checklist_items" USING btree ("organization_id","checklist_id");--> statement-breakpoint
CREATE INDEX "idx_job_checklist_items_org_completed" ON "job_checklist_items" USING btree ("organization_id","is_completed");--> statement-breakpoint
CREATE INDEX "idx_job_checklists_org_job" ON "job_checklists" USING btree ("organization_id","job_id");--> statement-breakpoint
CREATE INDEX "idx_job_checklists_org_template" ON "job_checklists" USING btree ("organization_id","template_id");--> statement-breakpoint
CREATE INDEX "idx_job_checklists_org_created" ON "job_checklists" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_attachments_storage_key_unique" ON "attachments" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "idx_attachments_org" ON "attachments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_attachments_entity" ON "attachments" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_attachments_uploader" ON "attachments" USING btree ("uploaded_by");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sla_config_org_domain_name" ON "sla_configurations" USING btree ("organization_id","domain","name");--> statement-breakpoint
CREATE INDEX "idx_sla_config_org_domain" ON "sla_configurations" USING btree ("organization_id","domain");--> statement-breakpoint
CREATE INDEX "idx_sla_config_default" ON "sla_configurations" USING btree ("organization_id","domain","is_default");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sla_tracking_entity" ON "sla_tracking" USING btree ("domain","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_sla_tracking_due_dates" ON "sla_tracking" USING btree ("organization_id","response_due_at","resolution_due_at");--> statement-breakpoint
CREATE INDEX "idx_sla_tracking_status" ON "sla_tracking" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_sla_tracking_config" ON "sla_tracking" USING btree ("sla_configuration_id");--> statement-breakpoint
CREATE INDEX "idx_sla_events_tracking" ON "sla_events" USING btree ("sla_tracking_id","triggered_at");--> statement-breakpoint
CREATE INDEX "idx_sla_events_org_type" ON "sla_events" USING btree ("organization_id","event_type","triggered_at");--> statement-breakpoint
CREATE INDEX "idx_issues_customer" ON "issues" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_issues_assignee" ON "issues" USING btree ("assigned_to_user_id");--> statement-breakpoint
CREATE INDEX "idx_issues_status" ON "issues" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_issues_priority" ON "issues" USING btree ("organization_id","priority");--> statement-breakpoint
CREATE INDEX "idx_issues_sla_tracking" ON "issues" USING btree ("sla_tracking_id");--> statement-breakpoint
CREATE INDEX "idx_issues_escalated" ON "issues" USING btree ("organization_id","escalated_at");--> statement-breakpoint
CREATE INDEX "idx_issues_org_created" ON "issues" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_escalation_history_issue" ON "escalation_history" USING btree ("issue_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_escalation_history_performed_by" ON "escalation_history" USING btree ("performed_by_user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_escalation_rules_org_active" ON "escalation_rules" USING btree ("organization_id","is_active","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_rma_number_org_unique" ON "return_authorizations" USING btree ("organization_id","rma_number");--> statement-breakpoint
CREATE INDEX "idx_rma_issue" ON "return_authorizations" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "idx_rma_customer" ON "return_authorizations" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_rma_order" ON "return_authorizations" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_rma_org_status" ON "return_authorizations" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_rma_org_created" ON "return_authorizations" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_rma_line_items_rma" ON "rma_line_items" USING btree ("rma_id");--> statement-breakpoint
CREATE INDEX "idx_rma_line_items_order_line" ON "rma_line_items" USING btree ("order_line_item_id");--> statement-breakpoint
CREATE INDEX "issue_templates_organization_idx" ON "issue_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "issue_templates_type_idx" ON "issue_templates" USING btree ("type");--> statement-breakpoint
CREATE INDEX "issue_templates_usage_idx" ON "issue_templates" USING btree ("usage_count");--> statement-breakpoint
CREATE INDEX "issue_templates_active_idx" ON "issue_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "csat_responses_organization_idx" ON "csat_responses" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "csat_responses_issue_idx" ON "csat_responses" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "csat_responses_rating_idx" ON "csat_responses" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "csat_responses_source_idx" ON "csat_responses" USING btree ("source");--> statement-breakpoint
CREATE INDEX "csat_responses_submitted_at_idx" ON "csat_responses" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "csat_responses_token_idx" ON "csat_responses" USING btree ("token");--> statement-breakpoint
CREATE INDEX "kb_articles_organization_idx" ON "kb_articles" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "kb_articles_category_idx" ON "kb_articles" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "kb_articles_status_idx" ON "kb_articles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "kb_articles_slug_idx" ON "kb_articles" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "kb_articles_search_idx" ON "kb_articles" USING btree ("title","content");--> statement-breakpoint
CREATE INDEX "kb_categories_organization_idx" ON "kb_categories" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "kb_categories_parent_idx" ON "kb_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "kb_categories_slug_idx" ON "kb_categories" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_warranties_number_org" ON "warranties" USING btree ("organization_id","warranty_number");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_warranties_serial_org" ON "warranties" USING btree ("organization_id","product_serial") WHERE product_serial IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_warranties_org" ON "warranties" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_warranties_customer" ON "warranties" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_warranties_product" ON "warranties" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_warranties_policy" ON "warranties" USING btree ("warranty_policy_id");--> statement-breakpoint
CREATE INDEX "idx_warranties_order" ON "warranties" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_warranties_status" ON "warranties" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_warranties_expiry" ON "warranties" USING btree ("organization_id","expiry_date","expiry_alert_opt_out");--> statement-breakpoint
CREATE INDEX "idx_warranties_assigned" ON "warranties" USING btree ("assigned_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_warranty_claims_number_org" ON "warranty_claims" USING btree ("organization_id","claim_number");--> statement-breakpoint
CREATE INDEX "idx_warranty_claims_org" ON "warranty_claims" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_warranty_claims_warranty" ON "warranty_claims" USING btree ("warranty_id");--> statement-breakpoint
CREATE INDEX "idx_warranty_claims_customer" ON "warranty_claims" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_warranty_claims_issue" ON "warranty_claims" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "idx_warranty_claims_status" ON "warranty_claims" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_warranty_claims_type" ON "warranty_claims" USING btree ("organization_id","claim_type");--> statement-breakpoint
CREATE INDEX "idx_warranty_claims_sla" ON "warranty_claims" USING btree ("sla_tracking_id");--> statement-breakpoint
CREATE INDEX "idx_warranty_claims_assigned" ON "warranty_claims" USING btree ("assigned_user_id");--> statement-breakpoint
CREATE INDEX "idx_warranty_claims_org_created" ON "warranty_claims" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_warranty_claims_submitted" ON "warranty_claims" USING btree ("organization_id","submitted_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_warranty_extensions_warranty" ON "warranty_extensions" USING btree ("warranty_id");--> statement-breakpoint
CREATE INDEX "idx_warranty_extensions_org" ON "warranty_extensions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_warranty_extensions_type" ON "warranty_extensions" USING btree ("organization_id","extension_type");--> statement-breakpoint
CREATE INDEX "idx_warranty_extensions_approver" ON "warranty_extensions" USING btree ("approved_by_id");--> statement-breakpoint
CREATE INDEX "idx_warranty_extensions_created" ON "warranty_extensions" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_warranty_policies_name_org" ON "warranty_policies" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "idx_warranty_policies_org" ON "warranty_policies" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_warranty_policies_type" ON "warranty_policies" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "idx_warranty_policies_default" ON "warranty_policies" USING btree ("organization_id","type","is_default");--> statement-breakpoint
CREATE INDEX "idx_warranty_policies_sla" ON "warranty_policies" USING btree ("sla_configuration_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_supplier_price_lists_supplier_product_qty_unique" ON "supplier_price_lists" USING btree ("supplier_id","product_id","min_quantity") WHERE "supplier_price_lists"."is_active" = true;--> statement-breakpoint
CREATE INDEX "idx_supplier_price_lists_supplier" ON "supplier_price_lists" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_price_lists_org_supplier" ON "supplier_price_lists" USING btree ("organization_id","supplier_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_price_lists_product" ON "supplier_price_lists" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_price_lists_org_product" ON "supplier_price_lists" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_price_lists_supplier_product" ON "supplier_price_lists" USING btree ("supplier_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_price_lists_org_active" ON "supplier_price_lists" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_supplier_price_lists_preferred" ON "supplier_price_lists" USING btree ("is_preferred_price");--> statement-breakpoint
CREATE INDEX "idx_supplier_price_lists_effective_date" ON "supplier_price_lists" USING btree ("effective_date");--> statement-breakpoint
CREATE INDEX "idx_supplier_price_lists_expiry_date" ON "supplier_price_lists" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "idx_supplier_price_lists_org_created_id" ON "supplier_price_lists" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_supplier_performance_metrics_unique" ON "supplier_performance_metrics" USING btree ("supplier_id","metric_month");--> statement-breakpoint
CREATE INDEX "idx_supplier_performance_metrics_supplier" ON "supplier_performance_metrics" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_performance_metrics_org_supplier" ON "supplier_performance_metrics" USING btree ("organization_id","supplier_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_performance_metrics_month" ON "supplier_performance_metrics" USING btree ("metric_month");--> statement-breakpoint
CREATE INDEX "idx_supplier_performance_metrics_overall" ON "supplier_performance_metrics" USING btree ("overall_score");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_suppliers_code_org_unique" ON "suppliers" USING btree ("organization_id","supplier_code") WHERE "suppliers"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_suppliers_email_org_unique" ON "suppliers" USING btree ("organization_id","email") WHERE "suppliers"."email" IS NOT NULL AND "suppliers"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_suppliers_org_status" ON "suppliers" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_suppliers_org_type" ON "suppliers" USING btree ("organization_id","supplier_type");--> statement-breakpoint
CREATE INDEX "idx_suppliers_org_overall_rating" ON "suppliers" USING btree ("organization_id","overall_rating");--> statement-breakpoint
CREATE INDEX "idx_suppliers_org_last_order" ON "suppliers" USING btree ("organization_id","last_order_date");--> statement-breakpoint
CREATE INDEX "idx_suppliers_org_created_id" ON "suppliers" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_suppliers_name_search" ON "suppliers" USING gin (to_tsvector('english', "name"));--> statement-breakpoint
CREATE INDEX "idx_suppliers_tags_gin" ON "suppliers" USING gin ("tags");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_purchase_orders_po_number_org_unique" ON "purchase_orders" USING btree ("organization_id","po_number") WHERE "purchase_orders"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_purchase_orders_org_status" ON "purchase_orders" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_purchase_orders_org_supplier" ON "purchase_orders" USING btree ("organization_id","supplier_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_orders_supplier" ON "purchase_orders" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_orders_supplier_status" ON "purchase_orders" USING btree ("supplier_id","status");--> statement-breakpoint
CREATE INDEX "idx_purchase_orders_order_date" ON "purchase_orders" USING btree ("order_date");--> statement-breakpoint
CREATE INDEX "idx_purchase_orders_required_date" ON "purchase_orders" USING btree ("required_date");--> statement-breakpoint
CREATE INDEX "idx_purchase_orders_expected_delivery" ON "purchase_orders" USING btree ("expected_delivery_date");--> statement-breakpoint
CREATE INDEX "idx_purchase_orders_org_status_order_date" ON "purchase_orders" USING btree ("organization_id","status","order_date");--> statement-breakpoint
CREATE INDEX "idx_purchase_orders_org_created_id" ON "purchase_orders" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "idx_purchase_orders_ordered_by" ON "purchase_orders" USING btree ("ordered_by");--> statement-breakpoint
CREATE INDEX "idx_purchase_orders_approved_by" ON "purchase_orders" USING btree ("approved_by");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_items_po" ON "purchase_order_items" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_items_org_po" ON "purchase_order_items" USING btree ("organization_id","purchase_order_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_items_product" ON "purchase_order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_items_po_line" ON "purchase_order_items" USING btree ("purchase_order_id","line_number");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_items_org_receipt" ON "purchase_order_items" USING btree ("organization_id","quantity_received");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_items_org_created_id" ON "purchase_order_items" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_purchase_order_approval_rules_org" ON "purchase_order_approval_rules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_approval_rules_org_active" ON "purchase_order_approval_rules" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_approval_rules_org_active_priority" ON "purchase_order_approval_rules" USING btree ("organization_id","is_active","priority");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_approval_rules_min_amount" ON "purchase_order_approval_rules" USING btree ("min_amount");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_approval_rules_max_amount" ON "purchase_order_approval_rules" USING btree ("max_amount");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_approval_rules_org_created_id" ON "purchase_order_approval_rules" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_purchase_order_approvals_po_level_unique" ON "purchase_order_approvals" USING btree ("purchase_order_id","level");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_approvals_po" ON "purchase_order_approvals" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_approvals_org_po" ON "purchase_order_approvals" USING btree ("organization_id","purchase_order_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_approvals_approver" ON "purchase_order_approvals" USING btree ("approver_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_approvals_approver_status" ON "purchase_order_approvals" USING btree ("approver_id","status");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_approvals_org_status" ON "purchase_order_approvals" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_approvals_due_at" ON "purchase_order_approvals" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_approvals_org_due_pending" ON "purchase_order_approvals" USING btree ("organization_id","status","due_at");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_approvals_org_created_id" ON "purchase_order_approvals" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_receipt_items_receipt" ON "purchase_order_receipt_items" USING btree ("receipt_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_receipt_items_org_receipt" ON "purchase_order_receipt_items" USING btree ("organization_id","receipt_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_receipt_items_po_item" ON "purchase_order_receipt_items" USING btree ("purchase_order_item_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_receipt_items_receipt_line" ON "purchase_order_receipt_items" USING btree ("receipt_id","line_number");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_receipt_items_condition" ON "purchase_order_receipt_items" USING btree ("condition");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_receipt_items_warehouse" ON "purchase_order_receipt_items" USING btree ("warehouse_location");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_receipt_items_lot" ON "purchase_order_receipt_items" USING btree ("lot_number");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_receipt_items_org_created_id" ON "purchase_order_receipt_items" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_purchase_order_receipts_number_org_unique" ON "purchase_order_receipts" USING btree ("organization_id","receipt_number");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_receipts_po" ON "purchase_order_receipts" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_receipts_org_po" ON "purchase_order_receipts" USING btree ("organization_id","purchase_order_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_receipts_org_status" ON "purchase_order_receipts" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_receipts_received_at" ON "purchase_order_receipts" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_receipts_received_by" ON "purchase_order_receipts" USING btree ("received_by");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_receipts_inspection_by" ON "purchase_order_receipts" USING btree ("inspection_completed_by");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_receipts_org_pending_inspection" ON "purchase_order_receipts" USING btree ("organization_id","status","inspection_completed_at");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_receipts_org_created_id" ON "purchase_order_receipts" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_purchase_order_amendments_po_number_unique" ON "purchase_order_amendments" USING btree ("purchase_order_id","amendment_number");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_amendments_po" ON "purchase_order_amendments" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_amendments_org_po" ON "purchase_order_amendments" USING btree ("organization_id","purchase_order_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_amendments_org_status" ON "purchase_order_amendments" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_amendments_requested_by" ON "purchase_order_amendments" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_amendments_requested_at" ON "purchase_order_amendments" USING btree ("requested_at");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_amendments_org_pending" ON "purchase_order_amendments" USING btree ("organization_id","status","requested_at");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_amendments_org_created_id" ON "purchase_order_amendments" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_costs_po" ON "purchase_order_costs" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_costs_org_po" ON "purchase_order_costs" USING btree ("organization_id","purchase_order_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_costs_type" ON "purchase_order_costs" USING btree ("cost_type");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_costs_org_type" ON "purchase_order_costs" USING btree ("organization_id","cost_type");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_costs_supplier_invoice" ON "purchase_order_costs" USING btree ("supplier_invoice_number");--> statement-breakpoint
CREATE INDEX "idx_purchase_order_costs_org_created_id" ON "purchase_order_costs" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "idx_supplier_price_history_supplier_product" ON "supplier_price_history" USING btree ("supplier_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_price_history_effective_date" ON "supplier_price_history" USING btree ("effective_date");--> statement-breakpoint
CREATE INDEX "idx_supplier_price_history_changed_at" ON "supplier_price_history" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "idx_supplier_price_history_price_list" ON "supplier_price_history" USING btree ("price_list_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_price_history_org_supplier" ON "supplier_price_history" USING btree ("organization_id","supplier_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_price_history_org_product" ON "supplier_price_history" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_price_history_org_created_id" ON "supplier_price_history" USING btree ("organization_id","changed_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_price_agreements_number_org_unique" ON "price_agreements" USING btree ("organization_id","agreement_number") WHERE "price_agreements"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_price_agreements_supplier" ON "price_agreements" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_price_agreements_org_supplier" ON "price_agreements" USING btree ("organization_id","supplier_id");--> statement-breakpoint
CREATE INDEX "idx_price_agreements_org_status" ON "price_agreements" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_price_agreements_effective_date" ON "price_agreements" USING btree ("effective_date");--> statement-breakpoint
CREATE INDEX "idx_price_agreements_expiry_date" ON "price_agreements" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "idx_price_agreements_org_active" ON "price_agreements" USING btree ("organization_id","status","expiry_date");--> statement-breakpoint
CREATE INDEX "idx_price_agreements_created_by" ON "price_agreements" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_price_agreements_approved_by" ON "price_agreements" USING btree ("approved_by");--> statement-breakpoint
CREATE INDEX "idx_price_agreements_org_created_id" ON "price_agreements" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "idx_price_change_history_price_list" ON "price_change_history" USING btree ("price_list_id");--> statement-breakpoint
CREATE INDEX "idx_price_change_history_agreement" ON "price_change_history" USING btree ("agreement_id");--> statement-breakpoint
CREATE INDEX "idx_price_change_history_supplier" ON "price_change_history" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_price_change_history_org_supplier" ON "price_change_history" USING btree ("organization_id","supplier_id");--> statement-breakpoint
CREATE INDEX "idx_price_change_history_org_status" ON "price_change_history" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_price_change_history_requested_by" ON "price_change_history" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "idx_price_change_history_requested_at" ON "price_change_history" USING btree ("requested_at");--> statement-breakpoint
CREATE INDEX "idx_price_change_history_org_pending" ON "price_change_history" USING btree ("organization_id","status","requested_at");--> statement-breakpoint
CREATE INDEX "idx_price_change_history_org_created_id" ON "price_change_history" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_search_index_org_entity" ON "search_index" USING btree ("organization_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_search_index_org_type" ON "search_index" USING btree ("organization_id","entity_type");--> statement-breakpoint
CREATE INDEX "idx_search_index_org_updated" ON "search_index" USING btree ("organization_id","updated_at");--> statement-breakpoint
CREATE INDEX "idx_search_index_search_vector" ON "search_index" USING gin ("search_vector");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_recent_items_user_entity" ON "recent_items" USING btree ("organization_id","user_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_recent_items_org_user" ON "recent_items" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_recent_items_org_accessed" ON "recent_items" USING btree ("organization_id","last_accessed_at");--> statement-breakpoint
CREATE INDEX "idx_search_outbox_org_status" ON "search_index_outbox" USING btree ("organization_id","status","created_at");--> statement-breakpoint
CREATE INDEX "idx_search_outbox_org_entity" ON "search_index_outbox" USING btree ("organization_id","entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_search_outbox_org_entity_action" ON "search_index_outbox" USING btree ("organization_id","entity_type","entity_id","action");--> statement-breakpoint
CREATE INDEX "idx_custom_reports_org" ON "custom_reports" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_custom_reports_org_shared" ON "custom_reports" USING btree ("organization_id","is_shared");--> statement-breakpoint
CREATE INDEX "idx_report_favorites_org_user" ON "report_favorites" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_report_favorites_org_user_report" ON "report_favorites" USING btree ("organization_id","user_id","report_type","report_id");--> statement-breakpoint
CREATE INDEX "idx_targets_org_metric" ON "targets" USING btree ("organization_id","metric");--> statement-breakpoint
CREATE INDEX "idx_targets_org_date" ON "targets" USING btree ("organization_id","start_date","end_date");--> statement-breakpoint
CREATE INDEX "idx_targets_org_period" ON "targets" USING btree ("organization_id","period");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_targets_unique_metric_period" ON "targets" USING btree ("organization_id","metric","period","start_date");--> statement-breakpoint
CREATE INDEX "idx_scheduled_reports_org" ON "scheduled_reports" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_scheduled_reports_org_active" ON "scheduled_reports" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_scheduled_reports_org_next_run" ON "scheduled_reports" USING btree ("organization_id","next_run_at");--> statement-breakpoint
CREATE INDEX "idx_scheduled_reports_org_frequency" ON "scheduled_reports" USING btree ("organization_id","frequency");--> statement-breakpoint
CREATE INDEX "idx_scheduled_reports_org_created" ON "scheduled_reports" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_dashboard_layouts_org_user" ON "dashboard_layouts" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_dashboard_layouts_org_user_default" ON "dashboard_layouts" USING btree ("organization_id","user_id","is_default");--> statement-breakpoint
CREATE INDEX "idx_dashboard_layouts_org_role_default" ON "dashboard_layouts" USING btree ("organization_id","role_default");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_portal_sessions_token" ON "customer_portal_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_portal_sessions_org_scope" ON "customer_portal_sessions" USING btree ("organization_id","scope");--> statement-breakpoint
CREATE INDEX "idx_portal_sessions_org_customer" ON "customer_portal_sessions" USING btree ("organization_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_portal_sessions_org_job" ON "customer_portal_sessions" USING btree ("organization_id","job_assignment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_portal_identities_org_auth_unique" ON "portal_identities" USING btree ("organization_id","auth_user_id");--> statement-breakpoint
CREATE INDEX "idx_portal_identities_org_scope_customer" ON "portal_identities" USING btree ("organization_id","scope","customer_id");--> statement-breakpoint
CREATE INDEX "idx_portal_identities_org_scope_job" ON "portal_identities" USING btree ("organization_id","scope","job_assignment_id");--> statement-breakpoint
CREATE INDEX "idx_ai_conversations_org" ON "ai_conversations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_conversations_user" ON "ai_conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ai_conversations_last_message" ON "ai_conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "idx_ai_conversations_active_agent" ON "ai_conversations" USING btree ("active_agent");--> statement-breakpoint
CREATE INDEX "idx_ai_messages_conversation_created" ON "ai_conversation_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_ai_messages_conversation_role" ON "ai_conversation_messages" USING btree ("conversation_id","role");--> statement-breakpoint
CREATE INDEX "idx_ai_messages_agent_name" ON "ai_conversation_messages" USING btree ("agent_name");--> statement-breakpoint
CREATE INDEX "idx_ai_approvals_org" ON "ai_approvals" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_approvals_user" ON "ai_approvals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ai_approvals_status" ON "ai_approvals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ai_approvals_expires" ON "ai_approvals" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_ai_approvals_user_status" ON "ai_approvals" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_ai_approvals_org_status" ON "ai_approvals" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_ai_approvals_retry_status" ON "ai_approvals" USING btree ("status","retry_count");--> statement-breakpoint
CREATE INDEX "ai_approval_entities_approval_idx" ON "ai_approval_entities" USING btree ("approval_id");--> statement-breakpoint
CREATE INDEX "ai_approval_entities_entity_idx" ON "ai_approval_entities" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_tasks_org" ON "ai_agent_tasks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_tasks_user" ON "ai_agent_tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_tasks_status" ON "ai_agent_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_tasks_type" ON "ai_agent_tasks" USING btree ("task_type");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_tasks_queued" ON "ai_agent_tasks" USING btree ("queued_at");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_tasks_user_status" ON "ai_agent_tasks" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_tasks_org_status" ON "ai_agent_tasks" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_tasks_status_queued" ON "ai_agent_tasks" USING btree ("status","queued_at");--> statement-breakpoint
CREATE INDEX "idx_ai_cost_org" ON "ai_cost_tracking" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_cost_user" ON "ai_cost_tracking" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ai_cost_date" ON "ai_cost_tracking" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_ai_cost_model" ON "ai_cost_tracking" USING btree ("model");--> statement-breakpoint
CREATE INDEX "idx_ai_cost_feature" ON "ai_cost_tracking" USING btree ("feature");--> statement-breakpoint
CREATE INDEX "idx_ai_cost_org_date" ON "ai_cost_tracking" USING btree ("organization_id","date");--> statement-breakpoint
CREATE INDEX "idx_ai_cost_user_date" ON "ai_cost_tracking" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "idx_ai_cost_org_model_date" ON "ai_cost_tracking" USING btree ("organization_id","model","date");--> statement-breakpoint
CREATE INDEX "idx_ai_cost_org_feature_date" ON "ai_cost_tracking" USING btree ("organization_id","feature","date");--> statement-breakpoint
CREATE INDEX "idx_generated_documents_entity" ON "generated_documents" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_generated_documents_org_entity" ON "generated_documents" USING btree ("organization_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_generated_documents_org_doc_type" ON "generated_documents" USING btree ("organization_id","document_type");--> statement-breakpoint
CREATE INDEX "idx_generated_documents_generated_by" ON "generated_documents" USING btree ("generated_by_id");--> statement-breakpoint
CREATE INDEX "idx_generated_documents_org_created" ON "generated_documents" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_document_templates_org" ON "document_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE POLICY "jobs_select_policy" ON "jobs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "jobs_insert_policy" ON "jobs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "jobs_update_policy" ON "jobs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "jobs_delete_policy" ON "jobs" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "notifications_select_policy" ON "notifications" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "notifications_insert_policy" ON "notifications" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "notifications_update_policy" ON "notifications" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "notifications_delete_policy" ON "notifications" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "audit_logs_select_policy" ON "audit_logs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "audit_logs_insert_policy" ON "audit_logs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "addresses_select_policy" ON "addresses" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "addresses_insert_policy" ON "addresses" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "addresses_update_policy" ON "addresses" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "addresses_delete_policy" ON "addresses" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "contacts_select_policy" ON "contacts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "contacts_insert_policy" ON "contacts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "contacts_update_policy" ON "contacts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "contacts_delete_policy" ON "contacts" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "customer_tag_assignments_select_policy" ON "customer_tag_assignments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "customer_tag_assignments_insert_policy" ON "customer_tag_assignments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "customer_tag_assignments_update_policy" ON "customer_tag_assignments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "customer_tag_assignments_delete_policy" ON "customer_tag_assignments" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "customers_select_policy" ON "customers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "customers_insert_policy" ON "customers" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "customers_update_policy" ON "customers" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "customers_delete_policy" ON "customers" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "categories_select_policy" ON "categories" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "categories_insert_policy" ON "categories" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "categories_update_policy" ON "categories" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "categories_delete_policy" ON "categories" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "products_select_policy" ON "products" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "products_insert_policy" ON "products" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "products_update_policy" ON "products" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "products_delete_policy" ON "products" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "product_attribute_values_select_policy" ON "product_attribute_values" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "product_attribute_values_insert_policy" ON "product_attribute_values" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "product_attribute_values_update_policy" ON "product_attribute_values" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "product_attribute_values_delete_policy" ON "product_attribute_values" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "product_attributes_select_policy" ON "product_attributes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "product_attributes_insert_policy" ON "product_attributes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "product_attributes_update_policy" ON "product_attributes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "product_attributes_delete_policy" ON "product_attributes" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "product_bundles_select_policy" ON "product_bundles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "product_bundles_insert_policy" ON "product_bundles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "product_bundles_update_policy" ON "product_bundles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "product_bundles_delete_policy" ON "product_bundles" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "product_images_select_policy" ON "product_images" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "product_images_insert_policy" ON "product_images" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "product_images_update_policy" ON "product_images" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "product_images_delete_policy" ON "product_images" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "customer_product_prices_select_policy" ON "customer_product_prices" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "customer_product_prices_insert_policy" ON "customer_product_prices" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "customer_product_prices_update_policy" ON "customer_product_prices" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "customer_product_prices_delete_policy" ON "customer_product_prices" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "price_history_select_policy" ON "price_history" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "price_history_insert_policy" ON "price_history" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "price_history_update_policy" ON "price_history" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "price_history_delete_policy" ON "price_history" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "product_price_tiers_select_policy" ON "product_price_tiers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "product_price_tiers_insert_policy" ON "product_price_tiers" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "product_price_tiers_update_policy" ON "product_price_tiers" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "product_price_tiers_delete_policy" ON "product_price_tiers" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "product_relations_select_policy" ON "product_relations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "product_relations_insert_policy" ON "product_relations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "product_relations_update_policy" ON "product_relations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "product_relations_delete_policy" ON "product_relations" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "order_line_items_select_policy" ON "order_line_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "order_line_items_insert_policy" ON "order_line_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "order_line_items_update_policy" ON "order_line_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "order_line_items_delete_policy" ON "order_line_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "order_line_items_portal_select_policy" ON "order_line_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((
        "order_line_items"."organization_id" = (SELECT current_setting('app.organization_id', true)::uuid)
        OR EXISTS (
          SELECT 1 FROM orders o
          WHERE o.id = "order_line_items"."order_id"
            AND o.organization_id = "order_line_items"."organization_id"
            AND (
              EXISTS (
                SELECT 1 FROM portal_identities pi
                WHERE pi.auth_user_id = auth.uid()
                  AND pi.status = 'active'
                  AND pi.organization_id = "order_line_items"."organization_id"
                  AND pi.scope = 'customer'
                  AND pi.customer_id = o.customer_id
              )
              OR EXISTS (
                SELECT 1 FROM portal_identities pi
                JOIN job_assignments ja ON ja.id = pi.job_assignment_id
                WHERE pi.auth_user_id = auth.uid()
                  AND pi.status = 'active'
                  AND pi.organization_id = "order_line_items"."organization_id"
                  AND pi.scope = 'subcontractor'
                  AND ja.order_id = o.id
              )
            )
        )
      ));--> statement-breakpoint
CREATE POLICY "orders_select_policy" ON "orders" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "orders_insert_policy" ON "orders" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "orders_update_policy" ON "orders" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "orders_delete_policy" ON "orders" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "orders_portal_select_policy" ON "orders" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((
        "orders"."organization_id" = (SELECT current_setting('app.organization_id', true)::uuid)
        OR EXISTS (
          SELECT 1 FROM portal_identities pi
          WHERE pi.auth_user_id = auth.uid()
            AND pi.status = 'active'
            AND pi.organization_id = "orders"."organization_id"
            AND pi.scope = 'customer'
            AND pi.customer_id = "orders"."customer_id"
        )
        OR EXISTS (
          SELECT 1 FROM portal_identities pi
          JOIN job_assignments ja ON ja.id = pi.job_assignment_id
          WHERE pi.auth_user_id = auth.uid()
            AND pi.status = 'active'
            AND pi.organization_id = "orders"."organization_id"
            AND pi.scope = 'subcontractor'
            AND ja.order_id = "orders"."id"
        )
      ));--> statement-breakpoint
CREATE POLICY "order_amendments_select_policy" ON "order_amendments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "order_amendments_insert_policy" ON "order_amendments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "order_amendments_update_policy" ON "order_amendments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "order_amendments_delete_policy" ON "order_amendments" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "order_shipments_select_policy" ON "order_shipments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "order_shipments_insert_policy" ON "order_shipments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "order_shipments_update_policy" ON "order_shipments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "order_shipments_delete_policy" ON "order_shipments" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "shipment_items_select_policy" ON "shipment_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "shipment_items_insert_policy" ON "shipment_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "shipment_items_update_policy" ON "shipment_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "shipment_items_delete_policy" ON "shipment_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "order_template_items_select_policy" ON "order_template_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "order_template_items_insert_policy" ON "order_template_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "order_template_items_update_policy" ON "order_template_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "order_template_items_delete_policy" ON "order_template_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "order_templates_select_policy" ON "order_templates" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "order_templates_insert_policy" ON "order_templates" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "order_templates_update_policy" ON "order_templates" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "order_templates_delete_policy" ON "order_templates" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "credit_notes_select_policy" ON "credit_notes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "credit_notes_insert_policy" ON "credit_notes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "credit_notes_update_policy" ON "credit_notes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "credit_notes_delete_policy" ON "credit_notes" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "payment_reminder_settings_select_policy" ON "payment_reminder_settings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "payment_reminder_settings_insert_policy" ON "payment_reminder_settings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "payment_reminder_settings_update_policy" ON "payment_reminder_settings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "payment_reminder_settings_delete_policy" ON "payment_reminder_settings" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "reminder_history_select_policy" ON "reminder_history" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "reminder_history_insert_policy" ON "reminder_history" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "reminder_history_update_policy" ON "reminder_history" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "reminder_history_delete_policy" ON "reminder_history" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "reminder_templates_select_policy" ON "reminder_templates" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "reminder_templates_insert_policy" ON "reminder_templates" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "reminder_templates_update_policy" ON "reminder_templates" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "reminder_templates_delete_policy" ON "reminder_templates" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "payment_schedules_select_policy" ON "payment_schedules" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "payment_schedules_insert_policy" ON "payment_schedules" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "payment_schedules_update_policy" ON "payment_schedules" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "payment_schedules_delete_policy" ON "payment_schedules" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "deferred_revenue_select_policy" ON "deferred_revenue" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "deferred_revenue_insert_policy" ON "deferred_revenue" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "deferred_revenue_update_policy" ON "deferred_revenue" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "deferred_revenue_delete_policy" ON "deferred_revenue" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "revenue_recognition_select_policy" ON "revenue_recognition" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "revenue_recognition_insert_policy" ON "revenue_recognition" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "revenue_recognition_update_policy" ON "revenue_recognition" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "revenue_recognition_delete_policy" ON "revenue_recognition" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "statement_history_select_policy" ON "statement_history" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "statement_history_insert_policy" ON "statement_history" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "statement_history_update_policy" ON "statement_history" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "statement_history_delete_policy" ON "statement_history" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "opportunities_select_policy" ON "opportunities" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "opportunities_insert_policy" ON "opportunities" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "opportunities_update_policy" ON "opportunities" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "opportunities_delete_policy" ON "opportunities" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "opportunity_activities_select_policy" ON "opportunity_activities" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "opportunity_activities_insert_policy" ON "opportunity_activities" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "opportunity_activities_delete_policy" ON "opportunity_activities" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "quote_versions_select_policy" ON "quote_versions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "quote_versions_insert_policy" ON "quote_versions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "quote_versions_update_policy" ON "quote_versions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "quote_versions_delete_policy" ON "quote_versions" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "quote_versions_portal_select_policy" ON "quote_versions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((
        "quote_versions"."organization_id" = (SELECT current_setting('app.organization_id', true)::uuid)
        OR EXISTS (
          SELECT 1 FROM portal_identities pi
          JOIN opportunities o ON o.id = "quote_versions"."opportunity_id"
          WHERE pi.auth_user_id = auth.uid()
            AND pi.status = 'active'
            AND pi.organization_id = "quote_versions"."organization_id"
            AND pi.scope = 'customer'
            AND pi.customer_id = o.customer_id
        )
      ));--> statement-breakpoint
CREATE POLICY "quotes_select_policy" ON "quotes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "quotes_insert_policy" ON "quotes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "quotes_update_policy" ON "quotes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "quotes_delete_policy" ON "quotes" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "quotes_portal_select_policy" ON "quotes" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((
        "quotes"."organization_id" = (SELECT current_setting('app.organization_id', true)::uuid)
        OR EXISTS (
          SELECT 1 FROM portal_identities pi
          WHERE pi.auth_user_id = auth.uid()
            AND pi.status = 'active'
            AND pi.organization_id = "quotes"."organization_id"
            AND pi.scope = 'customer'
            AND pi.customer_id = "quotes"."customer_id"
        )
      ));--> statement-breakpoint
CREATE POLICY "win_loss_reasons_select_policy" ON "win_loss_reasons" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "win_loss_reasons_insert_policy" ON "win_loss_reasons" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "win_loss_reasons_update_policy" ON "win_loss_reasons" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "win_loss_reasons_delete_policy" ON "win_loss_reasons" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "inventory_select_policy" ON "inventory" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "inventory_insert_policy" ON "inventory" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "inventory_update_policy" ON "inventory" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "inventory_delete_policy" ON "inventory" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "inventory_alerts_select_policy" ON "inventory_alerts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "inventory_alerts_insert_policy" ON "inventory_alerts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "inventory_alerts_update_policy" ON "inventory_alerts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "inventory_alerts_delete_policy" ON "inventory_alerts" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "inventory_cost_layers_select_policy" ON "inventory_cost_layers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "inventory_cost_layers_insert_policy" ON "inventory_cost_layers" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "inventory_cost_layers_update_policy" ON "inventory_cost_layers" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "inventory_cost_layers_delete_policy" ON "inventory_cost_layers" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "inventory_forecasts_select_policy" ON "inventory_forecasts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "inventory_forecasts_insert_policy" ON "inventory_forecasts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "inventory_forecasts_update_policy" ON "inventory_forecasts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "inventory_forecasts_delete_policy" ON "inventory_forecasts" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "inventory_movements_select_policy" ON "inventory_movements" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "inventory_movements_insert_policy" ON "inventory_movements" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "stock_counts_select_policy" ON "stock_counts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "stock_counts_insert_policy" ON "stock_counts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "stock_counts_update_policy" ON "stock_counts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "stock_counts_delete_policy" ON "stock_counts" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warehouse_locations_select_policy" ON "warehouse_locations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warehouse_locations_insert_policy" ON "warehouse_locations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warehouse_locations_update_policy" ON "warehouse_locations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warehouse_locations_delete_policy" ON "warehouse_locations" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "organizations_select_policy" ON "organizations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "organizations_insert_policy" ON "organizations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "organizations_update_policy" ON "organizations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "organizations_delete_policy" ON "organizations" AS PERMISSIVE FOR DELETE TO "authenticated" USING (id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "system_settings_select_policy" ON "system_settings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "system_settings_insert_policy" ON "system_settings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "system_settings_update_policy" ON "system_settings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "system_settings_delete_policy" ON "system_settings" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "custom_fields_select_policy" ON "custom_fields" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "custom_fields_insert_policy" ON "custom_fields" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "custom_fields_update_policy" ON "custom_fields" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "custom_fields_delete_policy" ON "custom_fields" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "custom_field_values_select_policy" ON "custom_field_values" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
        SELECT 1 FROM custom_fields cf
        WHERE cf.id = custom_field_id
        AND cf.organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      ));--> statement-breakpoint
CREATE POLICY "custom_field_values_insert_policy" ON "custom_field_values" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (EXISTS (
        SELECT 1 FROM custom_fields cf
        WHERE cf.id = custom_field_id
        AND cf.organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      ));--> statement-breakpoint
CREATE POLICY "custom_field_values_update_policy" ON "custom_field_values" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (EXISTS (
        SELECT 1 FROM custom_fields cf
        WHERE cf.id = custom_field_id
        AND cf.organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM custom_fields cf
        WHERE cf.id = custom_field_id
        AND cf.organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      ));--> statement-breakpoint
CREATE POLICY "custom_field_values_delete_policy" ON "custom_field_values" AS PERMISSIVE FOR DELETE TO "authenticated" USING (EXISTS (
        SELECT 1 FROM custom_fields cf
        WHERE cf.id = custom_field_id
        AND cf.organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      ));--> statement-breakpoint
CREATE POLICY "data_exports_select_policy" ON "data_exports" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "data_exports_insert_policy" ON "data_exports" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "data_exports_update_policy" ON "data_exports" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "data_exports_delete_policy" ON "data_exports" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "business_hours_config_select_policy" ON "business_hours_config" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "business_hours_config_insert_policy" ON "business_hours_config" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "business_hours_config_update_policy" ON "business_hours_config" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "business_hours_config_delete_policy" ON "business_hours_config" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "organization_holidays_select_policy" ON "organization_holidays" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "organization_holidays_insert_policy" ON "organization_holidays" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "organization_holidays_update_policy" ON "organization_holidays" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "organization_holidays_delete_policy" ON "organization_holidays" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "user_sessions_select_policy" ON "user_sessions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (user_id IN (
        SELECT id FROM users
        WHERE organization_id = current_setting('app.organization_id', true)::uuid
      ));--> statement-breakpoint
CREATE POLICY "user_sessions_delete_policy" ON "user_sessions" AS PERMISSIVE FOR DELETE TO "authenticated" USING (user_id IN (
        SELECT id FROM users
        WHERE organization_id = current_setting('app.organization_id', true)::uuid
      ));--> statement-breakpoint
CREATE POLICY "users_select_policy" ON "users" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "users_insert_policy" ON "users" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "users_update_policy" ON "users" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "users_delete_policy" ON "users" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "user_delegations_select_policy" ON "user_delegations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "user_delegations_insert_policy" ON "user_delegations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "user_delegations_update_policy" ON "user_delegations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "user_delegations_delete_policy" ON "user_delegations" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "user_group_members_select_policy" ON "user_group_members" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "user_group_members_insert_policy" ON "user_group_members" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "user_group_members_update_policy" ON "user_group_members" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "user_group_members_delete_policy" ON "user_group_members" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "user_groups_select_policy" ON "user_groups" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "user_groups_insert_policy" ON "user_groups" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "user_groups_update_policy" ON "user_groups" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "user_groups_delete_policy" ON "user_groups" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "user_invitations_select_policy" ON "user_invitations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "user_invitations_insert_policy" ON "user_invitations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "user_invitations_update_policy" ON "user_invitations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "user_invitations_delete_policy" ON "user_invitations" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "api_tokens_org_isolation" ON "api_tokens" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (
        SELECT organization_id FROM users WHERE auth_id = auth.uid()
      )) WITH CHECK (organization_id = (
        SELECT organization_id FROM users WHERE auth_id = auth.uid()
      ));--> statement-breakpoint
CREATE POLICY "api_tokens_owner_access" ON "api_tokens" AS PERMISSIVE FOR ALL TO "authenticated" USING (
        user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM users
          WHERE auth_id = auth.uid()
          AND role IN ('owner', 'admin')
          AND organization_id = api_tokens.organization_id
        )
      );--> statement-breakpoint
CREATE POLICY "activities_select_policy" ON "activities" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "activities_insert_policy" ON "activities" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "campaign_recipients_select_policy" ON "campaign_recipients" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "campaign_recipients_insert_policy" ON "campaign_recipients" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "campaign_recipients_update_policy" ON "campaign_recipients" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "campaign_recipients_delete_policy" ON "campaign_recipients" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "email_campaigns_select_policy" ON "email_campaigns" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "email_campaigns_insert_policy" ON "email_campaigns" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "email_campaigns_update_policy" ON "email_campaigns" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "email_campaigns_delete_policy" ON "email_campaigns" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "email_history_select_policy" ON "email_history" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "email_history_insert_policy" ON "email_history" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "email_signatures_select_policy" ON "email_signatures" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "email_signatures_insert_policy" ON "email_signatures" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "email_signatures_update_policy" ON "email_signatures" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "email_signatures_delete_policy" ON "email_signatures" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "email_suppression_select_policy" ON "email_suppression" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "email_suppression_insert_policy" ON "email_suppression" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "email_suppression_update_policy" ON "email_suppression" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "email_suppression_delete_policy" ON "email_suppression" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "email_templates_select_policy" ON "email_templates" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "email_templates_insert_policy" ON "email_templates" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "email_templates_update_policy" ON "email_templates" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "email_templates_delete_policy" ON "email_templates" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "scheduled_calls_select_policy" ON "scheduled_calls" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "scheduled_calls_insert_policy" ON "scheduled_calls" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "scheduled_calls_update_policy" ON "scheduled_calls" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "scheduled_calls_delete_policy" ON "scheduled_calls" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "scheduled_emails_select_policy" ON "scheduled_emails" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "scheduled_emails_insert_policy" ON "scheduled_emails" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "scheduled_emails_update_policy" ON "scheduled_emails" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "scheduled_emails_delete_policy" ON "scheduled_emails" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_connections_select_policy" ON "oauth_connections" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_connections_insert_policy" ON "oauth_connections" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_connections_update_policy" ON "oauth_connections" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_connections_delete_policy" ON "oauth_connections" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_service_permissions_select_policy" ON "oauth_service_permissions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_service_permissions_insert_policy" ON "oauth_service_permissions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_service_permissions_update_policy" ON "oauth_service_permissions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_service_permissions_delete_policy" ON "oauth_service_permissions" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_sync_logs_select_policy" ON "oauth_sync_logs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_sync_logs_insert_policy" ON "oauth_sync_logs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_sync_logs_update_policy" ON "oauth_sync_logs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_sync_logs_delete_policy" ON "oauth_sync_logs" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_states_select_policy" ON "oauth_states" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_states_insert_policy" ON "oauth_states" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_states_update_policy" ON "oauth_states" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_states_delete_policy" ON "oauth_states" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_email_messages_select_policy" ON "oauth_email_messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_email_messages_insert_policy" ON "oauth_email_messages" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_email_messages_update_policy" ON "oauth_email_messages" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_email_messages_delete_policy" ON "oauth_email_messages" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_contacts_select_policy" ON "oauth_contacts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_contacts_insert_policy" ON "oauth_contacts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_contacts_update_policy" ON "oauth_contacts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_contacts_delete_policy" ON "oauth_contacts" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_calendar_events_select_policy" ON "oauth_calendar_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_calendar_events_insert_policy" ON "oauth_calendar_events" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_calendar_events_update_policy" ON "oauth_calendar_events" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_calendar_events_delete_policy" ON "oauth_calendar_events" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_sync_states_select_policy" ON "oauth_sync_states" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_sync_states_insert_policy" ON "oauth_sync_states" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_sync_states_update_policy" ON "oauth_sync_states" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "oauth_sync_states_delete_policy" ON "oauth_sync_states" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_assignments_portal_select_policy" ON "job_assignments" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((
        "job_assignments"."organization_id" = (SELECT current_setting('app.organization_id', true)::uuid)
        OR EXISTS (
          SELECT 1 FROM portal_identities pi
          WHERE pi.auth_user_id = auth.uid()
            AND pi.status = 'active'
            AND pi.organization_id = "job_assignments"."organization_id"
            AND pi.scope = 'customer'
            AND pi.customer_id = "job_assignments"."customer_id"
        )
        OR EXISTS (
          SELECT 1 FROM portal_identities pi
          WHERE pi.auth_user_id = auth.uid()
            AND pi.status = 'active'
            AND pi.organization_id = "job_assignments"."organization_id"
            AND pi.scope = 'subcontractor'
            AND pi.job_assignment_id = "job_assignments"."id"
        )
      ));--> statement-breakpoint
CREATE POLICY "job_materials_select_policy" ON "job_materials" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_materials_insert_policy" ON "job_materials" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_materials_update_policy" ON "job_materials" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_materials_delete_policy" ON "job_materials" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_tasks_select_policy" ON "job_tasks" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_tasks_insert_policy" ON "job_tasks" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_tasks_update_policy" ON "job_tasks" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_tasks_delete_policy" ON "job_tasks" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_templates_select_policy" ON "job_templates" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_templates_insert_policy" ON "job_templates" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_templates_update_policy" ON "job_templates" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_templates_delete_policy" ON "job_templates" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_time_entries_select_policy" ON "job_time_entries" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_time_entries_insert_policy" ON "job_time_entries" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_time_entries_update_policy" ON "job_time_entries" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_time_entries_delete_policy" ON "job_time_entries" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "checklist_templates_select_policy" ON "checklist_templates" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "checklist_templates_insert_policy" ON "checklist_templates" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "checklist_templates_update_policy" ON "checklist_templates" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "checklist_templates_delete_policy" ON "checklist_templates" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_checklist_items_select_policy" ON "job_checklist_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_checklist_items_insert_policy" ON "job_checklist_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_checklist_items_update_policy" ON "job_checklist_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_checklist_items_delete_policy" ON "job_checklist_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_checklists_select_policy" ON "job_checklists" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_checklists_insert_policy" ON "job_checklists" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_checklists_update_policy" ON "job_checklists" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "job_checklists_delete_policy" ON "job_checklists" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "attachments_select_policy" ON "attachments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "attachments_insert_policy" ON "attachments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "attachments_update_policy" ON "attachments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "attachments_delete_policy" ON "attachments" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "sla_configurations_select_policy" ON "sla_configurations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "sla_configurations_insert_policy" ON "sla_configurations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "sla_configurations_update_policy" ON "sla_configurations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "sla_configurations_delete_policy" ON "sla_configurations" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "sla_tracking_select_policy" ON "sla_tracking" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "sla_tracking_insert_policy" ON "sla_tracking" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "sla_tracking_update_policy" ON "sla_tracking" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "sla_tracking_delete_policy" ON "sla_tracking" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "sla_events_select_policy" ON "sla_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "sla_events_insert_policy" ON "sla_events" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "sla_events_update_policy" ON "sla_events" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "sla_events_delete_policy" ON "sla_events" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "issues_select_policy" ON "issues" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "issues_insert_policy" ON "issues" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "issues_update_policy" ON "issues" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "issues_delete_policy" ON "issues" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "escalation_history_select_policy" ON "escalation_history" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "escalation_history_insert_policy" ON "escalation_history" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "escalation_history_update_policy" ON "escalation_history" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "escalation_history_delete_policy" ON "escalation_history" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "escalation_rules_select_policy" ON "escalation_rules" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "escalation_rules_insert_policy" ON "escalation_rules" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "escalation_rules_update_policy" ON "escalation_rules" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "escalation_rules_delete_policy" ON "escalation_rules" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "rma_line_items_select_policy" ON "rma_line_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
        SELECT 1 FROM return_authorizations ra
        WHERE ra.id = rma_id
        AND ra.organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      ));--> statement-breakpoint
CREATE POLICY "rma_line_items_insert_policy" ON "rma_line_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (EXISTS (
        SELECT 1 FROM return_authorizations ra
        WHERE ra.id = rma_id
        AND ra.organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      ));--> statement-breakpoint
CREATE POLICY "rma_line_items_update_policy" ON "rma_line_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (EXISTS (
        SELECT 1 FROM return_authorizations ra
        WHERE ra.id = rma_id
        AND ra.organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM return_authorizations ra
        WHERE ra.id = rma_id
        AND ra.organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      ));--> statement-breakpoint
CREATE POLICY "rma_line_items_delete_policy" ON "rma_line_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (EXISTS (
        SELECT 1 FROM return_authorizations ra
        WHERE ra.id = rma_id
        AND ra.organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      ));--> statement-breakpoint
CREATE POLICY "issue_templates_select_policy" ON "issue_templates" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "issue_templates_insert_policy" ON "issue_templates" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "issue_templates_update_policy" ON "issue_templates" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "issue_templates_delete_policy" ON "issue_templates" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "csat_responses_select_policy" ON "csat_responses" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "csat_responses_insert_policy" ON "csat_responses" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "csat_responses_update_policy" ON "csat_responses" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "csat_responses_delete_policy" ON "csat_responses" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "kb_articles_select_policy" ON "kb_articles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "kb_articles_insert_policy" ON "kb_articles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "kb_articles_update_policy" ON "kb_articles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "kb_articles_delete_policy" ON "kb_articles" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "kb_categories_select_policy" ON "kb_categories" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "kb_categories_insert_policy" ON "kb_categories" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "kb_categories_update_policy" ON "kb_categories" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "kb_categories_delete_policy" ON "kb_categories" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warranties_select_policy" ON "warranties" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warranties_insert_policy" ON "warranties" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warranties_update_policy" ON "warranties" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warranties_delete_policy" ON "warranties" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warranty_claims_select_policy" ON "warranty_claims" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warranty_claims_insert_policy" ON "warranty_claims" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warranty_claims_update_policy" ON "warranty_claims" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warranty_claims_delete_policy" ON "warranty_claims" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warranty_extensions_select_policy" ON "warranty_extensions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warranty_extensions_insert_policy" ON "warranty_extensions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warranty_extensions_update_policy" ON "warranty_extensions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warranty_extensions_delete_policy" ON "warranty_extensions" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warranty_policies_select_policy" ON "warranty_policies" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warranty_policies_insert_policy" ON "warranty_policies" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warranty_policies_update_policy" ON "warranty_policies" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warranty_policies_delete_policy" ON "warranty_policies" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "supplier_price_lists_select_policy" ON "supplier_price_lists" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "supplier_price_lists_insert_policy" ON "supplier_price_lists" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "supplier_price_lists_update_policy" ON "supplier_price_lists" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "supplier_price_lists_delete_policy" ON "supplier_price_lists" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "supplier_performance_metrics_select_policy" ON "supplier_performance_metrics" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "supplier_performance_metrics_insert_policy" ON "supplier_performance_metrics" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "supplier_performance_metrics_update_policy" ON "supplier_performance_metrics" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "supplier_performance_metrics_delete_policy" ON "supplier_performance_metrics" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "suppliers_select_policy" ON "suppliers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "suppliers_insert_policy" ON "suppliers" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "suppliers_update_policy" ON "suppliers" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "suppliers_delete_policy" ON "suppliers" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_orders_select_policy" ON "purchase_orders" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_orders_insert_policy" ON "purchase_orders" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_orders_update_policy" ON "purchase_orders" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_orders_delete_policy" ON "purchase_orders" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_items_select_policy" ON "purchase_order_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_items_insert_policy" ON "purchase_order_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_items_update_policy" ON "purchase_order_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_items_delete_policy" ON "purchase_order_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_approval_rules_select_policy" ON "purchase_order_approval_rules" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_approval_rules_insert_policy" ON "purchase_order_approval_rules" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_approval_rules_update_policy" ON "purchase_order_approval_rules" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_approval_rules_delete_policy" ON "purchase_order_approval_rules" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_approvals_select_policy" ON "purchase_order_approvals" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_approvals_insert_policy" ON "purchase_order_approvals" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_approvals_update_policy" ON "purchase_order_approvals" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_approvals_delete_policy" ON "purchase_order_approvals" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_receipt_items_select_policy" ON "purchase_order_receipt_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_receipt_items_insert_policy" ON "purchase_order_receipt_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_receipt_items_update_policy" ON "purchase_order_receipt_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_receipt_items_delete_policy" ON "purchase_order_receipt_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_receipts_select_policy" ON "purchase_order_receipts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_receipts_insert_policy" ON "purchase_order_receipts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_receipts_update_policy" ON "purchase_order_receipts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_receipts_delete_policy" ON "purchase_order_receipts" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_amendments_select_policy" ON "purchase_order_amendments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_amendments_insert_policy" ON "purchase_order_amendments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_amendments_update_policy" ON "purchase_order_amendments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_amendments_delete_policy" ON "purchase_order_amendments" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_costs_select_policy" ON "purchase_order_costs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_costs_insert_policy" ON "purchase_order_costs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_costs_update_policy" ON "purchase_order_costs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "purchase_order_costs_delete_policy" ON "purchase_order_costs" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "supplier_price_history_select_policy" ON "supplier_price_history" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "supplier_price_history_insert_policy" ON "supplier_price_history" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "supplier_price_history_update_policy" ON "supplier_price_history" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "supplier_price_history_delete_policy" ON "supplier_price_history" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "price_agreements_select_policy" ON "price_agreements" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "price_agreements_insert_policy" ON "price_agreements" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "price_agreements_update_policy" ON "price_agreements" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "price_agreements_delete_policy" ON "price_agreements" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "price_change_history_select_policy" ON "price_change_history" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "price_change_history_insert_policy" ON "price_change_history" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "price_change_history_update_policy" ON "price_change_history" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "price_change_history_delete_policy" ON "price_change_history" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "search_index_select_policy" ON "search_index" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "search_index_insert_policy" ON "search_index" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "search_index_update_policy" ON "search_index" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "search_index_delete_policy" ON "search_index" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "recent_items_select_policy" ON "recent_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (
        organization_id = (
          SELECT organization_id FROM users WHERE auth_id = auth.uid()
        )
        AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      );--> statement-breakpoint
CREATE POLICY "recent_items_insert_policy" ON "recent_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
        organization_id = (
          SELECT organization_id FROM users WHERE auth_id = auth.uid()
        )
        AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      );--> statement-breakpoint
CREATE POLICY "recent_items_update_policy" ON "recent_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (
        organization_id = (
          SELECT organization_id FROM users WHERE auth_id = auth.uid()
        )
        AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      ) WITH CHECK (
        organization_id = (
          SELECT organization_id FROM users WHERE auth_id = auth.uid()
        )
        AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      );--> statement-breakpoint
CREATE POLICY "recent_items_delete_policy" ON "recent_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (
        organization_id = (
          SELECT organization_id FROM users WHERE auth_id = auth.uid()
        )
        AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      );--> statement-breakpoint
CREATE POLICY "search_outbox_select_policy" ON "search_index_outbox" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "search_outbox_insert_policy" ON "search_index_outbox" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "search_outbox_update_policy" ON "search_index_outbox" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "search_outbox_delete_policy" ON "search_index_outbox" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "custom_reports_select_policy" ON "custom_reports" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "custom_reports_insert_policy" ON "custom_reports" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "custom_reports_update_policy" ON "custom_reports" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "custom_reports_delete_policy" ON "custom_reports" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "report_favorites_select_policy" ON "report_favorites" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "report_favorites_insert_policy" ON "report_favorites" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "report_favorites_update_policy" ON "report_favorites" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "report_favorites_delete_policy" ON "report_favorites" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "targets_select_policy" ON "targets" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "targets_insert_policy" ON "targets" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "targets_update_policy" ON "targets" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "targets_delete_policy" ON "targets" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "scheduled_reports_select_policy" ON "scheduled_reports" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "scheduled_reports_insert_policy" ON "scheduled_reports" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "scheduled_reports_update_policy" ON "scheduled_reports" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "scheduled_reports_delete_policy" ON "scheduled_reports" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "dashboard_layouts_select_policy" ON "dashboard_layouts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "dashboard_layouts_insert_policy" ON "dashboard_layouts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "dashboard_layouts_update_policy" ON "dashboard_layouts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "dashboard_layouts_delete_policy" ON "dashboard_layouts" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "portal_sessions_select_policy" ON "customer_portal_sessions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "portal_sessions_insert_policy" ON "customer_portal_sessions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "portal_sessions_update_policy" ON "customer_portal_sessions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "portal_sessions_delete_policy" ON "customer_portal_sessions" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "portal_identities_select_policy" ON "portal_identities" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid) OR auth_user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "portal_identities_insert_policy" ON "portal_identities" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "portal_identities_update_policy" ON "portal_identities" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "portal_identities_delete_policy" ON "portal_identities" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "ai_conversations_select_policy" ON "ai_conversations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "ai_conversations_insert_policy" ON "ai_conversations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "ai_conversations_update_policy" ON "ai_conversations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "ai_conversations_delete_policy" ON "ai_conversations" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "ai_conversation_messages_select_policy" ON "ai_conversation_messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
        SELECT 1 FROM ai_conversations c
        WHERE c.id = conversation_id
        AND c.organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      ));--> statement-breakpoint
CREATE POLICY "ai_conversation_messages_insert_policy" ON "ai_conversation_messages" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (EXISTS (
        SELECT 1 FROM ai_conversations c
        WHERE c.id = conversation_id
        AND c.organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      ));--> statement-breakpoint
CREATE POLICY "ai_conversation_messages_delete_policy" ON "ai_conversation_messages" AS PERMISSIVE FOR DELETE TO "authenticated" USING (EXISTS (
        SELECT 1 FROM ai_conversations c
        WHERE c.id = conversation_id
        AND c.organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      ));--> statement-breakpoint
CREATE POLICY "ai_approvals_select_policy" ON "ai_approvals" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "ai_approvals_insert_policy" ON "ai_approvals" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "ai_approvals_update_policy" ON "ai_approvals" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "ai_approvals_delete_policy" ON "ai_approvals" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "ai_approval_entities_select_policy" ON "ai_approval_entities" AS PERMISSIVE FOR SELECT TO "authenticated" USING (approval_id IN (
        SELECT id FROM ai_approvals
        WHERE organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      ));--> statement-breakpoint
CREATE POLICY "ai_approval_entities_insert_policy" ON "ai_approval_entities" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (approval_id IN (
        SELECT id FROM ai_approvals
        WHERE organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      ));--> statement-breakpoint
CREATE POLICY "ai_approval_entities_delete_policy" ON "ai_approval_entities" AS PERMISSIVE FOR DELETE TO "authenticated" USING (approval_id IN (
        SELECT id FROM ai_approvals
        WHERE organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      ));--> statement-breakpoint
CREATE POLICY "ai_agent_tasks_select_policy" ON "ai_agent_tasks" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "ai_agent_tasks_insert_policy" ON "ai_agent_tasks" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "ai_agent_tasks_update_policy" ON "ai_agent_tasks" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "ai_agent_tasks_delete_policy" ON "ai_agent_tasks" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "ai_cost_tracking_select_policy" ON "ai_cost_tracking" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "ai_cost_tracking_insert_policy" ON "ai_cost_tracking" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "ai_cost_tracking_delete_policy" ON "ai_cost_tracking" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "generated_documents_select_policy" ON "generated_documents" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "generated_documents_insert_policy" ON "generated_documents" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "generated_documents_update_policy" ON "generated_documents" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "generated_documents_delete_policy" ON "generated_documents" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "document_templates_select_policy" ON "document_templates" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "document_templates_insert_policy" ON "document_templates" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "document_templates_update_policy" ON "document_templates" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "document_templates_delete_policy" ON "document_templates" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));