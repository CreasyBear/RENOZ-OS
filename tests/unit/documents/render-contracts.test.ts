import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { documentDataSchema } from '@/lib/documents/schemas';
import { generateFilename, generateStoragePath } from '@/lib/documents/render';
import {
  InvoicePdfDocument,
  PackingSlipPdfDocument,
  ReportSummaryPdfDocument,
  WarrantyCertificatePdfDocument,
  type DocumentOrganization,
} from '@/lib/documents';

const organization: DocumentOrganization = {
  id: 'org-1',
  name: 'Renoz Pty Ltd',
  currency: 'AUD',
  locale: 'en-AU',
  address: {
    addressLine1: '123 Solar Way',
    city: 'Perth',
    state: 'WA',
    postalCode: '6000',
    country: 'AU',
  },
  branding: null,
  settings: null,
};

describe('document render contracts', () => {
  it('supports pro-forma filenames and storage paths', () => {
    const date = new Date('2026-04-08T00:00:00.000Z');

    expect(generateFilename('pro-forma', 'ORD-20260407-0001', date)).toBe(
      'pro-forma-ORD-20260407-0001-2026-04-08.pdf'
    );
    expect(
      generateStoragePath(
        '7efe18a0-cb19-49de-ab45-7bfa82f62e72',
        'pro-forma',
        'pro-forma-ORD-20260407-0001-2026-04-08.pdf'
      )
    ).toBe(
      'documents/7efe18a0-cb19-49de-ab45-7bfa82f62e72/pro-formas/pro-forma-ORD-20260407-0001-2026-04-08.pdf'
    );
  });

  it('accepts pro-forma payloads in the shared document schema', () => {
    const result = documentDataSchema.safeParse({
      type: 'pro-forma',
      documentNumber: 'PF-ORD-001',
      issueDate: '2026-04-08T00:00:00.000Z',
      validUntil: '2026-04-22T00:00:00.000Z',
      order: {
        id: '11111111-1111-4111-8111-111111111111',
        orderNumber: 'ORD-001',
        customer: {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Acme',
        },
        lineItems: [],
        subtotal: 100,
        taxAmount: 10,
        total: 110,
      },
    });

    expect(result.success).toBe(true);
  });

  it('constructs representative document elements across the redesigned families', () => {
    const invoice = createElement(InvoicePdfDocument, {
      organization,
      data: {
        type: 'invoice',
        documentNumber: 'INV-001',
        issueDate: new Date('2026-04-09T00:00:00.000Z'),
        dueDate: new Date('2026-04-24T00:00:00.000Z'),
        generatedAt: new Date('2026-04-09T00:00:00.000Z'),
        isPaid: false,
        order: {
          id: 'order-1',
          orderNumber: 'SO-001',
          customer: { id: 'cust-1', name: 'Acme Industries' },
          lineItems: [
            {
              id: 'line-1',
              description: 'Heat Pump Supply',
              quantity: 1,
              unitPrice: 1000,
              taxAmount: 100,
              total: 1100,
            },
          ],
          subtotal: 1000,
          taxAmount: 120,
          shippingAmount: 20,
          total: 1120,
          balanceDue: 1120,
        },
        paymentDetails: {
          bankName: 'Commonwealth Bank',
          accountName: 'Renoz Pty Ltd',
          bsb: '123-456',
          accountNumber: '12345678',
        },
      },
    });

    const packingSlip = createElement(PackingSlipPdfDocument, {
      organization,
      data: {
        documentNumber: 'PS-001',
        orderNumber: 'SO-001',
        issueDate: new Date('2026-04-09T00:00:00.000Z'),
        customer: { id: 'cust-1', name: 'Acme Industries' },
        shippingAddress: {
          addressLine1: '45 Freight Road',
          city: 'Fremantle',
          state: 'WA',
          postalCode: '6160',
          country: 'AU',
          contactName: 'Warehouse Team',
        },
        lineItems: [
          {
            id: 'line-1',
            description: 'Heat Pump',
            sku: 'HP-1',
            quantity: 2,
            location: 'A-14',
            serialNumbers: ['SN-001', 'SN-002'],
          },
        ],
        carrier: 'Toll',
        packageCount: 2,
      },
    });

    const warranty = createElement(WarrantyCertificatePdfDocument, {
      organization,
      data: {
        warrantyNumber: 'WAR-001',
        customerName: 'Acme Industries',
        productName: 'Heat Pump 24kW',
        productSerial: 'SN-001',
        registrationDate: new Date('2026-04-09T00:00:00.000Z'),
        expiryDate: new Date('2028-04-09T00:00:00.000Z'),
        warrantyDuration: '24 Months',
        coverageType: 'Parts & Labor',
        status: 'active',
        terms: 'Warranty applies to standard installation and approved maintenance.',
      },
    });

    const report = createElement(ReportSummaryPdfDocument, {
      organization,
      data: {
        reportName: 'Monthly Performance Summary',
        dateFrom: new Date('2026-04-01T00:00:00.000Z'),
        dateTo: new Date('2026-04-30T00:00:00.000Z'),
        generatedAt: new Date('2026-05-01T00:00:00.000Z'),
        metrics: [
          { label: 'Jobs Completed', value: '42' },
          { label: 'Revenue', value: '$182,500' },
        ],
      },
    });

    expect(invoice.type).toBe(InvoicePdfDocument);
    expect(packingSlip.type).toBe(PackingSlipPdfDocument);
    expect(warranty.type).toBe(WarrantyCertificatePdfDocument);
    expect(report.type).toBe(ReportSummaryPdfDocument);
  });
});
