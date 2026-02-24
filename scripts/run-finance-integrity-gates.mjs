/* global process, console */
import 'dotenv/config';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const db = postgres(process.env.DATABASE_URL, { ssl: 'require' });

const hardGateColumns = [
  'stock_without_active_layers',
  'rows_value_mismatch',
  'layer_negative_or_overconsumed',
  'duplicate_active_serialized_allocations',
  'shipment_link_not_shipped_or_returned',
];

const query = `
WITH layer_totals AS (
  SELECT
    inventory_id,
    COALESCE(SUM(CASE WHEN quantity_remaining > 0 THEN quantity_remaining ELSE 0 END), 0) AS active_qty,
    COALESCE(SUM(CASE WHEN quantity_remaining > 0 THEN quantity_remaining * unit_cost ELSE 0 END), 0)::numeric AS active_value
  FROM inventory_cost_layers
  GROUP BY inventory_id
),
stock_without_layers AS (
  SELECT COUNT(*)::int AS stock_without_active_layers
  FROM inventory i
  LEFT JOIN layer_totals lt ON lt.inventory_id = i.id
  WHERE i.quantity_on_hand > 0
    AND COALESCE(lt.active_qty, 0) = 0
),
value_mismatch AS (
  SELECT
    COUNT(*)::int AS rows_value_mismatch,
    COALESCE(SUM(ABS(COALESCE(i.total_value, 0) - COALESCE(lt.active_value, 0))), 0)::numeric AS total_abs_value_drift
  FROM inventory i
  LEFT JOIN layer_totals lt ON lt.inventory_id = i.id
  WHERE ABS(COALESCE(i.total_value, 0) - COALESCE(lt.active_value, 0)) > 0.01
),
layer_bounds AS (
  SELECT COUNT(*)::int AS layer_negative_or_overconsumed
  FROM inventory_cost_layers
  WHERE quantity_remaining < 0
     OR quantity_remaining > quantity_received
),
dup_alloc AS (
  SELECT COUNT(*)::int AS duplicate_active_serialized_allocations
  FROM (
    SELECT serialized_item_id
    FROM order_line_serial_allocations
    WHERE is_active = true
      AND released_at IS NULL
    GROUP BY serialized_item_id
    HAVING COUNT(*) > 1
  ) dup
),
shipment_mismatch AS (
  SELECT COUNT(*)::int AS shipment_link_not_shipped_or_returned
  FROM shipment_item_serials sis
  JOIN serialized_items si ON si.id = sis.serialized_item_id
  WHERE si.status NOT IN ('shipped', 'returned')
)
SELECT
  stock_without_layers.stock_without_active_layers,
  value_mismatch.rows_value_mismatch,
  value_mismatch.total_abs_value_drift,
  layer_bounds.layer_negative_or_overconsumed,
  dup_alloc.duplicate_active_serialized_allocations,
  shipment_mismatch.shipment_link_not_shipped_or_returned
FROM stock_without_layers, value_mismatch, layer_bounds, dup_alloc, shipment_mismatch;
`;

try {
  const rows = await db.unsafe(query);
  const row = rows[0];
  if (!row) {
    console.error('Finance invariant query returned no rows.');
    process.exit(1);
  }

  const payload = {
    gateName: 'finance-integrity',
    generatedAt: new Date().toISOString(),
    hardGates: Object.fromEntries(hardGateColumns.map((column) => [column, Number(row[column] ?? 0)])),
    metrics: {
      ...Object.fromEntries(hardGateColumns.map((column) => [column, Number(row[column] ?? 0)])),
      total_abs_value_drift: Number(row.total_abs_value_drift ?? 0),
    },
  };

  console.log(JSON.stringify(payload, null, 2));
  const failing = hardGateColumns.filter((column) => Number(row[column] ?? 0) > 0);
  if (failing.length > 0) {
    console.error(`Finance do-not-ship gates failed: ${failing.join(', ')}`);
    process.exit(2);
  }

  console.log('Finance integrity hard gates: PASS');
} finally {
  await db.end({ timeout: 5 });
}

