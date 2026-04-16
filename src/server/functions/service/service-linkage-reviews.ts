'use server'

import { createServerFn } from '@tanstack/react-start';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  customers,
  orders,
  orderShipments,
  serviceLinkageReviews,
  warranties,
  warrantyEntitlements,
} from 'drizzle/schema';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  getServiceLinkageReviewSchema,
  listServiceLinkageReviewsSchema,
  resolveServiceLinkageReviewSchema,
  type ServiceLinkageReviewSummary,
} from '@/lib/schemas/service';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import {
  forceCreateWarrantyServiceLinkageTx,
  syncWarrantyOwnerMirrorTx,
} from './_shared/service-writer';
import {
  getServiceContextForWarranty,
  getServiceLinkageReviewDetail,
} from './_shared/service-resolver';

export const listServiceLinkageReviews = createServerFn({ method: 'GET' })
  .inputValidator(listServiceLinkageReviewsSchema)
  .handler(async ({ data }): Promise<{ reviews: ServiceLinkageReviewSummary[] }> => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.read });
    const conditions = [eq(serviceLinkageReviews.organizationId, ctx.organizationId)];

    if (data.status) conditions.push(eq(serviceLinkageReviews.status, data.status));
    if (data.reasonCode) conditions.push(eq(serviceLinkageReviews.reasonCode, data.reasonCode));

    const rows = await db
      .select({
        id: serviceLinkageReviews.id,
        status: serviceLinkageReviews.status,
        reasonCode: serviceLinkageReviews.reasonCode,
        snapshot: serviceLinkageReviews.snapshot,
        candidateSystemIds: serviceLinkageReviews.candidateSystemIds,
        createdAt: serviceLinkageReviews.createdAt,
        customerId: customers.id,
        customerName: customers.name,
        warrantyId: warranties.id,
        warrantyNumber: warranties.warrantyNumber,
        entitlementId: warrantyEntitlements.id,
        orderNumber: orders.orderNumber,
        shipmentNumber: orderShipments.shipmentNumber,
      })
      .from(serviceLinkageReviews)
      .leftJoin(customers, eq(customers.id, serviceLinkageReviews.commercialCustomerId))
      .leftJoin(warranties, eq(warranties.id, serviceLinkageReviews.sourceWarrantyId))
      .leftJoin(orders, eq(orders.id, serviceLinkageReviews.sourceOrderId))
      .leftJoin(
        warrantyEntitlements,
        eq(warrantyEntitlements.id, serviceLinkageReviews.sourceEntitlementId)
      )
      .leftJoin(orderShipments, eq(orderShipments.id, warrantyEntitlements.shipmentId))
      .where(and(...conditions))
      .orderBy(serviceLinkageReviews.createdAt);

    return {
      reviews: rows.map((row) => ({
        id: row.id,
        status: row.status,
        reasonCode: row.reasonCode,
        commercialCustomer: row.customerId
          ? { id: row.customerId, name: row.customerName }
          : null,
        sourceWarranty: row.warrantyId
          ? { id: row.warrantyId, warrantyNumber: row.warrantyNumber ?? row.warrantyId }
          : null,
        sourceEntitlement: row.entitlementId
          ? {
              id: row.entitlementId,
              orderNumber: row.orderNumber,
              shipmentNumber: row.shipmentNumber,
            }
          : null,
        snapshot: row.snapshot ?? {},
        candidateCount: row.candidateSystemIds?.length ?? 0,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  });

export const getServiceLinkageReview = createServerFn({ method: 'GET' })
  .inputValidator(getServiceLinkageReviewSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.read });
    const detail = await getServiceLinkageReviewDetail(ctx.organizationId, data.id);

    if (!detail) {
      throw new NotFoundError('Service linkage review not found', 'serviceLinkageReview');
    }

    return detail;
  });

export const resolveServiceLinkageReview = createServerFn({ method: 'POST' })
  .inputValidator(resolveServiceLinkageReviewSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.update });
    const logger = createActivityLoggerWithContext(ctx);

    return db.transaction(async (tx) => {
      const detail = await getServiceLinkageReviewDetail(ctx.organizationId, data.reviewId, tx);
      if (!detail) {
        throw new NotFoundError('Service linkage review not found', 'serviceLinkageReview');
      }

      if (detail.status !== 'pending') {
        throw new ValidationError('Only pending linkage reviews can be resolved');
      }

      let resolvedServiceSystemId: string | null = null;
      let serviceContext = null;

      if (data.resolutionType === 'link_existing') {
        if (!data.serviceSystemId) {
          throw new ValidationError('Select an existing system to link this review');
        }
        resolvedServiceSystemId = data.serviceSystemId;

        if (detail.sourceWarranty?.id) {
          await tx
            .update(warranties)
            .set({
              serviceSystemId: resolvedServiceSystemId,
              updatedBy: ctx.user.id,
              updatedAt: new Date(),
            })
            .where(eq(warranties.id, detail.sourceWarranty.id));

          serviceContext = await getServiceContextForWarranty(
            ctx.organizationId,
            detail.sourceWarranty.id,
            tx
          );

          if (serviceContext.currentOwner) {
            await syncWarrantyOwnerMirrorTx({
              executor: tx,
              organizationId: ctx.organizationId,
              warrantyIds: [detail.sourceWarranty.id],
              owner: serviceContext.currentOwner,
              userId: ctx.user.id,
            });
          }
        }
      } else {
        if (!detail.sourceWarranty?.id) {
          throw new ValidationError('Cannot create a new system without a source warranty');
        }

        const ownerInput =
          data.owner ?? {
            fullName: detail.snapshot.ownerName ?? 'Unknown Owner',
            email: detail.snapshot.ownerEmail,
            phone: detail.snapshot.ownerPhone,
            address: detail.snapshot.siteAddress ?? undefined,
            notes: detail.snapshot.notes,
          };

        const linkage = await forceCreateWarrantyServiceLinkageTx(tx, {
          organizationId: ctx.organizationId,
          warrantyId: detail.sourceWarranty.id,
          sourceEntitlementId: detail.sourceEntitlement?.id ?? null,
          commercialCustomerId: detail.commercialCustomer?.id ?? null,
          sourceOrderId: detail.sourceOrder?.id ?? null,
          projectId: detail.project?.id ?? null,
          owner: ownerInput,
          sourceLabel: 'Service Review',
          userId: ctx.user.id,
        });

        resolvedServiceSystemId = linkage.serviceSystemId;
        serviceContext = await getServiceContextForWarranty(
          ctx.organizationId,
          detail.sourceWarranty.id,
          tx
        );
      }

      if (!resolvedServiceSystemId) {
        throw new ValidationError('Failed to resolve service linkage review');
      }

      await tx
        .update(serviceLinkageReviews)
        .set({
          status: 'resolved',
          resolvedServiceSystemId,
          resolutionNotes: data.notes ?? null,
          resolvedAt: new Date(),
          resolvedBy: ctx.user.id,
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(serviceLinkageReviews.id, data.reviewId));

      logger.logAsync({
        entityType: 'service_system',
        entityId: resolvedServiceSystemId,
        entityName: serviceContext?.serviceSystem?.displayName ?? undefined,
        action: data.resolutionType === 'create_new' ? 'created' : 'updated',
        description:
          data.resolutionType === 'create_new'
            ? 'Created service system from linkage review'
            : 'Resolved linkage review by linking existing service system',
        metadata: {
          reviewId: data.reviewId,
          serviceSystemId: resolvedServiceSystemId,
          serviceSystemDisplayName: serviceContext?.serviceSystem?.displayName,
          currentOwnerId: serviceContext?.currentOwner?.id,
          currentOwnerName: serviceContext?.currentOwner?.fullName,
        },
      });

      if (detail.sourceWarranty?.id) {
        logger.logAsync({
          entityType: 'warranty',
          entityId: detail.sourceWarranty.id,
          action: 'updated',
          description: 'Resolved service linkage review for linked warranty',
          metadata: {
            reviewId: data.reviewId,
            serviceSystemId: resolvedServiceSystemId,
            serviceSystemDisplayName: serviceContext?.serviceSystem?.displayName,
            currentOwnerId: serviceContext?.currentOwner?.id,
            currentOwnerName: serviceContext?.currentOwner?.fullName,
            customFields: {
              resolutionType: data.resolutionType,
            },
          },
        });
      }

      return { success: true, resolvedServiceSystemId };
    });
  });
