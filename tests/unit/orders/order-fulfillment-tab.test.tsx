import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockUseOrderShipments = vi.fn();
const mockUseCancelAmendment = vi.fn();

vi.mock('resend', () => ({
  Resend: class MockResend {},
}));

vi.mock('@/hooks/orders', () => ({
  useOrderShipments: (...args: unknown[]) => mockUseOrderShipments(...args),
  useCancelAmendment: (...args: unknown[]) => mockUseCancelAmendment(...args),
}));

vi.mock('@/hooks/users', () => ({
  useUserLookup: () => ({
    getUser: () => null,
  }),
}));

vi.mock('@/components/domain/orders/fulfillment/shipment-list', () => ({
  ShipmentList: ({ orderId }: { orderId: string }) => (
    <div data-testid="shipment-list">Shipments for {orderId}</div>
  ),
}));

vi.mock('@/components/domain/orders/amendments', () => ({
  AmendmentList: () => <div data-testid="amendment-list" />,
}));

vi.mock('@/components/domain/orders/components', () => ({
  OrderLineItemSerialsCell: () => <span>No serials</span>,
  SerialNumbersList: () => <div />,
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}));

describe('order fulfillment tab', () => {
  it('shows shipment cards for picked orders so pending drafts remain visible', async () => {
    mockUseOrderShipments.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    mockUseCancelAmendment.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    const { OrderFulfillmentTab } = await import('@/components/domain/orders/tabs/order-fulfillment-tab');

    render(
      <OrderFulfillmentTab
        orderId="order-1"
        orderStatus="picked"
        lineItems={[
          {
            id: 'line-1',
            description: 'Serialized sensor',
            quantity: 1,
            qtyPicked: 1,
            qtyShipped: 0,
            qtyDelivered: 0,
            pickStatus: 'picked',
            allocatedSerialNumbers: [],
            productId: null,
            product: null,
          },
        ] as never}
        fulfillmentActions={{}}
      />
    );

    expect(screen.getByText('Shipments')).toBeInTheDocument();
    expect(screen.getByTestId('shipment-list')).toHaveTextContent('Shipments for order-1');
  });
});
