import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  selectQueue: [] as Array<Array<Record<string, unknown>>>,
  returningQueue: [] as Array<Array<Record<string, unknown>>>,
  updateSets: [] as Array<Record<string, unknown>>,
}));

function createAwaitableResult<T>(values: T[]) {
  return {
    limit: async (count: number) => values.slice(0, count),
    orderBy: () => createAwaitableResult(values),
    offset: () => createAwaitableResult(values),
    groupBy: async () => values,
    then: (resolve: (value: T[]) => unknown) => resolve(values),
  };
}

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: unknown) => handler,
      inputValidator: () => builder,
    };
    return builder;
  },
}));

vi.mock('@/lib/server/protected', () => ({
  withAuth: vi.fn(async () => ({
    organizationId: 'org-1',
    user: { id: 'user-1' },
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => createAwaitableResult(state.selectQueue.shift() ?? []),
      }),
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        state.updateSets.push(values);
        return {
          where: () => ({
            returning: async () => state.returningQueue.shift() ?? [],
            then: (resolve: (value: unknown) => unknown) => resolve(undefined),
          }),
        };
      },
    }),
  },
}));

describe('purchase order approval hardening', () => {
  beforeEach(() => {
    state.selectQueue = [];
    state.returningQueue = [];
    state.updateSets = [];
  });

  it('allows an escalated approval to be approved by the escalated user', async () => {
    state.selectQueue = [
      [
        {
          id: 'approval-1',
          purchaseOrderId: 'po-1',
          organizationId: 'org-1',
          approverId: 'user-9',
          escalatedTo: 'user-1',
          level: 1,
          status: 'escalated',
        },
      ],
      [],
    ];
    state.returningQueue = [
      [
        {
          id: 'approval-1',
          purchaseOrderId: 'po-1',
          organizationId: 'org-1',
          approverId: 'user-9',
          escalatedTo: null,
          level: 1,
          status: 'approved',
        },
      ],
    ];

    const { approvePurchaseOrderAtLevel } = await import('@/server/functions/suppliers/approvals');
    const result = await approvePurchaseOrderAtLevel({
      data: {
        approvalId: 'approval-1',
        comments: 'Approved after escalation',
      },
    });

    expect(result.approval.status).toBe('approved');
    expect(state.updateSets[0]).toMatchObject({
      status: 'approved',
      escalatedTo: null,
      escalationReason: null,
      escalatedAt: null,
    });
  });

  it('validates delegation targets before updating the approval row', async () => {
    state.selectQueue = [
      [
        {
          id: 'approval-1',
          purchaseOrderId: 'po-1',
          organizationId: 'org-1',
          approverId: 'user-1',
          delegatedFrom: null,
          status: 'pending',
        },
      ],
      [],
    ];

    const { delegateApproval } = await import('@/server/functions/suppliers/approvals');

    await expect(
      delegateApproval({
        data: {
          approvalId: 'approval-1',
          delegateTo: 'missing-user',
        },
      })
    ).rejects.toThrow('Approver missing-user not found');

    expect(state.updateSets).toHaveLength(0);
  });
});
