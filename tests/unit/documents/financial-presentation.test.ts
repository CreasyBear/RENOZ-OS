import { describe, expect, it } from 'vitest';
import {
  areDocumentAddressesEqual,
  buildFinancialSummaryRows,
  buildFinancialTableRows,
  getFinancialLineAmount,
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
        taxAmount: 97.5,
        total: 1072.5,
        balanceDue: 400,
      },
      { includeBalanceDue: true }
    );

    expect(presentation.showShipTo).toBe(true);
    expect(rows.map((row) => row.label)).toEqual([
      'Subtotal (before GST)',
      'Discount',
      'GST (10%)',
      'Total',
      'Balance Due',
    ]);
    expect(rows.some((row) => row.label === 'Shipping (ex GST)')).toBe(false);
    expect(rows.find((row) => row.key === 'tax')?.amount).toBe(97.5);
  });

  it('derives ex-GST line amounts for financial tables', () => {
    expect(
      getFinancialLineAmount({
        total: 110,
        taxAmount: 10,
      })
    ).toBe(100);
  });

  it('adds shipping as a dedicated financial table row when present', () => {
    const rows = buildFinancialTableRows({
      lineItems: [
        {
          id: 'line-1',
          description: 'Install',
          quantity: 2,
          unitPrice: 55,
          total: 110,
          taxAmount: 10,
        },
      ],
      shippingAmount: 15,
    });

    expect(rows).toEqual([
      expect.objectContaining({
        key: 'line-1',
        description: 'Install',
        amount: 100,
      }),
      expect.objectContaining({
        key: 'shipping-charge',
        description: 'Shipping',
        quantity: 1,
        unitPrice: 15,
        amount: 15,
      }),
    ]);
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
