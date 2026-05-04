import { z } from 'zod';
import {
  filterSchema,
  idParamSchema,
  normalizeObjectInput,
  paginationSchema,
  type FlexibleJson,
} from '../_shared/patterns';

export const stockCountStatusValues = ['draft', 'in_progress', 'completed', 'cancelled'] as const;

export const stockCountTypeValues = ['full', 'cycle', 'spot', 'annual'] as const;

export const stockCountStatusSchema = z.enum(stockCountStatusValues);
export const stockCountTypeSchema = z.enum(stockCountTypeValues);

// ============================================================================
// STOCK COUNT
// ============================================================================

export const stockCountMetadataSchema = z
  .object({
    instructions: z.string().max(1000).optional(),
    varianceNotes: z.string().max(1000).optional(),
  })
  .passthrough();

// FlexibleJson for ServerFn boundary per SCHEMA-TRACE section 4.
export type StockCountMetadata = FlexibleJson | null;

export const createStockCountSchema = z.object({
  countCode: z.string().min(1, 'Count code is required').max(20),
  countType: stockCountTypeSchema.default('cycle'),
  locationId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  varianceThreshold: z.coerce.number().min(0).max(100).default(5),
  notes: z.string().max(1000).optional(),
  metadata: stockCountMetadataSchema.default({}),
});

export type CreateStockCount = z.infer<typeof createStockCountSchema>;

export const updateStockCountSchema = createStockCountSchema.partial().extend({
  status: stockCountStatusSchema.optional(),
});

export type UpdateStockCount = z.infer<typeof updateStockCountSchema>;

export const stockCountSchema = createStockCountSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  status: stockCountStatusSchema,
  startedAt: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  approvedBy: z.string().uuid().nullable(),
  approvedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
  version: z.number(),
});

export type StockCount = z.infer<typeof stockCountSchema>;

export const stockCountFilterSchema = filterSchema.extend({
  status: stockCountStatusSchema.optional(),
  countType: stockCountTypeSchema.optional(),
  locationId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
});

export type StockCountFilter = z.infer<typeof stockCountFilterSchema>;

export const stockCountListQuerySchema = normalizeObjectInput(
  paginationSchema.merge(stockCountFilterSchema)
);
export type StockCountListQuery = z.infer<typeof stockCountListQuerySchema>;

// ============================================================================
// STOCK COUNT ITEMS
// ============================================================================

export const createStockCountItemSchema = z.object({
  inventoryId: z.string().uuid('Inventory item is required'),
  expectedQuantity: z.number().int(),
});

export type CreateStockCountItem = z.infer<typeof createStockCountItemSchema>;

export const updateStockCountItemSchema = z.object({
  countedQuantity: z.number().int().optional(),
  varianceReason: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
});

export type UpdateStockCountItem = z.infer<typeof updateStockCountItemSchema>;

export const stockCountItemSchema = z.object({
  id: z.string().uuid(),
  stockCountId: z.string().uuid(),
  inventoryId: z.string().uuid(),
  expectedQuantity: z.number().int(),
  countedQuantity: z.number().int().nullable(),
  varianceReason: z.string().nullable(),
  countedBy: z.string().uuid().nullable(),
  countedAt: z.coerce.date().nullable(),
  reviewedBy: z.string().uuid().nullable(),
  reviewedAt: z.coerce.date().nullable(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type StockCountItem = z.infer<typeof stockCountItemSchema>;

/**
 * Extended stock count item with inventory, product, and location relations
 * as returned from getStockCount server function
 */
export interface StockCountItemWithRelations extends StockCountItem {
  inventory?: {
    product?: {
      name?: string;
      sku?: string;
    };
    location?: {
      name?: string;
    };
    productId?: string;
    unitCost?: number | null;
  } | null;
}

export const stockCountParamsSchema = idParamSchema;
export type StockCountParams = z.infer<typeof stockCountParamsSchema>;

export const stockCountItemParamsSchema = z.object({
  countId: z.string().uuid(),
  itemId: z.string().uuid(),
});
export type StockCountItemParams = z.infer<typeof stockCountItemParamsSchema>;
