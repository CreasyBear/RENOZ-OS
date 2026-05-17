/**
 * Inventory receiving server functions.
 *
 * Owns manual non-PO stock-in. Supplier-backed PO receiving lives under
 * supplier/purchase-order workflows.
 */

'use server';

import { createServerFn } from '@tanstack/react-start';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { receiveInventorySchema } from '@/lib/schemas/inventory';
import { withAuth } from '@/lib/server/protected';
import { receiveManualInventory } from './manual-receive-inventory';

/**
 * Receive inventory with cost layer creation.
 */
export const receiveInventory = createServerFn({ method: 'POST' })
  .inputValidator(receiveInventorySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.inventory.receive });
    return receiveManualInventory({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      data,
    });
  });
