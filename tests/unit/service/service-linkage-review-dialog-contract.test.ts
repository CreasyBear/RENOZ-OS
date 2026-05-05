import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('service linkage review create-new dialog contract', () => {
  it('uses the shared owner-address contract and accessible field wiring', () => {
    const source = read(
      'src/components/domain/service/dialogs/resolve-service-linkage-review-dialog.tsx'
    );
    const fieldIds = [
      'linkage-review-owner-name',
      'linkage-review-owner-email',
      'linkage-review-owner-phone',
      'linkage-review-country',
      'linkage-review-street1',
      'linkage-review-street2',
      'linkage-review-city',
      'linkage-review-state',
      'linkage-review-postal',
      'linkage-review-notes',
    ];

    expect(source).toContain('buildOptionalServiceOwnerAddress');
    expect(source).toContain('getOptionalServiceOwnerAddressError');
    expect(source).toContain('const address = buildOptionalServiceOwnerAddress(values);');
    expect(source).toContain('const addressError = getOptionalServiceOwnerAddressError(values);');
    expect(source).toContain('<FormErrorSummary');
    expect(source).toContain('title="Check service system creation"');
    expect(source).not.toContain('address: values.street1');

    for (const fieldId of fieldIds) {
      expect(source).toContain(`htmlFor="${fieldId}"`);
      expect(source).toContain(`id="${fieldId}"`);
    }

    expect(source.match(/onBlur=\{field\.handleBlur\}/g)?.length).toBe(fieldIds.length);
  });
});
