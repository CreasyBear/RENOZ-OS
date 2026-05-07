import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { deriveInventoryQualityStatus } from '@/lib/inventory-utils';

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('inventory quality status derivation', () => {
  it('derives exceptional quality statuses from inventory state and expiry', () => {
    const now = new Date('2026-05-07T12:00:00.000Z');

    expect(deriveInventoryQualityStatus({ status: 'damaged', now })).toBe('damaged');
    expect(deriveInventoryQualityStatus({ status: 'quarantined', now })).toBe('quarantined');
    expect(
      deriveInventoryQualityStatus({
        status: 'available',
        expiryDate: '2026-05-06T23:59:59.000Z',
        now,
      })
    ).toBe('expired');
  });

  it('leaves good, future, missing, and invalid expiry states unset', () => {
    const now = new Date('2026-05-07T12:00:00.000Z');

    expect(deriveInventoryQualityStatus({ status: 'available', now })).toBeUndefined();
    expect(
      deriveInventoryQualityStatus({
        status: 'available',
        expiryDate: '2026-05-08T00:00:00.000Z',
        now,
      })
    ).toBeUndefined();
    expect(
      deriveInventoryQualityStatus({
        status: 'available',
        expiryDate: 'not-a-date',
        now,
      })
    ).toBeUndefined();
  });

  it('uses the shared derivation in inventory detail hook and container mappings', () => {
    const hook = read('src/hooks/inventory/use-inventory-detail.ts');
    const container = read('src/components/domain/inventory/containers/inventory-detail-container.tsx');

    expect(hook).toContain("import { deriveInventoryQualityStatus } from '@/lib/inventory-utils';");
    expect(container).toContain("import { deriveInventoryQualityStatus } from '@/lib/inventory-utils';");
    expect(hook).toContain('qualityStatus: deriveInventoryQualityStatus({');
    expect(container).toContain('qualityStatus: deriveInventoryQualityStatus({');
    expect(hook).not.toContain('Expired would need expiryDate check');
  });
});
