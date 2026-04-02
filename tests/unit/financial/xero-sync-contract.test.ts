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

describe('xero invoice sync hardening', () => {
  beforeEach(() => {
    state.updateSets = [];
    withAuthMock.mockClear();
    getXeroSyncReadinessMock.mockClear();
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
});
