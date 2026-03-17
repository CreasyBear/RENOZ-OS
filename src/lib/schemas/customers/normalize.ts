/**
 * Customer row normalization
 *
 * Normalizes raw DB/list response for schema compatibility.
 * Per SCHEMA-TRACE §8 - single boundary, no scattered ?? in views.
 */

function normalizeDateValue(value: string | Date | null | undefined) {
  if (value == null) return value ?? null;
  return value instanceof Date ? value : new Date(value);
}

/**
 * Normalize customer for combobox display. Handles optional fields at boundary.
 * Converts null to undefined for schema compatibility (Customer expects undefined, not null).
 */
export function normalizeCustomerForCombobox<T extends {
  tags?: unknown[] | null;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  size?: string | null;
  industry?: string | null;
  taxId?: string | null;
  registrationNumber?: string | null;
}>(item: T) {
  return {
    ...item,
    tags: item.tags ?? [],
    legalName: item.legalName ?? undefined,
    email: item.email ?? undefined,
    phone: item.phone ?? undefined,
    website: item.website ?? undefined,
    size: item.size ?? undefined,
    industry: item.industry ?? undefined,
    taxId: item.taxId ?? undefined,
    registrationNumber: item.registrationNumber ?? undefined,
  };
}

/**
 * Normalize customer detail payload returned across the server boundary.
 * Converts serialized dates back to Date instances and aligns optional fields.
 */
export function normalizeCustomerDetail<T extends {
  tags?: unknown[] | null;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  size?: string | null;
  industry?: string | null;
  taxId?: string | null;
  registrationNumber?: string | null;
  parentId?: string | null;
  creditLimit?: string | number | null;
  creditHoldReason?: string | null;
  customFields?: unknown;
  firstOrderDate?: string | Date | null;
  lastOrderDate?: string | Date | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
  contacts?: unknown[] | null;
  addresses?: unknown[] | null;
}>(item: T) {
  return {
    ...item,
    ...normalizeCustomerForCombobox(item),
    parentId: item.parentId ?? undefined,
    creditLimit: item.creditLimit ?? undefined,
    creditHoldReason: item.creditHoldReason ?? undefined,
    customFields: item.customFields ?? undefined,
    firstOrderDate: normalizeDateValue(item.firstOrderDate),
    lastOrderDate: normalizeDateValue(item.lastOrderDate),
    createdAt: normalizeDateValue(item.createdAt) ?? new Date(),
    updatedAt: normalizeDateValue(item.updatedAt) ?? new Date(),
    deletedAt: normalizeDateValue(item.deletedAt),
    contacts: item.contacts ?? [],
    addresses: item.addresses ?? [],
  } as T;
}
