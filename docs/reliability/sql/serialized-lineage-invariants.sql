-- Serialized lineage release-gate invariants (read-only).
-- Use this as a hard "do-not-ship" gate before and after production rollout.
--
-- Non-DB gates are validated separately in UI/UAT:
-- - URL-intent no-op flows
-- - destructive mutation double-fire paths

SELECT
  -- Schema / constraint presence
  to_regclass('public.serialized_items') IS NOT NULL AS has_serialized_items,
  to_regclass('public.serialized_item_events') IS NOT NULL AS has_serialized_item_events,
  to_regclass('public.order_line_serial_allocations') IS NOT NULL AS has_order_line_serial_allocations,
  to_regclass('public.shipment_item_serials') IS NOT NULL AS has_shipment_item_serials,
  EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inventory_serial_single_unit'
  ) AS has_inventory_serial_single_unit,

  -- Operational volume context
  (SELECT count(*)::int FROM serialized_items) AS serialized_items_count,
  (SELECT count(*)::int FROM serialized_item_events) AS serialized_item_events_count,
  (SELECT count(*)::int FROM order_line_serial_allocations WHERE is_active = TRUE) AS active_allocations_count,
  (SELECT count(*)::int FROM shipment_item_serials) AS shipment_serial_links_count,

  -- Do-not-ship gates
  (SELECT count(*)::int
   FROM (
     SELECT organization_id, serialized_item_id, count(*) AS c
     FROM order_line_serial_allocations
     WHERE is_active = TRUE
     GROUP BY 1, 2
     HAVING count(*) > 1
   ) t
  ) AS duplicate_active_allocations,
  (SELECT count(*)::int
   FROM inventory
   WHERE serial_number IS NOT NULL
     AND (
       quantity_on_hand < 0 OR quantity_on_hand > 1
       OR quantity_allocated < 0 OR quantity_allocated > 1
     )
  ) AS invalid_serial_inventory_rows,
  (SELECT count(*)::int
   FROM order_line_serial_allocations a
   LEFT JOIN serialized_items si ON si.id = a.serialized_item_id
   WHERE si.id IS NULL
  ) AS orphan_allocations,
  (SELECT count(*)::int
   FROM shipment_item_serials sis
   LEFT JOIN serialized_items si ON si.id = sis.serialized_item_id
   WHERE si.id IS NULL
  ) AS orphan_shipment_serials,
  (SELECT count(*)::int
   FROM serialized_items si
   LEFT JOIN inventory i ON i.id = si.current_inventory_id
   WHERE si.current_inventory_id IS NOT NULL
     AND i.id IS NULL
  ) AS orphan_current_inventory_refs,
  (SELECT count(*)::int
   FROM order_line_serial_allocations a
   JOIN serialized_items si ON si.id = a.serialized_item_id
   WHERE a.is_active = TRUE
     AND si.status <> 'allocated'
  ) AS active_alloc_not_allocated_status,
  (SELECT count(*)::int
   FROM shipment_item_serials sis
   JOIN serialized_items si ON si.id = sis.serialized_item_id
   WHERE si.status NOT IN ('shipped', 'returned')
  ) AS shipped_link_not_shipped_status,

  -- Event continuity metrics (non-blocking but should trend to zero)
  (SELECT count(*)::int
   FROM order_line_serial_allocations a
   WHERE a.is_active = TRUE
     AND NOT EXISTS (
       SELECT 1
       FROM serialized_item_events sie
       WHERE sie.organization_id = a.organization_id
         AND sie.serialized_item_id = a.serialized_item_id
         AND sie.event_type = 'allocated'::serialized_item_event_type
     )
  ) AS allocations_missing_allocated_event,
  (SELECT count(*)::int
   FROM serialized_items si
   WHERE si.source_receipt_item_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM serialized_item_events sie
       WHERE sie.organization_id = si.organization_id
         AND sie.serialized_item_id = si.id
         AND sie.event_type = 'received'::serialized_item_event_type
     )
  ) AS receipt_link_missing_received_event,
  (SELECT count(*)::int
   FROM shipment_item_serials sis
   WHERE NOT EXISTS (
     SELECT 1
     FROM serialized_item_events sie
     WHERE sie.organization_id = sis.organization_id
       AND sie.serialized_item_id = sis.serialized_item_id
       AND sie.event_type = 'shipped'::serialized_item_event_type
   )
  ) AS shipment_link_missing_shipped_event;
