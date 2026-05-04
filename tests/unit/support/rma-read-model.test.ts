import { describe, expect, it, vi } from 'vitest';

import type { RmaLineItemResponse } from '@/lib/schemas/support/rma';
import {
  createRmaReadModel,
  type RmaRow,
} from '@/server/functions/orders/_shared/rma-read-model';

function createRmaRow(
  id: string,
  overrides: Partial<RmaRow> = {}
): RmaRow {
  const now = new Date('2026-04-16T00:00:00.000Z');
  return {
    id,
    organizationId: 'org-1',
    rmaNumber: `RMA-${id}`,
    sequenceNumber: 1,
    orderId: 'order-1',
    customerId: 'customer-1',
    issueId: 'issue-1',
    status: 'received',
    reason: 'defective',
    reasonDetails: null,
    customerNotes: null,
    internalNotes: null,
    resolution: null,
    resolutionDetails: null,
    inspectionNotes: null,
    approvedAt: null,
    approvedBy: null,
    receivedAt: null,
    receivedBy: null,
    processedAt: null,
    processedBy: null,
    rejectedAt: null,
    rejectedBy: null,
    rejectionReason: null,
    refundPaymentId: null,
    creditNoteId: null,
    replacementOrderId: null,
    executionStatus: 'pending',
    executionBlockedReason: null,
    executionCompletedAt: null,
    executionCompletedBy: null,
    createdAt: now,
    updatedAt: now,
    createdBy: 'user-1',
    updatedBy: 'user-1',
    ...overrides,
  } as RmaRow;
}

function createLineItem(rmaId: string): RmaLineItemResponse {
  return {
    id: `line-${rmaId}`,
    rmaId,
    orderLineItemId: `order-line-${rmaId}`,
    quantityReturned: 1,
    itemReason: null,
    itemCondition: null,
    serialNumber: null,
    createdAt: new Date('2026-04-16T00:00:00.000Z'),
    updatedAt: new Date('2026-04-16T00:00:00.000Z'),
  };
}

describe('rma read model', () => {
  it('batches summary-profile hydration across collections', async () => {
    const fetchBasicLineItems = vi.fn(async (_executor: unknown, rmaIds: string[]) => {
      return new Map(
        rmaIds.map((rmaId) => [rmaId, [createLineItem(rmaId)]])
      );
    });
    const fetchDetailedLineItems = vi.fn();
    const fetchCustomers = vi.fn(async () => new Map([['customer-1', { id: 'customer-1', name: 'Acme' }]]));
    const fetchIssues = vi.fn(async () =>
      new Map([['issue-1', { id: 'issue-1', title: 'Pump fault', status: 'in_progress' }]])
    );
    const fetchExecutionArtifacts = vi.fn(async (
      _executor: unknown,
      _organizationId: string,
      requests: Array<{
        rmaId: string;
        refundPaymentId: string | null;
        creditNoteId: string | null;
        replacementOrderId: string | null;
        issue: { id: string; status: string } | null;
      }>
    ) => {
      expect(requests).toEqual([
        {
          rmaId: 'rma-1',
          refundPaymentId: 'payment-1',
          creditNoteId: null,
          replacementOrderId: null,
          issue: { id: 'issue-1', status: 'in_progress' },
        },
        {
          rmaId: 'rma-2',
          refundPaymentId: null,
          creditNoteId: 'credit-1',
          replacementOrderId: null,
          issue: null,
        },
      ]);

      return new Map([
        [
          'rma-1',
          {
            refundPayment: { id: 'payment-1', label: 'PAY-001' },
            creditNote: null,
            replacementOrder: null,
            linkedIssueOpen: true,
          },
        ],
        [
          'rma-2',
          {
            refundPayment: null,
            creditNote: { id: 'credit-1', label: 'CN-001' },
            replacementOrder: null,
            linkedIssueOpen: null,
          },
        ],
      ]);
    });

    const readModel = createRmaReadModel({
      fetchBasicLineItems,
      fetchDetailedLineItems,
      fetchCustomers,
      fetchIssues,
      fetchExecutionArtifacts,
    });

    const result = await readModel.loadMany({
      organizationId: 'org-1',
      profile: 'summary',
      rmas: [
        createRmaRow('rma-1', { refundPaymentId: 'payment-1' }),
        createRmaRow('rma-2', {
          customerId: null,
          issueId: null,
          creditNoteId: 'credit-1',
        }),
      ],
    });

    expect(fetchBasicLineItems).toHaveBeenCalledTimes(1);
    expect(fetchBasicLineItems).toHaveBeenCalledWith(expect.anything(), ['rma-1', 'rma-2']);
    expect(fetchDetailedLineItems).not.toHaveBeenCalled();
    expect(result[0].customer).toEqual({ id: 'customer-1', name: 'Acme' });
    expect(result[0].issue).toEqual({ id: 'issue-1', title: 'Pump fault' });
    expect(result[0].execution?.refundPayment?.label).toBe('PAY-001');
    expect(result[1].execution?.creditNote?.label).toBe('CN-001');
  });

  it('uses the detail profile for enriched line-item reads', async () => {
    const fetchDetailedLineItems = vi.fn(async () => [
      {
        ...createLineItem('rma-3'),
        orderLineItem: {
          id: 'order-line-rma-3',
          productId: 'product-1',
          productName: 'Controller Board',
          quantity: 2,
          unitPrice: 499,
        },
      },
    ]);

    const readModel = createRmaReadModel({
      fetchBasicLineItems: vi.fn(),
      fetchDetailedLineItems,
      fetchCustomers: vi.fn(async () => new Map()),
      fetchIssues: vi.fn(async () => new Map()),
      fetchExecutionArtifacts: vi.fn(async () => new Map()),
    });

    const result = await readModel.loadOne({
      organizationId: 'org-1',
      profile: 'detail',
      rma: createRmaRow('rma-3', { customerId: null, issueId: null }),
    });

    expect(fetchDetailedLineItems).toHaveBeenCalledTimes(1);
    expect(result.lineItems?.[0].orderLineItem?.productName).toBe('Controller Board');
    expect(result.execution?.status).toBe('pending');
  });

  it('maps cancelled RMAs through the read model with normalized response fields', async () => {
    const cancelledAt = new Date('2026-04-16T10:30:00.000Z');
    const completedAt = new Date('2026-04-16T11:00:00.000Z');
    const readModel = createRmaReadModel({
      fetchBasicLineItems: vi.fn(async () => new Map()),
      fetchDetailedLineItems: vi.fn(),
      fetchCustomers: vi.fn(async () => new Map()),
      fetchIssues: vi.fn(async () => new Map()),
      fetchExecutionArtifacts: vi.fn(async () =>
        new Map([
          [
            'rma-4',
            {
              refundPayment: null,
              creditNote: null,
              replacementOrder: null,
              linkedIssueOpen: null,
            },
          ],
        ])
      ),
    });

    const result = await readModel.loadOne({
      organizationId: 'org-1',
      profile: 'summary',
      rma: createRmaRow('rma-4', {
        status: 'cancelled',
        approvedAt: cancelledAt.toISOString(),
        executionCompletedAt: completedAt.toISOString(),
        customerId: null,
        issueId: null,
      }),
    });

    expect(result.status).toBe('cancelled');
    expect(result.approvedAt).toBe('2026-04-16T10:30:00.000Z');
    expect(result.executionCompletedAt).toBe('2026-04-16T11:00:00.000Z');
  });
});
