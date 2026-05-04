import { describe, expect, it } from 'vitest';
import { buildDocumentOrderFromDb, buildDocumentOrderFromPreviewData } from '@/lib/documents/builders';
import { buildFinancialTableRows } from '@/lib/documents/financial-presentation';

describe('document builders', () => {
  it('prefers order billing and shipping addresses over customer fallbacks', () => {
    const order = buildDocumentOrderFromDb(
      {
        id: '11111111-1111-4111-8111-111111111111',
        orderNumber: 'ORD-001',
        orderDate: '2026-04-08',
        dueDate: '2026-04-15',
        billingAddress: {
          street1: 'Order Bill 1',
          city: 'Perth',
          state: 'WA',
          postalCode: '6000',
          country: 'AU',
        },
        shippingAddress: {
          street1: 'Order Ship 1',
          city: 'Fremantle',
          state: 'WA',
          postalCode: '6160',
          country: 'AU',
        },
        subtotal: 1000,
        discountAmount: 50,
        discountPercent: 5,
        taxAmount: 95,
        shippingAmount: 25,
        total: 1070,
        paidAmount: 120,
        balanceDue: 950,
        customerNotes: 'Customer note',
        internalNotes: 'Internal note',
        paymentStatus: 'partial',
        status: 'confirmed',
        lineItems: [
          {
            id: '22222222-2222-4222-8222-222222222222',
            lineNumber: '1',
            sku: 'BAT-1',
            description: 'Battery',
            quantity: 1,
            unitPrice: 1000,
            discountPercent: 5,
            discountAmount: 50,
            taxAmount: 95,
            lineTotal: 1045,
            notes: null,
          },
        ],
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        name: 'Acme',
        email: 'ops@example.com',
        phone: '1234',
        address: {
          addressLine1: 'Legacy Address',
          city: 'Sydney',
          state: 'NSW',
          postalCode: '2000',
          country: 'AU',
        },
        billingAddress: {
          addressLine1: 'Customer Bill 1',
          city: 'Sydney',
          state: 'NSW',
          postalCode: '2000',
          country: 'AU',
        },
        shippingAddress: {
          addressLine1: 'Customer Ship 1',
          city: 'Melbourne',
          state: 'VIC',
          postalCode: '3000',
          country: 'AU',
        },
        primaryAddress: {
          addressLine1: 'Primary Address',
          city: 'Adelaide',
          state: 'SA',
          postalCode: '5000',
          country: 'AU',
        },
      },
    );

    expect(order.billingAddress?.addressLine1).toBe('Order Bill 1');
    expect(order.shippingAddress?.addressLine1).toBe('Order Ship 1');
    expect(order.customer.address?.addressLine1).toBe('Primary Address');
    expect(order.shippingAmount).toBe(25);
    expect(order.paidAmount).toBe(120);
    expect(order.balanceDue).toBe(950);
  });

  it('falls back to customer billing and shipping addresses when order overrides are absent', () => {
    const order = buildDocumentOrderFromDb(
      {
        id: '11111111-1111-4111-8111-111111111111',
        orderNumber: 'ORD-002',
        orderDate: '2026-04-08',
        dueDate: null,
        subtotal: 500,
        discountAmount: 0,
        discountPercent: 0,
        taxAmount: 50,
        total: 550,
        customerNotes: null,
        internalNotes: null,
        lineItems: [],
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        name: 'Fallback Co',
        email: null,
        phone: null,
        billingAddress: {
          addressLine1: 'Customer Bill 2',
          city: 'Brisbane',
          state: 'QLD',
          postalCode: '4000',
          country: 'AU',
        },
        shippingAddress: {
          addressLine1: 'Customer Ship 2',
          city: 'Gold Coast',
          state: 'QLD',
          postalCode: '4217',
          country: 'AU',
        },
      },
    );

    expect(order.billingAddress?.addressLine1).toBe('Customer Bill 2');
    expect(order.shippingAddress?.addressLine1).toBe('Customer Ship 2');
  });

  it('preserves preview line-item tax and discount data for financial presentation', () => {
    const order = buildDocumentOrderFromPreviewData({
      organization: {
        name: 'Acme',
      },
      customer: {
        name: 'Acme Customer',
      },
      order: {
        orderNumber: 'ORD-003',
        createdAt: '2026-04-08T00:00:00.000Z',
        validUntil: '2026-04-15T00:00:00.000Z',
        lineItems: [
          {
            description: 'Install',
            quantity: 1,
            unitPrice: 100,
            total: 110,
            discountPercent: 0,
            discountAmount: 0,
            taxAmount: 10,
          },
        ],
        subtotal: 100,
        taxAmount: 10,
        total: 110,
      },
    });

    expect(order.lineItems[0]?.taxAmount).toBe(10);
    expect(buildFinancialTableRows(order)[0]?.amount).toBe(100);
  });
});
