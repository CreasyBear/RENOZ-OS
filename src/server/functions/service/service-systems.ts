'use server'

import { createServerFn } from '@tanstack/react-start';
import { NotFoundError } from '@/lib/server/errors';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  getServiceSystemSchema,
  listServiceSystemsSchema,
  transferServiceSystemOwnershipSchema,
} from '@/lib/schemas/service';
import { db } from '@/lib/db';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { transferServiceSystemOwnershipTx } from './_shared/service-writer';
import {
  getServiceSystemDetail,
  getServiceSystemContextById,
  listServiceSystemSummaries,
} from './_shared/service-resolver';

export const getServiceSystem = createServerFn({ method: 'GET' })
  .inputValidator(getServiceSystemSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.read });
    const detail = await getServiceSystemDetail(ctx.organizationId, data.id);

    if (!detail) {
      throw new NotFoundError('Service system not found', 'serviceSystem');
    }

    return detail;
  });

export const listServiceSystems = createServerFn({ method: 'GET' })
  .inputValidator(listServiceSystemsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.read });
    const items = await listServiceSystemSummaries(ctx.organizationId, data);
    return { items };
  });

export const transferServiceSystemOwnership = createServerFn({ method: 'POST' })
  .inputValidator(transferServiceSystemOwnershipSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.warranty.update });
    const logger = createActivityLoggerWithContext(ctx);

    return db.transaction(async (tx) => {
      const result = await transferServiceSystemOwnershipTx(tx, {
        organizationId: ctx.organizationId,
        serviceSystemId: data.serviceSystemId,
        newOwner: data.newOwner,
        reason: data.reason,
        effectiveAt: data.effectiveAt ? new Date(data.effectiveAt) : new Date(),
        userId: ctx.user.id,
      });

      const serviceContext = await getServiceSystemContextById(
        ctx.organizationId,
        data.serviceSystemId,
        tx
      );
      const linkedWarrantyIds = result.linkedWarrantyIds ?? [];

      logger.logAsync({
        entityType: 'service_system',
        entityId: data.serviceSystemId,
        entityName: serviceContext.serviceSystem?.displayName ?? undefined,
        action: 'updated',
        description: 'Transferred service-system ownership',
        metadata: {
          reason: data.reason,
          serviceSystemId: data.serviceSystemId,
          serviceSystemDisplayName: serviceContext.serviceSystem?.displayName,
          currentOwnerId: result.newOwner.id,
          currentOwnerName: result.newOwner.fullName,
        },
      });

      for (const linkedWarrantyId of linkedWarrantyIds) {
        logger.logAsync({
          entityType: 'warranty',
          entityId: linkedWarrantyId,
          action: 'updated',
          description: 'Transferred linked service-system ownership',
          metadata: {
            reason: data.reason,
            serviceSystemId: data.serviceSystemId,
            serviceSystemDisplayName: serviceContext.serviceSystem?.displayName,
            currentOwnerId: result.newOwner.id,
            currentOwnerName: result.newOwner.fullName,
          },
        });
      }

      return {
        success: true,
        serviceSystemId: data.serviceSystemId,
        newOwner: result.newOwner,
      };
    });
  });
