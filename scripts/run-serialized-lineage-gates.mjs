/* global process, console */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

function parseArgValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) return fallback;
  return value;
}

const target = parseArgValue('--target', 'website');
const validTargets = new Set(['website', 'crm']);
if (!validTargets.has(target)) {
  console.error(`Invalid --target "${target}". Use "website" or "crm".`);
  process.exit(1);
}

const sqlFile = path.resolve(
  target === 'crm'
    ? 'docs/reliability/sql/serialized-lineage-invariants-renoz-crm.sql'
    : 'docs/reliability/sql/serialized-lineage-invariants.sql'
);
const query = fs.readFileSync(sqlFile, 'utf8');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const db = postgres(process.env.DATABASE_URL, { ssl: 'require' });

const hardGateColumns = [
  'duplicate_active_allocations',
  'shipped_link_not_shipped_status',
  'invalid_serial_inventory_rows',
  'orphan_allocations',
  'orphan_shipment_serials',
  'orphan_current_inventory_refs',
];

const requiredColumns = [
  'has_serialized_items',
  'has_serialized_item_events',
  'has_order_line_serial_allocations',
  'has_shipment_item_serials',
  'has_inventory_serial_single_unit',
  'serialized_items_count',
  'serialized_item_events_count',
  'active_allocations_count',
  'shipment_serial_links_count',
  'duplicate_active_allocations',
  'invalid_serial_inventory_rows',
  'orphan_allocations',
  'orphan_shipment_serials',
  'orphan_current_inventory_refs',
  'active_alloc_not_allocated_status',
  'shipped_link_not_shipped_status',
  'allocations_missing_allocated_event',
  'receipt_link_missing_received_event',
  'shipment_link_missing_shipped_event',
];

try {
  const rows = await db.unsafe(query);
  const row = rows[0];
  if (!row) {
    console.error('Invariant query returned no rows.');
    process.exit(1);
  }

  const missingColumns = requiredColumns.filter((column) => !(column in row));
  if (missingColumns.length > 0) {
    console.error(`Invariant output contract mismatch. Missing columns: ${missingColumns.join(', ')}`);
    process.exit(3);
  }

  const payload = {
    target,
    sqlFile,
    generatedAt: new Date().toISOString(),
    hardGates: Object.fromEntries(hardGateColumns.map((column) => [column, Number(row[column] ?? 0)])),
    metrics: Object.fromEntries(requiredColumns.map((column) => [column, row[column]])),
  };
  console.log(JSON.stringify(payload, null, 2));

  const failing = hardGateColumns.filter((column) => Number(row[column] ?? 0) > 0);
  if (failing.length > 0) {
    console.error(`Do-not-ship gates failed: ${failing.join(', ')}`);
    process.exit(2);
  }

  console.log(`Serialized lineage hard gates (${target}): PASS`);
} finally {
  await db.end({ timeout: 5 });
}
