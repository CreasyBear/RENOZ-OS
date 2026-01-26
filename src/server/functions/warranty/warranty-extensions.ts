/**
 * Warranty Extension Server Functions
 *
 * Operations for extending warranty coverage periods.
 * Supports paid extensions, promotional offers, loyalty rewards, and goodwill gestures.
 *
 * @see drizzle/schema/warranty-extensions.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-007b
 */

import { eq, and, desc, asc, gte, lte, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  warrantyExtensions,
  warranties,
  customers,
  products,
  type WarrantyExtension,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { client, warrantyEvents, type WarrantyExtendedPayload } from '@/trigger/client';
import {
  extendWarrantySchema,
  listWarrantyExtensionsSchema,
  getExtensionHistorySchema,
  getExtensionByIdSchema,
} from '@/lib/schemas/warranty/extensions';
import { typedGetFn, typedPostFn } from '@/lib/server/typed-server-fn';
import { NotFoundError, ValidationError } from '@/lib/server/errors';

// ============================================================================
// TYPES
// ============================================================================

export interface WarrantyExtensionItem {
  id: string;
  warrantyId: string;
  warrantyNumber: string;
  extensionType: WarrantyExtension['extensionType'];
  extensionMonths: number;
  previousExpiryDate: string;
  newExpiryDate: string;
  price: number | null;
  notes: string | null;
  approvedById: string | null;
  createdAt: string;
}

export interface WarrantyExtensionWithDetails extends WarrantyExtensionItem {
  customerName: string | null;
  productName: string | null;
}

export interface ExtensionHistoryResult {
  extensions: WarrantyExtensionWithDetails[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// EXTEND WARRANTY
// ============================================================================

/**
 * Extend a warranty's coverage period.
 *
 * This function:
 * 1. Validates the warranty exists and is active
 * 2. Calculates the new expiry date
 * 3. Creates an extension record
 * 4. Updates the warranty's expiry date
 * 5. Triggers a notification event
 *
 * @param warrantyId - The warranty to extend
 * @param extensionType - Type of extension (paid, promotional, loyalty, goodwill)
 * @param extensionMonths - Number of months to extend
 * @param price - Price paid (required for paid_extension)
 * @param notes - Optional notes/reason
 */
export const extendWarranty = typedPostFn(
  extendWarrantySchema,
  async ({ data }) => {
    const ctx = await withAuth();

    // 1. Fetch and validate the warranty
    const [warranty] = await db
      .select({
        id: warranties.id,
        warrantyNumber: warranties.warrantyNumber,
        organizationId: warranties.organizationId,
        customerId: warranties.customerId,
        productId: warranties.productId,
        expiryDate: warranties.expiryDate,
        status: warranties.status,
      })
      .from(warranties)
      .where(
        and(eq(warranties.id, data.warrantyId), eq(warranties.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!warranty) {
      throw new NotFoundError('Warranty not found', 'warranty');
    }

    // Validate warranty is in a state that can be extended
    if (warranty.status === 'voided') {
      throw new ValidationError('Cannot extend a voided warranty');
    }

    // 2. Calculate new expiry date
    const previousExpiryDate = warranty.expiryDate;
    const newExpiryDate = new Date(previousExpiryDate);
    newExpiryDate.setMonth(newExpiryDate.getMonth() + data.extensionMonths);

    // 3. Create extension record
    const [extension] = await db
      .insert(warrantyExtensions)
      .values({
        organizationId: ctx.organizationId,
        warrantyId: data.warrantyId,
        extensionType: data.extensionType,
        extensionMonths: data.extensionMonths,
        previousExpiryDate,
        newExpiryDate,
        price: data.price ?? null,
        notes: data.notes ?? null,
        approvedById: ctx.user.id,
      })
      .returning();

    // 4. Update warranty expiry date and status
    const newStatus = warranty.status === 'expired' ? 'active' : warranty.status;

    await db
      .update(warranties)
      .set({
        expiryDate: newExpiryDate,
        status: newStatus,
        updatedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(eq(warranties.id, data.warrantyId));

    // 5. Trigger notification event
    await triggerWarrantyExtendedNotification({
      warrantyId: warranty.id,
      warrantyNumber: warranty.warrantyNumber,
      extensionId: extension.id,
      organizationId: ctx.organizationId,
      customerId: warranty.customerId,
      productId: warranty.productId,
      extensionType: data.extensionType,
      extensionMonths: data.extensionMonths,
      previousExpiryDate,
      newExpiryDate,
      price: data.price ?? undefined,
    });

    return {
      extension,
      warranty: {
        id: warranty.id,
        warrantyNumber: warranty.warrantyNumber,
        previousExpiryDate: previousExpiryDate.toISOString(),
        newExpiryDate: newExpiryDate.toISOString(),
        status: newStatus,
      },
    };
  }
);

// ============================================================================
// LIST WARRANTY EXTENSIONS
// ============================================================================

/**
 * List all extensions for a specific warranty.
 * Returns extensions in reverse chronological order (most recent first).
 */
export const listWarrantyExtensions = typedGetFn(
  listWarrantyExtensionsSchema,
  async ({ data }) => {
    const ctx = await withAuth();

    // Verify the warranty belongs to this organization
    const [warranty] = await db
      .select({
        id: warranties.id,
        warrantyNumber: warranties.warrantyNumber,
      })
      .from(warranties)
      .where(
        and(eq(warranties.id, data.warrantyId), eq(warranties.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!warranty) {
      throw new NotFoundError('Warranty not found', 'warranty');
    }

    // Fetch extensions
    const extensions = await db
      .select({
        id: warrantyExtensions.id,
        warrantyId: warrantyExtensions.warrantyId,
        extensionType: warrantyExtensions.extensionType,
        extensionMonths: warrantyExtensions.extensionMonths,
        previousExpiryDate: warrantyExtensions.previousExpiryDate,
        newExpiryDate: warrantyExtensions.newExpiryDate,
        price: warrantyExtensions.price,
        notes: warrantyExtensions.notes,
        approvedById: warrantyExtensions.approvedById,
        createdAt: warrantyExtensions.createdAt,
      })
      .from(warrantyExtensions)
      .where(eq(warrantyExtensions.warrantyId, data.warrantyId))
      .orderBy(desc(warrantyExtensions.createdAt));

    return {
      warrantyNumber: warranty.warrantyNumber,
      extensions: extensions.map((ext) => ({
        id: ext.id,
        warrantyId: ext.warrantyId,
        warrantyNumber: warranty.warrantyNumber,
        extensionType: ext.extensionType,
        extensionMonths: ext.extensionMonths,
        previousExpiryDate: ext.previousExpiryDate.toISOString(),
        newExpiryDate: ext.newExpiryDate.toISOString(),
        price: ext.price,
        notes: ext.notes,
        approvedById: ext.approvedById,
        createdAt: ext.createdAt.toISOString(),
      })),
    };
  }
);

// ============================================================================
// GET EXTENSION HISTORY
// ============================================================================

/**
 * Get all extensions across the organization with filtering and pagination.
 * Useful for reporting on extension activity.
 */
export const getExtensionHistory = typedGetFn(
  getExtensionHistorySchema,
  async ({ data }): Promise<ExtensionHistoryResult> => {
    const ctx = await withAuth();

    // Build where conditions
    const conditions = [eq(warrantyExtensions.organizationId, ctx.organizationId)];

    if (data.extensionType) {
      conditions.push(eq(warrantyExtensions.extensionType, data.extensionType));
    }

    if (data.startDate) {
      conditions.push(gte(warrantyExtensions.createdAt, new Date(data.startDate)));
    }

    if (data.endDate) {
      conditions.push(lte(warrantyExtensions.createdAt, new Date(data.endDate)));
    }

    // Determine sort order
    const orderByClause = (() => {
      switch (data.sortBy) {
        case 'created_at_asc':
          return asc(warrantyExtensions.createdAt);
        case 'extension_months':
          return desc(warrantyExtensions.extensionMonths);
        case 'created_at_desc':
        default:
          return desc(warrantyExtensions.createdAt);
      }
    })();

    // Calculate offset
    const offset = (data.page - 1) * data.limit;

    // Fetch extensions with warranty and customer/product details
    const results = await db
      .select({
        id: warrantyExtensions.id,
        warrantyId: warrantyExtensions.warrantyId,
        warrantyNumber: warranties.warrantyNumber,
        extensionType: warrantyExtensions.extensionType,
        extensionMonths: warrantyExtensions.extensionMonths,
        previousExpiryDate: warrantyExtensions.previousExpiryDate,
        newExpiryDate: warrantyExtensions.newExpiryDate,
        price: warrantyExtensions.price,
        notes: warrantyExtensions.notes,
        approvedById: warrantyExtensions.approvedById,
        createdAt: warrantyExtensions.createdAt,
        customerName: customers.name,
        productName: products.name,
      })
      .from(warrantyExtensions)
      .innerJoin(warranties, eq(warranties.id, warrantyExtensions.warrantyId))
      .innerJoin(customers, eq(customers.id, warranties.customerId))
      .innerJoin(products, eq(products.id, warranties.productId))
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(data.limit)
      .offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(warrantyExtensions)
      .where(and(...conditions));

    const totalCount = countResult[0]?.count ?? 0;

    return {
      extensions: results.map((ext) => ({
        id: ext.id,
        warrantyId: ext.warrantyId,
        warrantyNumber: ext.warrantyNumber,
        extensionType: ext.extensionType,
        extensionMonths: ext.extensionMonths,
        previousExpiryDate: ext.previousExpiryDate.toISOString(),
        newExpiryDate: ext.newExpiryDate.toISOString(),
        price: ext.price,
        notes: ext.notes,
        approvedById: ext.approvedById,
        createdAt: ext.createdAt.toISOString(),
        customerName: ext.customerName,
        productName: ext.productName,
      })),
      totalCount,
      page: data.page,
      limit: data.limit,
      totalPages: Math.ceil(totalCount / data.limit),
    };
  }
);

// ============================================================================
// GET EXTENSION BY ID
// ============================================================================

/**
 * Get a single extension by ID with full details.
 */
export const getExtensionById = typedGetFn(
  getExtensionByIdSchema,
  async ({ data }) => {
    const ctx = await withAuth();

    const [result] = await db
      .select({
        id: warrantyExtensions.id,
        warrantyId: warrantyExtensions.warrantyId,
        warrantyNumber: warranties.warrantyNumber,
        extensionType: warrantyExtensions.extensionType,
        extensionMonths: warrantyExtensions.extensionMonths,
        previousExpiryDate: warrantyExtensions.previousExpiryDate,
        newExpiryDate: warrantyExtensions.newExpiryDate,
        price: warrantyExtensions.price,
        notes: warrantyExtensions.notes,
        approvedById: warrantyExtensions.approvedById,
        createdAt: warrantyExtensions.createdAt,
        customerName: customers.name,
        productName: products.name,
      })
      .from(warrantyExtensions)
      .innerJoin(warranties, eq(warranties.id, warrantyExtensions.warrantyId))
      .innerJoin(customers, eq(customers.id, warranties.customerId))
      .innerJoin(products, eq(products.id, warranties.productId))
      .where(
        and(
          eq(warrantyExtensions.id, data.extensionId),
          eq(warrantyExtensions.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      warrantyId: result.warrantyId,
      warrantyNumber: result.warrantyNumber,
      extensionType: result.extensionType,
      extensionMonths: result.extensionMonths,
      previousExpiryDate: result.previousExpiryDate.toISOString(),
      newExpiryDate: result.newExpiryDate.toISOString(),
      price: result.price,
      notes: result.notes,
      approvedById: result.approvedById,
      createdAt: result.createdAt.toISOString(),
      customerName: result.customerName,
      productName: result.productName,
    };
  }
);

// ============================================================================
// NOTIFICATION HELPER
// ============================================================================

/**
 * Trigger warranty extension notification event.
 *
 * Sends WarrantyExtendedPayload to trigger background notification job.
 * Fetches customer and product details for the notification content.
 */
async function triggerWarrantyExtendedNotification(params: {
  warrantyId: string;
  warrantyNumber: string;
  extensionId: string;
  organizationId: string;
  customerId: string;
  productId: string;
  extensionType: WarrantyExtension['extensionType'];
  extensionMonths: number;
  previousExpiryDate: Date;
  newExpiryDate: Date;
  price?: number;
}): Promise<void> {
  // Fetch customer details
  const [customer] = await db
    .select({
      id: customers.id,
      email: customers.email,
      name: customers.name,
    })
    .from(customers)
    .where(eq(customers.id, params.customerId))
    .limit(1);

  // Skip if no customer email
  if (!customer?.email) {
    console.log(
      `[warranty-extension] Skipping notification for warranty ${params.warrantyNumber} - no customer email`
    );
    return;
  }

  // Note: Product details are passed via params.productId, no additional fetch needed

  // Build event payload
  const payload: WarrantyExtendedPayload = {
    warrantyId: params.warrantyId,
    warrantyNumber: params.warrantyNumber,
    organizationId: params.organizationId,
    customerId: params.customerId,
    productId: params.productId,
    oldExpiryDate: params.previousExpiryDate.toISOString(),
    newExpiryDate: params.newExpiryDate.toISOString(),
    extensionMonths: params.extensionMonths,
    reason: params.extensionType,
  };

  // Send event to trigger.dev
  await client.sendEvent({
    name: warrantyEvents.extended,
    payload,
  });

  console.log(
    `[warranty-extension] Triggered notification for warranty ${params.warrantyNumber} extended by ${params.extensionMonths} months`
  );
}
