import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import {
  formatBulkRmaReceiveFailure,
  formatRmaRemedyBlockedReason,
} from '@/server/functions/orders/rma-result-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('RMA server result feedback contract', () => {
  it('keeps bulk receive failures operator-safe', () => {
    expect(formatBulkRmaReceiveFailure(new NotFoundError('RMA not found', 'rma'))).toBe(
      'RMA not found'
    );

    expect(
      formatBulkRmaReceiveFailure(
        new ValidationError('Validation failed', {
          lineItem: [
            'RMA line item is not linked to a product. Repair the source order line before receiving this RMA.',
          ],
        })
      )
    ).toBe(
      'RMA line item is not linked to a product. Repair the source order line before receiving this RMA.'
    );

    expect(
      formatBulkRmaReceiveFailure(
        new Error('duplicate key value violates unique constraint inventory_serial_idx')
      )
    ).toBe('Unable to receive this RMA. Refresh and retry.');

    expect(
      formatBulkRmaReceiveFailure(
        new Error('Serialized serial ABC123 would exceed single-unit bounds on return.')
      )
    ).toBe(
      'Serialized inventory could not be restored for this RMA. Review serial assignment and retry.'
    );
  });

  it('keeps remedy blocked reasons operator-safe before persistence', () => {
    expect(
      formatRmaRemedyBlockedReason(
        new ValidationError('Refund amount cannot exceed remaining refundable balance.')
      )
    ).toBe('Refund amount cannot exceed remaining refundable balance.');

    expect(
      formatRmaRemedyBlockedReason(
        new ValidationError('Customer could not be resolved for credit note creation.')
      )
    ).toBe('Customer could not be resolved for credit note creation.');

    expect(
      formatRmaRemedyBlockedReason(new Error('postgres database stack leaked from credit insert'))
    ).toBe('RMA remedy execution is blocked. Review the RMA and try again.');

    expect(
      formatRmaRemedyBlockedReason(new Error('Cannot read properties of undefined'))
    ).toBe('RMA remedy execution is blocked. Review the RMA and try again.');
  });

  it('keeps RMA server result feedback behind the formatter helper', () => {
    const server = read('src/server/functions/orders/rma.ts');

    expect(server).toContain('formatBulkRmaReceiveFailure(err)');
    expect(server).toContain('formatRmaRemedyBlockedReason(error)');
    expect(server).not.toContain('function isUnsafeBulkRmaFailureMessage');
    expect(server).not.toContain('function extractBulkRmaValidationMessage');
    expect(server).not.toContain(
      "const message = error instanceof Error ? error.message : 'Failed to execute the selected remedy.'"
    );
  });
});
