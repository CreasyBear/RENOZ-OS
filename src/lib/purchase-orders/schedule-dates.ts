type PurchaseOrderDateInput = string | Date | null | undefined;

export type PurchaseOrderScheduleDateField = 'requiredDate' | 'expectedDeliveryDate';

export interface PurchaseOrderScheduleDateError {
  message: string;
  fieldErrors: Partial<Record<PurchaseOrderScheduleDateField, string[]>>;
}

function toIsoDateString(value: PurchaseOrderDateInput): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
}

export function getPurchaseOrderScheduleDateError(input: {
  orderDate: PurchaseOrderDateInput;
  requiredDate?: PurchaseOrderDateInput;
  expectedDeliveryDate?: PurchaseOrderDateInput;
}): PurchaseOrderScheduleDateError | null {
  const orderDate = toIsoDateString(input.orderDate);
  const requiredDate = toIsoDateString(input.requiredDate);
  const expectedDeliveryDate = toIsoDateString(input.expectedDeliveryDate);

  if (!orderDate) return null;

  if (requiredDate && requiredDate < orderDate) {
    return {
      message: `Required date (${requiredDate}) cannot be before order date (${orderDate})`,
      fieldErrors: { requiredDate: ['Required date cannot be before order date'] },
    };
  }

  if (expectedDeliveryDate && expectedDeliveryDate < orderDate) {
    return {
      message: `Expected delivery date (${expectedDeliveryDate}) cannot be before order date (${orderDate})`,
      fieldErrors: { expectedDeliveryDate: ['Expected delivery date cannot be before order date'] },
    };
  }

  return null;
}
