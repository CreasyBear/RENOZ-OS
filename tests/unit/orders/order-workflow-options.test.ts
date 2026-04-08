import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  selectResponses: [] as Array<Array<Record<string, unknown>>>,
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
  requirePermission: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () =>
          createAwaitableResult((state.selectResponses.shift() ?? []) as Array<Record<string, unknown>>),
      }),
    }),
  },
}));

vi.mock('@/server/functions/orders/order-pending-shipment-reservations', () => ({
  getPendingShipmentReservations: vi.fn(async () => ({
    pendingShipmentIds: new Set<string>(),
    quantitiesByLineItem: new Map<string, number>(),
  })),
}));

vi.mock('@/server/functions/orders/order-status-effects', () => ({
  queueStatusArtifacts: vi.fn(async () => undefined),
}));

describe('order workflow options', () => {
  beforeEach(() => {
    state.selectResponses = [];
  });

  it('exposes confirm_order as the primary next action for draft orders', async () => {
    state.selectResponses = [
      [
        {
          id: 'order-1',
          organizationId: 'org-1',
          status: 'draft',
        },
      ],
      [
        {
          hasShippedQty: false,
          hasDeliveredQty: false,
        },
      ],
      [],
    ];

    const { getOrderWorkflowOptions } = await import('@/server/functions/orders/order-status');
    const result = await getOrderWorkflowOptions({
      data: { orderId: 'order-1' },
    });

    expect(result.actions[0]).toMatchObject({
      key: 'confirm_order',
      label: 'Confirm Order',
      category: 'next',
    });
  });

  it('exposes reopen_shipment as a recovery action when a shipped order has an in-transit shipment', async () => {
    state.selectResponses = [
      [
        {
          id: 'order-2',
          organizationId: 'org-1',
          status: 'shipped',
        },
      ],
      [
        {
          hasShippedQty: true,
          hasDeliveredQty: false,
        },
      ],
      [
        {
          id: 'shipment-1',
          status: 'in_transit',
          shipmentNumber: 'SHP-100',
        },
      ],
    ];

    const { getOrderWorkflowOptions } = await import('@/server/functions/orders/order-status');
    const result = await getOrderWorkflowOptions({
      data: { orderId: 'order-2' },
    });

    expect(result.actions).toContainEqual(
      expect.objectContaining({
        key: 'reopen_shipment',
        category: 'recovery',
        shipmentId: 'shipment-1',
      })
    );
  });
});
