import { readFileSync } from 'fs';
import { join } from 'path';
import { pgClient } from '@/lib/db';

const POLICY_NAMES = [
  'orders_portal_select_policy',
  'order_line_items_portal_select_policy',
  'job_assignments_portal_select_policy',
  'quotes_portal_select_policy',
  'quote_versions_portal_select_policy',
];

async function main() {
  const sqlPath = join(process.cwd(), 'tests/unit/rls/portal/portal-rls.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  const rows = (await pgClient.unsafe(sql)) as Array<{ policyname: string }>;
  const found = new Set(rows.map((row) => row.policyname));

  const missing = POLICY_NAMES.filter((name) => !found.has(name));
  if (missing.length > 0) {
    throw new Error(`Missing portal RLS policies: ${missing.join(', ')}`);
  }

  console.log('Portal RLS policies verified.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
