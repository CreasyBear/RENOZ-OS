import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockUseOrderShipments = vi.fn();
const mockMarkShippedMutateAsync = vi.fn();

vi.mock('resend', () => ({
  Resend: class MockResend {},
}));

vi.mock('@/hooks/orders', () => ({
  useOrderShipments: (...args: unknown[]) => mockUseOrderShipments(...args),
  useMarkShipped: () => ({
    mutateAsync: mockMarkShippedMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/hooks/documents', () => ({
  useGenerateShipmentPackingSlip: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useGenerateShipmentDispatchNote: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useGenerateShipmentDeliveryNote: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe('shipment list', () => {
  it('lets users mark an existing pending shipment draft as shipped', async () => {
    mockUseOrderShipments.mockReturnValue({
      data: [
        {
          id: '5c646761-ef6c-45c8-a150-c41f8ab37708',
          shipmentNumber: 'ORD-20260407-S01',
          status: 'pending',
          carrier: 'DHL',
          carrierService: 'Express',
          trackingNumber: 'TRACK-123',
          trackingUrl: null,
          shippingCost: 1250,
          shippedAt: null,
          estimatedDeliveryAt: null,
          deliveredAt: null,
          deliveryConfirmation: null,
          trackingEvents: [],
          canGenerateDispatchNote: true,
          dispatchNoteBlockedReason: null,
          canGenerateDeliveryNote: false,
          deliveryNoteBlockedReason: 'Confirm delivery first.',
          items: [
            {
              id: 'item-1',
              orderLineItemId: 'line-1',
              quantity: 1,
              serialNumbers: null,
            },
          ],
        },
      ],
      isLoading: false,
      error: null,
    });
    mockMarkShippedMutateAsync.mockResolvedValue({});

    const { ShipmentList } = await import('@/components/domain/orders/fulfillment/shipment-list');

    render(<ShipmentList orderId="order-1" />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Mark Shipped' })[0]);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByDisplayValue('DHL')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('Express')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('TRACK-123')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('12.50')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(within(dialog).getAllByRole('button', { name: 'Mark Shipped' })[0]);
    });

    expect(mockMarkShippedMutateAsync).toHaveBeenCalledWith({
      id: '5c646761-ef6c-45c8-a150-c41f8ab37708',
      idempotencyKey: expect.stringContaining('shipment-mark-shipped:5c646761-ef6c-45c8-a150-c41f8ab37708:'),
      carrier: 'DHL',
      carrierService: 'Express',
      trackingNumber: 'TRACK-123',
      shippingCost: 1250,
    });
  }, 20000);
});
