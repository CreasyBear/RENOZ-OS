-- Migration: Add exchange rate and exchange date to purchase orders
-- Purpose: Support multi-currency POs; required when po.currency !== org.currency for receive-goods
-- Reference: 2026-02-12-business-logic-premortem.md, Business Logic Remediation Plan Phase 2

-- Add exchange_rate: 1 PO currency unit = X org currency units (e.g. 1 USD = 1.5586 AUD)
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "exchange_rate" numeric(12, 6);

-- Add exchange_date: when the rate was applied
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "exchange_date" date;
