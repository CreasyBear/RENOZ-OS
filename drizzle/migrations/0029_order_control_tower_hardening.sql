ALTER TABLE "generated_documents"
ADD COLUMN IF NOT EXISTS "source_revision" integer;--> statement-breakpoint

ALTER TABLE "order_shipments"
ADD COLUMN IF NOT EXISTS "operational_document_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
