import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findBulkReceiveDuplicateSerialFailures } from '@/server/functions/suppliers/bulk-receive-serial-preflight';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('bulk receive serial preflight', () => {
  it('finds same-product duplicate serials across purchase orders after normalization', () => {
    expect(
      findBulkReceiveDuplicateSerialFailures([
        {
          poId: 'po-1',
          poItemId: 'po-item-1',
          productId: 'product-1',
          productName: 'RENOZ LFP Module',
          serialNumbers: [' sn-001 '],
        },
        {
          poId: 'po-2',
          poItemId: 'po-item-2',
          productId: 'product-1',
          productName: 'RENOZ LFP Module',
          serialNumbers: ['SN-001'],
        },
      ])
    ).toEqual([
      {
        poId: 'po-1',
        poItemId: 'po-item-1',
        productId: 'product-1',
        productName: 'RENOZ LFP Module',
        serialNumber: 'SN-001',
        error:
          'Serial "SN-001" appears multiple times for "RENOZ LFP Module" in this bulk receipt request.',
      },
      {
        poId: 'po-2',
        poItemId: 'po-item-2',
        productId: 'product-1',
        productName: 'RENOZ LFP Module',
        serialNumber: 'SN-001',
        error:
          'Serial "SN-001" appears multiple times for "RENOZ LFP Module" in this bulk receipt request.',
      },
    ]);
  });

  it('allows matching serial text across different products', () => {
    expect(
      findBulkReceiveDuplicateSerialFailures([
        {
          poId: 'po-1',
          poItemId: 'po-item-1',
          productId: 'product-1',
          productName: 'RENOZ LFP Module',
          serialNumbers: ['SN-001'],
        },
        {
          poId: 'po-2',
          poItemId: 'po-item-2',
          productId: 'product-2',
          productName: 'RENOZ BMS',
          serialNumbers: ['SN-001'],
        },
      ])
    ).toEqual([]);
  });

  it('keeps batch duplicate preflight before receiveGoods delegation', () => {
    const source = compact(read('src/server/functions/suppliers/bulk-receive-goods.ts'));

    const preflightIndex = source.indexOf(
      'findBulkReceiveDuplicateSerialFailures(serialPreflightLines)'
    );
    const receiveGoodsIndex = source.indexOf('awaitreceiveGoods({');

    expect(preflightIndex).toBeGreaterThan(-1);
    expect(receiveGoodsIndex).toBeGreaterThan(-1);
    expect(preflightIndex).toBeLessThan(receiveGoodsIndex);
  });
});
