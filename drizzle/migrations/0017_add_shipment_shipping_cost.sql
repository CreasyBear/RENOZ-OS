-- ============================================================================
-- Migration: Add shipping_cost to order_shipments
-- ============================================================================
-- Tracks the actual shipping cost charged by the carrier at shipment time.
-- Stored in cents (integer) to match currency column patterns.
-- Nullable because cost may not be known when shipment is first created.
-- ============================================================================

-- Add shipping_cost column to order_shipments table
ALTER TABLE order_shipments
ADD COLUMN IF NOT EXISTS shipping_cost INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN order_shipments.shipping_cost IS 'Actual shipping cost in cents, charged by carrier. Nullable until shipment is finalized.';
