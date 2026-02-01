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

// Dynamic imports to prevent server-only code from being bundled to client
const loadShipmentsModule = async () => import('@/server/functions/orders/order-shipments');

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

  const listShipmentsFn = useServerFn(async ({ data }: { data: Parameters<Awaited<ReturnType<typeof loadShipmentsModule>>['listShipments']>[0]['data'] }) => {
    const { listShipments } = await loadShipmentsModule();
    return listShipments({ data });
  });

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
    queryFn: () => listShipmentsFn({ data: filters }),
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
  const getShipmentFn = useServerFn(async ({ data }: { data: { id: string } }) => {
    const { getShipment } = await loadShipmentsModule();
    return getShipment({ data });
  });

  return useQuery({
    queryKey: queryKeys.orders.shipmentDetail(shipmentId),
    queryFn: () => getShipmentFn({ data: { id: shipmentId } }),
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

  const confirmFn = useServerFn(async ({ data }: { data: { id: string; deliveredAt?: Date; signedBy?: string; signature?: string; photoUrl?: string; notes?: string } }) => {
    const { confirmDelivery } = await loadShipmentsModule();
    return confirmDelivery({ data });
  });

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

  const updateFn = useServerFn(async ({ data }: { data: { id: string; status: ShipmentStatus; trackingEvent?: { timestamp: string; status: string; location?: string; description?: string }; deliveryConfirmation?: { confirmedAt: string; signedBy?: string; signature?: string; photoUrl?: string; notes?: string } } }) => {
    const { updateShipmentStatus } = await loadShipmentsModule();
    return updateShipmentStatus({ data });
  });

  return useMutation({
    mutationFn: (input: { id: string; status: ShipmentStatus; trackingEvent?: { timestamp: string; status: string; location?: string; description?: string }; deliveryConfirmation?: { confirmedAt: string; signedBy?: string; signature?: string; photoUrl?: string; notes?: string } }) =>
      updateFn({ data: input }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.shipments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.shipmentDetail(variables.id) });
    },
  });
}
