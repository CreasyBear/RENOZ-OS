/**
 * Customer row normalization
 *
 * Normalizes raw DB/list response for schema compatibility.
 * Per SCHEMA-TRACE §8 - single boundary, no scattered ?? in views.
 */

/**
 * Normalize customer for combobox display. Handles optional fields at boundary.
 */
export function normalizeCustomerForCombobox<T extends {
  tags?: unknown[] | null;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  size?: string | null;
  industry?: string | null;
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
  };
}
