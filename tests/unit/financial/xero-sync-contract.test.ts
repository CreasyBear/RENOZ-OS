import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  updateSets: [] as Array<Record<string, unknown>>,
}));

const withAuthMock = vi.hoisted(() => vi.fn(async () => ({
  organizationId: 'org-1',
  user: { id: 'user-1' },
})));

const getXeroSyncReadinessMock = vi.hoisted(() => vi.fn(async () => ({
  available: false,
  message: 'Xero is disconnected',
})));

const applyXeroPaymentUpdateMock = vi.hoisted(() => vi.fn(async () => ({
  success: true,
  resultState: 'applied',
})));

const applyXeroPaymentWebhookEventMock = vi.hoisted(() => vi.fn());
const processXeroPaymentWebhookEventsMock = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    inputValidator: () => ({
      handler: (handler: unknown) => handler,
    }),
  }),
}));

vi.mock('@/lib/server/protected', () => ({
  withAuth: withAuthMock,
}));

vi.mock('@/lib/db', () => ({
  db: {
    update: () => ({
      set: (values: Record<string, unknown>) => {
        state.updateSets.push(values);
        return {
          where: async () => undefined,
        };
      },
    }),
  },
}));

vi.mock('@/server/functions/financial/xero-adapter', () => ({
  findInvoiceByReference: vi.fn(),
  getXeroPaymentById: vi.fn(),
  getXeroErrorMessage: vi.fn((error: unknown) =>
    error instanceof Error ? error.message : 'Unknown error'
  ),
  getXeroSyncReadiness: getXeroSyncReadinessMock,
  syncInvoiceWithXero: vi.fn(),
}));

vi.mock('@/server/functions/financial/_shared/xero-payment-reconciliation', () => ({
  applyXeroPaymentUpdate: applyXeroPaymentUpdateMock,
  applyXeroPaymentWebhookEvent: applyXeroPaymentWebhookEventMock,
  processXeroPaymentWebhookEvents: processXeroPaymentWebhookEventsMock,
}));

describe('xero invoice sync hardening', () => {
  beforeEach(() => {
    state.updateSets = [];
    withAuthMock.mockClear();
    getXeroSyncReadinessMock.mockClear();
    applyXeroPaymentUpdateMock.mockClear();
    applyXeroPaymentWebhookEventMock.mockClear();
    processXeroPaymentWebhookEventsMock.mockClear();
  });

  it('requires financial.update and returns staged readiness failure', async () => {
    const { syncInvoiceToXero } = await import('@/server/functions/financial/xero-invoice-sync');

    const result = await syncInvoiceToXero({
      data: {
        orderId: 'order-1',
        force: false,
      },
    });

    expect(withAuthMock).toHaveBeenCalledWith({ permission: 'financial.update' });
    expect(result.orderId).toBe('order-1');
    expect(result.success).toBe(false);
    expect(result.stages?.readiness).toEqual({
      status: 'failed',
      message: 'Xero is disconnected',
    });
    expect(result.stages?.persist.status).toBe('completed');
    expect(state.updateSets[0]).toMatchObject({
      xeroSyncStatus: 'error',
      xeroSyncError: 'Xero is disconnected',
    });
  });

  it('requires financial.update and ignores caller-supplied organization for payment applies', async () => {
    const { handleXeroPaymentUpdate } = await import('@/server/functions/financial/xero-invoice-sync');

    await handleXeroPaymentUpdate({
      data: {
        organizationId: 'attacker-org',
        xeroInvoiceId: 'invoice-1',
        paymentId: 'payment-1',
        amountPaid: 100,
        paymentDate: '2026-04-01',
        reference: 'PAY-1',
      },
    });

    expect(withAuthMock).toHaveBeenCalledWith({ permission: 'financial.update' });
    expect(applyXeroPaymentUpdateMock).toHaveBeenCalledWith({
      organizationId: 'org-1',
      xeroInvoiceId: 'invoice-1',
      paymentId: 'payment-1',
      amountPaid: 100,
      paymentDate: '2026-04-01',
      reference: 'PAY-1',
    });
  });
});
