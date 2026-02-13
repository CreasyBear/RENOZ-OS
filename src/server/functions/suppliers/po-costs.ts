/**
 * Purchase Order Costs Server Functions
 *
 * CRUD operations for additional PO costs (freight, duty, insurance, etc.)
 * and cost allocation preview across PO line items.
 *
 * @see drizzle/schema/suppliers/purchase-order-costs.ts
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, asc, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { purchaseOrderCosts, purchaseOrders, purchaseOrderItems } from 'drizzle/schema/suppliers';
import { organizations } from 'drizzle/schema/settings/organizations';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { allocateCosts, type AllocationItem } from './cost-allocation';
import { unitPriceToOrgCurrency } from './receive-goods-utils';

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const costTypeSchema = z.enum(['freight', 'duty', 'insurance', 'handling', 'customs', 'other']);
const allocationMethodSchema = z.enum(['equal', 'by_value', 'by_weight', 'by_quantity']);

const addPurchaseOrderCostSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  costType: costTypeSchema,
  amount: z.number().min(0),
  allocationMethod: allocationMethodSchema.default('equal'),
  description: z.string().optional(),
  supplierInvoiceNumber: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  currency: z.string().default('AUD'),
});

const updatePurchaseOrderCostSchema = z.object({
  costId: z.string().uuid(),
  costType: costTypeSchema.optional(),
  amount: z.number().min(0).optional(),
  allocationMethod: allocationMethodSchema.optional(),
  description: z.string().optional(),
  supplierInvoiceNumber: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List all costs for a purchase order.
 */
export const getPurchaseOrderCosts = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ purchaseOrderId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.read });

    const costs = await db
      .select()
      .from(purchaseOrderCosts)
      .where(
        and(
          eq(purchaseOrderCosts.purchaseOrderId, data.purchaseOrderId),
          eq(purchaseOrderCosts.organizationId, ctx.organizationId)
        )
      )
      .orderBy(asc(purchaseOrderCosts.createdAt));

    const totalCosts = costs.reduce((sum, c) => sum + Number(c.amount ?? 0), 0);

    return { costs, totalCosts };
  });

/**
 * Calculate allocated costs per PO line item (preview).
 * When PO currency differs from org currency, unitPrice is converted to org currency for landed cost.
 */
export const calculateAllocatedCosts = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ purchaseOrderId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.read });

    // Get PO with currency for multi-currency conversion
    const [po] = await db
      .select({ currency: purchaseOrders.currency, exchangeRate: purchaseOrders.exchangeRate })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, data.purchaseOrderId),
          eq(purchaseOrders.organizationId, ctx.organizationId),
          isNull(purchaseOrders.deletedAt)
        )
      )
      .limit(1);

    if (!po) {
      throw new NotFoundError('Purchase order not found', 'purchaseOrder');
    }

    const [org] = await db
      .select({ currency: organizations.currency })
      .from(organizations)
      .where(eq(organizations.id, ctx.organizationId))
      .limit(1);
    const orgCurrency = org?.currency ?? 'AUD';
    const poCurrency = po.currency ?? 'AUD';
    // Align with receive-goods: require exchange_rate when currencies differ
    if (poCurrency !== orgCurrency) {
      const rate = po.exchangeRate != null ? Number(po.exchangeRate) : null;
      if (rate == null || rate <= 0) {
        throw new ValidationError(
          `Purchase order currency (${poCurrency}) differs from organization currency (${orgCurrency}). Set exchange rate on the purchase order to view landed cost.`
        );
      }
    }
    const exchangeRate = po.exchangeRate != null ? Number(po.exchangeRate) : null;

    // Get PO items
    const items = await db
      .select({
        id: purchaseOrderItems.id,
        productId: purchaseOrderItems.productId,
        productName: purchaseOrderItems.productName,
        quantity: purchaseOrderItems.quantity,
        unitPrice: purchaseOrderItems.unitPrice,
        lineTotal: purchaseOrderItems.lineTotal,
      })
      .from(purchaseOrderItems)
      .where(
        and(
          eq(purchaseOrderItems.purchaseOrderId, data.purchaseOrderId),
          eq(purchaseOrderItems.organizationId, ctx.organizationId)
        )
      )
      .orderBy(asc(purchaseOrderItems.lineNumber));

    // Get PO costs
    const costs = await db
      .select()
      .from(purchaseOrderCosts)
      .where(
        and(
          eq(purchaseOrderCosts.purchaseOrderId, data.purchaseOrderId),
          eq(purchaseOrderCosts.organizationId, ctx.organizationId)
        )
      );

    // Build allocation items (weight not available on PO items, default to 0)
    const allocationItems: AllocationItem[] = items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice ?? 0),
      lineTotal: Number(item.lineTotal ?? 0),
      weight: 0,
    }));

    // Allocate each cost across items
    const itemAllocations = new Map<string, number>();
    for (const item of items) {
      itemAllocations.set(item.id, 0);
    }

    for (const cost of costs) {
      const allocated = allocateCosts(allocationItems, {
        amount: Number(cost.amount ?? 0),
        method: cost.allocationMethod ?? 'equal',
      });
      for (const [itemId, amount] of allocated) {
        itemAllocations.set(itemId, (itemAllocations.get(itemId) ?? 0) + amount);
      }
    }

    // Build result
    const totalAdditionalCosts = costs.reduce((sum, c) => sum + Number(c.amount ?? 0), 0);
    const totalPOValue = items.reduce((sum, item) => sum + Number(item.lineTotal ?? 0), 0);

    const allocatedItems = items.map((item) => {
      const allocatedAmount = itemAllocations.get(item.id) ?? 0;
      const qty = item.quantity;
      const unitPriceInPoCurrency = Number(item.unitPrice ?? 0);
      const unitPriceInOrgCurrency = unitPriceToOrgCurrency(
        unitPriceInPoCurrency,
        poCurrency,
        orgCurrency,
        exchangeRate
      );
      const allocatedPerUnit = qty > 0 ? allocatedAmount / qty : 0;
      const landedUnitCost = unitPriceInOrgCurrency + allocatedPerUnit;

      return {
        itemId: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: qty,
        unitPrice: unitPriceInPoCurrency, // Return PO currency for display (po-costs-tab uses poCurrency)
        lineTotal: Number(item.lineTotal ?? 0),
        allocatedCosts: allocatedAmount,
        allocatedPerUnit,
        landedUnitCost,
        landedLineTotal: landedUnitCost * qty,
      };
    });

    // totalPOValue and totalLandedCost: when mixed currency, totalPOValue is in PO currency
    // but totalLandedCost = sum of landed line totals (in org currency). For display simplicity,
    // we keep totalPOValue in PO currency; totalLandedCost = sum(landedLineTotal) which is correct.
    const totalLandedCost = allocatedItems.reduce((sum, i) => sum + i.landedLineTotal, 0);

    return {
      items: allocatedItems,
      summary: {
        totalPOValue,
        totalAdditionalCosts,
        totalLandedCost,
      },
    };
  });

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Add a cost to a purchase order.
 */
export const addPurchaseOrderCost = createServerFn({ method: 'POST' })
  .inputValidator(addPurchaseOrderCostSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.update });

    // Verify PO exists and belongs to org
    const [po] = await db
      .select({ id: purchaseOrders.id, status: purchaseOrders.status })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, data.purchaseOrderId),
          eq(purchaseOrders.organizationId, ctx.organizationId),
          isNull(purchaseOrders.deletedAt)
        )
      )
      .limit(1);

    if (!po) {
      throw new NotFoundError('Purchase order not found', 'purchaseOrder');
    }

    // Allow adding costs to any non-cancelled/closed PO
    if (['cancelled', 'closed'].includes(po.status)) {
      throw new ValidationError('Cannot add costs to a cancelled or closed purchase order');
    }

    // Cost amounts must be in organization currency (required for landed cost allocation)
    const [org] = await db
      .select({ currency: organizations.currency })
      .from(organizations)
      .where(eq(organizations.id, ctx.organizationId))
      .limit(1);
    const orgCurrency = org?.currency ?? 'AUD';
    if (data.currency !== orgCurrency) {
      throw new ValidationError(
        `Cost amounts must be in organization currency (${orgCurrency}). Received ${data.currency}.`
      );
    }

    const [cost] = await db
      .insert(purchaseOrderCosts)
      .values({
        organizationId: ctx.organizationId,
        purchaseOrderId: data.purchaseOrderId,
        costType: data.costType,
        amount: data.amount,
        allocationMethod: data.allocationMethod,
        description: data.description,
        supplierInvoiceNumber: data.supplierInvoiceNumber,
        referenceNumber: data.referenceNumber,
        notes: data.notes,
        currency: data.currency,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return cost;
  });

/**
 * Update a purchase order cost.
 */
export const updatePurchaseOrderCost = createServerFn({ method: 'POST' })
  .inputValidator(updatePurchaseOrderCostSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.update });

    const { costId, ...updateFields } = data;

    // Verify cost exists and belongs to org
    const [existing] = await db
      .select()
      .from(purchaseOrderCosts)
      .where(
        and(
          eq(purchaseOrderCosts.id, costId),
          eq(purchaseOrderCosts.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Purchase order cost not found', 'purchaseOrderCost');
    }

    const updates: Record<string, unknown> = {
      updatedBy: ctx.user.id,
      version: existing.version + 1,
    };

    if (updateFields.costType !== undefined) updates.costType = updateFields.costType;
    if (updateFields.amount !== undefined) updates.amount = updateFields.amount;
    if (updateFields.allocationMethod !== undefined) updates.allocationMethod = updateFields.allocationMethod;
    if (updateFields.description !== undefined) updates.description = updateFields.description;
    if (updateFields.supplierInvoiceNumber !== undefined)
      updates.supplierInvoiceNumber = updateFields.supplierInvoiceNumber;
    if (updateFields.referenceNumber !== undefined) updates.referenceNumber = updateFields.referenceNumber;
    if (updateFields.notes !== undefined) updates.notes = updateFields.notes;

    const [updated] = await db
      .update(purchaseOrderCosts)
      .set(updates)
      .where(eq(purchaseOrderCosts.id, costId))
      .returning();

    return updated;
  });

/**
 * Delete a purchase order cost.
 */
export const deletePurchaseOrderCost = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ costId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.update });

    // Verify cost exists and belongs to org
    const [existing] = await db
      .select({ id: purchaseOrderCosts.id })
      .from(purchaseOrderCosts)
      .where(
        and(
          eq(purchaseOrderCosts.id, data.costId),
          eq(purchaseOrderCosts.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Purchase order cost not found', 'purchaseOrderCost');
    }

    await db.delete(purchaseOrderCosts).where(eq(purchaseOrderCosts.id, data.costId));

    return { success: true };
  });
