ALTER TYPE "public"."cost_layer_reference_type" ADD VALUE 'rma';--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "exchange_rate" numeric(12, 6);--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "exchange_date" date;