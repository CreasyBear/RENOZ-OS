/**
 * Inventory adjustment server functions.
 *
 * Owns operator stock corrections. Manual inbound stock-in belongs to
 * receiving; supplier-backed stock-in belongs to PO receiving.
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { stockAdjustmentSchema } from '@/lib/schemas/inventory';
import { withAuth } from '@/lib/server/protected';
import { adjustInventoryQuantity } from './adjust-inventory-quantity';

/**
 * Adjust inventory quantity with full audit trail.
 */
export const adjustInventory = createServerFn({ method: 'POST' })
  .inputValidator(stockAdjustmentSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.adjust });
    return adjustInventoryQuantity({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      data,
    });
  });
