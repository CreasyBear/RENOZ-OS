type UnknownRecord = Record<string, unknown>;

const PRODUCT_PRICING_FALLBACKS = {
  createTier:
    'Product price tier creation is temporarily unavailable. Please refresh and try again.',
  updateTier:
    'Product price tier update is temporarily unavailable. Please refresh and try again.',
  deleteTier:
    'Product price tier deletion is temporarily unavailable. Please refresh and try again.',
  setTiers:
    'Product price tier update is temporarily unavailable. Please refresh and try again.',
  setCustomerPrice:
    'Customer-specific product pricing is temporarily unavailable. Please refresh and try again.',
  deleteCustomerPrice:
    'Customer-specific product pricing removal is temporarily unavailable. Please refresh and try again.',
  bulkUpdate:
    'Bulk product price update is temporarily unavailable. Please refresh and try again.',
  adjust:
    'Product price adjustment is temporarily unavailable. Please refresh and try again.',
} as const;

const PRODUCT_CORE_FALLBACKS = {
  createProduct:
    'Product creation is temporarily unavailable. Please refresh and try again.',
  updateProduct:
    'Product update is temporarily unavailable. Please refresh and try again.',
  deleteProduct:
    'Product deletion is temporarily unavailable. Please refresh and try again.',
  bulkDelete:
    'Bulk product deletion is temporarily unavailable. Please refresh and try again.',
  duplicateProduct:
    'Product duplication is temporarily unavailable. Please refresh and try again.',
  createCategory:
    'Product category creation is temporarily unavailable. Please refresh and try again.',
  updateCategory:
    'Product category update is temporarily unavailable. Please refresh and try again.',
  deleteCategory:
    'Product category deletion is temporarily unavailable. Please refresh and try again.',
  importProducts:
    'Product import is temporarily unavailable. Please refresh and try again.',
  bulkUpdateProducts:
    'Bulk product update is temporarily unavailable. Please refresh and try again.',
  bulkAdjustPrices:
    'Bulk product price adjustment is temporarily unavailable. Please refresh and try again.',
  exportProducts:
    'Product export is temporarily unavailable. Please refresh and try again.',
} as const;

const PRODUCT_CODE_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Product record could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to manage products.',
  AUTH_ERROR: 'Your session has expired. Sign in again before managing products.',
  RATE_LIMIT: 'Too many product changes were attempted. Wait a moment and retry.',
  CONFLICT: 'Product details conflict with an existing record.',
};

const PRODUCT_PRICING_CODE_MESSAGES: Record<string, string> = {
  ...PRODUCT_CODE_MESSAGES,
  NOT_FOUND: 'Product pricing record could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to manage product pricing.',
  AUTH_ERROR: 'Your session has expired. Sign in again before managing product pricing.',
  RATE_LIMIT: 'Too many product pricing changes were attempted. Wait a moment and retry.',
  CONFLICT: 'Product pricing conflicts with an existing price rule.',
};

export type ProductPricingMutationAction = keyof typeof PRODUCT_PRICING_FALLBACKS;
export type ProductCoreMutationAction = keyof typeof PRODUCT_CORE_FALLBACKS;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function getValueAtPath(source: unknown, path: string[]): unknown {
  let cursor: unknown = source;
  for (const segment of path) {
    if (!isRecord(cursor)) return undefined;
    cursor = cursor[segment];
  }
  return cursor;
}

function extractFirstString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) return value;

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === 'string' && entry.trim().length > 0) {
        return entry;
      }
    }
  }

  return null;
}

function extractStatusCode(error: unknown): number | null {
  const paths = [
    ['statusCode'],
    ['status'],
    ['data', 'statusCode'],
    ['cause', 'statusCode'],
    ['cause', 'data', 'statusCode'],
    ['response', 'status'],
    ['response', 'data', 'statusCode'],
  ];

  for (const path of paths) {
    const value = getValueAtPath(error, path);
    if (typeof value === 'number') return value;
  }

  return null;
}

function extractCode(error: unknown): string | null {
  const paths = [
    ['errors', 'code'],
    ['data', 'errors', 'code'],
    ['cause', 'errors', 'code'],
    ['cause', 'data', 'errors', 'code'],
    ['details', 'validationErrors', 'code'],
    ['data', 'details', 'validationErrors', 'code'],
    ['cause', 'details', 'validationErrors', 'code'],
    ['cause', 'data', 'details', 'validationErrors', 'code'],
    ['response', 'data', 'details', 'validationErrors', 'code'],
    ['code'],
    ['data', 'code'],
    ['cause', 'code'],
    ['cause', 'data', 'code'],
    ['response', 'data', 'code'],
  ];

  for (const path of paths) {
    const code = extractFirstString(getValueAtPath(error, path));
    if (code) return code;
  }

  return null;
}

function extractFieldErrorMessage(error: unknown): string | null {
  const paths = [
    ['errors'],
    ['data', 'errors'],
    ['cause', 'errors'],
    ['cause', 'data', 'errors'],
    ['response', 'data', 'errors'],
    ['details', 'validationErrors'],
    ['data', 'details', 'validationErrors'],
    ['cause', 'details', 'validationErrors'],
    ['cause', 'data', 'details', 'validationErrors'],
    ['response', 'data', 'details', 'validationErrors'],
  ];

  for (const path of paths) {
    const fieldErrors = getValueAtPath(error, path);
    if (!isRecord(fieldErrors)) continue;

    for (const [field, messages] of Object.entries(fieldErrors)) {
      if (field === 'code') continue;
      const first = extractFirstString(messages);
      if (first) return first;
    }
  }

  return null;
}

function extractMessage(error: unknown): string | null {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  const paths = [
    ['message'],
    ['error'],
    ['data', 'message'],
    ['data', 'error'],
    ['details', 'summary'],
    ['data', 'details', 'summary'],
    ['cause', 'message'],
    ['cause', 'details', 'summary'],
    ['cause', 'data', 'message'],
    ['cause', 'data', 'details', 'summary'],
    ['response', 'data', 'details', 'summary'],
    ['response', 'data', 'message'],
    ['response', 'data', 'error'],
  ];

  for (const path of paths) {
    const message = extractFirstString(getValueAtPath(error, path));
    if (message) return message;
  }

  return null;
}

function isUnsafeMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('api key') ||
    normalized.includes('client_secret') ||
    normalized.includes('duplicate key') ||
    normalized.includes('violates') ||
    normalized.includes('constraint') ||
    normalized.includes('postgres') ||
    normalized.includes('supabase') ||
    normalized.includes('database') ||
    normalized.includes('stack') ||
    normalized.includes('token') ||
    normalized.includes('internal server error')
  );
}

function formatProductMutationError(
  error: unknown,
  fallback: string,
  codeMessages: Record<string, string>
): string {
  const fieldMessage = extractFieldErrorMessage(error);

  if (fieldMessage && !isUnsafeMessage(fieldMessage)) {
    return fieldMessage;
  }

  const code = extractCode(error);
  const codeMessage = code
    ? codeMessages[code] ?? codeMessages[code.toUpperCase()]
    : undefined;

  if (codeMessage) {
    return codeMessage;
  }

  const statusCode = extractStatusCode(error);
  const message = extractMessage(error);
  if (
    message &&
    !isUnsafeMessage(message) &&
    (statusCode === 400 || statusCode === 401 || statusCode === 403 || statusCode === 404)
  ) {
    return message;
  }

  return fallback;
}

export function formatProductPricingMutationError(
  error: unknown,
  action: ProductPricingMutationAction
): string {
  return formatProductMutationError(
    error,
    PRODUCT_PRICING_FALLBACKS[action],
    PRODUCT_PRICING_CODE_MESSAGES
  );
}

export function formatProductCoreMutationError(
  error: unknown,
  action: ProductCoreMutationAction
): string {
  return formatProductMutationError(
    error,
    PRODUCT_CORE_FALLBACKS[action],
    PRODUCT_CODE_MESSAGES
  );
}
