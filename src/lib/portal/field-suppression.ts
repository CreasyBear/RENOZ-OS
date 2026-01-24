type RecordValue = string | number | boolean | null | undefined | object;

function pickFields<T extends Record<string, RecordValue>>(
  input: T,
  allowed: readonly (keyof T)[]
): Partial<T> {
  return allowed.reduce<Partial<T>>((acc, key) => {
    if (key in input) {
      acc[key] = input[key];
    }
    return acc;
  }, {});
}

export const PORTAL_ORDER_FIELDS = [
  'id',
  'orderNumber',
  'customerId',
  'status',
  'paymentStatus',
  'orderDate',
  'dueDate',
  'shippedDate',
  'deliveredDate',
  'billingAddress',
  'shippingAddress',
  'subtotal',
  'discountAmount',
  'discountPercent',
  'taxAmount',
  'shippingAmount',
  'total',
  'paidAmount',
  'balanceDue',
  'customerNotes',
  'createdAt',
  'updatedAt',
] as const;

export const PORTAL_JOB_ASSIGNMENT_FIELDS = [
  'id',
  'orderId',
  'customerId',
  'installerId',
  'jobType',
  'jobNumber',
  'title',
  'description',
  'scheduledDate',
  'scheduledTime',
  'status',
  'startedAt',
  'completedAt',
  'startLocation',
  'completeLocation',
  'signatureUrl',
  'signedByName',
  'confirmationStatus',
  'metadata',
  'createdAt',
  'updatedAt',
] as const;

export const PORTAL_ORDER_LINE_ITEM_FIELDS = [
  'id',
  'orderId',
  'productId',
  'lineNumber',
  'sku',
  'description',
  'quantity',
  'unitPrice',
  'discountPercent',
  'discountAmount',
  'taxType',
  'taxAmount',
  'lineTotal',
  'pickStatus',
  'pickedAt',
  'qtyPicked',
  'qtyShipped',
  'qtyDelivered',
  'createdAt',
  'updatedAt',
] as const;

export const PORTAL_QUOTE_FIELDS = [
  'id',
  'quoteNumber',
  'opportunityId',
  'customerId',
  'status',
  'quoteDate',
  'validUntil',
  'acceptedAt',
  'lineItems',
  'subtotal',
  'discountAmount',
  'taxAmount',
  'total',
  'terms',
  'notes',
  'createdAt',
  'updatedAt',
] as const;

export const PORTAL_QUOTE_VERSION_FIELDS = [
  'id',
  'opportunityId',
  'versionNumber',
  'items',
  'subtotal',
  'taxAmount',
  'total',
  'notes',
  'createdAt',
  'updatedAt',
] as const;

export function sanitizeOrderForPortal<T extends Record<string, RecordValue>>(order: T) {
  return pickFields(order, PORTAL_ORDER_FIELDS as readonly (keyof T)[]);
}

export function sanitizeJobAssignmentForPortal<T extends Record<string, RecordValue>>(job: T) {
  return pickFields(job, PORTAL_JOB_ASSIGNMENT_FIELDS as readonly (keyof T)[]);
}

export function sanitizeOrderLineItemForPortal<T extends Record<string, RecordValue>>(lineItem: T) {
  return pickFields(lineItem, PORTAL_ORDER_LINE_ITEM_FIELDS as readonly (keyof T)[]);
}

export function sanitizeQuoteForPortal<T extends Record<string, RecordValue>>(quote: T) {
  return pickFields(quote, PORTAL_QUOTE_FIELDS as readonly (keyof T)[]);
}

export function sanitizeQuoteVersionForPortal<T extends Record<string, RecordValue>>(version: T) {
  return pickFields(version, PORTAL_QUOTE_VERSION_FIELDS as readonly (keyof T)[]);
}
