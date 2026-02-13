/**
 * Saved Customer Filters Schemas
 *
 * Schemas for user-saved customer filter presets.
 * Types live here per SCHEMA-TRACE.md; server and hooks import from schemas.
 *
 * Wire type pattern: SavedCustomerFilterWire uses FlexibleJson for filters to satisfy
 * ServerFn serialization boundary. Domain type CustomerFiltersState for UI.
 *
 * @see src/server/functions/customers/saved-filters.ts
 * @see SCHEMA-TRACE.md §4 ServerFn Serialization Boundary
 */

import { z } from 'zod';
import type { FlexibleJson } from '../_shared/patterns';
import { flexibleJsonSchema } from '../_shared/patterns';
import {
  customerStatusValues,
  customerTypeValues,
  customerSizeValues,
} from './customers';

// ============================================================================
// TYPES
// ============================================================================

export type CustomerStatus = (typeof customerStatusValues)[number];
export type CustomerType = (typeof customerTypeValues)[number];
export type CustomerSize = (typeof customerSizeValues)[number];

/** Domain type for UI - extends Record<string, unknown> per useTransformedFilterUrlState (FILTER-STANDARDS) */
export interface CustomerFiltersState extends Record<string, unknown> {
  search: string;
  status: CustomerStatus[];
  type: CustomerType[];
  size: CustomerSize[];
  healthScoreRange: { min: number | null; max: number | null } | null;
  tags: string[];
}

/** Domain type - used by hooks and components */
export interface SavedCustomerFilter {
  id: string;
  name: string;
  filters: CustomerFiltersState;
  createdAt: Date;
  updatedAt: Date;
}

/** Wire type for ServerFn boundary - filters uses FlexibleJson per SCHEMA-TRACE */
export interface SavedCustomerFilterWire {
  id: string;
  name: string;
  filters: FlexibleJson;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// ZOD SCHEMAS (for server input validation)
// ============================================================================

/** Flexible JSON for ServerFn boundary - satisfies both unknown and {} inference */
const customerFiltersSchema = flexibleJsonSchema;

export const saveFilterSchema = z.object({
  name: z.string().min(1).max(100),
  filters: customerFiltersSchema,
});

export const updateFilterSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  filters: customerFiltersSchema.optional(),
});

export const deleteFilterSchema = z.object({
  id: z.string().uuid(),
});

export type SaveFilterInput = z.infer<typeof saveFilterSchema>;
export type UpdateFilterInput = z.infer<typeof updateFilterSchema>;
export type DeleteFilterInput = z.infer<typeof deleteFilterSchema>;
