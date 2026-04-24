ALTER TABLE "issues" ADD COLUMN "warranty_id" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "warranty_entitlement_id" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "order_id" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "shipment_id" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "product_id" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "serialized_item_id" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "service_system_id" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "serial_number" text;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_warranty_id_warranties_id_fk" FOREIGN KEY ("warranty_id") REFERENCES "public"."warranties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_warranty_entitlement_id_warranty_entitlements_id_fk" FOREIGN KEY ("warranty_entitlement_id") REFERENCES "public"."warranty_entitlements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_shipment_id_order_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."order_shipments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_serialized_item_id_serialized_items_id_fk" FOREIGN KEY ("serialized_item_id") REFERENCES "public"."serialized_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_issues_warranty" ON "issues" USING btree ("warranty_id");--> statement-breakpoint
CREATE INDEX "idx_issues_warranty_entitlement" ON "issues" USING btree ("warranty_entitlement_id");--> statement-breakpoint
CREATE INDEX "idx_issues_order" ON "issues" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_issues_shipment" ON "issues" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "idx_issues_product" ON "issues" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_issues_serialized_item" ON "issues" USING btree ("serialized_item_id");--> statement-breakpoint
CREATE INDEX "idx_issues_service_system" ON "issues" USING btree ("service_system_id");--> statement-breakpoint
CREATE INDEX "idx_issues_serial_number" ON "issues" USING btree ("serial_number");
