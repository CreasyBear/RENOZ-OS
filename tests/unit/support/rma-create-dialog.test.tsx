import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RmaCreateDialog } from '@/components/domain/support/rma/rma-create-dialog';

const toastErrorMock = vi.fn();

vi.mock('@/hooks', () => ({
  toastError: (...args: unknown[]) => toastErrorMock(...args),
}));

vi.mock('@/lib/pricing-utils', () => ({
  useCurrency: () => ({
    formatPrice: (value: number) => `$${value.toFixed(2)}`,
  }),
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

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { value: string; children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({
    id,
    children,
  }: {
    id?: string;
    children: React.ReactNode;
  }) => <button aria-label={id}>{children}</button>,
  SelectValue: () => null,
}));

function CreateDialogHarness({
  onSubmit,
  onSuccess = vi.fn(),
}: {
  onSubmit: Parameters<typeof RmaCreateDialog>[0]['onSubmit'];
  onSuccess?: (rmaId: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Reopen
      </button>
      <RmaCreateDialog
        open={open}
        onOpenChange={setOpen}
        orderId="order-1"
        orderLineItems={[
          {
            id: 'line-1',
            productId: 'product-1',
            productName: 'Battery Module',
            quantity: 2,
            unitPrice: 120,
            isSerialized: false,
          },
        ]}
        onSubmit={onSubmit}
        onSuccess={onSuccess}
      />
    </div>
  );
}

describe('RmaCreateDialog', () => {
  beforeEach(() => {
    toastErrorMock.mockClear();
  });

  it('keeps the dialog open when RMA creation fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('duplicate key value violates constraint'));
    const onSuccess = vi.fn();

    render(<CreateDialogHarness onSubmit={onSubmit} onSuccess={onSuccess} />);

    fireEvent.click(screen.getByLabelText(/Battery Module/));
    fireEvent.click(screen.getByRole('button', { name: 'Create RMA' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        orderId: 'order-1',
        reason: 'defective',
        lineItems: [
          {
            orderLineItemId: 'line-1',
            quantityReturned: 1,
            itemReason: null,
            serialNumber: null,
          },
        ],
        issueId: null,
        customerId: null,
        reasonDetails: null,
        customerNotes: null,
      });
    });

    expect(screen.getByRole('heading', { name: 'Create Return Authorization' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Battery Module/)).toBeChecked();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(toastErrorMock).not.toHaveBeenCalled();
  });
});
