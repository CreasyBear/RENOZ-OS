'use server'

import { createServerFn } from '@tanstack/react-start';
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  activities,
  customers,
  orders,
  orderShipments,
  products,
  warranties,
  warrantyEntitlements,
  warrantyItems,
  warrantyOwnerRecords,
  warrantyPolicies,
} from 'drizzle/schema';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { containsPattern } from '@/lib/db/utils';
import {
  activateWarrantyFromEntitlementSchema,
  getWarrantyEntitlementSchema,
  warrantyEntitlementFiltersSchema,
  type ListWarrantyEntitlementsResult,
  type WarrantyEntitlementDetail,
  type WarrantyEntitlementListItem,
} from '@/lib/schemas/warranty/entitlements';
import { serializedMutationSuccess } from '@/lib/server/serialized-mutation-contract';
import { ValidationError, NotFoundError } from '@/lib/server/errors';
import { withAuth } from '@/lib/server/protected';
import { addSerializedItemEvent } from '@/server/functions/_shared/serialized-lineage';
import { getServiceContextForWarranty } from '@/server/functions/service/_shared/service-resolver';
import { ensureWarrantyServiceLinkageTx } from '@/server/functions/service/_shared/service-writer';
import { generateWarrantyNumbersTx } from './_shared/warranty-numbering';

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function startOfDayUtc(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export const listWarrantyEntitlements = createServerFn({ method: 'GET' })
  .inputValidator(warrantyEntitlementFiltersSchema)
  .handler(async ({ data }): Promise<ListWarrantyEntitlementsResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.read });

    const conditions = [eq(warrantyEntitlements.organizationId, ctx.organizationId)];

    if (data.status) {
      conditions.push(eq(warrantyEntitlements.status, data.status));
    }

    if (data.customerId) {
      conditions.push(eq(warrantyEntitlements.commercialCustomerId, data.customerId));
    }

    if (data.search) {
      const searchPattern = containsPattern(data.search);
      conditions.push(
        or(
          ilike(customers.name, searchPattern),
          ilike(products.name, searchPattern),
          ilike(orders.orderNumber, searchPattern),
          ilike(orderShipments.shipmentNumber, searchPattern),
          ilike(warrantyEntitlements.productSerial, searchPattern)
        )!
      );
    }

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(warrantyEntitlements)
      .innerJoin(customers, eq(customers.id, warrantyEntitlements.commercialCustomerId))
      .innerJoin(products, eq(products.id, warrantyEntitlements.productId))
      .innerJoin(orders, eq(orders.id, warrantyEntitlements.orderId))
      .innerJoin(orderShipments, eq(orderShipments.id, warrantyEntitlements.shipmentId))
      .where(and(...conditions));

    const orderColumn =
      data.sortBy === 'status'
        ? warrantyEntitlements.status
        : data.sortBy === 'createdAt'
          ? warrantyEntitlements.createdAt
          : warrantyEntitlements.deliveredAt;
    const orderDirection = data.sortOrder === 'asc' ? asc : desc;

    const rows = await db
      .select({
        id: warrantyEntitlements.id,
        status: warrantyEntitlements.status,
        evidenceType: warrantyEntitlements.evidenceType,
        provisioningIssueCode: warrantyEntitlements.provisioningIssueCode,
        deliveredAt: warrantyEntitlements.deliveredAt,
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        shipmentId: orderShipments.id,
        shipmentNumber: orderShipments.shipmentNumber,
        customerId: customers.id,
        customerName: customers.name,
        productId: products.id,
        productName: products.name,
        productSku: products.sku,
        productSerial: warrantyEntitlements.productSerial,
        unitSequence: warrantyEntitlements.unitSequence,
        warrantyPolicyId: warrantyPolicies.id,
        policyName: warrantyPolicies.name,
        activatedWarrantyId: warranties.id,
        activatedWarrantyNumber: warranties.warrantyNumber,
      })
      .from(warrantyEntitlements)
      .innerJoin(customers, eq(customers.id, warrantyEntitlements.commercialCustomerId))
      .innerJoin(products, eq(products.id, warrantyEntitlements.productId))
      .innerJoin(orders, eq(orders.id, warrantyEntitlements.orderId))
      .innerJoin(orderShipments, eq(orderShipments.id, warrantyEntitlements.shipmentId))
      .leftJoin(warrantyPolicies, eq(warrantyPolicies.id, warrantyEntitlements.warrantyPolicyId))
      // Activation is authoritative from warranties -> sourceEntitlementId.
      .leftJoin(warranties, eq(warranties.sourceEntitlementId, warrantyEntitlements.id))
      .where(and(...conditions))
      .orderBy(orderDirection(orderColumn))
      .limit(data.limit)
      .offset(data.offset);

    const entitlements: WarrantyEntitlementListItem[] = rows.map((row) => ({
      ...row,
      deliveredAt: row.deliveredAt.toISOString(),
    }));

    const total = countRow?.count ?? 0;

    return {
      entitlements,
      total,
      hasMore: data.offset + entitlements.length < total,
      nextOffset:
        data.offset + entitlements.length < total ? data.offset + entitlements.length : undefined,
    };
  });

export const getWarrantyEntitlement = createServerFn({ method: 'GET' })
  .inputValidator(getWarrantyEntitlementSchema)
  .handler(async ({ data }): Promise<WarrantyEntitlementDetail> => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.read });

    const [row] = await db
      .select({
        id: warrantyEntitlements.id,
        status: warrantyEntitlements.status,
        evidenceType: warrantyEntitlements.evidenceType,
        provisioningIssueCode: warrantyEntitlements.provisioningIssueCode,
        deliveredAt: warrantyEntitlements.deliveredAt,
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        shipmentId: orderShipments.id,
        shipmentNumber: orderShipments.shipmentNumber,
        customerId: customers.id,
        customerName: customers.name,
        productId: products.id,
        productName: products.name,
        productSku: products.sku,
        productSerial: warrantyEntitlements.productSerial,
        unitSequence: warrantyEntitlements.unitSequence,
        warrantyPolicyId: warrantyPolicies.id,
        policyName: warrantyPolicies.name,
        activatedWarrantyId: warranties.id,
        activatedWarrantyNumber: warranties.warrantyNumber,
        ownerRecordId: warrantyOwnerRecords.id,
        ownerRecordFullName: warrantyOwnerRecords.fullName,
        ownerRecordEmail: warrantyOwnerRecords.email,
        ownerRecordPhone: warrantyOwnerRecords.phone,
        ownerRecordAddress: warrantyOwnerRecords.address,
        ownerRecordNotes: warrantyOwnerRecords.notes,
      })
      .from(warrantyEntitlements)
      .innerJoin(customers, eq(customers.id, warrantyEntitlements.commercialCustomerId))
      .innerJoin(products, eq(products.id, warrantyEntitlements.productId))
      .innerJoin(orders, eq(orders.id, warrantyEntitlements.orderId))
      .innerJoin(orderShipments, eq(orderShipments.id, warrantyEntitlements.shipmentId))
      .leftJoin(warrantyPolicies, eq(warrantyPolicies.id, warrantyEntitlements.warrantyPolicyId))
      // Keep detail reads aligned with the one-way activation link.
      .leftJoin(warranties, eq(warranties.sourceEntitlementId, warrantyEntitlements.id))
      .leftJoin(warrantyOwnerRecords, eq(warrantyOwnerRecords.id, warranties.ownerRecordId))
      .where(
        and(
          eq(warrantyEntitlements.id, data.id),
          eq(warrantyEntitlements.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!row) {
      throw new NotFoundError('Warranty entitlement not found', 'warrantyEntitlement');
    }

    return {
      id: row.id,
      status: row.status,
      evidenceType: row.evidenceType,
      provisioningIssueCode: row.provisioningIssueCode,
      deliveredAt: row.deliveredAt.toISOString(),
      orderId: row.orderId,
      orderNumber: row.orderNumber,
      shipmentId: row.shipmentId,
      shipmentNumber: row.shipmentNumber,
      customerId: row.customerId,
      customerName: row.customerName,
      productId: row.productId,
      productName: row.productName,
      productSku: row.productSku,
      productSerial: row.productSerial,
      unitSequence: row.unitSequence,
      warrantyPolicyId: row.warrantyPolicyId,
      policyName: row.policyName,
      activatedWarrantyId: row.activatedWarrantyId,
      activatedWarrantyNumber: row.activatedWarrantyNumber,
      commercialCustomer: {
        id: row.customerId,
        name: row.customerName,
      },
      ownerRecord: row.ownerRecordId
        ? {
            id: row.ownerRecordId,
            fullName: row.ownerRecordFullName ?? '',
            email: row.ownerRecordEmail,
            phone: row.ownerRecordPhone,
            address: row.ownerRecordAddress ?? null,
            notes: row.ownerRecordNotes,
          }
        : null,
    };
  });

export const activateWarrantyFromEntitlement = createServerFn({ method: 'POST' })
  .inputValidator(activateWarrantyFromEntitlementSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.create });

    return db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`
      );

      const [entitlement] = await tx
        .select({
          id: warrantyEntitlements.id,
          status: warrantyEntitlements.status,
          orderId: warrantyEntitlements.orderId,
          shipmentId: warrantyEntitlements.shipmentId,
          productId: warrantyEntitlements.productId,
          productSerial: warrantyEntitlements.productSerial,
          warrantyPolicyId: warrantyEntitlements.warrantyPolicyId,
          commercialCustomerId: warrantyEntitlements.commercialCustomerId,
          deliveredAt: warrantyEntitlements.deliveredAt,
          unitSequence: warrantyEntitlements.unitSequence,
          evidenceType: warrantyEntitlements.evidenceType,
          serializedItemId: warrantyEntitlements.serializedItemId,
          policyDurationMonths: warrantyPolicies.durationMonths,
          productName: products.name,
        })
        .from(warrantyEntitlements)
        .innerJoin(products, eq(products.id, warrantyEntitlements.productId))
        .leftJoin(warrantyPolicies, eq(warrantyPolicies.id, warrantyEntitlements.warrantyPolicyId))
        .where(
          and(
            eq(warrantyEntitlements.id, data.entitlementId),
            eq(warrantyEntitlements.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!entitlement) {
        throw new NotFoundError('Warranty entitlement not found', 'warrantyEntitlement');
      }

      const [existingWarranty] = await tx
        .select({
          id: warranties.id,
          warrantyNumber: warranties.warrantyNumber,
        })
        .from(warranties)
        .where(
          and(
            eq(warranties.organizationId, ctx.organizationId),
            eq(warranties.sourceEntitlementId, entitlement.id)
          )
        )
        .limit(1);

      if (existingWarranty) {
        // sourceEntitlementId is the only authoritative activation link, so if we
        // find a warranty here we repair the entitlement status instead of relying
        // on a redundant backlink field.
        if (entitlement.status !== 'activated') {
          await tx
            .update(warrantyEntitlements)
            .set({
              status: 'activated',
              updatedBy: ctx.user.id,
              updatedAt: new Date(),
            })
            .where(eq(warrantyEntitlements.id, entitlement.id));
        }

        return serializedMutationSuccess(
          {
            entitlementId: entitlement.id,
            warrantyId: existingWarranty.id,
            warrantyNumber: existingWarranty.warrantyNumber,
          },
          'Warranty entitlement already activated.',
          {
            affectedIds: [entitlement.id, existingWarranty.id],
          }
        );
      }

      if (!entitlement.warrantyPolicyId || !entitlement.policyDurationMonths) {
        throw new ValidationError(
          'This entitlement cannot be activated until a warranty policy is resolved.'
        );
      }

      const [warrantyNumber] = await generateWarrantyNumbersTx(tx, {
        organizationId: ctx.organizationId,
        count: 1,
      });
      const activationDate = startOfDayUtc(data.activationDate);
      const expiryDate = addMonths(activationDate, entitlement.policyDurationMonths);
      const expiryDateString = toDateOnly(expiryDate);

      const [warranty] = await tx
        .insert(warranties)
        .values({
          organizationId: ctx.organizationId,
          warrantyNumber,
          customerId: entitlement.commercialCustomerId,
          productId: entitlement.productId,
          productSerial: entitlement.productSerial,
          warrantyPolicyId: entitlement.warrantyPolicyId,
          orderId: entitlement.orderId,
          sourceEntitlementId: entitlement.id,
          activatedAt: activationDate,
          registrationDate: activationDate,
          expiryDate,
          notes: data.notes ?? null,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning({
          id: warranties.id,
          warrantyNumber: warranties.warrantyNumber,
        });

      const linkage = await ensureWarrantyServiceLinkageTx(tx, {
        organizationId: ctx.organizationId,
        warrantyId: warranty.id,
        commercialCustomerId: entitlement.commercialCustomerId,
        sourceOrderId: entitlement.orderId,
        projectId: null,
        sourceEntitlementId: entitlement.id,
        owner: data.owner,
        sourceLabel: 'Warranty Activation',
        userId: ctx.user.id,
      });

      await tx.insert(warrantyItems).values({
        organizationId: ctx.organizationId,
        warrantyId: warranty.id,
        productId: entitlement.productId,
        productSerial: entitlement.productSerial,
        warrantyStartDate: data.activationDate,
        warrantyEndDate: expiryDateString,
        warrantyPeriodMonths: entitlement.policyDurationMonths,
        installationNotes: data.notes ?? null,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      });

      await tx
        .update(warrantyEntitlements)
        .set({
          status: 'activated',
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(warrantyEntitlements.id, entitlement.id));

      if (entitlement.serializedItemId) {
        await addSerializedItemEvent(tx, {
          organizationId: ctx.organizationId,
          serializedItemId: entitlement.serializedItemId,
          eventType: 'warranty_registered',
          entityType: 'warranty',
          entityId: warranty.id,
          notes: `Warranty ${warranty.warrantyNumber} activated from entitlement`,
          userId: ctx.user.id,
        });
      }

      await tx.insert(activities).values({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        entityType: 'warranty',
        entityId: warranty.id,
        action: 'created',
        description: `Activated warranty ${warranty.warrantyNumber} from entitlement`,
        metadata: {
          customerId: entitlement.commercialCustomerId,
          orderId: entitlement.orderId,
          reason: data.notes ?? undefined,
          customFields: {
            reviewId: linkage.reviewId ?? null,
            serviceSystemId: linkage.serviceSystemId ?? null,
          },
        },
        createdBy: ctx.user.id,
      });

      if (linkage.serviceSystemId) {
        const serviceContext = await getServiceContextForWarranty(ctx.organizationId, warranty.id, tx);

        await tx.insert(activities).values({
          organizationId: ctx.organizationId,
          userId: ctx.user.id,
          entityType: 'service_system',
          entityId: linkage.serviceSystemId,
          entityName: serviceContext.serviceSystem?.displayName ?? null,
          action: 'created',
          description: `Linked warranty ${warranty.warrantyNumber} during warranty activation`,
          metadata: {
            customerId: entitlement.commercialCustomerId,
            orderId: entitlement.orderId,
            warrantyId: warranty.id,
            warrantyNumber: warranty.warrantyNumber,
            serviceSystemId: linkage.serviceSystemId,
            serviceSystemDisplayName: serviceContext.serviceSystem?.displayName,
            currentOwnerId: serviceContext.currentOwner?.id,
            currentOwnerName: serviceContext.currentOwner?.fullName,
          },
          createdBy: ctx.user.id,
        });
      }

      return serializedMutationSuccess(
        {
          entitlementId: entitlement.id,
          warrantyId: warranty.id,
          warrantyNumber: warranty.warrantyNumber,
          serviceSystemId: linkage.serviceSystemId,
          serviceLinkageReviewId: linkage.reviewId,
        },
        `Warranty ${warranty.warrantyNumber} activated.`,
        {
          affectedIds: [entitlement.id, warranty.id],
        }
      );
    });
  });
