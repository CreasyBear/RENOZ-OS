import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMutateAsync = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/hooks/orders/use-orders', () => ({
  useCreateOrder: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/components/layout', () => {
  const Root = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  Root.Header = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  Root.Content = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return { PageLayout: Root };
});

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/domain/orders/creation/order-creation-wizard', () => ({
  OrderCreationWizard: ({ onSubmit }: { onSubmit: (data: Record<string, unknown>) => Promise<unknown> }) => (
    <button
      onClick={() => {
        void onSubmit({
          customerId: '11111111-1111-4111-8111-111111111111',
          status: 'draft',
          paymentStatus: 'pending',
          orderDate: new Date('2026-03-19'),
          dueDate: null,
          shippingAddress: undefined,
          billingAddress: undefined,
          discountPercent: undefined,
          discountAmount: undefined,
          shippingAmount: 0,
          internalNotes: undefined,
          customerNotes: undefined,
          metadata: {},
          lineItems: [
            {
              productId: '22222222-2222-4222-8222-222222222222',
              description: 'Battery',
              quantity: 1,
              unitPrice: 10,
              taxType: 'gst',
            },
          ],
        });
        void onSubmit({
          customerId: '11111111-1111-4111-8111-111111111111',
          status: 'draft',
          paymentStatus: 'pending',
          orderDate: new Date('2026-03-19'),
          dueDate: null,
          shippingAddress: undefined,
          billingAddress: undefined,
          discountPercent: undefined,
          discountAmount: undefined,
          shippingAmount: 0,
          internalNotes: undefined,
          customerNotes: undefined,
          metadata: {},
          lineItems: [
            {
              productId: '22222222-2222-4222-8222-222222222222',
              description: 'Battery',
              quantity: 1,
              unitPrice: 10,
              taxType: 'gst',
            },
          ],
        });
      }}
    >
      submit
    </button>
  ),
}));

describe('OrderCreatePage request identity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({ id: 'order-1', orderNumber: 'ORD-1' });
  });

  it('reuses the same clientRequestId across repeated submits in one page session', async () => {
    const { default: OrderCreatePage } = await import('@/routes/_authenticated/orders/-create-page');

    render(<OrderCreatePage />);

    fireEvent.click(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(2);
    });

    const firstCall = mockMutateAsync.mock.calls[0][0];
    const secondCall = mockMutateAsync.mock.calls[1][0];

    expect(firstCall.clientRequestId).toMatch(/^order-create:/);
    expect(firstCall.clientRequestId).toBe(secondCall.clientRequestId);
  });
});
