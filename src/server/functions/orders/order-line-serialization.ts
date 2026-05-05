import { ValidationError } from '@/lib/server/errors';

export type OrderLineSerializationAction =
  | 'picking'
  | 'shipping'
  | 'unpicking'
  | 'creating an RMA for';

export interface OrderLineSerializationInput {
  id?: string;
  productId: string | null;
  description: string;
}

export interface OrderLineProductSerializationInput {
  isSerialized: boolean;
}

export function getOrderLineSerializationRequirement(
  lineItem: OrderLineSerializationInput,
  product: OrderLineProductSerializationInput | null,
  action: OrderLineSerializationAction
): boolean {
  if (!lineItem.productId) return false;

  if (!product) {
    const errorKey = lineItem.id ?? 'productId';
    throw new ValidationError('Product serialization requirements are unavailable', {
      [errorKey]: [
        `Line '${lineItem.description}' is linked to a product that could not be loaded. Refresh product data before ${action} this order.`,
      ],
    });
  }

  return product.isSerialized;
}
