/**
 * Order Templates Server Functions
 *
 * Template CRUD and order creation from templates.
 *
 * @see drizzle/schema/order-templates.ts for database schema
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-TEMPLATES-API)
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc, asc, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  orderTemplates,
  orderTemplateItems,
  orders,
  orderLineItems,
  products,
  customers,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { ValidationError, NotFoundError } from '@/lib/server/errors';
import {
  createTemplateSchema,
  updateTemplateSchema,
  saveOrderAsTemplateSchema,
  createOrderFromTemplateSchema,
  templateParamsSchema,
  templateListQuerySchema,
  createTemplateItemSchema,
} from '@/lib/schemas';

// ============================================================================
// TYPES
// ============================================================================

type OrderTemplate = typeof orderTemplates.$inferSelect;
type OrderTemplateItem = typeof orderTemplateItems.$inferSelect;

interface TemplateWithItems extends OrderTemplate {
  items: OrderTemplateItem[];
}

interface ListTemplatesResult {
  templates: OrderTemplate[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

async function generateOrderNumber(organizationId: string): Promise<string> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(eq(orders.organizationId, organizationId));

  const orderNum = (count || 0) + 1;
  return `ORD-${String(orderNum).padStart(6, '0')}`;
}

// ============================================================================
// LIST TEMPLATES
// ============================================================================

export const listTemplates = createServerFn({ method: 'GET' })
  .inputValidator(templateListQuerySchema)
  .handler(async ({ data }): Promise<ListTemplatesResult> => {
    const ctx = await withAuth();
    const { search, isActive, category, page, pageSize, sortBy, sortOrder } = data;

    // Build conditions
    const conditions = [
      eq(orderTemplates.organizationId, ctx.organizationId),
      isNull(orderTemplates.deletedAt),
    ];

    if (isActive !== undefined) {
      conditions.push(eq(orderTemplates.isActive, isActive));
    }

    if (search) {
      conditions.push(
        sql`(
          ${orderTemplates.name} ILIKE ${`%${search}%`} OR
          ${orderTemplates.description} ILIKE ${`%${search}%`}
        )`
      );
    }

    if (category) {
      conditions.push(sql`${orderTemplates.metadata}->>'category' = ${category}`);
    }

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orderTemplates)
      .where(and(...conditions));

    const total = count || 0;

    // Sort
    const sortColumn = {
      name: orderTemplates.name,
      createdAt: orderTemplates.createdAt,
      usageCount: sql`COALESCE((${orderTemplates.metadata}->>'usageCount')::int, 0)`,
    }[sortBy];

    const orderFn = sortOrder === 'asc' ? asc : desc;

    // Fetch templates
    const templates = await db
      .select()
      .from(orderTemplates)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      templates,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  });

// ============================================================================
// GET TEMPLATE
// ============================================================================

export const getTemplate = createServerFn({ method: 'GET' })
  .inputValidator(templateParamsSchema)
  .handler(async ({ data }): Promise<TemplateWithItems> => {
    const ctx = await withAuth();

    const [template] = await db
      .select()
      .from(orderTemplates)
      .where(
        and(
          eq(orderTemplates.id, data.id),
          eq(orderTemplates.organizationId, ctx.organizationId),
          isNull(orderTemplates.deletedAt)
        )
      )
      .limit(1);

    if (!template) {
      throw new NotFoundError('Template not found');
    }

    // Get items
    const items = await db
      .select()
      .from(orderTemplateItems)
      .where(eq(orderTemplateItems.templateId, data.id))
      .orderBy(asc(orderTemplateItems.sortOrder));

    return {
      ...template,
      items,
    };
  });

// ============================================================================
// CREATE TEMPLATE
// ============================================================================

export const createTemplate = createServerFn({ method: 'POST' })
  .inputValidator(createTemplateSchema)
  .handler(async ({ data }): Promise<TemplateWithItems> => {
    const ctx = await withAuth();

    // Validate default customer if provided
    if (data.defaultCustomerId) {
      const [customer] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            eq(customers.id, data.defaultCustomerId),
            eq(customers.organizationId, ctx.organizationId),
            isNull(customers.deletedAt)
          )
        )
        .limit(1);

      if (!customer) {
        throw new ValidationError('Default customer not found', {
          defaultCustomerId: ['Customer does not exist'],
        });
      }
    }

    // Create template
    const [template] = await db
      .insert(orderTemplates)
      .values({
        organizationId: ctx.organizationId,
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        isGlobal: data.isGlobal,
        defaultCustomerId: data.defaultCustomerId,
        defaultValues: data.defaultValues,
        metadata: data.metadata ?? { usageCount: 0 },
        createdBy: ctx.user.id,
      })
      .returning();

    // Create items
    const createdItems: OrderTemplateItem[] = [];
    for (const item of data.items) {
      const [createdItem] = await db
        .insert(orderTemplateItems)
        .values({
          organizationId: ctx.organizationId,
          templateId: template.id,
          lineNumber: item.lineNumber,
          sortOrder: item.sortOrder,
          productId: item.productId,
          sku: item.sku,
          description: item.description,
          defaultQuantity: item.defaultQuantity,
          fixedUnitPrice: item.fixedUnitPrice,
          useCurrentPrice: item.useCurrentPrice,
          discountPercent: item.discountPercent,
          discountAmount: item.discountAmount,
          taxType: item.taxType,
          notes: item.notes,
        })
        .returning();

      createdItems.push(createdItem);
    }

    return {
      ...template,
      items: createdItems,
    };
  });

// ============================================================================
// UPDATE TEMPLATE
// ============================================================================

export const updateTemplate = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      ...updateTemplateSchema.shape,
    })
  )
  .handler(async ({ data }): Promise<OrderTemplate> => {
    const ctx = await withAuth();
    const { id, ...updateData } = data;

    // Verify template exists
    const [existing] = await db
      .select()
      .from(orderTemplates)
      .where(
        and(
          eq(orderTemplates.id, id),
          eq(orderTemplates.organizationId, ctx.organizationId),
          isNull(orderTemplates.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Template not found');
    }

    // Validate default customer if provided
    if (updateData.defaultCustomerId) {
      const [customer] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            eq(customers.id, updateData.defaultCustomerId),
            eq(customers.organizationId, ctx.organizationId),
            isNull(customers.deletedAt)
          )
        )
        .limit(1);

      if (!customer) {
        throw new ValidationError('Default customer not found', {
          defaultCustomerId: ['Customer does not exist'],
        });
      }
    }

    const [template] = await db
      .update(orderTemplates)
      .set({
        ...updateData,
        updatedBy: ctx.user.id,
      })
      .where(eq(orderTemplates.id, id))
      .returning();

    return template;
  });

// ============================================================================
// DELETE TEMPLATE
// ============================================================================

export const deleteTemplate = createServerFn({ method: 'POST' })
  .inputValidator(templateParamsSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth();

    // Verify template exists
    const [existing] = await db
      .select()
      .from(orderTemplates)
      .where(
        and(
          eq(orderTemplates.id, data.id),
          eq(orderTemplates.organizationId, ctx.organizationId),
          isNull(orderTemplates.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Template not found');
    }

    // Soft delete
    await db
      .update(orderTemplates)
      .set({
        deletedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(eq(orderTemplates.id, data.id));

    return { success: true };
  });

// ============================================================================
// SAVE ORDER AS TEMPLATE
// ============================================================================

export const saveOrderAsTemplate = createServerFn({ method: 'POST' })
  .inputValidator(saveOrderAsTemplateSchema)
  .handler(async ({ data }): Promise<TemplateWithItems> => {
    const ctx = await withAuth();

    // Get order with line items
    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, data.orderId),
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt)
        )
      )
      .limit(1);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    const lineItems = await db
      .select()
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, data.orderId))
      .orderBy(asc(orderLineItems.lineNumber));

    // Create template
    const [template] = await db
      .insert(orderTemplates)
      .values({
        organizationId: ctx.organizationId,
        name: data.name,
        description: data.description,
        isActive: true,
        isGlobal: data.isGlobal,
        defaultCustomerId: data.preserveCustomer ? order.customerId : null,
        defaultValues: {
          discountPercent: order.discountPercent ?? undefined,
          discountAmount: order.discountAmount ?? undefined,
          shippingAmount: order.shippingAmount ?? undefined,
          internalNotes: order.internalNotes ?? undefined,
          customerNotes: order.customerNotes ?? undefined,
        },
        metadata: { usageCount: 0 },
        createdBy: ctx.user.id,
      })
      .returning();

    // Create template items from order line items
    const createdItems: OrderTemplateItem[] = [];
    for (const item of lineItems) {
      const [createdItem] = await db
        .insert(orderTemplateItems)
        .values({
          organizationId: ctx.organizationId,
          templateId: template.id,
          lineNumber: item.lineNumber,
          sortOrder: item.lineNumber,
          productId: item.productId ?? undefined,
          sku: item.sku ?? undefined,
          description: item.description,
          defaultQuantity: item.quantity,
          fixedUnitPrice: data.preservePrices ? item.unitPrice : undefined,
          useCurrentPrice: !data.preservePrices,
          discountPercent: item.discountPercent ?? undefined,
          discountAmount: item.discountAmount ?? undefined,
          taxType: item.taxType,
          notes: item.notes ?? undefined,
        })
        .returning();

      createdItems.push(createdItem);
    }

    return {
      ...template,
      items: createdItems,
    };
  });

// ============================================================================
// CREATE ORDER FROM TEMPLATE
// ============================================================================

export const createOrderFromTemplate = createServerFn({ method: 'POST' })
  .inputValidator(createOrderFromTemplateSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Get template with items
    const [template] = await db
      .select()
      .from(orderTemplates)
      .where(
        and(
          eq(orderTemplates.id, data.templateId),
          eq(orderTemplates.organizationId, ctx.organizationId),
          isNull(orderTemplates.deletedAt),
          eq(orderTemplates.isActive, true)
        )
      )
      .limit(1);

    if (!template) {
      throw new NotFoundError('Template not found or inactive');
    }

    const templateItems = await db
      .select()
      .from(orderTemplateItems)
      .where(eq(orderTemplateItems.templateId, data.templateId))
      .orderBy(asc(orderTemplateItems.sortOrder));

    if (templateItems.length === 0) {
      throw new ValidationError('Template has no items', {
        templateId: ['Template is empty'],
      });
    }

    // Validate customer
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.id, data.customerId),
          eq(customers.organizationId, ctx.organizationId),
          isNull(customers.deletedAt)
        )
      )
      .limit(1);

    if (!customer) {
      throw new ValidationError('Customer not found', {
        customerId: ['Customer does not exist'],
      });
    }

    // Generate order number
    const orderNumber = await generateOrderNumber(ctx.organizationId);

    // Determine default values
    const defaults = data.useTemplateDefaults ? template.defaultValues : null;
    const overrides = data.overrides ?? {};

    // Create order
    const [order] = await db
      .insert(orders)
      .values({
        organizationId: ctx.organizationId,
        orderNumber,
        customerId: data.customerId,
        status: 'draft',
        paymentStatus: 'pending',
        orderDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        discountPercent: overrides.discountPercent ?? defaults?.discountPercent ?? undefined,
        discountAmount: overrides.discountAmount ?? defaults?.discountAmount ?? undefined,
        shippingAmount: overrides.shippingAmount ?? defaults?.shippingAmount ?? 0,
        internalNotes: overrides.internalNotes ?? defaults?.internalNotes ?? undefined,
        customerNotes: overrides.customerNotes ?? defaults?.customerNotes ?? undefined,
        createdBy: ctx.user.id,
      })
      .returning();

    // Create line items
    let subtotal = 0;
    let totalTax = 0;

    for (const templateItem of templateItems) {
      // Get current price if needed
      let unitPrice = templateItem.fixedUnitPrice;
      if (templateItem.useCurrentPrice && templateItem.productId) {
        const [product] = await db
          .select({ basePrice: products.basePrice })
          .from(products)
          .where(eq(products.id, templateItem.productId))
          .limit(1);

        unitPrice = product?.basePrice ?? 0;
      }

      if (unitPrice === null) unitPrice = 0;

      // Calculate line totals
      const lineSubtotal = templateItem.defaultQuantity * unitPrice;
      const discount =
        (templateItem.discountPercent ? lineSubtotal * (templateItem.discountPercent / 100) : 0) +
        (templateItem.discountAmount ?? 0);
      const afterDiscount = lineSubtotal - discount;
      const taxRate = templateItem.taxType === 'gst' ? 0.1 : 0;
      const taxAmount = Math.round(afterDiscount * taxRate);
      const lineTotal = afterDiscount + taxAmount;

      await db.insert(orderLineItems).values({
        organizationId: ctx.organizationId,
        orderId: order.id,
        productId: templateItem.productId,
        lineNumber: templateItem.lineNumber,
        sku: templateItem.sku,
        description: templateItem.description,
        quantity: templateItem.defaultQuantity,
        unitPrice,
        discountPercent: templateItem.discountPercent,
        discountAmount: templateItem.discountAmount,
        taxType: templateItem.taxType ?? 'gst',
        taxAmount,
        lineTotal,
        notes: templateItem.notes,
        qtyPicked: 0,
        qtyShipped: 0,
        qtyDelivered: 0,
      });

      subtotal += lineSubtotal;
      totalTax += taxAmount;
    }

    // Update order totals
    const orderDiscount =
      (order.discountPercent ? subtotal * (order.discountPercent / 100) : 0) +
      (order.discountAmount ?? 0);
    const total = subtotal - orderDiscount + totalTax + (order.shippingAmount ?? 0);

    await db
      .update(orders)
      .set({
        subtotal,
        taxAmount: totalTax,
        discountAmount: orderDiscount,
        total,
      })
      .where(eq(orders.id, order.id));

    // Update template usage count
    const currentUsage = (template.metadata as Record<string, unknown>)?.usageCount ?? 0;
    await db
      .update(orderTemplates)
      .set({
        metadata: {
          ...(template.metadata as Record<string, unknown>),
          usageCount: (currentUsage as number) + 1,
          lastUsedAt: new Date().toISOString(),
        },
      })
      .where(eq(orderTemplates.id, data.templateId));

    return {
      order: { ...order, subtotal, taxAmount: totalTax, total },
      orderNumber,
    };
  });

// ============================================================================
// ADD TEMPLATE ITEM
// ============================================================================

export const addTemplateItem = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      templateId: z.string().uuid(),
      item: createTemplateItemSchema,
    })
  )
  .handler(async ({ data }): Promise<OrderTemplateItem> => {
    const ctx = await withAuth();

    // Verify template exists
    const [template] = await db
      .select()
      .from(orderTemplates)
      .where(
        and(
          eq(orderTemplates.id, data.templateId),
          eq(orderTemplates.organizationId, ctx.organizationId),
          isNull(orderTemplates.deletedAt)
        )
      )
      .limit(1);

    if (!template) {
      throw new NotFoundError('Template not found');
    }

    const [item] = await db
      .insert(orderTemplateItems)
      .values({
        organizationId: ctx.organizationId,
        templateId: data.templateId,
        ...data.item,
      })
      .returning();

    return item;
  });

// ============================================================================
// DELETE TEMPLATE ITEM
// ============================================================================

export const deleteTemplateItem = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ itemId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth();

    // Verify item exists and belongs to org
    const [item] = await db
      .select()
      .from(orderTemplateItems)
      .where(
        and(
          eq(orderTemplateItems.id, data.itemId),
          eq(orderTemplateItems.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!item) {
      throw new NotFoundError('Template item not found');
    }

    await db.delete(orderTemplateItems).where(eq(orderTemplateItems.id, data.itemId));

    return { success: true };
  });
