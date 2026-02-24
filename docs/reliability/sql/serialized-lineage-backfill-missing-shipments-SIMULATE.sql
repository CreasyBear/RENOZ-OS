-- Simulated backfill: report what would be created (read-only, no inserts)
-- Run this to preview before executing serialized-lineage-backfill-missing-shipments.sql
--
-- Includes cost layer check: serials still in inventory (qty_on_hand>0 or cost layers remaining)
-- indicate legacy flow may not have consumed inventory. Backfill does NOT touch cost layers.

WITH orders_to_backfill AS (
  SELECT
    o.id AS order_id,
    o.organization_id,
    o.order_number,
    o.status AS order_status,
    o.shipped_date
  FROM orders o
  WHERE o.deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM order_line_items oli
      WHERE oli.order_id = o.id
        AND oli.qty_shipped > 0
        AND oli.allocated_serial_numbers IS NOT NULL
        AND jsonb_array_length(oli.allocated_serial_numbers) > 0
        AND oli.product_id IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1
      FROM order_shipments os
      JOIN shipment_items si ON si.shipment_id = os.id
      JOIN shipment_item_serials sis ON sis.shipment_item_id = si.id
      WHERE os.order_id = o.id
    )
),
line_item_stats AS (
  SELECT
    otb.order_id,
    otb.order_number,
    otb.order_status,
    otb.shipped_date,
    oli.id AS line_item_id,
    oli.description,
    oli.product_id,
    oli.qty_shipped,
    jsonb_array_length(oli.allocated_serial_numbers) AS serial_count,
    (SELECT COUNT(*)
     FROM jsonb_array_elements_text(oli.allocated_serial_numbers) AS sn(val)
     JOIN serialized_items szi ON szi.organization_id = otb.organization_id
       AND szi.serial_number_normalized = UPPER(TRIM(sn.val))
    ) AS serials_in_catalog,
    (SELECT COUNT(*)
     FROM jsonb_array_elements_text(oli.allocated_serial_numbers) AS sn(val)
     WHERE NOT EXISTS (
       SELECT 1 FROM serialized_items szi
       WHERE szi.organization_id = otb.organization_id
         AND szi.serial_number_normalized = UPPER(TRIM(sn.val))
     )
     AND TRIM(sn.val) <> ''
    ) AS orphan_serials,
    (SELECT COUNT(*)
     FROM jsonb_array_elements_text(oli.allocated_serial_numbers) AS sn(val)
     JOIN inventory i ON i.organization_id = otb.organization_id
       AND UPPER(TRIM(i.serial_number)) = UPPER(TRIM(sn.val))
     WHERE TRIM(sn.val) <> ''
       AND (i.quantity_on_hand > 0 OR EXISTS (
         SELECT 1 FROM inventory_cost_layers icl
         WHERE icl.inventory_id = i.id AND icl.quantity_remaining > 0
       ))
    ) AS inv_still_has_stock
  FROM orders_to_backfill otb
  JOIN order_line_items oli ON oli.order_id = otb.order_id
  WHERE oli.qty_shipped > 0
    AND oli.allocated_serial_numbers IS NOT NULL
    AND jsonb_array_length(oli.allocated_serial_numbers) > 0
    AND oli.product_id IS NOT NULL
)
SELECT
  order_number,
  order_status,
  shipped_date,
  COUNT(*) AS line_items,
  SUM(serial_count)::int AS total_serials,
  SUM(serials_in_catalog)::int AS serials_will_link,
  SUM(orphan_serials)::int AS orphan_serials,
  SUM(inv_still_has_stock)::int AS inv_still_has_stock,
  CASE
    WHEN SUM(orphan_serials) > 0 THEN 'WARN'
    WHEN SUM(inv_still_has_stock) > 0 THEN 'COST_CHECK'
    ELSE 'OK'
  END AS status
FROM line_item_stats
GROUP BY order_id, order_number, order_status, shipped_date
ORDER BY order_number;
