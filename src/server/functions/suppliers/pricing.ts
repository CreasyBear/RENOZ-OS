/**
 * Pricing Server Functions
 *
 * Complete pricing management operations including CRUD for price lists,
 * agreements, and bulk operations.
 *
 * @see drizzle/schema/suppliers/pricing.ts (when created)
 * @see src/lib/schemas/suppliers.ts
 */
import { createServerFn } from "@tanstack/react-start";
import { eq, and, ilike, desc, asc, sql, gte, lte, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { priceLists, priceAgreements } from "drizzle/schema/suppliers";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/constants";
import {
  createPriceListSchema,
  updatePriceListSchema,
  createPriceAgreementSchema,
  updatePriceAgreementSchema,
  listPriceListsSchema,
  listPriceAgreementsSchema,
  type CreatePriceListInput,
  type UpdatePriceListInput,
  type CreatePriceAgreementInput,
  type UpdatePriceAgreementInput,
} from "@/lib/schemas/suppliers";

// ============================================================================
// PRICE LIST OPERATIONS
// ============================================================================

/**
 * List price lists with filtering, sorting, and pagination
 */
export const listPriceLists = createServerFn({ method: "GET" })
  .inputValidator(listPriceListsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.READ });

    const {
      search,
      supplierId,
      status = "active",
      sortBy = "productName",
      sortOrder = "asc",
      page = 1,
      pageSize = 20,
    } = data;

    // Build where conditions
    const conditions = [eq(priceLists.organizationId, ctx.organizationId)];

    if (supplierId) {
      conditions.push(eq(priceLists.supplierId, supplierId));
    }

    if (status) {
      conditions.push(eq(priceLists.status, status));
    }

    if (search) {
      conditions.push(ilike(priceLists.productName, `%${search}%`));
    }

    const whereClause = and(...conditions);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(priceLists)
      .where(whereClause);

    const totalItems = Number(countResult[0]?.count ?? 0);

    // Get paginated results with sorting
    const offset = (page - 1) * pageSize;
    const orderBy = sortOrder === "asc" ? asc : desc;

    let orderColumn;
    switch (sortBy) {
      case "productName":
        orderColumn = priceLists.productName;
        break;
      case "basePrice":
        orderColumn = priceLists.basePrice;
        break;
      case "effectivePrice":
        orderColumn = priceLists.effectivePrice;
        break;
      case "effectiveDate":
        orderColumn = priceLists.effectiveDate;
        break;
      default:
        orderColumn = priceLists.productName;
    }

    const items = await db
      .select()
      .from(priceLists)
      .where(whereClause)
      .orderBy(orderBy(orderColumn))
      .limit(pageSize)
      .offset(offset);

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  });

/**
 * Create a new price list item
 */
export const createPriceList = createServerFn({ method: "POST" })
  .inputValidator(createPriceListSchema)
  .handler(async ({ data }: { data: CreatePriceListInput }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.CREATE });

    // Calculate effective price based on discount
    let effectivePrice = Number(data.basePrice);
    if (data.discountType === "percentage") {
      effectivePrice = Number(data.basePrice) * (1 - Number(data.discountValue) / 100);
    } else if (data.discountType === "fixed") {
      effectivePrice = Number(data.basePrice) - Number(data.discountValue);
    } else if (data.discountType === "volume") {
      // Volume discount requires min order qty and is applied at order level
      effectivePrice = Number(data.basePrice);
    }

    const [result] = await db
      .insert(priceLists)
      .values({
        organizationId: ctx.organizationId,
        supplierId: data.supplierId,
        productId: data.productId,
        productName: "", // Would be populated from product lookup
        productSku: "", // Would be populated from product lookup
        basePrice: data.basePrice.toString(),
        currency: data.currency,
        discountType: data.discountType,
        discountValue: data.discountValue.toString(),
        effectivePrice: effectivePrice.toString(),
        minOrderQty: data.minOrderQty,
        maxOrderQty: data.maxOrderQty,
        effectiveDate: data.effectiveDate,
        expiryDate: data.expiryDate,
        status: "active",
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      })
      .returning();

    return result;
  });

/**
 * Get a specific price list item
 */
export const getPriceList = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.READ });

    const [price] = await db
      .select()
      .from(priceLists)
      .where(and(
        eq(priceLists.id, data.id),
        eq(priceLists.organizationId, ctx.organizationId)
      ))
      .limit(1);

    if (!price) {
      throw new Error("Price list item not found");
    }

    return price;
  });

/**
 * Update a price list item
 */
export const updatePriceList = createServerFn({ method: "PUT" })
  .inputValidator(updatePriceListSchema)
  .handler(async ({ data }: { data: UpdatePriceListInput }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.UPDATE });

    const updateData: any = {
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    };

    // Handle price updates and recalculate effective price
    if (data.basePrice !== undefined || data.discountType !== undefined || data.discountValue !== undefined) {
      // Get current price data
      const [currentPrice] = await db
        .select()
        .from(priceLists)
        .where(and(
          eq(priceLists.id, data.id),
          eq(priceLists.organizationId, ctx.organizationId)
        ))
        .limit(1);

      if (!currentPrice) {
        throw new Error("Price list item not found");
      }

      const basePrice = data.basePrice !== undefined ? Number(data.basePrice) : Number(currentPrice.basePrice);
      const discountType = data.discountType !== undefined ? data.discountType : currentPrice.discountType as any;
      const discountValue = data.discountValue !== undefined ? Number(data.discountValue) : Number(currentPrice.discountValue);

      let effectivePrice = basePrice;
      if (discountType === "percentage") {
        effectivePrice = basePrice * (1 - discountValue / 100);
      } else if (discountType === "fixed") {
        effectivePrice = basePrice - discountValue;
      }

      updateData.basePrice = basePrice.toString();
      updateData.discountType = discountType;
      updateData.discountValue = discountValue.toString();
      updateData.effectivePrice = effectivePrice.toString();
    }

    // Handle other fields
    if (data.minOrderQty !== undefined) updateData.minOrderQty = data.minOrderQty;
    if (data.maxOrderQty !== undefined) updateData.maxOrderQty = data.maxOrderQty;
    if (data.effectiveDate !== undefined) updateData.effectiveDate = data.effectiveDate;
    if (data.expiryDate !== undefined) updateData.expiryDate = data.expiryDate;
    if (data.status !== undefined) updateData.status = data.status;

    const [result] = await db
      .update(priceLists)
      .set(updateData)
      .where(and(
        eq(priceLists.id, data.id),
        eq(priceLists.organizationId, ctx.organizationId)
      ))
      .returning();

    if (!result) {
      throw new Error("Price list item not found or update failed");
    }

    return result;
  });

/**
 * Delete a price list item
 */
export const deletePriceList = createServerFn({ method: "DELETE" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.DELETE });

    const [result] = await db
      .delete(priceLists)
      .where(and(
        eq(priceLists.id, data.id),
        eq(priceLists.organizationId, ctx.organizationId)
      ))
      .returning();

    if (!result) {
      throw new Error("Price list item not found or deletion failed");
    }

    return { success: true, deletedItem: result };
  });

/**
 * Bulk update price lists
 */
export const bulkUpdatePriceLists = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    ids: z.array(z.string()),
    updates: z.object({
      discountType: z.enum(['percentage', 'fixed', 'volume']).optional(),
      discountValue: z.number().min(0).optional(),
      basePrice: z.number().positive().optional(),
      minOrderQty: z.number().int().positive().optional(),
      maxOrderQty: z.number().int().positive().optional(),
      effectiveDate: z.string().optional(),
      expiryDate: z.string().optional(),
      status: z.enum(['active', 'inactive', 'pending']).optional(),
      notes: z.string().optional(),
    }),
  }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.UPDATE });

    const { ids, updates } = data;

    // Prepare update data
    const updateData: any = {
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    };

    // Handle different update types
    if (updates.discountType || updates.discountValue !== undefined) {
      updateData.discountType = updates.discountType;
      updateData.discountValue = updates.discountValue?.toString();
    }

    if (updates.basePrice !== undefined) {
      updateData.basePrice = updates.basePrice.toString();
    }

    if (updates.minOrderQty !== undefined) updateData.minOrderQty = updates.minOrderQty;
    if (updates.maxOrderQty !== undefined) updateData.maxOrderQty = updates.maxOrderQty;
    if (updates.effectiveDate !== undefined) updateData.effectiveDate = updates.effectiveDate;
    if (updates.expiryDate !== undefined) updateData.expiryDate = updates.expiryDate;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    // Recalculate effective prices for all updated items
    const currentPrices = await db
      .select()
      .from(priceLists)
      .where(and(
        inArray(priceLists.id, ids),
        eq(priceLists.organizationId, ctx.organizationId)
      ));

    // Calculate new effective prices
    const itemsToUpdate = currentPrices.map((price) => {
      const basePrice = updates.basePrice !== undefined ? updates.basePrice : Number(price.basePrice);
      const discountType = updates.discountType !== undefined ? updates.discountType : price.discountType as any;
      const discountValue = updates.discountValue !== undefined ? updates.discountValue : Number(price.discountValue);

      let effectivePrice = basePrice;
      if (discountType === 'percentage') {
        effectivePrice = basePrice * (1 - discountValue / 100);
      } else if (discountType === 'fixed') {
        effectivePrice = basePrice - discountValue;
      }

      return {
        id: price.id,
        ...updateData,
        basePrice: basePrice.toString(),
        discountType,
        discountValue: discountValue.toString(),
        effectivePrice: Math.max(0, effectivePrice).toString(),
      };
    });

    // Perform bulk update
    const updatePromises = itemsToUpdate.map((item) =>
      db
        .update(priceLists)
        .set(item)
        .where(and(
          eq(priceLists.id, item.id),
          eq(priceLists.organizationId, ctx.organizationId)
        ))
    );

    await Promise.all(updatePromises);

    return {
      success: true,
      updatedCount: itemsToUpdate.length,
      message: `Successfully updated ${itemsToUpdate.length} price records`,
    };
  });

// ============================================================================
// PRICE AGREEMENT OPERATIONS
// ============================================================================

/**
 * List price agreements with filtering, sorting, and pagination
 */
export const listPriceAgreements = createServerFn({ method: "GET" })
  .inputValidator(listPriceAgreementsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.READ });

    const {
      search,
      supplierId,
      status,
      sortBy = "title",
      sortOrder = "asc",
      page = 1,
      pageSize = 20,
    } = data;

    // Build where conditions
    const conditions = [eq(priceAgreements.organizationId, ctx.organizationId)];

    if (supplierId) {
      conditions.push(eq(priceAgreements.supplierId, supplierId));
    }

    if (status) {
      conditions.push(eq(priceAgreements.status, status));
    }

    if (search) {
      conditions.push(ilike(priceAgreements.title, `%${search}%`));
    }

    const whereClause = and(...conditions);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(priceAgreements)
      .where(whereClause);

    const totalItems = Number(countResult[0]?.count ?? 0);

    // Get paginated results with sorting
    const offset = (page - 1) * pageSize;
    const orderBy = sortOrder === "asc" ? asc : desc;

    let orderColumn;
    switch (sortBy) {
      case "title":
        orderColumn = priceAgreements.title;
        break;
      case "effectiveDate":
        orderColumn = priceAgreements.effectiveDate;
        break;
      case "status":
        orderColumn = priceAgreements.status;
        break;
      default:
        orderColumn = priceAgreements.title;
    }

    const items = await db
      .select()
      .from(priceAgreements)
      .where(whereClause)
      .orderBy(orderBy(orderColumn))
      .limit(pageSize)
      .offset(offset);

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  });

/**
 * Create a new price agreement
 */
export const createPriceAgreement = createServerFn({ method: "POST" })
  .inputValidator(createPriceAgreementSchema)
  .handler(async ({ data }: { data: CreatePriceAgreementInput }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.CREATE });

    const [result] = await db
      .insert(priceAgreements)
      .values({
        organizationId: ctx.organizationId,
        supplierId: data.supplierId,
        title: data.title,
        description: data.description,
        effectiveDate: data.effectiveDate,
        expiryDate: data.expiryDate,
        status: "draft",
        totalItems: 0,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      })
      .returning();

    return result;
  });

/**
 * Get a specific price agreement
 */
export const getPriceAgreement = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.READ });

    const [agreement] = await db
      .select()
      .from(priceAgreements)
      .where(and(
        eq(priceAgreements.id, data.id),
        eq(priceAgreements.organizationId, ctx.organizationId)
      ))
      .limit(1);

    if (!agreement) {
      throw new Error("Price agreement not found");
    }

    return agreement;
  });

/**
 * Update a price agreement
 */
export const updatePriceAgreement = createServerFn({ method: "PUT" })
  .inputValidator(updatePriceAgreementSchema)
  .handler(async ({ data }: { data: UpdatePriceAgreementInput }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.UPDATE });

    const updateData: any = {
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    };

    // Handle status changes and workflow
    if (data.status !== undefined) {
      updateData.status = data.status;

      // Handle approval workflow
      if (data.status === 'approved' && !updateData.approvedBy) {
        updateData.approvedBy = ctx.userId;
        updateData.approvedAt = new Date();
      }
    }

    // Handle other fields
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.effectiveDate !== undefined) updateData.effectiveDate = data.effectiveDate;
    if (data.expiryDate !== undefined) updateData.expiryDate = data.expiryDate;

    const [result] = await db
      .update(priceAgreements)
      .set(updateData)
      .where(and(
        eq(priceAgreements.id, data.id),
        eq(priceAgreements.organizationId, ctx.organizationId)
      ))
      .returning();

    if (!result) {
      throw new Error("Price agreement not found or update failed");
    }

    return result;
  });

/**
 * Delete a price agreement
 */
export const deletePriceAgreement = createServerFn({ method: "DELETE" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.DELETE });

    const [result] = await db
      .delete(priceAgreements)
      .where(and(
        eq(priceAgreements.id, data.id),
        eq(priceAgreements.organizationId, ctx.organizationId)
      ))
      .returning();

    if (!result) {
      throw new Error("Price agreement not found or deletion failed");
    }

    return { success: true, deletedAgreement: result };
  });

// ============================================================================
// EXPORT OPERATIONS
// ============================================================================

/**
 * Export price data in various formats
 */
export const exportPriceData = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    format: z.enum(['csv', 'xlsx', 'json']),
    filters: listPriceListsSchema.optional(),
    includeAgreements: z.boolean().default(false),
  }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.SUPPLIERS.READ });

    const { format, filters = {}, includeAgreements = false } = data;

    // Get price lists with filters
    const priceListsResult = await listPriceLists({
      data: {
        ...filters,
        pageSize: 10000, // Export all matching records (reasonable limit)
      }
    });

    let csvContent = '';

    if (includeAgreements) {
      // Get agreements data
      const agreementsResult = await listPriceAgreements({
        data: {
          pageSize: 10000,
        }
      });

      // Generate combined export with both price lists and agreements
      const headers = [
        'Type',
        'Supplier Name',
        'Product Name',
        'Product SKU',
        'Base Price',
        'Effective Price',
        'Discount Type',
        'Discount Value',
        'Agreement Title',
        'Effective Date',
        'Expiry Date',
        'Status',
      ];

      const rows = [
        headers,
        // Price list rows
        ...priceListsResult.items.map((price) => [
          'Price List',
          price.supplierName,
          price.productName,
          price.productSku || '',
          price.basePrice.toString(),
          price.effectivePrice.toString(),
          price.discountType,
          price.discountValue.toString(),
          '', // No agreement for individual prices
          price.effectiveDate.split('T')[0],
          price.expiryDate?.split('T')[0] || '',
          price.status,
        ]),
        // Agreement rows
        ...agreementsResult.items.map((agreement) => [
          'Agreement',
          agreement.supplierName,
          '', // No specific product
          '', // No SKU
          '', // No base price
          '', // No effective price
          '', // No discount type
          '', // No discount value
          agreement.title,
          agreement.effectiveDate.split('T')[0],
          agreement.expiryDate?.split('T')[0] || '',
          agreement.status,
        ]),
      ];

      csvContent = rows.map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(',')).join('\n');
    } else {
      // Generate price lists only export
      const headers = [
        'Supplier Name',
        'Product Name',
        'Product SKU',
        'Base Price',
        'Effective Price',
        'Discount Type',
        'Discount Value',
        'Min Order Qty',
        'Max Order Qty',
        'Effective Date',
        'Expiry Date',
        'Status',
        'Last Updated',
      ];

      const rows = [
        headers,
        ...priceListsResult.items.map((price) => [
          price.supplierName,
          price.productName,
          price.productSku || '',
          price.basePrice.toString(),
          price.effectivePrice.toString(),
          price.discountType,
          price.discountValue.toString(),
          price.minOrderQty?.toString() || '',
          price.maxOrderQty?.toString() || '',
          price.effectiveDate.split('T')[0],
          price.expiryDate?.split('T')[0] || '',
          price.status,
          price.lastUpdated.split('T')[0],
        ]),
      ];

      csvContent = rows.map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(',')).join('\n');
    }

    // For now, return CSV content - in a real implementation, you might upload to storage and return a download URL
    return {
      format,
      filename: `pricing-export-${new Date().toISOString().split('T')[0]}.${format}`,
      content: csvContent,
      recordCount: priceListsResult.pagination.totalItems,
    };
  });