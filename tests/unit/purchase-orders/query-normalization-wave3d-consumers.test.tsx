import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.RESEND_API_KEY = process.env.RESEND_API_KEY ?? 're_test_key';

const mockUsePurchaseOrderReceipts = vi.fn();
const mockUsePurchaseOrderCosts = vi.fn();
const mockUseAllocatedCosts = vi.fn();
const mockUseAddPurchaseOrderCost = vi.fn();
const mockUseUpdatePurchaseOrderCost = vi.fn();
const mockUseDeletePurchaseOrderCost = vi.fn();
const mockUseBulkPurchaseOrders = vi.fn();
const mockUseProductSerialization = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

vi.mock('@/hooks', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/hooks/suppliers', () => ({
  usePurchaseOrderReceipts: (...args: unknown[]) => mockUsePurchaseOrderReceipts(...args),
  usePurchaseOrderCosts: (...args: unknown[]) => mockUsePurchaseOrderCosts(...args),
  useAllocatedCosts: (...args: unknown[]) => mockUseAllocatedCosts(...args),
  useAddPurchaseOrderCost: () => mockUseAddPurchaseOrderCost(),
  useUpdatePurchaseOrderCost: () => mockUseUpdatePurchaseOrderCost(),
  useDeletePurchaseOrderCost: () => mockUseDeletePurchaseOrderCost(),
}));

vi.mock('@/hooks/suppliers/use-bulk-purchase-orders', () => ({
  useBulkPurchaseOrders: (...args: unknown[]) => mockUseBulkPurchaseOrders(...args),
}));

vi.mock('@/hooks/purchase-orders/use-product-serialization', () => ({
  useProductSerialization: (...args: unknown[]) => mockUseProductSerialization(...args),
}));

vi.mock('~/contexts/organization-settings-context', () => ({
  useOrganizationSettings: () => ({ currency: 'AUD' }),
}));

vi.mock('@/hooks/use-org-format', () => ({
  useOrgFormat: () => ({
    formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
  }),
}));

vi.mock('@/components/shared/format', () => ({
  FormatAmount: ({ amount, currency }: { amount: number | null; currency?: string }) => (
    <span>{amount == null ? 'n/a' : `${currency ?? 'AUD'} ${amount}`}</span>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children: ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children: ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children: ReactNode }) => <tr>{children}</tr>,
  TableHead: ({ children }: { children: ReactNode }) => <th>{children}</th>,
  TableCell: ({ children }: { children: ReactNode }) => <td>{children}</td>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/dialog-pending-guards', () => ({
  createPendingDialogInteractionGuards: () => ({
    onEscapeKeyDown: vi.fn(),
    onInteractOutside: vi.fn(),
  }),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  SelectValue: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  AlertDialogAction: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: ReactNode }) => <label>{children}</label>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: Record<string, unknown>) => <textarea {...props} />,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div>skeleton</div>,
}));

vi.mock('@/components/shared/error-state', () => ({
  ErrorState: ({
    title,
    message,
  }: {
    title?: string;
    message: string;
  }) => (
    <div>
      <div>{title}</div>
      <div>{message}</div>
    </div>
  ),
}));

vi.mock('@/components/domain/procurement/receiving/bulk-receiving-dialog', () => ({
  BulkReceivingDialog: ({
    error,
  }: {
    error?: ReactNode;
  }) => <div>{error ?? 'bulk-dialog-ready'}</div>,
}));

describe('purchase-order consumer normalization wave 3d', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUsePurchaseOrderReceipts.mockReturnValue({
      data: { receipts: [] },
      isLoading: false,
      error: null,
    });
    mockUsePurchaseOrderCosts.mockReturnValue({
      data: { costs: [], totalCosts: 0 },
      isLoading: false,
      error: null,
    });
    mockUseAllocatedCosts.mockReturnValue({
      data: {
        items: [],
        summary: {
          totalLandedCost: 100,
        },
      },
      isLoading: false,
      error: null,
    });
    mockUseAddPurchaseOrderCost.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    mockUseUpdatePurchaseOrderCost.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    mockUseDeletePurchaseOrderCost.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    mockUseBulkPurchaseOrders.mockReturnValue({
      queries: [],
      isLoading: false,
      hasErrors: false,
      errors: [],
    });
    mockUseProductSerialization.mockReturnValue({
      serializationMap: new Map(),
      isLoading: false,
      hasErrors: false,
    });
  });

  it('shows an unavailable state instead of a fake empty state when receipt history fails without data', async () => {
    mockUsePurchaseOrderReceipts.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: new Error('Purchase order receipts are temporarily unavailable. Please refresh and try again.'),
    });

    const { POReceiptsTab } = await import('@/components/domain/purchase-orders/tabs/po-receipts-tab');

    render(<POReceiptsTab poId="po-1" />);

    expect(screen.getByText('Receipt history unavailable')).toBeInTheDocument();
    expect(screen.queryByText('No receipts recorded yet')).not.toBeInTheDocument();
  });

  it('keeps receipt history visible with a degraded warning when stale data exists', async () => {
    mockUsePurchaseOrderReceipts.mockReturnValueOnce({
      data: {
        receipts: [
          {
            id: 'receipt-1',
            receiptNumber: 'GR-100',
            receivedAt: '2026-04-20T00:00:00.000Z',
            totalItemsReceived: 2,
            totalItemsRejected: 0,
            items: [],
          },
        ],
      },
      isLoading: false,
      error: new Error('Purchase order receipts are temporarily unavailable. Please refresh and try again.'),
    });

    const { POReceiptsTab } = await import('@/components/domain/purchase-orders/tabs/po-receipts-tab');

    render(<POReceiptsTab poId="po-1" />);

    expect(screen.getByText('Receipt history may be outdated')).toBeInTheDocument();
    expect(screen.getByText('1 receipt recorded')).toBeInTheDocument();
    expect(screen.getByText('GR-100')).toBeInTheDocument();
  });

  it('shows an unavailable state instead of a fake empty cost table when costs fail without data', async () => {
    mockUsePurchaseOrderCosts.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: new Error('Purchase order costs are temporarily unavailable. Please refresh and try again.'),
    });
    mockUseAllocatedCosts.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: null,
    });

    const { POCostsTab } = await import('@/components/domain/purchase-orders/tabs/po-costs-tab');

    render(
      <POCostsTab
        poId="po-1"
        poStatus="ordered"
        totalPOValue={100}
        poCurrency="AUD"
      />
    );

    expect(screen.getByText('Purchase order costs unavailable')).toBeInTheDocument();
    expect(screen.queryByText('No additional costs recorded')).not.toBeInTheDocument();
  });

  it('preserves actionable allocated-cost validation messaging in the costs tab', async () => {
    mockUsePurchaseOrderCosts.mockReturnValueOnce({
      data: {
        costs: [],
        totalCosts: 0,
      },
      isLoading: false,
      error: null,
    });
    mockUseAllocatedCosts.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: new Error(
        'Purchase order currency (USD) differs from organization currency (AUD). Set exchange rate on the purchase order to view landed cost.'
      ),
    });

    const { POCostsTab } = await import('@/components/domain/purchase-orders/tabs/po-costs-tab');

    render(
      <POCostsTab
        poId="po-1"
        poStatus="ordered"
        totalPOValue={100}
        poCurrency="USD"
      />
    );

    expect(screen.getByText('Landed cost allocation unavailable')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Purchase order currency (USD) differs from organization currency (AUD). Set exchange rate on the purchase order to view landed cost.'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Landed cost allocation is temporarily unavailable. Please refresh and try again.')
    ).not.toBeInTheDocument();
  });

  it('blocks bulk receiving when required purchase-order details cannot be loaded safely', async () => {
    mockUseBulkPurchaseOrders.mockReturnValueOnce({
      queries: [
        {
          isError: true,
          refetch: vi.fn(),
        },
      ],
      isLoading: false,
      hasErrors: true,
      errors: [
        {
          poId: 'po-1',
          error: Object.assign(new Error('The requested purchase order could not be found.'), {
            failureKind: 'not-found',
            contractType: 'detail-not-found',
          }),
        },
      ],
    });

    const { BulkReceivingDialogContainer } = await import(
      '@/components/domain/procurement/receiving/bulk-receiving-dialog-container'
    );

    render(
      <BulkReceivingDialogContainer
        open
        onOpenChange={vi.fn()}
        purchaseOrders={[
          {
            id: 'po-1',
            poNumber: 'PO-100',
          } as never,
        ]}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('Some purchase orders could not be found')).toBeInTheDocument();
    expect(screen.getByText('PO-100: The requested purchase order could not be found.')).toBeInTheDocument();
  });
});
