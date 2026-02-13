-- Migration: Invoice Status System
-- Description: Add invoice tracking fields and status enum to orders table
-- Task: P0.1 Invoice Status System

-- Create the invoice_status enum
DO $$ BEGIN
  CREATE TYPE "invoice_status" AS ENUM (
    'draft',
    'scheduled',
    'unpaid',
    'overdue',
    'paid',
    'canceled',
    'refunded'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add invoice tracking columns to orders table
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "invoice_status" "invoice_status" DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS "invoice_due_date" date,
  ADD COLUMN IF NOT EXISTS "invoice_sent_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "invoice_viewed_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "invoice_reminder_sent_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "invoice_number" text;

-- Add index for querying by invoice status
CREATE INDEX IF NOT EXISTS "idx_orders_org_invoice_status"
  ON "orders" ("organization_id", "invoice_status");
