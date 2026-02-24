import { z } from 'zod';

export const inventoryFinanceErrorCodeSchema = z.enum([
  'insufficient_cost_layers',
  'layer_transfer_mismatch',
  'inventory_value_drift_detected',
  'serialized_unit_violation',
  'invalid_serial_state',
  'landed_cost_allocation_conflict',
]);

export const inventoryFinancePartialFailureSchema = z.object({
  code: inventoryFinanceErrorCodeSchema,
  message: z.string(),
});

export const inventoryFinanceLayerDeltaSchema = z.object({
  inventoryId: z.string().uuid().optional(),
  layerId: z.string().uuid().optional(),
  quantityDelta: z.number(),
  costDelta: z.number(),
  action: z.string(),
});

export const inventoryFinanceMetadataSchema = z.object({
  valuationBefore: z.number().optional(),
  valuationAfter: z.number().optional(),
  cogsImpact: z.number().optional(),
  layerDeltas: z.array(inventoryFinanceLayerDeltaSchema).optional(),
});

export const inventoryFinanceMutationResultSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  affectedInventoryIds: z.array(z.string().uuid()).optional(),
  affectedLayerIds: z.array(z.string().uuid()).optional(),
  financeMetadata: inventoryFinanceMetadataSchema.optional(),
  errorsById: z.record(z.string(), z.string()).optional(),
  partialFailure: inventoryFinancePartialFailureSchema.optional(),
});

export type InventoryFinanceErrorCode = z.infer<typeof inventoryFinanceErrorCodeSchema>;
export type InventoryFinanceMutationResult = z.infer<typeof inventoryFinanceMutationResultSchema>;
export type InventoryFinanceMetadata = z.infer<typeof inventoryFinanceMetadataSchema>;
