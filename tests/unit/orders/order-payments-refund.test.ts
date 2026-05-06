import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  selectResponses: [] as unknown[][],
}));

function createAwaitableResult<T>(values: T[]) {
  return {
    limit: async (count: number) => values.slice(0, count),
    then: (resolve: (value: T[]) => unknown) => resolve(values),
  };
}

function createSelectableResult<T>(values: T[]) {
  return {
    ...createAwaitableResult(values),
    for: () => createAwaitableResult(values),
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

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => createSelectableResult(state.selectResponses.shift() ?? []),
      }),
    }),
    transaction: vi.fn(async (callback: (tx: {
      execute: () => Promise<void>;
      select: () => {
        from: () => {
          where: () => ReturnType<typeof createSelectableResult>;
        };
      };
    }) => Promise<unknown>) =>
      callback({
        execute: async () => {},
        select: () => ({
          from: () => ({
            where: () => createSelectableResult(state.selectResponses.shift() ?? []),
          }),
        }),
      })
    ),
  },
}));

describe('refund payment safeguards', () => {
  beforeEach(() => {
    state.selectResponses = [];
  });

  it('rejects refunds above the remaining refundable balance after earlier refunds', async () => {
    state.selectResponses = [
      [
        {
          id: 'payment-1',
          amount: 100,
          paymentMethod: 'bank_transfer',
        },
      ],
      [
        {
          totalRefunded: 80,
        },
      ],
    ];

    const { createRefundPayment } = await import('@/server/functions/orders/order-payments');

    await expect(
      createRefundPayment({
        data: {
          orderId: 'order-1',
          originalPaymentId: 'payment-1',
          amount: 30,
          notes: 'Too much',
        },
      })
    ).rejects.toMatchObject({
      message: 'Refund amount cannot exceed remaining refundable balance',
    });
  });
});
