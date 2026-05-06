import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  select: vi.fn(),
};
const mockGetXeroSyncReadiness = vi.fn();

vi.mock('@tanstack/react-start/server', () => ({
  setResponseStatus: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: mockDb,
}));

vi.mock('@/server/functions/financial/xero-adapter', () => ({
  findInvoiceByReference: vi.fn(),
  getXeroErrorMessage: vi.fn((error: unknown) =>
    error instanceof Error ? error.message : 'Unknown Xero error'
  ),
  getXeroSyncReadiness: (...args: unknown[]) => mockGetXeroSyncReadiness(...args),
  syncInvoiceWithXero: vi.fn(),
}));

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function makeInvoiceStatusQuery(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(rows),
      }),
    }),
  };
}

describe('xero sync issue feedback contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetXeroSyncReadiness.mockResolvedValue({ available: true });
  });

  it('maps stored provider and database errors to finance-owned operator issue copy', async () => {
    const { normalizeXeroSyncIssue } = await import(
      '@/server/functions/financial/_shared/xero-invoice-sync-command'
    );
    const { formatXeroSyncReadError } = await import(
      '@/server/functions/financial/_shared/xero-sync-feedback'
    );
    const { formatXeroInvoiceSyncMutationError } = await import(
      '@/server/functions/financial/_shared/xero-sync-feedback'
    );

    const validationIssue = normalizeXeroSyncIssue({
      readiness: { available: true },
      xeroSyncError: 'duplicate key violates orders_xero_access_token_key at provider stack frame',
      customerXeroContactId: 'contact-1',
      orderId: 'order-1',
      customerId: 'customer-1',
    });
    expect(validationIssue).toMatchObject({
      code: 'validation_failed',
      message: 'Invoice data needs review before this order can sync to Xero.',
    });
    expect(formatXeroSyncReadError('duplicate key violates access_token constraint', validationIssue)).toBe(
      'Invoice data needs review before this order can sync to Xero.'
    );
    expect(formatXeroInvoiceSyncMutationError('duplicate key violates access_token constraint')).toBe(
      'Xero connection needs attention before invoices can sync.'
    );

    const authIssue = normalizeXeroSyncIssue({
      readiness: { available: true },
      xeroSyncError: 'refresh_token expired for bearer access_token from provider stack',
      customerXeroContactId: 'contact-1',
    });
    expect(authIssue).toMatchObject({
      code: 'auth_failed',
      message: 'Xero connection needs attention before invoices and journals can sync.',
    });

    const mappingIssue = normalizeXeroSyncIssue({
      readiness: { available: true },
      xeroSyncError: 'Customer is missing a trusted Xero contact mapping: sql xeroContactId failed',
      customerXeroContactId: null,
    });
    expect(mappingIssue).toMatchObject({
      code: 'missing_contact_mapping',
      message: 'Customer needs a trusted Xero contact mapping before this invoice can sync.',
    });
  });

  it('returns safe invoice status read-model errors for the remediation console', async () => {
    mockDb.select.mockReturnValueOnce(
      makeInvoiceStatusQuery([
        {
          orderId: 'order-1',
          orderNumber: 'ORD-001',
          customerId: 'customer-1',
          xeroInvoiceId: null,
          xeroSyncStatus: 'error',
          xeroSyncError: 'duplicate key violates orders_xero_access_token_key at provider stack frame',
          lastXeroSyncAt: new Date('2026-05-06T01:00:00.000Z'),
          xeroInvoiceUrl: null,
          customerXeroContactId: 'contact-1',
        },
      ])
    );

    const { readInvoiceXeroStatus } = await import(
      '@/server/functions/financial/_shared/xero-invoice-status-read'
    );
    const result = await readInvoiceXeroStatus(
      { organizationId: 'org-1', user: { id: 'user-1' } } as never,
      { orderId: 'order-1' } as never
    );

    expect(result.xeroSyncError).toBe('Invoice data needs review before this order can sync to Xero.');
    expect(result.issue).toMatchObject({
      code: 'validation_failed',
      message: 'Invoice data needs review before this order can sync to Xero.',
    });
    expect(JSON.stringify(result)).not.toContain('duplicate key');
    expect(JSON.stringify(result)).not.toContain('access_token');
    expect(JSON.stringify(result)).not.toContain('provider stack');
  });

  it('keeps Xero status read models behind finance-owned safe message helpers', () => {
    const command = read('src/server/functions/financial/_shared/xero-invoice-sync-command.ts');
    const statusRead = read('src/server/functions/financial/_shared/xero-invoice-status-read.ts');
    const feedback = read('src/server/functions/financial/_shared/xero-sync-feedback.ts');

    expect(feedback).toContain('formatXeroSyncIssueMessage');
    expect(feedback).toContain('formatXeroInvoiceSyncMutationError');
    expect(command).toContain('formatXeroSyncIssueMessage');
    expect(command).not.toContain('message: xeroSyncError');
    expect(command).toContain('const responseMessage = formatXeroInvoiceSyncMutationError(errorMessage)');
    expect(command).not.toContain('error: errorMessage');
    expect(command).not.toContain('error: readiness.message');
    expect(command).not.toContain("message: readiness.message ?? 'Xero integration unavailable'");
    expect(command).not.toContain("sync: { status: 'failed', message: errorMessage }");
    expect(statusRead).toContain('xeroSyncError: formatXeroSyncReadError(order.xeroSyncError, issue)');
    expect(statusRead).toContain('xeroSyncError: formatXeroSyncReadError(r.xeroSyncError, syncIssue)');
    expect(statusRead).not.toMatch(/\n\s+xeroSyncError:\s+order\.xeroSyncError,\n\s+lastXeroSyncAt/);
    expect(statusRead).not.toMatch(/\n\s+xeroSyncError:\s+r\.xeroSyncError,\n\s+lastXeroSyncAt/);
  });
});
