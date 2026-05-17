import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

const rmaAwarePredicateFiles = [
  'scripts/run-finance-integrity-gates.mjs',
  'src/server/functions/financial/_shared/inventory-finance-integrity-read.ts',
];

const appConsumerFiles = [
  'src/server/functions/financial/_shared/financial-close-readiness.ts',
  'src/server/functions/inventory/finance-integrity-summary.ts',
];

const inventoryValuationEntrypointFiles = [
  'src/server/functions/inventory/valuation.ts',
];

describe('finance integrity shipment-link RMA contract', () => {
  it('does not block close readiness for historical shipment links superseded by RMA receipt', () => {
    for (const file of rmaAwarePredicateFiles) {
      const source = read(file);

      expect(source, `${file} should keep the shipment-link hard gate`).toContain(
        'shipment_mismatch'
      );
      expect(source, `${file} should keep non-shipped current status detection`).toContain(
        "si.status NOT IN ('shipped', 'returned')"
      );
      expect(source, `${file} should ignore shipment links after RMA receipt`).toContain(
        'NOT EXISTS ('
      );
      expect(source, `${file} should use canonical serialized events`).toContain(
        'FROM serialized_item_events sie'
      );
      expect(source, `${file} should require same serial lineage`).toContain(
        'sie.serialized_item_id = sis.serialized_item_id'
      );
      expect(source, `${file} should only exempt RMA receipt lineage`).toContain(
        "sie.event_type = 'rma_received'"
      );
      expect(source, `${file} should compare receipt timing to shipment timing`).toContain(
        'sie.occurred_at >= COALESCE(sis.shipped_at, sis.created_at)'
      );
    }
  });

  it('keeps app finance-integrity readers on the shared aggregate query', () => {
    for (const file of appConsumerFiles) {
      const source = read(file);

      expect(source, `${file} should consume the shared aggregate reader`).toContain(
        'readInventoryFinanceIntegrityAggregate'
      );
      expect(source, `${file} should not own duplicated shipment mismatch SQL`).not.toContain(
        'shipment_mismatch AS'
      );
      expect(source, `${file} should not own duplicated serialized event predicate`).not.toContain(
        'FROM serialized_item_events sie'
      );
    }

    for (const file of inventoryValuationEntrypointFiles) {
      const source = read(file);

      expect(source, `${file} should consume the inventory finance summary boundary`).toContain(
        'getFinanceIntegritySummary'
      );
      expect(source, `${file} should not own duplicated drift-row SQL`).not.toContain(
        'AS absolute_drift'
      );
      expect(source, `${file} should not own duplicated shipment mismatch SQL`).not.toContain(
        'shipment_mismatch AS'
      );
      expect(source, `${file} should not own duplicated serialized event predicate`).not.toContain(
        'FROM serialized_item_events sie'
      );
    }
  });
});
