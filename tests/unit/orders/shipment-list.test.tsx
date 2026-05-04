import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseOrderShipments = vi.fn();
const mockMarkShippedMutateAsync = vi.fn();
const mockGeneratePackingSlipMutateAsync = vi.fn();
const mockGenerateDispatchNoteMutateAsync = vi.fn();
const mockGenerateDeliveryNoteMutateAsync = vi.fn();
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();

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

vi.mock('@/hooks', () => ({
  toastError: (...args: unknown[]) => mockToastError(...args),
  toastSuccess: (...args: unknown[]) => mockToastSuccess(...args),
}));

vi.mock('@/hooks/documents', () => ({
  useGenerateShipmentPackingSlip: () => ({
    mutateAsync: mockGeneratePackingSlipMutateAsync,
    isPending: false,
  }),
  useGenerateShipmentDispatchNote: () => ({
    mutateAsync: mockGenerateDispatchNoteMutateAsync,
    isPending: false,
  }),
  useGenerateShipmentDeliveryNote: () => ({
    mutateAsync: mockGenerateDeliveryNoteMutateAsync,
    isPending: false,
  }),
}));

describe('shipment list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    expect(mockToastSuccess).toHaveBeenCalledWith('Shipment ORD-20260407-S01 marked as shipped.');
  }, 20000);

  it('shows action fallback text for unknown mark-shipped failures', async () => {
    mockUseOrderShipments.mockReturnValue({
      data: [
        {
          id: '5c646761-ef6c-45c8-a150-c41f8ab37708',
          shipmentNumber: 'ORD-20260407-S01',
          status: 'pending',
          carrier: 'DHL',
          carrierService: null,
          trackingNumber: null,
          trackingUrl: null,
          shippingCost: null,
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
    mockMarkShippedMutateAsync.mockRejectedValue(new Error('database driver stack leaked'));

    const { ShipmentList } = await import('@/components/domain/orders/fulfillment/shipment-list');

    render(<ShipmentList orderId="order-1" />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Mark Shipped' })[0]);

    const dialog = screen.getByRole('dialog');

    await act(async () => {
      fireEvent.click(within(dialog).getAllByRole('button', { name: 'Mark Shipped' })[0]);
    });

    expect(mockToastError).toHaveBeenCalledWith('Unable to mark shipment as shipped.');
  }, 20000);

  it('generates shipment dispatch notes from the extracted document actions', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    mockUseOrderShipments.mockReturnValue({
      data: [
        {
          id: '5c646761-ef6c-45c8-a150-c41f8ab37708',
          shipmentNumber: 'ORD-20260407-S01',
          status: 'in_transit',
          carrier: 'DHL',
          carrierService: null,
          trackingNumber: null,
          trackingUrl: null,
          shippingCost: null,
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
    mockGenerateDispatchNoteMutateAsync.mockResolvedValue({
      url: 'https://example.test/dispatch-note.pdf',
    });

    const { ShipmentList } = await import('@/components/domain/orders/fulfillment/shipment-list');

    render(<ShipmentList orderId="order-1" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Dispatch Note' }));
    });

    expect(mockGenerateDispatchNoteMutateAsync).toHaveBeenCalledWith({
      shipmentId: '5c646761-ef6c-45c8-a150-c41f8ab37708',
    });
    expect(mockToastSuccess).toHaveBeenCalledWith('Dispatch note generated');
    expect(openSpy).toHaveBeenCalledWith(
      'https://example.test/dispatch-note.pdf',
      '_blank',
      'noopener,noreferrer'
    );

    openSpy.mockRestore();
  }, 20000);

  it('shows action fallback text for unknown shipment document failures', async () => {
    mockUseOrderShipments.mockReturnValue({
      data: [
        {
          id: '5c646761-ef6c-45c8-a150-c41f8ab37708',
          shipmentNumber: 'ORD-20260407-S01',
          status: 'in_transit',
          carrier: 'DHL',
          carrierService: null,
          trackingNumber: null,
          trackingUrl: null,
          shippingCost: null,
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
    mockGenerateDispatchNoteMutateAsync.mockRejectedValue(
      new Error('document renderer stack leaked')
    );

    const { ShipmentList } = await import('@/components/domain/orders/fulfillment/shipment-list');

    render(<ShipmentList orderId="order-1" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Dispatch Note' }));
    });

    expect(mockToastError).toHaveBeenCalledWith('Unable to generate dispatch note.');
  }, 20000);
});
