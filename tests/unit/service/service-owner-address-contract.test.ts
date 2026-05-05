import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildOptionalServiceOwnerAddress,
  getOptionalServiceOwnerAddressError,
  OPTIONAL_SERVICE_OWNER_ADDRESS_ERROR,
} from '@/lib/service-owner-address';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('service owner address payload contract', () => {
  it('does not treat the default country as an address by itself', () => {
    expect(
      buildOptionalServiceOwnerAddress({
        street1: '',
        street2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'AU',
      })
    ).toBeUndefined();
  });

  it('trims populated ownership-transfer addresses and preserves the default country', () => {
    expect(
      buildOptionalServiceOwnerAddress({
        street1: '  12 Battery Rd  ',
        street2: '  Unit 4 ',
        city: ' Perth ',
        state: ' WA ',
        postalCode: ' 6000 ',
        country: 'au',
      })
    ).toEqual({
      street1: '12 Battery Rd',
      street2: 'Unit 4',
      city: 'Perth',
      state: 'WA',
      postalCode: '6000',
      country: 'AU',
    });
  });

  it('requires either a complete owner address or no address payload', () => {
    expect(
      getOptionalServiceOwnerAddressError({
        street1: '',
        street2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'AU',
      })
    ).toBeNull();

    expect(
      getOptionalServiceOwnerAddressError({
        street1: '12 Battery Rd',
        street2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'AU',
      })
    ).toBe(OPTIONAL_SERVICE_OWNER_ADDRESS_ERROR);

    expect(
      getOptionalServiceOwnerAddressError({
        street1: '12 Battery Rd',
        street2: '',
        city: 'Perth',
        state: 'WA',
        postalCode: '6000',
        country: 'AU',
      })
    ).toBeNull();
  });

  it('keeps warranty and service ownership transfer dialogs on the shared helper', () => {
    const serviceDialog = read(
      'src/components/domain/service/dialogs/transfer-service-system-dialog.tsx'
    );
    const warrantyDialog = read(
      'src/components/domain/warranty/dialogs/transfer-warranty-dialog.tsx'
    );

    for (const source of [serviceDialog, warrantyDialog]) {
      expect(source).toContain('buildOptionalServiceOwnerAddress');
      expect(source).toContain('getOptionalServiceOwnerAddressError');
      expect(source).toContain('const address = buildOptionalServiceOwnerAddress(values);');
      expect(source).toContain('address,');
      expect(source).toContain('.superRefine((values, ctx) => {');
      expect(source).toContain('const addressError = getOptionalServiceOwnerAddressError(values);');
      expect(source).toContain('<FormErrorSummary');
      expect(source).toContain('title="Check ownership transfer"');
      expect(source).not.toContain(
        'values.street1 || values.city || values.state || values.postalCode || values.country'
      );
    }
  });
});
