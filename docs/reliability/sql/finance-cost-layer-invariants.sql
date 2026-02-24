-- Finance Integrity Invariants (Inventory Cost Layers / COGS)
-- Run read-only during cutover and post-deploy validation.

-- 1) Inventory rows with on-hand stock but no active cost layers
WITH layer_totals AS (
  SELECT
    inventory_id,
    COALESCE(SUM(CASE WHEN quantity_remaining > 0 THEN quantity_remaining ELSE 0 END), 0) AS active_qty
  FROM inventory_cost_layers
  GROUP BY inventory_id
)
SELECT COUNT(*)::int AS stock_without_active_layers
FROM inventory i
LEFT JOIN layer_totals lt ON lt.inventory_id = i.id
WHERE i.quantity_on_hand > 0
  AND COALESCE(lt.active_qty, 0) = 0;

-- 2) inventory.total_value mismatches active cost-layer value
WITH layer_totals AS (
  SELECT
    inventory_id,
    COALESCE(SUM(CASE WHEN quantity_remaining > 0 THEN quantity_remaining * unit_cost ELSE 0 END), 0)::numeric AS layer_value
  FROM inventory_cost_layers
  GROUP BY inventory_id
)
SELECT
  COUNT(*)::int AS rows_value_mismatch,
  COALESCE(SUM(ABS(COALESCE(i.total_value, 0) - COALESCE(lt.layer_value, 0))), 0)::numeric AS total_abs_value_drift
FROM inventory i
LEFT JOIN layer_totals lt ON lt.inventory_id = i.id
WHERE ABS(COALESCE(i.total_value, 0) - COALESCE(lt.layer_value, 0)) > 0.01;

-- 3) Invalid layer bounds
SELECT COUNT(*)::int AS layer_negative_or_overconsumed
FROM inventory_cost_layers
WHERE quantity_remaining < 0
   OR quantity_remaining > quantity_received;

-- 4) Duplicate active serialized allocations
SELECT COUNT(*)::int AS duplicate_active_serialized_allocations
FROM (
  SELECT serialized_item_id
  FROM order_line_serial_allocations
  WHERE is_active = true
    AND released_at IS NULL
  GROUP BY serialized_item_id
  HAVING COUNT(*) > 1
) dup;

-- 5) Shipment-linked serials not marked shipped/returned
SELECT COUNT(*)::int AS shipment_link_not_shipped_or_returned
FROM shipment_item_serials sis
JOIN serialized_items si ON si.id = sis.serialized_item_id
WHERE si.status NOT IN ('shipped', 'returned');

