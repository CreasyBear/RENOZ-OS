/**
 * Shipments Hooks
 *
 * TanStack Query hooks for shipment data fetching and mutations.
 * Provides list, detail, and mutation operations for order shipments.
 *
 * @see src/server/functions/orders/order-shipments.ts for server functions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import type { ShipmentStatus } from '@/lib/schemas/orders';
import {
  listShipments,
  getShipment,
  confirmDelivery,
  updateShipmentStatus,
  getOrderShipments,
  createShipment,
  markShipped,
  deleteShipment,
} from '@/server/functions/orders/order-shipments';

// ============================================================================
// TYPES
// ============================================================================

export interface UseShipmentsOptions {
  orderId?: string;
  status?: ShipmentStatus;
  carrier?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'shippedAt' | 'deliveredAt' | 'status';
  sortOrder?: 'asc' | 'desc';
  enabled?: boolean;
  /** Polling interval in milliseconds. Set to false to disable polling. */
  refetchInterval?: number | false;
}

export interface UseShipmentOptions {
  shipmentId: string;
  enabled?: boolean;
}

// ============================================================================
// LIST HOOK
// ============================================================================

/**
 * Hook for fetching shipments with filters and pagination.
 * Supports polling for live updates.
 */
export function useShipments(options: UseShipmentsOptions = {}) {
  const {
    orderId,
    status,
    carrier,
    dateFrom,
    dateTo,
    page = 1,
    pageSize = 50,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    enabled = true,
    refetchInterval = false,
  } = options;

  const listShipmentsFn = useServerFn(listShipments);

  const filters = {
    orderId,
    status,
    carrier,
    dateFrom,
    dateTo,
    page,
    pageSize,
    sortBy,
    sortOrder,
  };

  return useQuery({
    queryKey: queryKeys.orders.shipments(filters),
    queryFn: async () => {
      const result = await listShipmentsFn({ data: filters });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000,
    refetchInterval,
  });
}

// ============================================================================
// DETAIL HOOK
// ============================================================================

/**
 * Hook for fetching a single shipment with items.
 */
export function useShipment({ shipmentId, enabled = true }: UseShipmentOptions) {
  const getShipmentFn = useServerFn(getShipment);

  return useQuery({
    queryKey: queryKeys.orders.shipmentDetail(shipmentId),
    queryFn: async () => {
      const result = await getShipmentFn({
        data: { id: shipmentId }
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!shipmentId,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook for confirming shipment delivery.
 */
export function useConfirmDelivery() {
  const queryClient = useQueryClient();

  const confirmFn = useServerFn(confirmDelivery);

  return useMutation({
    mutationFn: (input: { id: string; deliveredAt?: Date; signedBy?: string; signature?: string; photoUrl?: string; notes?: string }) =>
      confirmFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.shipments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });
}

/**
 * Hook for updating shipment status.
 */
export function useUpdateShipmentStatus() {
  const queryClient = useQueryClient();

  const updateFn = useServerFn(updateShipmentStatus);

  return useMutation({
    mutationFn: (input: { id: string; status: ShipmentStatus; trackingEvent?: { timestamp: string; status: string; location?: string; description?: string }; deliveryConfirmation?: { confirmedAt: string; signedBy?: string; signature?: string; photoUrl?: string; notes?: string } }) =>
      updateFn({ data: input }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.shipments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.shipmentDetail(variables.id) });
    },
  });
}

// ============================================================================
// ORDER SHIPMENTS HOOK
// ============================================================================

/**
 * Hook for fetching all shipments for an order.
 */
export function useOrderShipments(orderId: string, enabled = true) {
  const getOrderShipmentsFn = useServerFn(getOrderShipments);

  return useQuery({
    queryKey: queryKeys.orders.shipments({ orderId }),
    queryFn: async () => {
      const result = await getOrderShipmentsFn({
        data: { orderId }
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: enabled && !!orderId,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// CREATE SHIPMENT HOOK
// ============================================================================

export interface CreateShipmentInput {
  orderId: string;
  carrier?: string;
  carrierService?: string;
  trackingNumber?: string;
  shippingCost?: number; // Actual cost in cents
  notes?: string;
  shippingAddress?: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    phone?: string;
  };
  items: Array<{
    orderLineItemId: string;
    quantity: number;
    serialNumbers?: string[];
    lotNumber?: string;
    expiryDate?: Date;
    notes?: string;
  }>;
}

/**
 * Hook for creating a new shipment.
 */
export function useCreateShipment() {
  const queryClient = useQueryClient();

  const createFn = useServerFn(createShipment);

  return useMutation({
    mutationFn: (input: CreateShipmentInput) => createFn({ data: input }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.shipments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.withCustomer(variables.orderId) });
    },
  });
}

// ============================================================================
// MARK SHIPPED HOOK
// ============================================================================

export interface MarkShippedInput {
  id: string;
  carrier: string;
  carrierService?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippedAt?: Date;
  shippingCost?: number; // Actual cost in cents
}

/**
 * Hook for marking a shipment as shipped.
 */
export function useMarkShipped() {
  const queryClient = useQueryClient();

  const markFn = useServerFn(markShipped);

  return useMutation({
    mutationFn: (input: MarkShippedInput) => markFn({ data: input }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.shipments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.shipmentDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });
}

// ============================================================================
// DELETE SHIPMENT HOOK
// ============================================================================

/**
 * Hook for deleting a shipment.
 */
export function useDeleteShipment() {
  const queryClient = useQueryClient();

  const deleteFn = useServerFn(deleteShipment);

  return useMutation({
    mutationFn: (shipmentId: string) => deleteFn({ data: { id: shipmentId } }),
    onSuccess: (_result, variables) => {
      // Invalidate both list and detail caches per STANDARDS.md
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.shipments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.shipmentDetail(variables) });
    },
  });
}
