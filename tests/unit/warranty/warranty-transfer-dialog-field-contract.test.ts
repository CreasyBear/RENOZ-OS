import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('warranty transfer dialog field contract', () => {
  it('keeps ownership transfer fields associated with labels and blur handling', () => {
    const source = read('src/components/domain/warranty/dialogs/transfer-warranty-dialog.tsx');
    const fieldIds = [
      'warranty-transfer-owner-name',
      'warranty-transfer-owner-email',
      'warranty-transfer-owner-phone',
      'warranty-transfer-country',
      'warranty-transfer-street1',
      'warranty-transfer-street2',
      'warranty-transfer-city',
      'warranty-transfer-state',
      'warranty-transfer-postal',
      'warranty-transfer-owner-notes',
      'warranty-transfer-reason',
    ];

    for (const fieldId of fieldIds) {
      expect(source).toContain(`htmlFor="${fieldId}"`);
      expect(source).toContain(`id="${fieldId}"`);
    }

    expect(source.match(/onBlur=\{field\.handleBlur\}/g)?.length).toBe(fieldIds.length);
  });
});
