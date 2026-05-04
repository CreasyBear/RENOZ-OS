import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Payment } from '@/lib/schemas/orders/order-payments';
import type { RmaResponse } from '@/lib/schemas/support/rma';
import { RmaExecuteRemedyDialog } from '@/components/domain/support/rma/rma-execute-remedy-dialog';

const toastErrorMock = vi.fn();

vi.mock('@/hooks', () => ({
  toastError: (...args: unknown[]) => toastErrorMock(...args),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
  }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/dialog-pending-guards', () => ({
  createPendingDialogInteractionGuards: () => ({
    onEscapeKeyDown: () => undefined,
    onInteractOutside: () => undefined,
  }),
  createPendingDialogOpenChangeHandler:
    (_isPending: boolean, onOpenChange: (open: boolean) => void) =>
    (nextOpen: boolean) =>
      onOpenChange(nextOpen),
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({
    id,
    checked,
    onCheckedChange,
  }: {
    id?: string;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock('@/components/ui/select', async () => {
  const ReactModule = await import('react');

  interface SelectContextValue {
    value?: string;
    onValueChange?: (value: string) => void;
    items: Array<{ value: string; label: string }>;
  }

  const SelectContext = ReactModule.createContext<SelectContextValue>({
    value: '',
    items: [],
  });

  function flattenItems(
    children: React.ReactNode,
    SelectItem: React.ComponentType<{ value: string; children: React.ReactNode }>
  ): Array<{ value: string; label: string }> {
    const items: Array<{ value: string; label: string }> = [];

    ReactModule.Children.forEach(children, (child) => {
      if (!ReactModule.isValidElement(child)) return;

      const element = child as React.ReactElement<{
        value?: string;
        children?: React.ReactNode;
      }>;

      if (element.type === SelectItem && element.props.value) {
        items.push({
          value: element.props.value,
          label: String(element.props.children),
        });
        return;
      }

      if (element.props?.children) {
        items.push(...flattenItems(element.props.children, SelectItem));
      }
    });

    return items;
  }

  const SelectItem = ({
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <>{children}</>;

  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value?: string;
      onValueChange?: (value: string) => void;
      children: React.ReactNode;
    }) => {
      const items = flattenItems(children, SelectItem);
      return (
        <SelectContext.Provider value={{ value, onValueChange, items }}>
          <div>{children}</div>
        </SelectContext.Provider>
      );
    },
    SelectTrigger: ({
      id,
      children,
    }: {
      id?: string;
      children: React.ReactNode;
    }) => {
      const context = ReactModule.useContext(SelectContext);
      return (
        <select
          aria-label={id}
          value={context.value ?? ''}
          onChange={(event) => context.onValueChange?.(event.target.value)}
        >
          <option value="">Select</option>
          {context.items.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
          {children}
        </select>
      );
    },
    SelectValue: () => null,
    SelectContent: () => null,
    SelectItem,
  };
});

function createRma(overrides: Partial<RmaResponse> = {}): RmaResponse {
  return {
    id: 'rma-1',
    organizationId: 'org-1',
    rmaNumber: 'RMA-001',
    issueId: 'issue-1',
    customerId: 'customer-1',
    orderId: 'order-1',
    status: 'received',
    reason: 'defective',
    reasonDetails: null,
    resolution: null,
    resolutionDetails: null,
    executionStatus: 'pending',
    executionBlockedReason: null,
    executionCompletedAt: null,
    executionCompletedBy: null,
    refundPaymentId: null,
    creditNoteId: null,
    replacementOrderId: null,
    inspectionNotes: null,
    internalNotes: null,
    customerNotes: null,
    approvedAt: null,
    approvedBy: null,
    receivedAt: null,
    receivedBy: null,
    processedAt: null,
    processedBy: null,
    rejectedAt: null,
    rejectedBy: null,
    rejectionReason: null,
    sequenceNumber: 1,
    createdAt: new Date('2026-04-16T00:00:00.000Z'),
    updatedAt: new Date('2026-04-16T00:00:00.000Z'),
    createdBy: 'user-1',
    updatedBy: 'user-1',
    lineItems: [],
    customer: null,
    issue: null,
    execution: {
      status: 'pending',
      blockedReason: null,
      refundPayment: null,
      creditNote: null,
      replacementOrder: null,
      linkedIssueOpen: true,
      completedAt: null,
      completedBy: null,
    },
    linkedIssueOpen: true,
    ...overrides,
  };
}

function createPayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'payment-1',
    amount: 250,
    paymentMethod: 'bank_transfer',
    paymentDate: '2026-04-16',
    reference: 'PAY-001',
    notes: null,
    isRefund: false,
    relatedPaymentId: null,
    createdAt: '2026-04-16T00:00:00.000Z',
    ...overrides,
  };
}

function ExecuteRemedyHarness({
  orderPayments,
  onProcess,
}: {
  orderPayments: Payment[];
  onProcess: (input: unknown) => Promise<void>;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Reopen
      </button>
      <RmaExecuteRemedyDialog
        open={open}
        onOpenChange={setOpen}
        isPending={false}
        rma={createRma()}
        orderPayments={orderPayments}
        onProcess={onProcess as never}
      />
    </div>
  );
}

describe('RmaExecuteRemedyDialog', () => {
  it('shows the refund blocker and resets form state after close and reopen', async () => {
    render(<ExecuteRemedyHarness orderPayments={[]} onProcess={vi.fn().mockResolvedValue(undefined)} />);

    expect(
      screen.getByText(
        'No refundable source payment is available for this order. Choose another remedy or record a payment first.'
      )
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Refund Amount'), {
      target: { value: '19.95' },
    });
    expect(screen.getByLabelText('Refund Amount')).toHaveValue(19.95);

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Execute Remedy')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Reopen'));
    expect((screen.getByLabelText('Refund Amount') as HTMLInputElement).value).toBe('');
    expect(
      screen.getByText(
        'This records a real refund payment against the selected source payment.'
      )
    ).toBeInTheDocument();
  });

  it('updates consequence copy by resolution and closes cleanly after a successful submit', async () => {
    const onProcess = vi.fn().mockResolvedValue(undefined);

    render(
      <ExecuteRemedyHarness
        orderPayments={[createPayment()]}
        onProcess={onProcess}
      />
    );

    fireEvent.change(screen.getByLabelText('resolution'), {
      target: { value: 'credit' },
    });
    expect(
      screen.getByText(
        'This creates a real credit note and can apply it to the source order immediately.'
      )
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Credit Amount'), {
      target: { value: '42.5' },
    });
    fireEvent.change(screen.getByLabelText('Credit Note Reason'), {
      target: { value: 'Field labour reimbursement' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Execute Remedy' }));

    await waitFor(() => {
      expect(onProcess).toHaveBeenCalledWith({
        resolution: 'credit',
        amount: 42.5,
        creditReason: 'Field labour reimbursement',
        applyNow: true,
        notes: undefined,
      });
    });

    expect(screen.queryByText('Credit Amount')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Reopen'));
    expect(
      screen.getByText(
        'This records a real refund payment against the selected source payment.'
      )
    ).toBeInTheDocument();
  });
});
