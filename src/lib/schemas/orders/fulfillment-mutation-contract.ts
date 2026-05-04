import { z } from 'zod';

const uuidArraySchema = z.array(z.string().uuid());

export const fulfillmentInventoryMutationIdentitySchema = z.object({
  affectedInventoryIds: uuidArraySchema,
  affectedProductIds: uuidArraySchema,
  touchesSerializedInventory: z.boolean(),
});

export const fulfillmentInventoryMutationCacheResultSchema = z.object({
  affectedIds: uuidArraySchema.optional(),
  affectedInventoryIds: uuidArraySchema.optional(),
  affectedProductIds: uuidArraySchema.optional(),
  touchesSerializedInventory: z.boolean().optional(),
});

export type FulfillmentInventoryMutationIdentity = z.infer<
  typeof fulfillmentInventoryMutationIdentitySchema
>;
export type FulfillmentInventoryMutationCacheResult = z.infer<
  typeof fulfillmentInventoryMutationCacheResultSchema
>;
