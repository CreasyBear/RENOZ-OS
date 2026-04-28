'use server';

/**
 * Update Invoice Status Server Function
 *
 * Updates invoice status with validation of allowed transitions.
 *
 * SECURITY: Uses withAuth for authentication and filters by
 * organizationId for multi-tenant isolation.
 *
 * @source invoice from orders table
 * @mutates orders.invoiceStatus only; payment fields are ledger projections
 *
 * @see src/lib/constants/invoice-status.ts for status transitions
 * @see docs/design-system/INVOICE-STANDARDS.md
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { updateInvoiceStatusSchema } from '@/lib/schemas/invoices';
import {
  isValidInvoiceStatusTransition,
  type InvoiceStatus,
} from '@/lib/constants/invoice-status';

// ============================================================================
// TYPES
// ============================================================================

export interface UpdateInvoiceStatusResponse {
  success: boolean;
  invoiceId: string;
  previousStatus: InvoiceStatus | null;
  newStatus: InvoiceStatus;
}

// ============================================================================
// SERVER FUNCTION
// ============================================================================

/**
 * Update invoice status with transition validation
 */
export const updateInvoiceStatus = createServerFn({ method: 'POST' })
  .inputValidator(updateInvoiceStatusSchema)
  .handler(async ({ data }): Promise<UpdateInvoiceStatusResponse> => {
    const ctx = await withAuth();
    const { organizationId } = ctx;
    const userId = ctx.user.id;

    const { id, status: newStatus, note } = data;

    // Get current invoice state
    const [current] = await db
      .select({
        id: orders.id,
        invoiceStatus: orders.invoiceStatus,
        orderNumber: orders.orderNumber,
      })
      .from(orders)
      .where(
        and(
          eq(orders.id, id),
          eq(orders.organizationId, organizationId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);

    if (!current) {
      throw new NotFoundError('Invoice not found');
    }

    const currentStatus: InvoiceStatus = current.invoiceStatus ?? 'draft';

    // Validate status transition
    if (!isValidInvoiceStatusTransition(currentStatus, newStatus)) {
      throw new ValidationError(
        `Invalid status transition from "${currentStatus}" to "${newStatus}"`
      );
    }

    if (newStatus === 'paid') {
      throw new ValidationError(
        'Paid invoices must be created by recording a real payment, refund, or credit note.'
      );
    }

    // Build update data
    const now = new Date();
    const updateData: {
      invoiceStatus: InvoiceStatus;
      updatedAt: Date;
      updatedBy: string;
      invoiceSentAt?: Date;
    } = {
      invoiceStatus: newStatus,
      updatedAt: now,
      updatedBy: userId,
    };

    // Set timestamps based on new status
    if (newStatus === 'unpaid' && currentStatus === 'draft') {
      // First time sending - mark as sent
      updateData.invoiceSentAt = now;
    }

    // Execute update with affected row check
    const [updated] = await db
      .update(orders)
      .set(updateData)
      .where(
        and(
          eq(orders.id, id),
          eq(orders.organizationId, organizationId),
          isNull(orders.deletedAt)
        )
      )
      .returning({ id: orders.id });

    if (!updated) {
      throw new NotFoundError('Invoice not found or update failed');
    }

    // Log activity
    const logger = createActivityLoggerWithContext(ctx);

    await logger.log({
      entityType: 'order',
      entityId: id,
      action: 'updated',
      changes: {
        before: { invoiceStatus: currentStatus },
        after: { invoiceStatus: newStatus },
        fields: ['invoiceStatus'],
      },
      metadata: note ? { reason: note } : undefined,
    });

    return {
      success: true,
      invoiceId: id,
      previousStatus: currentStatus,
      newStatus,
    };
  });

/**
 * Mark invoice as viewed (for tracking customer engagement)
 */
export const markInvoiceViewed = createServerFn({ method: 'POST' })
  .inputValidator(updateInvoiceStatusSchema.pick({ id: true }))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth();
    const { organizationId } = ctx;

    const [current] = await db
      .select({ id: orders.id, invoiceViewedAt: orders.invoiceViewedAt })
      .from(orders)
      .where(
        and(
          eq(orders.id, data.id),
          eq(orders.organizationId, organizationId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);

    if (!current) {
      throw new NotFoundError('Invoice not found');
    }

    // Only set viewedAt if not already set (first view)
    if (!current.invoiceViewedAt) {
      await db
        .update(orders)
        .set({ invoiceViewedAt: new Date() })
        .where(eq(orders.id, data.id));
    }

    return { success: true };
  });
