import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ValidationError } from '@/lib/server/errors';
import { formatWarrantyBulkImportRowFailure } from '@/server/functions/warranty/bulk-import/warranty-bulk-import-result-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('warranty bulk import row result feedback', () => {
  it('keeps serial repair guidance while hiding infrastructure details', () => {
    expect(
      formatWarrantyBulkImportRowFailure(
        new ValidationError('Serialized item record not found', {
          serialNumbers: [
            'Serial "BAT-1001" could not be resolved to a serialized item before importing this warranty.',
          ],
        })
      )
    ).toBe(
      'Serial "BAT-1001" could not be resolved to a serialized item before importing this warranty.'
    );

    expect(
      formatWarrantyBulkImportRowFailure(
        new Error('duplicate key value violates unique constraint warranties_warranty_number_key')
      )
    ).toBe('Unable to import this warranty row. Review the row and retry.');

    expect(
      formatWarrantyBulkImportRowFailure(
        new Error('TypeError: Cannot read properties of undefined (reading warrantyNumber)')
      )
    ).toBe('Unable to import this warranty row. Review the row and retry.');
  });

  it('keeps bulk import row failures behind the result formatter', () => {
    const server = read('src/server/functions/warranty/bulk-import/warranty-bulk-import.ts');

    expect(server).toContain('formatWarrantyBulkImportRowFailure(err)');
    expect(server).not.toContain("err instanceof Error ? err.message : 'Unknown error'");
    expect(server).not.toContain('const msg = err instanceof Error ? err.message');
  });
});
