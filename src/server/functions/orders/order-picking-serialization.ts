import { ValidationError } from '@/lib/server/errors';

export type OrderPickingSerializationAction = 'picking' | 'unpicking';

export interface OrderPickingLineSerializationInput {
  productId: string | null;
  description: string;
}

export interface OrderPickingProductSerializationInput {
  isSerialized: boolean;
}

export function getOrderPickingSerializationRequirement(
  lineItem: OrderPickingLineSerializationInput,
  product: OrderPickingProductSerializationInput | null,
  action: OrderPickingSerializationAction
): boolean {
  if (!lineItem.productId) return false;

  if (!product) {
    throw new ValidationError('Product serialization requirements are unavailable', {
      productId: [
        `Line '${lineItem.description}' is linked to a product that could not be loaded. Refresh product data before ${action} this order.`,
      ],
    });
  }

  return product.isSerialized;
}
