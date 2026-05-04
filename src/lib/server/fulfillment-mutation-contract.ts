import {
  fulfillmentInventoryMutationIdentitySchema,
  type FulfillmentInventoryMutationIdentity,
} from '@/lib/schemas/orders';

export type FulfillmentInventoryMutationEnvelope<T> =
  T & FulfillmentInventoryMutationIdentity;

export function withFulfillmentInventoryMutationIdentity<T extends object>(
  payload: T,
  identity: FulfillmentInventoryMutationIdentity
): FulfillmentInventoryMutationEnvelope<T> {
  return {
    ...payload,
    ...fulfillmentInventoryMutationIdentitySchema.parse(identity),
  };
}
