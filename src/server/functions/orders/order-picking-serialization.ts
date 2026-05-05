import {
  getOrderLineSerializationRequirement,
  type OrderLineProductSerializationInput,
  type OrderLineSerializationInput,
} from './order-line-serialization';

export type OrderPickingSerializationAction = 'picking' | 'unpicking';
export type OrderPickingLineSerializationInput = OrderLineSerializationInput;
export type OrderPickingProductSerializationInput = OrderLineProductSerializationInput;

export function getOrderPickingSerializationRequirement(
  lineItem: OrderPickingLineSerializationInput,
  product: OrderPickingProductSerializationInput | null,
  action: OrderPickingSerializationAction
): boolean {
  return getOrderLineSerializationRequirement(lineItem, product, action);
}
