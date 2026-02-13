/**
 * Order Templates Validation Schemas
 *
 * Zod schemas for template operations.
 *
 * @see drizzle/schema/order-templates.ts for database schema
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-TEMPLATES-SCHEMA)
 */

import { z } from 'zod';
import { currencySchema, quantitySchema, percentageSchema } from '../_shared/patterns';
import { cursorPaginationSchema } from '@/lib/db/pagination';
import { taxTypeSchema } from '../products/products';

// ============================================================================
// METADATA SCHEMAS
// ============================================================================

export const templateMetadataSchema = z.object({
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).optional(),
  usageCount: z.number().int().min(0).optional(),
  lastUsedAt: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
});

export type TemplateMetadata = z.infer<typeof templateMetadataSchema>;

export const templateDefaultValuesSchema = z.object({
  discountPercent: percentageSchema.optional(),
  discountAmount: currencySchema.optional(),
  shippingAmount: currencySchema.optional(),
  paymentTermsDays: z.number().int().min(0).max(365).optional(),
  internalNotes: z.string().max(2000).optional(),
  customerNotes: z.string().max(2000).optional(),
});

export type TemplateDefaultValues = z.infer<typeof templateDefaultValuesSchema>;

// ============================================================================
// TEMPLATE ITEM SCHEMAS
// ============================================================================

export const createTemplateItemSchema = z.object({
  lineNumber: z.string().max(10),
  sortOrder: z.string().max(10).default('0'),
  productId: z.string().uuid().optional(),
  sku: z.string().max(50).optional(),
  description: z.string().min(1, 'Description is required').max(500),
  defaultQuantity: quantitySchema.default(1),
  fixedUnitPrice: currencySchema.optional(),
  useCurrentPrice: z.boolean().default(true),
  discountPercent: percentageSchema.optional(),
  discountAmount: currencySchema.optional(),
  taxType: taxTypeSchema.default('gst'),
  notes: z.string().max(500).optional(),
});

export type CreateTemplateItem = z.infer<typeof createTemplateItemSchema>;

export const updateTemplateItemSchema = createTemplateItemSchema.partial();

export type UpdateTemplateItem = z.infer<typeof updateTemplateItemSchema>;

export const templateItemSchema = createTemplateItemSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  templateId: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type TemplateItem = z.infer<typeof templateItemSchema>;

// ============================================================================
// CREATE TEMPLATE SCHEMA
// ============================================================================

export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().default(true),
  isGlobal: z.boolean().default(false),
  defaultCustomerId: z.string().uuid().optional(),
  defaultValues: templateDefaultValuesSchema.optional(),
  metadata: templateMetadataSchema.optional(),
  items: z.array(createTemplateItemSchema).min(1, 'At least one item required'),
});

export type CreateTemplate = z.infer<typeof createTemplateSchema>;

// ============================================================================
// UPDATE TEMPLATE SCHEMA
// ============================================================================

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
  isGlobal: z.boolean().optional(),
  defaultCustomerId: z.string().uuid().optional().nullable(),
  defaultValues: templateDefaultValuesSchema.optional().nullable(),
  metadata: templateMetadataSchema.optional().nullable(),
});

export type UpdateTemplate = z.infer<typeof updateTemplateSchema>;

// ============================================================================
// SAVE ORDER AS TEMPLATE SCHEMA
// ============================================================================

export const saveOrderAsTemplateSchema = z.object({
  orderId: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  isGlobal: z.boolean().default(false),
  preserveCustomer: z.boolean().default(false), // Whether to include customer as default
  preservePrices: z.boolean().default(false), // Whether to use fixed prices vs current
});

export type SaveOrderAsTemplate = z.infer<typeof saveOrderAsTemplateSchema>;

// ============================================================================
// CREATE ORDER FROM TEMPLATE SCHEMA
// ============================================================================

export const createOrderFromTemplateSchema = z.object({
  templateId: z.string().uuid(),
  customerId: z.string().uuid('Customer is required'),
  useTemplateDefaults: z.boolean().default(true), // Apply template default values
  overrides: z
    .object({
      discountPercent: percentageSchema.optional(),
      discountAmount: currencySchema.optional(),
      shippingAmount: currencySchema.optional(),
      internalNotes: z.string().max(2000).optional(),
      customerNotes: z.string().max(2000).optional(),
    })
    .optional(),
});

export type CreateOrderFromTemplate = z.infer<typeof createOrderFromTemplateSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const templateParamsSchema = z.object({
  id: z.string().uuid(),
});

export const templateListQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  category: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'createdAt', 'usageCount']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type TemplateListQuery = z.infer<typeof templateListQuerySchema>;

export const templateListCursorQuerySchema = cursorPaginationSchema.merge(
  z.object({
    search: z.string().optional(),
    isActive: z.boolean().optional(),
    category: z.string().optional(),
  })
);

export type TemplateListCursorQuery = z.infer<typeof templateListCursorQuerySchema>;

// ============================================================================
// OUTPUT SCHEMA
// ============================================================================

export const templateSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  isGlobal: z.boolean(),
  defaultCustomerId: z.string().uuid().nullable(),
  defaultValues: templateDefaultValuesSchema.nullable(),
  metadata: templateMetadataSchema.nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
});

export type Template = z.infer<typeof templateSchema>;
