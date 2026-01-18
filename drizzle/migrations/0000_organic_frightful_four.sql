CREATE TYPE "public"."activity_action" AS ENUM('created', 'updated', 'deleted', 'viewed', 'exported', 'shared', 'assigned', 'commented');--> statement-breakpoint
CREATE TYPE "public"."activity_entity_type" AS ENUM('customer', 'contact', 'order', 'opportunity', 'product', 'inventory', 'supplier', 'warranty', 'issue', 'user');--> statement-breakpoint
CREATE TYPE "public"."address_type" AS ENUM('billing', 'shipping', 'service', 'headquarters');--> statement-breakpoint
CREATE TYPE "public"."api_token_scope" AS ENUM('read', 'write', 'admin');--> statement-breakpoint
CREATE TYPE "public"."customer_size" AS ENUM('micro', 'small', 'medium', 'large', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."customer_status" AS ENUM('prospect', 'active', 'inactive', 'suspended', 'blacklisted');--> statement-breakpoint
CREATE TYPE "public"."customer_type" AS ENUM('individual', 'business', 'government', 'non_profit');--> statement-breakpoint
CREATE TYPE "public"."email_status" AS ENUM('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed');--> statement-breakpoint
CREATE TYPE "public"."empty_state_type" AS ENUM('no_data', 'filtered_empty', 'search_empty', 'permission_denied', 'error');--> statement-breakpoint
CREATE TYPE "public"."inventory_status" AS ENUM('available', 'allocated', 'sold', 'damaged', 'returned', 'quarantined');--> statement-breakpoint
CREATE TYPE "public"."issue_priority" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."issue_status" AS ENUM('open', 'in_progress', 'pending', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('receive', 'allocate', 'deallocate', 'pick', 'ship', 'adjust', 'return', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'read', 'dismissed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('quote', 'order', 'issue', 'warranty', 'shipment', 'payment', 'customer', 'product', 'inventory', 'user', 'system');--> statement-breakpoint
CREATE TYPE "public"."opportunity_stage" AS ENUM('new', 'qualified', 'proposal', 'negotiation', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('draft', 'confirmed', 'picking', 'picked', 'shipped', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'partial', 'paid', 'refunded', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('physical', 'service', 'digital', 'bundle');--> statement-breakpoint
CREATE TYPE "public"."purchase_order_status" AS ENUM('draft', 'sent', 'acknowledged', 'partial', 'received', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."tax_type" AS ENUM('gst', 'gst_free', 'input_taxed', 'export');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('owner', 'admin', 'manager', 'sales', 'operations', 'support', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'invited', 'suspended', 'deactivated');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('staff', 'installer');--> statement-breakpoint
CREATE TYPE "public"."warranty_status" AS ENUM('active', 'expired', 'voided', 'transferred');--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text,
	"email" text,
	"phone" text,
	"mobile" text,
	"job_title" text,
	"is_primary" uuid DEFAULT false,
	"is_decision_maker" uuid DEFAULT false,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"website" text,
	"status" "customer_status" DEFAULT 'prospect' NOT NULL,
	"type" "customer_type" DEFAULT 'individual' NOT NULL,
	"size" "customer_size",
	"abn" text,
	"account_number" text,
	"addresses" jsonb DEFAULT '[]'::jsonb,
	"preferences" jsonb DEFAULT '{}'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"barcode" text,
	"type" "product_type" DEFAULT 'physical' NOT NULL,
	"category" text,
	"subcategory" text,
	"unit_price" numeric(12, 2) DEFAULT 0 NOT NULL,
	"cost_price" numeric(12, 2) DEFAULT 0 NOT NULL,
	"tax_type" "tax_type" DEFAULT 'gst' NOT NULL,
	"pricing" jsonb DEFAULT '{}'::jsonb,
	"dimensions" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_sellable" boolean DEFAULT true NOT NULL,
	"is_purchasable" boolean DEFAULT true NOT NULL,
	"track_inventory" boolean DEFAULT true NOT NULL,
	"reorder_point" numeric(10, 3) DEFAULT 0 NOT NULL,
	"reorder_qty" numeric(10, 3) DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
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
	"qty_picked" numeric(10, 3) DEFAULT 0 NOT NULL,
	"qty_shipped" numeric(10, 3) DEFAULT 0 NOT NULL,
	"qty_delivered" numeric(10, 3) DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"customer_id" uuid NOT NULL,
	"stage" "opportunity_stage" DEFAULT 'new' NOT NULL,
	"probability" numeric(5, 2),
	"estimated_value" numeric(12, 2) DEFAULT 0 NOT NULL,
	"weighted_value" numeric(12, 2) DEFAULT 0 NOT NULL,
	"expected_close_date" date,
	"actual_close_date" date,
	"assigned_to" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
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
CREATE TABLE "inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"status" "inventory_status" DEFAULT 'available' NOT NULL,
	"quantity_on_hand" numeric(10, 3) DEFAULT 0 NOT NULL,
	"quantity_allocated" numeric(10, 3) DEFAULT 0 NOT NULL,
	"quantity_available" numeric(10, 3) DEFAULT 0 NOT NULL,
	"unit_cost" numeric(12, 2) DEFAULT 0 NOT NULL,
	"total_value" numeric(12, 2) DEFAULT 0 NOT NULL,
	"lot_number" text,
	"serial_number" text,
	"expiry_date" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
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
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"address" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"allow_negative" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"abn" text,
	"email" text,
	"phone" text,
	"website" text,
	"address" jsonb DEFAULT '{}'::jsonb,
	"settings" jsonb DEFAULT '{"timezone":"Australia/Sydney","locale":"en-AU","currency":"AUD","dateFormat":"DD/MM/YYYY"}'::jsonb,
	"branding" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"stripe_customer_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_token" text NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_contacts_customer" ON "contacts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_contacts_org_customer" ON "contacts" USING btree ("organization_id","customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_customers_email_org_unique" ON "customers" USING btree ("organization_id","email") WHERE "customers"."email" IS NOT NULL AND "customers"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_customers_account_org_unique" ON "customers" USING btree ("organization_id","account_number") WHERE "customers"."account_number" IS NOT NULL AND "customers"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_customers_org_status" ON "customers" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_customers_org_created" ON "customers" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_customers_name_search" ON "customers" USING gin (to_tsvector('english', "name"));--> statement-breakpoint
CREATE UNIQUE INDEX "idx_products_sku_org_unique" ON "products" USING btree ("organization_id","sku") WHERE "products"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_products_barcode_org_unique" ON "products" USING btree ("organization_id","barcode") WHERE "products"."barcode" IS NOT NULL AND "products"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_products_org_active" ON "products" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_products_org_category" ON "products" USING btree ("organization_id","category");--> statement-breakpoint
CREATE INDEX "idx_products_name_search" ON "products" USING gin (to_tsvector('english', "name"));--> statement-breakpoint
CREATE INDEX "idx_products_sku_search" ON "products" USING gin (to_tsvector('english', "sku"));--> statement-breakpoint
CREATE INDEX "idx_order_items_order" ON "order_line_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_product" ON "order_line_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_org_order" ON "order_line_items" USING btree ("organization_id","order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_orders_number_org_unique" ON "orders" USING btree ("organization_id","order_number") WHERE "orders"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_orders_org_status" ON "orders" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_orders_org_payment" ON "orders" USING btree ("organization_id","payment_status");--> statement-breakpoint
CREATE INDEX "idx_orders_org_customer" ON "orders" USING btree ("organization_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_orders_org_date" ON "orders" USING btree ("organization_id","order_date");--> statement-breakpoint
CREATE INDEX "idx_orders_customer" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_opportunities_org_stage" ON "opportunities" USING btree ("organization_id","stage");--> statement-breakpoint
CREATE INDEX "idx_opportunities_org_customer" ON "opportunities" USING btree ("organization_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_opportunities_org_assigned" ON "opportunities" USING btree ("organization_id","assigned_to");--> statement-breakpoint
CREATE INDEX "idx_opportunities_org_expected_close" ON "opportunities" USING btree ("organization_id","expected_close_date");--> statement-breakpoint
CREATE INDEX "idx_opportunities_customer" ON "opportunities" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_quotes_number_org_unique" ON "quotes" USING btree ("organization_id","quote_number");--> statement-breakpoint
CREATE INDEX "idx_quotes_org_status" ON "quotes" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_quotes_org_customer" ON "quotes" USING btree ("organization_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_quotes_org_opportunity" ON "quotes" USING btree ("organization_id","opportunity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_inventory_product_location_unique" ON "inventory" USING btree ("organization_id","product_id","location_id","lot_number") WHERE "inventory"."lot_number" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_inventory_org_product" ON "inventory" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_org_location" ON "inventory" USING btree ("organization_id","location_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_org_status" ON "inventory" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_inventory_product" ON "inventory" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_location" ON "inventory" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_movements_org_product" ON "inventory_movements" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_movements_org_location" ON "inventory_movements" USING btree ("organization_id","location_id");--> statement-breakpoint
CREATE INDEX "idx_movements_org_type" ON "inventory_movements" USING btree ("organization_id","movement_type");--> statement-breakpoint
CREATE INDEX "idx_movements_org_created" ON "inventory_movements" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_movements_reference" ON "inventory_movements" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_locations_code_org_unique" ON "locations" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "idx_locations_org_active" ON "locations" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_organizations_slug_unique" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_organizations_abn_unique" ON "organizations" USING btree ("abn") WHERE "organizations"."abn" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_organizations_active" ON "organizations" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sessions_token_unique" ON "user_sessions" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "idx_sessions_user" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_auth_id_unique" ON "users" USING btree ("auth_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_email_org_unique" ON "users" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "idx_users_org_role" ON "users" USING btree ("organization_id","role");--> statement-breakpoint
CREATE INDEX "idx_users_org_status" ON "users" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE POLICY "users_select_policy" ON "users" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "users_insert_policy" ON "users" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "users_update_policy" ON "users" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid) WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "users_delete_policy" ON "users" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid);