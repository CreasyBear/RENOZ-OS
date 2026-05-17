/**
 * Inventory transfer server functions.
 *
 * Owns warehouse-to-warehouse stock movement, including serialized lineage and
 * cost-layer continuity.
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { stockTransferSchema } from '@/lib/schemas/inventory';
import { withAuth } from '@/lib/server/protected';
import { transferInventoryQuantity } from './transfer-inventory-quantity';

/**
 * Transfer inventory between locations.
 */
export const transferInventory = createServerFn({ method: 'POST' })
  .inputValidator(stockTransferSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.transfer });
    return transferInventoryQuantity({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      data,
    });
  });
