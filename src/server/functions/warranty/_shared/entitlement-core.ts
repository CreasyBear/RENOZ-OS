'use server'

/**
 * Warranty entitlement provisioning helpers.
 *
 * Internal-only helpers for creating delivery-backed entitlement rows.
 * Kept separate from public server functions so order fulfillment can reuse
 * the same logic without importing route-facing handlers.
 */

import { and, eq } from 'drizzle-orm';
import type { TransactionExecutor } from '@/lib/db';
import {
  orderLineItems,
  orderShipments,
  orders,
  products,
  shipmentItems,
  warrantyEntitlements,
} from 'drizzle/schema';
import { NotFoundError } from '@/lib/server/errors';
import { normalizeSerial } from '@/lib/serials';
import {
  findSerializedItemBySerial,
} from '@/server/functions/_shared/serialized-lineage';
import { resolveWarrantyPolicyTx } from './policy-resolution';

async function entitlementExistsTx(
  tx: TransactionExecutor,
  organizationId: string,
  shipmentItemId: string,
  input: { productSerial?: string | null; unitSequence?: number | null }
) {
  if (input.productSerial) {
    const [existing] = await tx
      .select({ id: warrantyEntitlements.id })
      .from(warrantyEntitlements)
      .where(
        and(
          eq(warrantyEntitlements.organizationId, organizationId),
          eq(warrantyEntitlements.shipmentItemId, shipmentItemId),
          eq(warrantyEntitlements.productSerial, input.productSerial)
        )
      )
      .limit(1);
    return existing ?? null;
  }

  if (typeof input.unitSequence === 'number') {
    const [existing] = await tx
      .select({ id: warrantyEntitlements.id })
      .from(warrantyEntitlements)
      .where(
        and(
          eq(warrantyEntitlements.organizationId, organizationId),
          eq(warrantyEntitlements.shipmentItemId, shipmentItemId),
          eq(warrantyEntitlements.unitSequence, input.unitSequence)
        )
      )
      .limit(1);
    return existing ?? null;
  }

  return null;
}

async function placeholderReviewEntitlementExistsTx(
  tx: TransactionExecutor,
  organizationId: string,
  shipmentItemId: string
) {
  const [existing] = await tx
    .select({ id: warrantyEntitlements.id })
    .from(warrantyEntitlements)
    .where(
      and(
        eq(warrantyEntitlements.organizationId, organizationId),
        eq(warrantyEntitlements.shipmentItemId, shipmentItemId),
        eq(warrantyEntitlements.evidenceType, 'unitized'),
        eq(warrantyEntitlements.status, 'needs_review')
      )
    )
    .limit(1);

  return existing ?? null;
}

function getWholeUnitCount(quantity: unknown): number | null {
  const parsed = Number(quantity ?? 0);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  // Fractional delivered quantities cannot be deterministically unitized into
  // one-entitlement-per-covered-unit rows, so callers surface them for review.
  if (!Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
}

export async function createEntitlementsForDeliveredShipmentTx(
  tx: TransactionExecutor,
  params: {
    organizationId: string;
    shipmentId: string;
    deliveredAt: Date;
    userId: string;
  }
) {
  const [shipment] = await tx
    .select({
      shipmentId: orderShipments.id,
      orderId: orders.id,
      commercialCustomerId: orders.customerId,
    })
    .from(orderShipments)
    .innerJoin(orders, eq(orders.id, orderShipments.orderId))
    .where(
      and(
        eq(orderShipments.id, params.shipmentId),
        eq(orderShipments.organizationId, params.organizationId),
        eq(orders.organizationId, params.organizationId)
      )
    )
    .limit(1);

  if (!shipment) {
    throw new NotFoundError('Shipment not found', 'shipment');
  }

  const items = await tx
    .select({
      shipmentItemId: shipmentItems.id,
      orderLineItemId: shipmentItems.orderLineItemId,
      quantity: shipmentItems.quantity,
      serialNumbers: shipmentItems.serialNumbers,
      productId: orderLineItems.productId,
      productIsSerialized: products.isSerialized,
    })
    .from(shipmentItems)
    .innerJoin(orderLineItems, eq(orderLineItems.id, shipmentItems.orderLineItemId))
    .leftJoin(products, eq(products.id, orderLineItems.productId))
    .where(
      and(
        eq(shipmentItems.shipmentId, params.shipmentId),
        eq(shipmentItems.organizationId, params.organizationId),
        eq(orderLineItems.organizationId, params.organizationId)
      )
    );

  let created = 0;
  let skipped = 0;

  for (const item of items) {
    if (!item.productId) {
      skipped += 1;
      continue;
    }

    const quantityUnits = getWholeUnitCount(item.quantity);
    const { policy } = await resolveWarrantyPolicyTx(tx, {
      organizationId: params.organizationId,
      productId: item.productId,
    });

    if (quantityUnits === 0) {
      continue;
    }

    if (quantityUnits == null) {
      const existing = await placeholderReviewEntitlementExistsTx(
        tx,
        params.organizationId,
        item.shipmentItemId
      );

      if (existing) {
        skipped += 1;
        continue;
      }

      await tx.insert(warrantyEntitlements).values({
        organizationId: params.organizationId,
        orderId: shipment.orderId,
        shipmentId: shipment.shipmentId,
        shipmentItemId: item.shipmentItemId,
        orderLineItemId: item.orderLineItemId,
        commercialCustomerId: shipment.commercialCustomerId,
        productId: item.productId,
        warrantyPolicyId: policy?.id ?? null,
        evidenceType: 'unitized',
        status: 'needs_review',
        provisioningIssueCode: policy ? null : 'policy_unresolved',
        deliveredAt: params.deliveredAt,
        createdBy: params.userId,
        updatedBy: params.userId,
      });
      created += 1;
      continue;
    }

    const uniqueSerials = Array.from(
      new Set(
        ((item.serialNumbers as string[] | null) ?? [])
          .map((serial) => normalizeSerial(serial))
          .filter((serial) => serial.length > 0)
      )
    ).slice(0, quantityUnits);

    for (const serial of uniqueSerials) {
      const existing = await entitlementExistsTx(tx, params.organizationId, item.shipmentItemId, {
        productSerial: serial,
      });
      if (existing) {
        skipped += 1;
        continue;
      }

      const serializedItem = await findSerializedItemBySerial(tx, params.organizationId, serial, {
        userId: params.userId,
        productId: item.productId,
        source: 'warranty_entitlement_delivery',
      });

      await tx.insert(warrantyEntitlements).values({
        organizationId: params.organizationId,
        orderId: shipment.orderId,
        shipmentId: shipment.shipmentId,
        shipmentItemId: item.shipmentItemId,
        orderLineItemId: item.orderLineItemId,
        commercialCustomerId: shipment.commercialCustomerId,
        productId: item.productId,
        warrantyPolicyId: policy?.id ?? null,
        serializedItemId: serializedItem?.id ?? null,
        productSerial: serial,
        evidenceType: 'serialized',
        status: policy ? 'pending_activation' : 'needs_review',
        provisioningIssueCode: policy ? null : 'policy_unresolved',
        deliveredAt: params.deliveredAt,
        createdBy: params.userId,
        updatedBy: params.userId,
      });
      created += 1;
    }

    const unitStart = item.productIsSerialized ? uniqueSerials.length + 1 : 1;

    for (let unitSequence = unitStart; unitSequence <= quantityUnits; unitSequence += 1) {
      if (item.productIsSerialized === true && uniqueSerials.length >= quantityUnits) {
        break;
      }

      const existing = await entitlementExistsTx(tx, params.organizationId, item.shipmentItemId, {
        unitSequence,
      });
      if (existing) {
        skipped += 1;
        continue;
      }

      await tx.insert(warrantyEntitlements).values({
        organizationId: params.organizationId,
        orderId: shipment.orderId,
        shipmentId: shipment.shipmentId,
        shipmentItemId: item.shipmentItemId,
        orderLineItemId: item.orderLineItemId,
        commercialCustomerId: shipment.commercialCustomerId,
        productId: item.productId,
        warrantyPolicyId: policy?.id ?? null,
        unitSequence,
        evidenceType: 'unitized',
        // For serialized products, unitized fallback rows preserve coverage even
        // when serial capture is incomplete and activation needs operator review.
        status: policy ? (item.productIsSerialized ? 'needs_review' : 'pending_activation') : 'needs_review',
        provisioningIssueCode: policy
          ? item.productIsSerialized
            ? 'missing_serial_capture'
            : null
          : 'policy_unresolved',
        deliveredAt: params.deliveredAt,
        createdBy: params.userId,
        updatedBy: params.userId,
      });
      created += 1;
    }
  }

  return { created, skipped };
}
