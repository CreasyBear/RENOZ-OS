import { describe, expect, it } from 'vitest';
import { buildSerialManifestGroups } from '@/lib/documents/components/serial-number-manifest';

describe('serial number summary', () => {
  it('groups serialized line items by product for readable shipment manifests', () => {
    expect(
      buildSerialManifestGroups([
        {
          description: 'Heat Pump',
          sku: 'HP-1',
          quantity: 2,
          serialNumbers: ['SN-001', 'SN-002'],
        },
        {
          description: 'Valve Kit',
          quantity: 1,
          serialNumbers: ['VK-009'],
        },
      ])
    ).toEqual([
      {
        itemKey: 'HP-1-0',
        title: 'Heat Pump',
        meta: 'SKU HP-1 · Qty 2',
        serials: ['SN-001', 'SN-002'],
      },
      {
        itemKey: 'Valve Kit-1',
        title: 'Valve Kit',
        meta: 'Qty 1',
        serials: ['VK-009'],
      },
    ]);
  });
});
