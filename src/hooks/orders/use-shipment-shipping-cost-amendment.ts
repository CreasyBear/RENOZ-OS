import { useCallback } from 'react';
import { useApplyAmendment, useApproveAmendment, useRequestAmendment } from './use-order-amendments';
import type { RequestAmendmentInput } from './use-order-amendments';
import {
  getClientErrorMessage,
  normalizeOrderMutationError,
  type OrderMutationClientError,
} from './order-mutation-client-errors';

const SHIPMENT_SHIPPING_COST_REASON = 'Shipping cost from shipment';
const SHIPMENT_SHIPPING_COST_SYNC_FALLBACK = 'Create a shipping amendment manually.';

export interface SyncShipmentShippingCostInput {
  orderId: string;
  shippingAmount: number;
}

interface ShipmentShippingCostAmendmentMutations {
  requestAmendment: (input: RequestAmendmentInput) => Promise<{ id: string }>;
  approveAmendment: (input: { amendmentId: string }) => Promise<unknown>;
  applyAmendment: (input: { amendmentId: string }) => Promise<unknown>;
}

export type ShipmentShippingCostSyncResult =
  | {
      ok: true;
      amendmentId: string;
    }
  | {
      ok: false;
      message: string;
      error: OrderMutationClientError;
    };

export function buildShipmentShippingCostAmendmentRequest({
  orderId,
  shippingAmount,
}: SyncShipmentShippingCostInput): RequestAmendmentInput {
  return {
    orderId,
    amendmentType: 'shipping_change',
    reason: SHIPMENT_SHIPPING_COST_REASON,
    changes: {
      type: 'shipping_change',
      description: SHIPMENT_SHIPPING_COST_REASON,
      shippingAmount,
    },
  };
}

export function getShipmentShippingCostSyncErrorMessage(error: unknown): string {
  const normalized = normalizeOrderMutationError(error, 'Order shipping amount could not be updated.');
  return getClientErrorMessage(normalized, SHIPMENT_SHIPPING_COST_SYNC_FALLBACK);
}

export async function syncShipmentShippingCostAmendment({
  orderId,
  shippingAmount,
  mutations,
}: SyncShipmentShippingCostInput & {
  mutations: ShipmentShippingCostAmendmentMutations;
}): Promise<ShipmentShippingCostSyncResult> {
  try {
    const amendment = await mutations.requestAmendment(
      buildShipmentShippingCostAmendmentRequest({ orderId, shippingAmount })
    );

    await mutations.approveAmendment({ amendmentId: amendment.id });
    await mutations.applyAmendment({ amendmentId: amendment.id });

    return {
      ok: true,
      amendmentId: amendment.id,
    };
  } catch (error) {
    const normalized = normalizeOrderMutationError(
      error,
      'Order shipping amount could not be updated.'
    );

    return {
      ok: false,
      message: getClientErrorMessage(normalized, SHIPMENT_SHIPPING_COST_SYNC_FALLBACK),
      error: normalized,
    };
  }
}

export function useShipmentShippingCostAmendment() {
  const requestAmendmentMutation = useRequestAmendment();
  const approveAmendmentMutation = useApproveAmendment();
  const applyAmendmentMutation = useApplyAmendment();

  const syncShippingCost = useCallback(
    (input: SyncShipmentShippingCostInput) =>
      syncShipmentShippingCostAmendment({
        ...input,
        mutations: {
          requestAmendment: requestAmendmentMutation.mutateAsync,
          approveAmendment: approveAmendmentMutation.mutateAsync,
          applyAmendment: applyAmendmentMutation.mutateAsync,
        },
      }),
    [applyAmendmentMutation.mutateAsync, approveAmendmentMutation.mutateAsync, requestAmendmentMutation.mutateAsync]
  );

  return {
    syncShippingCost,
    isPending:
      requestAmendmentMutation.isPending ||
      approveAmendmentMutation.isPending ||
      applyAmendmentMutation.isPending,
  };
}
