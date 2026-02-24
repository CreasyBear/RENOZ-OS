-- Serialized lineage backfill: create missing shipment records for legacy shipped orders
--
-- Purpose: Orders that have qty_shipped > 0 and allocated_serial_numbers but NO
-- order_shipments/shipment_items/shipment_item_serials (legacy status update path).
-- This script creates synthetic shipment records so RMA validation passes.
--
-- Run: After serialized-lineage-backfill.sql (or standalone if Steps 1–2 already run).
-- Idempotent: safe to run multiple times.
--
-- DRY_RUN: Set v_dry_run := true in Step 2b DO block to simulate only (no inserts).
--
-- Premortem: docs/reliability/PREMORTEM_BACKFILL_MISSING_SHIPMENTS.md
--
-- COST LAYERS: This script does NOT consume cost layers or touch inventory.
-- Step 2b-pre runs a consistency check and RAISE NOTICE for serials that still
-- have qty_on_hand > 0 or cost layers remaining (inventory may not have been
-- consumed by legacy flow). Review before running.

-- =============================================================================
-- Step 2a: Ensure serialized_items exist for allocated serials on shipped lines
-- (Serials may exist only in allocated_serial_numbers, not in inventory)
-- Skips line items with product_id NULL (cannot create serialized_items)
-- =============================================================================

INSERT INTO serialized_items (
  organization_id,
  product_id,
  serial_number_raw,
  serial_number_normalized,
  status,
  created_at,
  updated_at
)
SELECT
  oli.organization_id,
  oli.product_id,
  sn.value,
  UPPER(TRIM(sn.value)),
  'available',
  now(),
  now()
FROM order_line_items oli
JOIN LATERAL jsonb_array_elements_text(
  CASE
    WHEN jsonb_typeof(oli.allocated_serial_numbers) = 'array' THEN oli.allocated_serial_numbers
    ELSE '[]'::jsonb
  END
) sn(value) ON TRUE
WHERE oli.qty_shipped > 0
  AND oli.allocated_serial_numbers IS NOT NULL
  AND jsonb_array_length(oli.allocated_serial_numbers) > 0
  AND oli.product_id IS NOT NULL
  AND TRIM(sn.value) <> ''
ON CONFLICT (organization_id, serial_number_normalized) DO UPDATE
SET
  product_id = EXCLUDED.product_id,
  updated_at = now();

-- =============================================================================
-- Step 2b-pre: Cost layer / inventory consistency check (report only)
-- Serials that still have qty_on_hand > 0 or cost layers remaining may indicate
-- inventory was never consumed by legacy flow. We do NOT consume cost layers.
-- =============================================================================

DO $$
DECLARE
  r RECORD;
  v_shipment_id uuid;
  v_shipment_number text;
  v_shipped_at timestamptz;
  v_delivered_at timestamptz;
  v_status text;
  v_order_count int := 0;
  v_serial_count int;
  v_expected_serial_count int;
  v_orphan_count int;
  v_inv_inconsistent int;
  v_dry_run boolean := false; -- SET TO false FOR REAL RUN
  v_lock_key bigint := 9876543210123456; -- arbitrary lock key for this backfill
BEGIN
  -- Advisory lock: block concurrent runs (released when transaction ends)
  IF NOT pg_try_advisory_xact_lock(v_lock_key) THEN
    RAISE EXCEPTION 'Backfill already running (advisory lock held). Aborting.';
  END IF;

  FOR r IN
    SELECT
      o.id AS order_id,
      o.organization_id,
      o.order_number,
      o.status AS order_status,
      o.shipped_date,
      o.delivered_date,
      o.shipping_address,
      o.updated_at AS order_updated_at
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
    ORDER BY o.order_number
  LOOP
    -- Skip if order already has any shipment (idempotency)
    IF EXISTS (SELECT 1 FROM order_shipments WHERE order_id = r.order_id) THEN
      CONTINUE;
    END IF;

    v_shipment_number := r.order_number || '-S01';
    -- shipped_date/delivered_date are date type; cast to timestamptz at noon UTC
    v_shipped_at := COALESCE(
      (r.shipped_date::text || ' 12:00:00+00')::timestamptz,
      r.order_updated_at,
      now()
    );
    v_delivered_at := CASE
      WHEN r.order_status IN ('delivered') AND r.delivered_date IS NOT NULL
        THEN (r.delivered_date::text || ' 12:00:00+00')::timestamptz
      WHEN r.order_status IN ('delivered') THEN v_shipped_at
      ELSE NULL
    END;
    v_status := CASE
      WHEN r.order_status IN ('delivered') THEN 'delivered'
      ELSE 'in_transit'
    END;

    -- Cost layer / inventory consistency check: count serials still in inventory
    SELECT COUNT(*)::int INTO v_inv_inconsistent
    FROM order_line_items oli
    JOIN LATERAL jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(oli.allocated_serial_numbers) = 'array' THEN oli.allocated_serial_numbers ELSE '[]'::jsonb END
    ) sn(value) ON TRUE
    JOIN inventory i ON i.organization_id = r.organization_id
      AND UPPER(TRIM(i.serial_number)) = UPPER(TRIM(sn.value))
    WHERE oli.order_id = r.order_id
      AND oli.qty_shipped > 0
      AND oli.product_id IS NOT NULL
      AND TRIM(sn.value) <> ''
      AND (i.quantity_on_hand > 0 OR EXISTS (
        SELECT 1 FROM inventory_cost_layers icl
        WHERE icl.inventory_id = i.id AND icl.quantity_remaining > 0
      ));
    IF v_inv_inconsistent > 0 THEN
      RAISE NOTICE '[COST LAYER CHECK] Order %: % serial(s) still have qty_on_hand>0 or cost layers remaining (inventory not consumed). Backfill does NOT touch cost layers.',
        r.order_number, v_inv_inconsistent;
    END IF;

    IF v_dry_run THEN
      -- Dry run: report only
      SELECT
        COALESCE(SUM(jsonb_array_length(oli.allocated_serial_numbers)), 0)::int,
        COUNT(DISTINCT sn.value) FILTER (WHERE szi.id IS NOT NULL),
        COUNT(DISTINCT sn.value) FILTER (WHERE szi.id IS NULL AND TRIM(sn.value) <> '')
      INTO v_expected_serial_count, v_serial_count, v_orphan_count
      FROM order_line_items oli
      JOIN LATERAL jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(oli.allocated_serial_numbers) = 'array' THEN oli.allocated_serial_numbers ELSE '[]'::jsonb END
      ) sn(value) ON TRUE
      LEFT JOIN serialized_items szi
        ON szi.organization_id = r.organization_id AND szi.serial_number_normalized = UPPER(TRIM(sn.value))
      WHERE oli.order_id = r.order_id
        AND oli.qty_shipped > 0
        AND oli.allocated_serial_numbers IS NOT NULL
        AND oli.product_id IS NOT NULL;

      RAISE NOTICE '[DRY RUN] Order %: would create 1 shipment, % line items, % shipment_item_serials (expected %). Orphan serials (no serialized_items): %',
        r.order_number,
        (SELECT COUNT(*) FROM order_line_items WHERE order_id = r.order_id AND qty_shipped > 0 AND allocated_serial_numbers IS NOT NULL AND product_id IS NOT NULL),
        COALESCE(v_serial_count, 0),
        COALESCE(v_expected_serial_count, 0),
        COALESCE(v_orphan_count, 0);
      v_order_count := v_order_count + 1;
      CONTINUE;
    END IF;

    -- Insert order_shipments (copy shipping_address from order, use delivered_date when delivered)
    INSERT INTO order_shipments (
      organization_id,
      order_id,
      shipment_number,
      status,
      carrier,
      shipped_at,
      delivered_at,
      shipping_address,
      tracking_events,
      notes,
      created_at,
      updated_at
    )
    VALUES (
      r.organization_id,
      r.order_id,
      v_shipment_number,
      v_status::shipment_status,
      'legacy_backfill',
      v_shipped_at,
      v_delivered_at,
      r.shipping_address,
      jsonb_build_array(
        jsonb_build_object(
          'timestamp', to_char(v_shipped_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'status', 'Legacy backfill',
          'description', 'No tracking data - order shipped before shipment tracking'
        )
      ),
      'Backfilled: order shipped before shipment tracking (serialized-lineage-backfill-missing-shipments.sql)',
      now(),
      now()
    )
    RETURNING id INTO v_shipment_id;

    v_order_count := v_order_count + 1;

    -- Insert shipment_items for each shipped line item (product_id NOT NULL only)
    INSERT INTO shipment_items (
      organization_id,
      shipment_id,
      order_line_item_id,
      quantity,
      serial_numbers,
      created_at,
      updated_at
    )
    SELECT
      oli.organization_id,
      v_shipment_id,
      oli.id,
      oli.qty_shipped,
      oli.allocated_serial_numbers,
      now(),
      now()
    FROM order_line_items oli
    WHERE oli.order_id = r.order_id
      AND oli.qty_shipped > 0
      AND oli.allocated_serial_numbers IS NOT NULL
      AND jsonb_array_length(oli.allocated_serial_numbers) > 0
      AND oli.product_id IS NOT NULL;

    -- Insert shipment_item_serials for each (shipment_item, serial) pair.
    -- Only serials that exist in serialized_items are linked (inner join).
    INSERT INTO shipment_item_serials (
      organization_id,
      shipment_item_id,
      serialized_item_id,
      shipped_at,
      created_at,
      updated_at
    )
    SELECT
      r.organization_id,
      si.id,
      szi.id,
      v_shipped_at,
      now(),
      now()
    FROM shipment_items si
    JOIN order_line_items oli ON oli.id = si.order_line_item_id
    JOIN LATERAL jsonb_array_elements_text(
      CASE
        WHEN jsonb_typeof(oli.allocated_serial_numbers) = 'array' THEN oli.allocated_serial_numbers
        ELSE '[]'::jsonb
      END
    ) sn(value) ON TRUE
    JOIN serialized_items szi
      ON szi.organization_id = r.organization_id
     AND szi.serial_number_normalized = UPPER(TRIM(sn.value))
    WHERE si.shipment_id = v_shipment_id
      AND TRIM(sn.value) <> ''
    ON CONFLICT (shipment_item_id, serialized_item_id) DO NOTHING;

    GET DIAGNOSTICS v_serial_count = ROW_COUNT;
    -- Warn if qty_shipped suggests more serials than we linked
    SELECT COALESCE(SUM(jsonb_array_length(oli.allocated_serial_numbers)), 0)::int INTO v_expected_serial_count
    FROM order_line_items oli
    WHERE oli.order_id = r.order_id AND oli.qty_shipped > 0 AND oli.product_id IS NOT NULL
      AND oli.allocated_serial_numbers IS NOT NULL;
    IF v_expected_serial_count > 0 AND v_serial_count < v_expected_serial_count THEN
      RAISE NOTICE 'Order %: linked % of % expected serials (check for orphan serials in serialized_items)',
        r.order_number, v_serial_count, v_expected_serial_count;
    END IF;

  END LOOP;

  RAISE NOTICE 'Backfill complete: % orders processed', v_order_count;
END $$;

-- =============================================================================
-- Step 2c: Normalize serialized_items.status for newly linked shipment serials
-- (Mirrors main backfill Step 4; ensures status = shipped after shipment_item_serials exists)
-- =============================================================================

DO $$
DECLARE
  v_dry_run boolean := false; -- MUST MATCH Step 2b: SET TO false FOR REAL RUN
BEGIN
  IF NOT v_dry_run THEN
    UPDATE serialized_items si
    SET status = 'shipped'::serialized_item_status,
        updated_at = now()
    WHERE EXISTS (
      SELECT 1
      FROM shipment_item_serials sis
      WHERE sis.organization_id = si.organization_id
        AND sis.serialized_item_id = si.id
    )
      AND si.status <> 'shipped';
  END IF;
END $$;

-- =============================================================================
-- Verification query (run manually after script)
-- =============================================================================
-- SELECT o.order_number, COUNT(sis.id) AS shipment_serial_count
-- FROM orders o
-- JOIN order_shipments os ON os.order_id = o.id
-- JOIN shipment_items si ON si.shipment_id = os.id
-- JOIN shipment_item_serials sis ON sis.shipment_item_id = si.id
-- WHERE os.notes LIKE '%Backfilled%'
-- GROUP BY o.order_number
-- ORDER BY o.order_number;
