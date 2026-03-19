import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  currentOrders: [] as Array<Record<string, unknown>>,
  pendingUpdatedOrders: [] as Array<Record<string, unknown>>,
  updateSets: [] as Array<Record<string, unknown>>,
  outboxCalls: [] as Array<Record<string, unknown>>,
  invoiceCalls: [] as Array<Record<string, unknown>>,
  deliveryCalls: [] as Array<Record<string, unknown>>,
  activityLogs: [] as Array<Record<string, unknown>>,
}));

function createAwaitableResult<T>(values: T[]) {
  return {
    limit: async (count: number) => values.slice(0, count),
    groupBy: async () => values,
    then: (resolve: (value: T[]) => unknown) => resolve(values),
  };
}

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    inputValidator: () => ({
      handler: (handler: unknown) => handler,
    }),
  }),
}));

vi.mock('@/lib/server/protected', () => ({
  withAuth: vi.fn(async () => ({
    organizationId: 'org-1',
    user: { id: 'user-1' },
  })),
}));

vi.mock('@/server/middleware/activity-context', () => ({
  createActivityLoggerWithContext: vi.fn(() => ({
    logAsync: (payload: Record<string, unknown>) => {
      state.activityLogs.push(payload);
    },
  })),
}));

vi.mock('@/server/functions/_shared/search-index-outbox', () => ({
  enqueueSearchIndexOutbox: vi.fn(async (payload: Record<string, unknown>) => {
    state.outboxCalls.push(payload);
  }),
}));

vi.mock('@/server/functions/_shared/idempotency', () => ({
  hasProcessedIdempotencyKey: vi.fn(async () => false),
}));

vi.mock('@/lib/logger', () => ({
  ordersLogger: {
    error: vi.fn(),
  },
}));

vi.mock('@/trigger/jobs', () => ({
  generateInvoicePdf: {
    trigger: vi.fn(async (payload: Record<string, unknown>) => {
      state.invoiceCalls.push(payload);
    }),
  },
  generateDeliveryNotePdf: {
    trigger: vi.fn(async (payload: Record<string, unknown>) => {
      state.deliveryCalls.push(payload);
    }),
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => createAwaitableResult(state.currentOrders),
      }),
    }),
    transaction: async (callback: (tx: Record<string, unknown>) => Promise<unknown>) => {
      const tx = {
        execute: async () => undefined,
        update: () => ({
          set: (values: Record<string, unknown>) => {
            state.updateSets.push(values);
            return {
              where: () => ({
                returning: async () => {
                  const next = state.pendingUpdatedOrders.shift();
                  return next ? [next] : [];
                },
              }),
            };
          },
        }),
      };

      return callback(tx);
    },
  },
}));

describe('order status contract alignment', () => {
  beforeEach(() => {
    state.currentOrders = [];
    state.pendingUpdatedOrders = [];
    state.updateSets = [];
    state.outboxCalls = [];
    state.invoiceCalls = [];
    state.deliveryCalls = [];
    state.activityLogs = [];
  });

  it('single status updates bump aggregate version and queue side effects', async () => {
    state.currentOrders = [
      {
        id: 'order-1',
        organizationId: 'org-1',
        orderNumber: 'ORD-001',
        customerId: 'cust-1',
        status: 'draft',
        dueDate: null,
        internalNotes: null,
      },
    ];
    state.pendingUpdatedOrders = [
      {
        id: 'order-1',
        organizationId: 'org-1',
        orderNumber: 'ORD-001',
        customerId: 'cust-1',
        status: 'confirmed',
        dueDate: null,
        shippedDate: null,
      },
    ];

    const { updateOrderStatus } = await import('@/server/functions/orders/order-status');
    const result = await updateOrderStatus({
      data: {
        id: 'order-1',
        data: {
          status: 'confirmed',
          notes: 'Approve order',
        },
      },
    });

    expect(result.success).toBe(true);
    expect(state.updateSets).toHaveLength(1);
    expect(state.updateSets[0]).toHaveProperty('version');
    expect(state.outboxCalls).toHaveLength(1);
    expect(state.invoiceCalls).toHaveLength(1);
    expect(state.deliveryCalls).toHaveLength(0);
    expect(state.activityLogs).toHaveLength(1);
  });

  it('bulk status updates use the same versioned side-effect path as single updates', async () => {
    state.currentOrders = [
      {
        id: 'order-1',
        organizationId: 'org-1',
        orderNumber: 'ORD-001',
        customerId: 'cust-1',
        status: 'draft',
        dueDate: null,
        internalNotes: null,
      },
    ];
    state.pendingUpdatedOrders = [
      {
        id: 'order-1',
        organizationId: 'org-1',
        orderNumber: 'ORD-001',
        customerId: 'cust-1',
        status: 'confirmed',
        dueDate: null,
        shippedDate: null,
      },
    ];

    const { bulkUpdateOrderStatus } = await import('@/server/functions/orders/order-status');
    const result = await bulkUpdateOrderStatus({
      data: {
        orderIds: ['order-1'],
        status: 'confirmed',
        notes: 'Move forward',
      },
    });

    expect(result.updated).toBe(1);
    expect(state.updateSets).toHaveLength(1);
    expect(state.updateSets[0]).toHaveProperty('version');
    expect(state.outboxCalls).toHaveLength(1);
    expect(state.invoiceCalls).toHaveLength(1);
    expect(state.deliveryCalls).toHaveLength(0);
    expect(state.activityLogs).toHaveLength(1);
  });

  it('bulk no-op status updates do not retrigger artifacts or writes', async () => {
    state.currentOrders = [
      {
        id: 'order-1',
        organizationId: 'org-1',
        orderNumber: 'ORD-001',
        customerId: 'cust-1',
        status: 'confirmed',
        dueDate: null,
        internalNotes: null,
      },
    ];

    const { bulkUpdateOrderStatus } = await import('@/server/functions/orders/order-status');
    const result = await bulkUpdateOrderStatus({
      data: {
        orderIds: ['order-1'],
        status: 'confirmed',
      },
    });

    expect(result.updated).toBe(1);
    expect(state.updateSets).toHaveLength(0);
    expect(state.outboxCalls).toHaveLength(0);
    expect(state.invoiceCalls).toHaveLength(0);
    expect(state.deliveryCalls).toHaveLength(0);
    expect(state.activityLogs).toHaveLength(0);
  });
});
