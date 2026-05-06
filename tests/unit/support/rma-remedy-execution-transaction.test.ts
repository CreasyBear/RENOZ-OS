import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ValidationError } from '@/lib/server/errors';
import type { SessionContext } from '@/lib/server/protected';
import { executeRmaRemedy } from '@/server/functions/orders/_shared/rma-remedy-execution';

const updateOrderPaymentStatusMock = vi.hoisted(() => vi.fn(async () => undefined));
const generateOrderNumberMock = vi.hoisted(() => vi.fn(async () => 'ORD-REPL-0001'));
const enqueueSearchIndexOutboxMock = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('@/server/functions/orders/order-payments', () => ({
  updateOrderPaymentStatus: updateOrderPaymentStatusMock,
}));

vi.mock('@/server/functions/orders/order-numbering', () => ({
  generateOrderNumber: generateOrderNumberMock,
}));

vi.mock('@/server/functions/_shared/search-index-outbox', () => ({
  enqueueSearchIndexOutbox: enqueueSearchIndexOutboxMock,
}));

interface FakeTxOptions {
  selectResponses?: unknown[][];
  insertResponses?: unknown[];
}

function createQueryResult(rows: unknown[], state?: { locks: string[] }) {
  const query = {
    where: () => query,
    innerJoin: () => query,
    orderBy: () => query,
    for: (mode: string) => {
      state?.locks.push(mode);
      return query;
    },
    limit: async (count: number) => rows.slice(0, count),
    then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(resolve(rows)),
  };

  return query;
}

function createFakeTransaction({
  selectResponses = [],
  insertResponses = [],
}: FakeTxOptions = {}) {
  const state = {
    inserts: [] as Array<{ table: unknown; values: unknown }>,
    locks: [] as string[],
    selectCount: 0,
  };

  const tx = {
    select: () => ({
      from: () => createQueryResult(selectResponses[state.selectCount++] ?? [], state),
    }),
    insert: (table: unknown) => ({
      values: (values: unknown) => {
        state.inserts.push({ table, values });
        const response = insertResponses.shift();
        const insertResult = {
          returning: async () => (response === null ? [] : [response ?? {}]),
          then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(undefined)),
        };
        return insertResult;
      },
    }),
  };

  return { tx: tx as never, state };
}

const ctx = {
  authUser: { id: 'auth-user-1', email: 'ops@renoz.test' },
  user: {
    id: 'user-1',
    authId: 'auth-user-1',
    email: 'ops@renoz.test',
    name: 'Ops User',
    role: 'admin',
    status: 'active',
    organizationId: 'org-1',
  },
  role: 'admin',
  organizationId: 'org-1',
} satisfies SessionContext;

const baseRma = {
  id: 'rma-1',
  organizationId: 'org-1',
  rmaNumber: 'RMA-1001',
  orderId: 'order-1',
  customerId: 'customer-1',
  refundPaymentId: null,
  creditNoteId: null,
  replacementOrderId: null,
  resolutionDetails: null,
};

const sourceOrder = {
  id: 'order-1',
  organizationId: 'org-1',
  customerId: 'customer-1',
  orderNumber: 'SO-1001',
  billingAddress: null,
  shippingAddress: null,
  metadata: null,
  internalNotes: null,
  customerNotes: null,
};

describe('RMA remedy artifact transaction contract', () => {
  beforeEach(() => {
    updateOrderPaymentStatusMock.mockClear();
    generateOrderNumberMock.mockClear();
    enqueueSearchIndexOutboxMock.mockClear();
  });

  it('creates a refund payment artifact and returns the canonical RMA execution link', async () => {
    const { tx, state } = createFakeTransaction({
      selectResponses: [
        [{ id: 'payment-1', amount: 250, paymentMethod: 'bank_transfer' }],
        [{ totalRefunded: 25 }],
      ],
      insertResponses: [{ id: 'refund-1', label: null }],
    });

    const result = await executeRmaRemedy({
      tx,
      ctx,
      rma: baseRma as never,
      sourceOrder: sourceOrder as never,
      sourceCustomerId: 'customer-1',
      issue: { id: 'issue-1', status: 'resolved' },
      input: {
        rmaId: 'rma-1',
        resolution: 'refund',
        originalPaymentId: 'payment-1',
        amount: 75,
      },
    });

    expect(result).toMatchObject({
      status: 'processed',
      executionStatus: 'completed',
      refundPaymentId: 'refund-1',
      creditNoteId: null,
      replacementOrderId: null,
      resolutionDetails: {
        refundAmount: 75,
      },
      artifacts: {
        refundPayment: { id: 'refund-1', label: null },
        linkedIssueOpen: false,
      },
    });
    expect(state.inserts).toHaveLength(1);
    expect(state.inserts[0].values).toMatchObject({
      orderId: 'order-1',
      amount: 75,
      paymentMethod: 'bank_transfer',
      isRefund: true,
      relatedPaymentId: 'payment-1',
      organizationId: 'org-1',
      recordedBy: 'user-1',
      createdBy: 'user-1',
      updatedBy: 'user-1',
    });
    expect(state.locks).toEqual(['update']);
    expect(updateOrderPaymentStatusMock).toHaveBeenCalledWith(tx, 'order-1', 'org-1', 'user-1');
  });

  it('rejects over-refunds before inserting fake artifact truth', async () => {
    const { tx, state } = createFakeTransaction({
      selectResponses: [
        [{ id: 'payment-1', amount: 100, paymentMethod: 'card' }],
        [{ totalRefunded: 80 }],
      ],
    });

    await expect(
      executeRmaRemedy({
        tx,
        ctx,
        rma: baseRma as never,
        sourceOrder: sourceOrder as never,
        sourceCustomerId: 'customer-1',
        issue: null,
        input: {
          rmaId: 'rma-1',
          resolution: 'refund',
          originalPaymentId: 'payment-1',
          amount: 25,
        },
      })
    ).rejects.toBeInstanceOf(ValidationError);

    expect(state.inserts).toHaveLength(0);
    expect(state.locks).toEqual(['update']);
    expect(updateOrderPaymentStatusMock).not.toHaveBeenCalled();
  });

  it('does not project RMA refunds when the ledger insert does not return an artifact', async () => {
    const { tx, state } = createFakeTransaction({
      selectResponses: [
        [{ id: 'payment-1', amount: 250, paymentMethod: 'bank_transfer' }],
        [{ totalRefunded: 25 }],
      ],
      insertResponses: [null],
    });

    await expect(
      executeRmaRemedy({
        tx,
        ctx,
        rma: baseRma as never,
        sourceOrder: sourceOrder as never,
        sourceCustomerId: 'customer-1',
        issue: null,
        input: {
          rmaId: 'rma-1',
          resolution: 'refund',
          originalPaymentId: 'payment-1',
          amount: 75,
        },
      })
    ).rejects.toBeInstanceOf(ValidationError);

    expect(state.inserts).toHaveLength(1);
    expect(state.locks).toEqual(['update']);
    expect(updateOrderPaymentStatusMock).not.toHaveBeenCalled();
  });

  it('creates a credit note artifact and returns the canonical RMA execution link', async () => {
    const { tx, state } = createFakeTransaction({
      selectResponses: [[{ id: 'customer-1' }], []],
      insertResponses: [{ id: 'credit-1', label: 'CN-202605-0001' }],
    });

    const result = await executeRmaRemedy({
      tx,
      ctx,
      rma: baseRma as never,
      sourceOrder: sourceOrder as never,
      sourceCustomerId: 'customer-1',
      issue: { id: 'issue-1', status: 'open' },
      input: {
        rmaId: 'rma-1',
        resolution: 'credit',
        amount: 120,
        creditReason: 'Warranty goodwill',
        applyNow: true,
      },
    });

    expect(result).toMatchObject({
      status: 'processed',
      executionStatus: 'completed',
      refundPaymentId: null,
      creditNoteId: 'credit-1',
      replacementOrderId: null,
      resolutionDetails: {
        creditNoteId: 'credit-1',
      },
      artifacts: {
        creditNote: { id: 'credit-1', label: 'CN-202605-0001' },
        linkedIssueOpen: true,
      },
    });
    expect(state.inserts).toHaveLength(1);
    expect(state.inserts[0].values).toMatchObject({
      organizationId: 'org-1',
      customerId: 'customer-1',
      orderId: 'order-1',
      amount: 120,
      reason: 'Warranty goodwill',
      status: 'applied',
      appliedToOrderId: 'order-1',
      createdBy: 'user-1',
      updatedBy: 'user-1',
    });
    expect(updateOrderPaymentStatusMock).toHaveBeenCalledWith(tx, 'order-1', 'org-1', 'user-1');
  });

  it('creates a zero-priced replacement draft and line item as canonical execution evidence', async () => {
    const { tx, state } = createFakeTransaction({
      selectResponses: [
        [
          {
            id: 'rma-line-1',
            orderLineItemId: 'line-1',
            quantityReturned: 2,
            description: 'RENOZ Battery 12V 100Ah',
            productId: 'product-1',
            lineNumber: '001',
            sku: 'BAT-100',
            taxType: 'gst',
            notes: 'Replace failed unit',
          },
        ],
      ],
      insertResponses: [{ id: 'replacement-order-1', label: 'ORD-REPL-0001' }],
    });

    const result = await executeRmaRemedy({
      tx,
      ctx,
      rma: baseRma as never,
      sourceOrder: sourceOrder as never,
      sourceCustomerId: 'customer-1',
      issue: null,
      input: {
        rmaId: 'rma-1',
        resolution: 'replacement',
        confirmReplacement: true,
      },
    });

    expect(result).toMatchObject({
      status: 'processed',
      executionStatus: 'completed',
      refundPaymentId: null,
      creditNoteId: null,
      replacementOrderId: 'replacement-order-1',
      resolutionDetails: {
        replacementOrderId: 'replacement-order-1',
      },
      artifacts: {
        replacementOrder: { id: 'replacement-order-1', label: 'ORD-REPL-0001' },
      },
    });
    expect(generateOrderNumberMock).toHaveBeenCalledWith('org-1');
    expect(state.inserts).toHaveLength(2);
    expect(state.inserts[0].values).toMatchObject({
      organizationId: 'org-1',
      customerId: 'customer-1',
      orderNumber: 'ORD-REPL-0001',
      status: 'draft',
      paymentStatus: 'pending',
      total: 0,
      createdBy: 'user-1',
      updatedBy: 'user-1',
    });
    expect(state.inserts[0].values).toMatchObject({
      metadata: expect.objectContaining({
        replacementForRmaId: 'rma-1',
        replacementForOrderId: 'order-1',
        replacementMode: 'warranty_rma',
      }),
    });
    expect(state.inserts[1].values).toEqual([
      expect.objectContaining({
        organizationId: 'org-1',
        orderId: 'replacement-order-1',
        productId: 'product-1',
        sku: 'BAT-100',
        quantity: 2,
        unitPrice: 0,
        lineTotal: 0,
        qtyPicked: 0,
        qtyShipped: 0,
        qtyDelivered: 0,
      }),
    ]);
    expect(enqueueSearchIndexOutboxMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        entityType: 'order',
        entityId: 'replacement-order-1',
        action: 'upsert',
      }),
      tx
    );
  });
});
