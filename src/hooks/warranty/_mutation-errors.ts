type UnknownRecord = Record<string, unknown>;

const DEFAULT_CODE_MESSAGES: Record<string, string> = {
  transition_blocked:
    'This claim cannot move to that status. Refresh and review the current claim state.',
  notification_failed:
    'The claim was saved, but notification delivery did not complete. Review the claim activity before retrying.',
  NOT_FOUND: 'Warranty claim or warranty record could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to update this warranty claim.',
  AUTH_ERROR: 'Your session has expired. Sign in again before updating this warranty claim.',
  RATE_LIMIT: 'Too many warranty claim updates were attempted. Wait a moment and retry.',
};

const WARRANTY_CLAIM_MUTATION_FALLBACKS = {
  submit: 'Warranty claim submission is temporarily unavailable. Please refresh and try again.',
  updateStatus:
    'Warranty claim status update is temporarily unavailable. Please refresh and try again.',
  approve: 'Warranty claim approval is temporarily unavailable. Please refresh and try again.',
  deny: 'Warranty claim denial is temporarily unavailable. Please refresh and try again.',
  resolve: 'Warranty claim resolution is temporarily unavailable. Please refresh and try again.',
  assign: 'Warranty claim assignment is temporarily unavailable. Please refresh and try again.',
  cancel: 'Warranty claim cancellation is temporarily unavailable. Please refresh and try again.',
} as const;

const WARRANTY_POLICY_MUTATION_FALLBACKS = {
  create: 'Warranty policy creation is temporarily unavailable. Please refresh and try again.',
  update: 'Warranty policy update is temporarily unavailable. Please refresh and try again.',
  delete: 'Warranty policy deletion is temporarily unavailable. Please refresh and try again.',
  setDefault:
    'Default warranty policy update is temporarily unavailable. Please refresh and try again.',
  seedDefaults:
    'Default warranty policy creation is temporarily unavailable. Please refresh and try again.',
  assignProduct:
    'Product warranty policy assignment is temporarily unavailable. Please refresh and try again.',
  assignCategory:
    'Category warranty policy assignment is temporarily unavailable. Please refresh and try again.',
} as const;

const WARRANTY_CORE_MUTATION_FALLBACKS = {
  updateNotifications:
    'Warranty notification settings update is temporarily unavailable. Please refresh and try again.',
  delete: 'Warranty deletion is temporarily unavailable. Please refresh and try again.',
  void: 'Warranty voiding is temporarily unavailable. Please refresh and try again.',
  transferOwnership:
    'Warranty ownership transfer is temporarily unavailable. Please refresh and try again.',
} as const;

const WARRANTY_ENTITLEMENT_MUTATION_FALLBACKS = {
  activate:
    'Warranty activation from entitlement is temporarily unavailable. Please refresh and try again.',
} as const;

const WARRANTY_EXTENSION_MUTATION_FALLBACKS = {
  extend: 'Warranty extension is temporarily unavailable. Please refresh and try again.',
} as const;

const WARRANTY_CERTIFICATE_MUTATION_FALLBACKS = {
  generate:
    'Warranty certificate generation is temporarily unavailable. Please refresh and try again.',
  regenerate:
    'Warranty certificate regeneration is temporarily unavailable. Please refresh and try again.',
} as const;

const WARRANTY_BULK_IMPORT_MUTATION_FALLBACKS = {
  preview:
    'Warranty import preview is temporarily unavailable. Please refresh and try again.',
  register:
    'Bulk warranty registration is temporarily unavailable. Please refresh and try again.',
} as const;

interface FormatWarrantyMutationErrorOptions {
  codeMessages?: Record<string, string>;
}

export type WarrantyClaimMutationAction = keyof typeof WARRANTY_CLAIM_MUTATION_FALLBACKS;
export type WarrantyPolicyMutationAction = keyof typeof WARRANTY_POLICY_MUTATION_FALLBACKS;
export type WarrantyCoreMutationAction = keyof typeof WARRANTY_CORE_MUTATION_FALLBACKS;
export type WarrantyEntitlementMutationAction =
  keyof typeof WARRANTY_ENTITLEMENT_MUTATION_FALLBACKS;
export type WarrantyExtensionMutationAction =
  keyof typeof WARRANTY_EXTENSION_MUTATION_FALLBACKS;
export type WarrantyCertificateMutationAction =
  keyof typeof WARRANTY_CERTIFICATE_MUTATION_FALLBACKS;
export type WarrantyBulkImportMutationAction =
  keyof typeof WARRANTY_BULK_IMPORT_MUTATION_FALLBACKS;

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
    ['cause', 'message'],
    ['cause', 'data', 'message'],
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
    normalized.includes('duplicate key') ||
    normalized.includes('violates') ||
    normalized.includes('constraint') ||
    normalized.includes('postgres') ||
    normalized.includes('supabase') ||
    normalized.includes('database') ||
    normalized.includes('sql') ||
    normalized.includes('stack') ||
    normalized.includes('internal server error') ||
    normalized.includes('typeerror') ||
    normalized.includes('referenceerror') ||
    normalized.includes('not a function') ||
    /cannot (read|set) properties of (undefined|null)/.test(normalized) ||
    /\bat\s+[\w.$<>]+\s*\(/.test(message)
  );
}

function lookupCodeMessage(
  code: string,
  options: FormatWarrantyMutationErrorOptions
): string | undefined {
  return (
    options.codeMessages?.[code] ??
    DEFAULT_CODE_MESSAGES[code] ??
    DEFAULT_CODE_MESSAGES[code.toUpperCase()]
  );
}

export function formatWarrantyMutationError(
  error: unknown,
  fallback: string,
  options: FormatWarrantyMutationErrorOptions = {}
): string {
  const code = extractCode(error);
  const fieldMessage = extractFieldErrorMessage(error);
  const statusCode = extractStatusCode(error);
  const codeMessage = code ? lookupCodeMessage(code, options) : undefined;

  if (fieldMessage && !isUnsafeMessage(fieldMessage)) {
    return fieldMessage;
  }

  if (codeMessage) {
    return codeMessage;
  }

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

export function formatWarrantyClaimMutationError(
  error: unknown,
  action: WarrantyClaimMutationAction
): string {
  return formatWarrantyMutationError(error, WARRANTY_CLAIM_MUTATION_FALLBACKS[action]);
}

export function formatWarrantyPolicyMutationError(
  error: unknown,
  action: WarrantyPolicyMutationAction
): string {
  return formatWarrantyMutationError(error, WARRANTY_POLICY_MUTATION_FALLBACKS[action]);
}

export function formatWarrantyCoreMutationError(
  error: unknown,
  action: WarrantyCoreMutationAction
): string {
  return formatWarrantyMutationError(error, WARRANTY_CORE_MUTATION_FALLBACKS[action]);
}

export function formatWarrantyEntitlementMutationError(
  error: unknown,
  action: WarrantyEntitlementMutationAction
): string {
  return formatWarrantyMutationError(error, WARRANTY_ENTITLEMENT_MUTATION_FALLBACKS[action]);
}

export function formatWarrantyExtensionMutationError(
  error: unknown,
  action: WarrantyExtensionMutationAction
): string {
  return formatWarrantyMutationError(error, WARRANTY_EXTENSION_MUTATION_FALLBACKS[action]);
}

export function formatWarrantyCertificateMutationError(
  error: unknown,
  action: WarrantyCertificateMutationAction
): string {
  return formatWarrantyMutationError(error, WARRANTY_CERTIFICATE_MUTATION_FALLBACKS[action]);
}

export function formatWarrantyBulkImportMutationError(
  error: unknown,
  action: WarrantyBulkImportMutationAction
): string {
  return formatWarrantyMutationError(error, WARRANTY_BULK_IMPORT_MUTATION_FALLBACKS[action]);
}
