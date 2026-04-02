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
  expectShipmentQueryData,
  normalizeShipmentMutationError,
} from './order-mutation-client-errors';
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

function invalidateOrderCollectionQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.orders.infiniteLists() });
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
      return expectShipmentQueryData(result, 'Shipment list is unavailable.');
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
      return expectShipmentQueryData(result, 'Shipment detail is unavailable.');
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
    mutationFn: async (input: { id: string; idempotencyKey: string; deliveredAt?: Date; signedBy?: string; signature?: string; photoUrl?: string; notes?: string }) => {
      try {
        return await confirmFn({ data: input });
      } catch (error) {
        throw normalizeShipmentMutationError(error, 'Unable to confirm delivery.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.shipments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.details() });
      invalidateOrderCollectionQueries(queryClient);
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
    mutationFn: async (input: { id: string; idempotencyKey: string; status: ShipmentStatus; trackingEvent?: { timestamp: string; status: string; location?: string; description?: string }; deliveryConfirmation?: { confirmedAt: string; signedBy?: string; signature?: string; photoUrl?: string; notes?: string } }) => {
      try {
        return await updateFn({ data: input });
      } catch (error) {
        throw normalizeShipmentMutationError(error, 'Unable to update shipment status.');
      }
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.shipments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.shipmentDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.details() });
      invalidateOrderCollectionQueries(queryClient);
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
      return expectShipmentQueryData(result, 'Order shipments are unavailable.');
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
  addressSource?: 'order' | 'customer' | 'custom';
  customerAddressId?: string;
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
  saveToOrderShippingAddress?: boolean;
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
    mutationFn: async (input: CreateShipmentInput) => {
      try {
        return await createFn({ data: input });
      } catch (error) {
        throw normalizeShipmentMutationError(error, 'Unable to create shipment.');
      }
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.shipments() });
      invalidateOrderCollectionQueries(queryClient);
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
  idempotencyKey: string;
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
    mutationFn: async (input: MarkShippedInput) => {
      try {
        return await markFn({ data: input });
      } catch (error) {
        throw normalizeShipmentMutationError(error, 'Unable to mark shipment as shipped.');
      }
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.shipments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.shipmentDetail(variables.id) });
      invalidateOrderCollectionQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.details() });
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
    mutationFn: async (shipmentId: string) => {
      try {
        return await deleteFn({ data: { id: shipmentId } });
      } catch (error) {
        throw normalizeShipmentMutationError(error, 'Unable to delete shipment.');
      }
    },
    onSuccess: (_result, variables) => {
      // Invalidate both list and detail caches per STANDARDS.md
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.shipments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.shipmentDetail(variables) });
      invalidateOrderCollectionQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.details() });
    },
  });
}
