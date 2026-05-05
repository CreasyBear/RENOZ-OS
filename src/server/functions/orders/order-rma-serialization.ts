import { ValidationError } from '@/lib/server/errors';
import {
  getOrderLineSerializationRequirement,
  type OrderLineProductSerializationInput,
  type OrderLineSerializationInput,
} from './order-line-serialization';

export type RmaCreateLineSerializationInput = OrderLineSerializationInput & {
  id: string;
};

export type RmaCreateLineProductSerializationInput = OrderLineProductSerializationInput;

export function getRmaCreateLineSerializationRequirement(
  lineItem: RmaCreateLineSerializationInput,
  product: RmaCreateLineProductSerializationInput | null
): boolean {
  if (!lineItem.productId) {
    throw new ValidationError('RMA line item must be linked to a product', {
      [lineItem.id]: [
        `Line '${lineItem.description}' is not linked to a product. Select a product-backed order line before creating an RMA.`,
      ],
    });
  }

  return getOrderLineSerializationRequirement(
    lineItem,
    product,
    'creating an RMA for'
  );
}

export function getRmaReceiveLineSerializationRequirement(
  lineItem: RmaCreateLineSerializationInput,
  product: RmaCreateLineProductSerializationInput | null
): boolean {
  if (!lineItem.productId) {
    throw new ValidationError('RMA line item must be linked to a product', {
      [lineItem.id]: [
        `RMA line '${lineItem.description}' is not linked to a product. Repair the source order line before receiving this RMA.`,
      ],
    });
  }

  return getOrderLineSerializationRequirement(
    lineItem,
    product,
    'receiving an RMA for'
  );
}

export function getRequiredRmaCreateLineSerializationRequirement(
  serializationMap: Map<string, boolean>,
  orderLineItemId: string
): boolean {
  const isSerialized = serializationMap.get(orderLineItemId);
  if (isSerialized === undefined) {
    throw new ValidationError('Product serialization requirements are unavailable', {
      [orderLineItemId]: [
        'Product serialization requirements are unavailable for this RMA line. Refresh order data before creating an RMA.',
      ],
    });
  }

  return isSerialized;
}
