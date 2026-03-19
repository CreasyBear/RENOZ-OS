ALTER TABLE "orders" ADD COLUMN "client_request_id" text;

CREATE UNIQUE INDEX "idx_orders_client_request_org_unique"
  ON "orders" ("organization_id", "client_request_id")
  WHERE "deleted_at" IS NULL AND "client_request_id" IS NOT NULL;
