/**
 * Serialized Item Schemas
 *
 * Validation and types for canonical serialized lineage CRUD workflows.
 */

import { z } from 'zod';
import { paginationSchema } from '../_shared/patterns';

export const serializedItemStatusValues = [
  'available',
  'allocated',
  'shipped',
  'returned',
  'quarantined',
  'scrapped',
] as const;

export const serializedItemEventTypeValues = [
  'received',
  'allocated',
  'deallocated',
  'shipped',
  'returned',
  'warranty_registered',
  'warranty_claimed',
  'rma_requested',
  'rma_received',
  'status_changed',
] as const;

export const serializedItemStatusSchema = z.enum(serializedItemStatusValues);
export const serializedItemEventTypeSchema = z.enum(serializedItemEventTypeValues);

export const serializedItemSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string().nullable(),
  productSku: z.string().nullable(),
  serialNumberRaw: z.string(),
  serialNumberNormalized: z.string(),
  status: serializedItemStatusSchema,
  currentInventoryId: z.string().uuid().nullable(),
  inventoryLocationName: z.string().nullable(),
  sourceReceiptItemId: z.string().uuid().nullable(),
  sourceReceiptId: z.string().uuid().nullable(),
  sourceReceiptNumber: z.string().nullable(),
  activeOrderLineItemId: z.string().uuid().nullable(),
  activeOrderId: z.string().uuid().nullable(),
  activeOrderNumber: z.string().nullable(),
  latestShipmentItemId: z.string().uuid().nullable(),
  latestShipmentId: z.string().uuid().nullable(),
  latestShipmentNumber: z.string().nullable(),
  latestWarrantyId: z.string().uuid().nullable(),
  latestWarrantyNumber: z.string().nullable(),
  latestRmaId: z.string().uuid().nullable(),
  latestRmaNumber: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
});

export const serializedItemEventSchema = z.object({
  id: z.string().uuid(),
  serializedItemId: z.string().uuid(),
  eventType: serializedItemEventTypeSchema,
  entityType: z.string().nullable(),
  entityId: z.string().uuid().nullable(),
  notes: z.string().nullable(),
  occurredAt: z.coerce.date(),
  createdAt: z.coerce.date(),
});

export const serializedItemListFilterSchema = z.object({
  search: z.string().trim().min(1).optional(),
  productId: z.string().uuid().optional(),
  status: z.union([serializedItemStatusSchema, z.array(serializedItemStatusSchema)]).optional(),
});

export const serializedItemListQuerySchema = paginationSchema.merge(serializedItemListFilterSchema);

export const createSerializedItemSchema = z.object({
  productId: z.string().uuid('Product is required'),
  serialNumber: z.string().trim().min(1, 'Serial number is required').max(255),
  currentInventoryId: z.string().uuid().optional(),
  status: serializedItemStatusSchema.default('available'),
  notes: z.string().trim().max(500).optional(),
});

export const updateSerializedItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid().optional(),
  serialNumber: z.string().trim().min(1).max(255).optional(),
  currentInventoryId: z.string().uuid().nullable().optional(),
  status: serializedItemStatusSchema.optional(),
  notes: z.string().trim().max(500).optional(),
});

export const deleteSerializedItemSchema = z.object({
  id: z.string().uuid(),
});

export const serializedItemParamsSchema = z.object({
  id: z.string().uuid(),
});

export type SerializedItemStatus = z.infer<typeof serializedItemStatusSchema>;
export type SerializedItemEventType = z.infer<typeof serializedItemEventTypeSchema>;
export type SerializedItem = z.infer<typeof serializedItemSchema>;
export type SerializedItemEvent = z.infer<typeof serializedItemEventSchema>;
export type SerializedItemListQuery = z.infer<typeof serializedItemListQuerySchema>;
export type CreateSerializedItemInput = z.infer<typeof createSerializedItemSchema>;
export type UpdateSerializedItemInput = z.infer<typeof updateSerializedItemSchema>;
export type DeleteSerializedItemInput = z.infer<typeof deleteSerializedItemSchema>;

export interface SerializedItemListResult {
  items: SerializedItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SerializedItemDetailResult {
  item: SerializedItem;
  events: SerializedItemEvent[];
}
