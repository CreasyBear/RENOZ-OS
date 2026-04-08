import { describe, expect, it } from 'vitest';
import { documentDataSchema } from '@/lib/documents/schemas';
import { generateFilename, generateStoragePath } from '@/lib/documents/render';

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
});
