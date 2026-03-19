const ORDER_MUTABLE_FIELDS = new Set([
  'customerId',
  'orderNumber',
  'status',
  'paymentStatus',
  'orderDate',
  'dueDate',
  'billingAddress',
  'shippingAddress',
  'discountPercent',
  'discountAmount',
  'shippingAmount',
  'metadata',
  'internalNotes',
  'customerNotes',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function buildPatch(
  input: Record<string, unknown>
): Partial<Record<string, unknown>> {
  const patch: Partial<Record<string, unknown>> = {};

  for (const [key, value] of Object.entries(input)) {
    if (!ORDER_MUTABLE_FIELDS.has(key)) {
      continue;
    }
    if (value === undefined) {
      continue;
    }
    patch[key] = value;
  }

  return patch;
}

export function applyOptimisticOrderPatch<T extends Record<string, unknown>>(
  current: T,
  input: Record<string, unknown>
): T {
  if (!isRecord(current)) {
    return current;
  }

  const patch = buildPatch(input);
  if (Object.keys(patch).length === 0) {
    return current;
  }

  return {
    ...current,
    ...patch,
  };
}
