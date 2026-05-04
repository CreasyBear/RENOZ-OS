import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { RmaResponse } from '@/lib/schemas/support/rma';
import { RmaReceiveDialog } from '@/components/domain/support/rma/rma-receive-dialog';

const toastErrorMock = vi.fn();

vi.mock('@/hooks', () => ({
  toastError: (...args: unknown[]) => toastErrorMock(...args),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <a className={className}>{children}</a>,
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
    status: 'approved',
    reason: 'damaged_in_shipping',
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
    lineItems: [
      {
        id: 'line-1',
        rmaId: 'rma-1',
        orderLineItemId: 'oli-1',
        quantityReturned: 1,
        serialNumber: 'SN-001',
        itemReason: 'damaged_in_shipping',
        itemCondition: 'good',
        createdAt: new Date('2026-04-16T00:00:00.000Z'),
        updatedAt: new Date('2026-04-16T00:00:00.000Z'),
        orderLineItem: {
          id: 'oli-1',
          productId: 'product-1',
          productName: 'Inverter',
          quantity: 1,
          unitPrice: 250,
        },
      },
    ],
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

function ReceiveDialogHarness({
  onReceive,
}: {
  onReceive: (input?: {
    condition?: string;
    notes?: string;
    locationId?: string;
  }) => Promise<void>;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Reopen
      </button>
      <RmaReceiveDialog
        open={open}
        onOpenChange={setOpen}
        isPending={false}
        rma={createRma()}
        locations={[
          { id: 'loc-1', name: 'Main Warehouse', code: 'MAIN' },
          { id: 'loc-2', name: 'Overflow', code: 'OVF' },
        ]}
        locationsLoading={false}
        onReceive={onReceive}
      />
    </div>
  );
}

describe('RmaReceiveDialog', () => {
  it('resets inspection fields after close and reopen', () => {
    render(<ReceiveDialogHarness onReceive={vi.fn().mockResolvedValue(undefined)} />);

    fireEvent.change(screen.getByLabelText('receivingLocation'), {
      target: { value: 'loc-1' },
    });
    fireEvent.change(screen.getByLabelText('condition'), {
      target: { value: 'damaged' },
    });
    fireEvent.change(screen.getByLabelText('Inspection Notes (optional)'), {
      target: { value: 'Bent corner on carton' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Receive Items')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reopen' }));
    expect((screen.getByLabelText('receivingLocation') as HTMLSelectElement).value).toBe('');
    expect((screen.getByLabelText('condition') as HTMLSelectElement).value).toBe('good');
    expect((screen.getByLabelText('Inspection Notes (optional)') as HTMLTextAreaElement).value).toBe('');
  });

  it('submits the selected inspection payload and closes cleanly', async () => {
    const onReceive = vi.fn().mockResolvedValue(undefined);

    render(<ReceiveDialogHarness onReceive={onReceive} />);

    fireEvent.change(screen.getByLabelText('receivingLocation'), {
      target: { value: 'loc-2' },
    });
    fireEvent.change(screen.getByLabelText('condition'), {
      target: { value: 'good' },
    });
    fireEvent.change(screen.getByLabelText('Inspection Notes (optional)'), {
      target: { value: 'Packaging intact' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Mark Received' }));

    await waitFor(() => {
      expect(onReceive).toHaveBeenCalledWith({
        condition: 'good',
        notes: 'Packaging intact',
        locationId: 'loc-2',
      });
    });

    expect(screen.queryByText('Receive Items')).not.toBeInTheDocument();
  });
});
