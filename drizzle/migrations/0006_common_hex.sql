CREATE TABLE "warranty_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"warranty_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_serial" varchar(255),
	"inventory_id" uuid,
	"warranty_start_date" date NOT NULL,
	"warranty_end_date" date NOT NULL,
	"warranty_period_months" integer NOT NULL,
	"installation_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "warranty_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "warranties" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "warranty_items" ADD CONSTRAINT "warranty_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_items" ADD CONSTRAINT "warranty_items_warranty_id_warranties_id_fk" FOREIGN KEY ("warranty_id") REFERENCES "public"."warranties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_items" ADD CONSTRAINT "warranty_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_items" ADD CONSTRAINT "warranty_items_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_warranty_items_org_warranty" ON "warranty_items" USING btree ("organization_id","warranty_id");--> statement-breakpoint
CREATE INDEX "idx_warranty_items_org_product" ON "warranty_items" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_warranty_items_org_serial" ON "warranty_items" USING btree ("organization_id","product_serial");--> statement-breakpoint
CREATE INDEX "idx_warranty_items_warranty" ON "warranty_items" USING btree ("warranty_id");--> statement-breakpoint
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "warranty_items_select_policy" ON "warranty_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warranty_items_insert_policy" ON "warranty_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warranty_items_update_policy" ON "warranty_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid)) WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "warranty_items_delete_policy" ON "warranty_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));