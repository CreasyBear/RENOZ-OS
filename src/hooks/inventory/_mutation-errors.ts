type UnknownRecord = Record<string, unknown>;

type InventoryMutationErrorCode =
  | 'insufficient_cost_layers'
  | 'layer_transfer_mismatch'
  | 'serialized_unit_violation'
  | 'inventory_value_drift_detected'
  | 'landed_cost_allocation_conflict';

const DEFAULT_CODE_MESSAGES: Record<InventoryMutationErrorCode, string> = {
  insufficient_cost_layers:
    'Cost layers are incomplete for this item. Reconcile layers and retry.',
  layer_transfer_mismatch: 'Cost-layer transfer mismatch detected. Refresh and retry.',
  serialized_unit_violation:
    'Serialized item integrity failed (unit must remain 0 or 1). Refresh and retry.',
  inventory_value_drift_detected:
    'Inventory valuation drift detected. Reconcile valuation and retry.',
  landed_cost_allocation_conflict:
    'Landed-cost allocation conflict detected. Review receipt costs and retry.',
};

interface FormatInventoryMutationErrorOptions {
  codeMessages?: Record<string, string>;
}

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

function isInventoryMutationErrorCode(code: string): code is InventoryMutationErrorCode {
  return code in DEFAULT_CODE_MESSAGES;
}

function extractValidationCode(error: unknown): string | null {
  const codePaths = [
    ['errors', 'code'],
    ['data', 'errors', 'code'],
    ['cause', 'errors', 'code'],
    ['cause', 'data', 'errors', 'code'],
    ['response', 'data', 'errors', 'code'],
    ['details', 'validationErrors', 'code'],
    ['data', 'details', 'validationErrors', 'code'],
    ['cause', 'details', 'validationErrors', 'code'],
    ['cause', 'data', 'details', 'validationErrors', 'code'],
    ['response', 'data', 'details', 'validationErrors', 'code'],
  ];

  for (const path of codePaths) {
    const code = extractFirstString(getValueAtPath(error, path));
    if (code) return code;
  }
  return null;
}

function extractFieldErrorMessage(error: unknown): string | null {
  const errorPaths = [
    ['errors'],
    ['data', 'errors'],
    ['cause', 'errors'],
    ['cause', 'data', 'errors'],
    ['response', 'data', 'errors'],
  ];

  for (const path of errorPaths) {
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

export function formatInventoryMutationError(
  error: unknown,
  fallback: string,
  options: FormatInventoryMutationErrorOptions = {}
): string {
  const code = extractValidationCode(error);
  const fieldMessage = extractFieldErrorMessage(error);

  if (code) {
    if (isInventoryMutationErrorCode(code)) {
      return fieldMessage ?? options.codeMessages?.[code] ?? DEFAULT_CODE_MESSAGES[code];
    }
    if (options.codeMessages?.[code]) {
      return fieldMessage ?? options.codeMessages[code];
    }
  }

  return fieldMessage ?? fallback;
}
