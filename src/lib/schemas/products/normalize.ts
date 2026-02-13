/**
 * Product row normalization
 *
 * Normalizes raw DB rows for schema compatibility.
 * DB returns null for optional JSONB/text columns; schema expects {} or undefined.
 *
 * @see SCHEMA-TRACE.md - Single source of truth at API boundary
 */

type ProductRow = {
  metadata?: unknown;
  description?: unknown;
  dimensions?: unknown;
  [k: string]: unknown;
};

/** Normalize raw product row from DB for ProductWithRelations (handles null metadata, description, dimensions) */
export function normalizeProductRow<T extends ProductRow>(row: T) {
  return {
    ...row,
    metadata: row.metadata ?? {},
    description: row.description ?? null,
    dimensions: row.dimensions ?? {},
  };
}

/**
 * Normalize product for table display. Handles optional fields at boundary.
 * Per SCHEMA-TRACE §8 - single boundary, no scattered ?? in views.
 */
export function normalizeProductForTable<T extends {
  costPrice?: string | number | null;
  description?: string | null;
  categoryId?: string | null;
}>(p: T) {
  return {
    ...p,
    costPrice: p.costPrice ?? null,
    description: p.description ?? null,
    categoryId: p.categoryId ?? null,
  };
}
