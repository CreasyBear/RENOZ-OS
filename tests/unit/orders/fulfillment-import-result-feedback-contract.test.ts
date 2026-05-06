import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatFulfillmentImportResultError } from '@/server/functions/orders/order-shipment-import-result-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('fulfillment import result feedback contract', () => {
  it('formats known shipment import failures without exposing raw backend details', () => {
    expect(formatFulfillmentImportResultError(new Error('Shipment not found'))).toBe(
      'Shipment could not be found for this import row.'
    );

    expect(formatFulfillmentImportResultError(new Error('Shipment already shipped'))).toBe(
      'Shipment is no longer pending. Refresh fulfillment and review the shipment.'
    );

    expect(
      formatFulfillmentImportResultError(
        new Error(
          'Serial "ABC123" could not be resolved to a serialized item before shipment finalization.'
        )
      )
    ).toBe('Serialized inventory could not be resolved for this shipment.');
  });

  it('sanitizes unknown import row failures', () => {
    expect(
      formatFulfillmentImportResultError(
        new Error('duplicate key value violates shipment_items constraint')
      )
    ).toBe('Shipment could not be imported. Review the row and try again.');

    expect(
      formatFulfillmentImportResultError(
        Object.assign(new Error('postgres database stack leaked'), {
          code: 'VALIDATION_ERROR',
          statusCode: 400,
        })
      )
    ).toBe('Shipment could not be imported because it failed validation.');

    expect(
      formatFulfillmentImportResultError(
        Object.assign(new Error('write conflict'), {
          code: 'CONFLICT',
          statusCode: 409,
        })
      )
    ).toBe('Shipment changed while the import was running. Refresh and try again.');
  });

  it('keeps fulfillment import result rows behind the formatter', () => {
    const source = read('src/server/functions/orders/order-shipments-finalization.ts');

    expect(source).toContain('formatFulfillmentImportResultError(error)');
    expect(source).not.toContain(
      "message: error instanceof Error ? error.message : 'Unknown error'"
    );
  });
});
