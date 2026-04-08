import { describe, expect, it } from 'vitest';
import {
  areDocumentAddressesEqual,
  buildFinancialSummaryRows,
  getFinancialDocumentRecipientName,
  resolveFinancialDocumentAddresses,
} from '@/lib/documents/financial-presentation';

describe('financial document presentation', () => {
  it('hides ship-to when billing and shipping addresses are effectively the same', () => {
    const address = {
      addressLine1: '123 Main St',
      city: 'Perth',
      state: 'WA',
      postalCode: '6000',
      country: 'AU',
    };

    expect(areDocumentAddressesEqual(address, { ...address })).toBe(true);
    expect(
      resolveFinancialDocumentAddresses({
        billingAddress: address,
        shippingAddress: { ...address },
        customer: { id: '1', name: 'Acme', address: null },
      }).showShipTo
    ).toBe(false);
  });

  it('shows ship-to when shipping differs and builds amount-only summary rows', () => {
    const presentation = resolveFinancialDocumentAddresses({
      billingAddress: {
        addressLine1: 'Bill To',
        city: 'Perth',
        state: 'WA',
        postalCode: '6000',
        country: 'AU',
      },
      shippingAddress: {
        addressLine1: 'Ship To',
        city: 'Fremantle',
        state: 'WA',
        postalCode: '6160',
        country: 'AU',
      },
      customer: { id: '1', name: 'Acme', address: null },
    });
    const rows = buildFinancialSummaryRows(
      {
        subtotal: 1000,
        discount: 50,
        shippingAmount: 25,
        taxAmount: 97.5,
        total: 1072.5,
        balanceDue: 400,
      },
      { includeBalanceDue: true }
    );

    expect(presentation.showShipTo).toBe(true);
    expect(rows.map((row) => row.label)).toEqual([
      'Subtotal',
      'Discount',
      'Shipping',
      'Tax',
      'Total',
      'Balance Due',
    ]);
    expect(rows.find((row) => row.key === 'tax')?.amount).toBe(97.5);
  });

  it('prefers address contact names for rendered recipient labels', () => {
    expect(
      getFinancialDocumentRecipientName(
        {
          addressLine1: '12 Marine Tce',
          city: 'Fremantle',
          state: 'WA',
          postalCode: '6160',
          country: 'AU',
          contactName: 'Warehouse Team',
        },
        'Acme Pty Ltd'
      )
    ).toBe('Warehouse Team');

    expect(getFinancialDocumentRecipientName(null, 'Acme Pty Ltd')).toBe('Acme Pty Ltd');
  });
});
