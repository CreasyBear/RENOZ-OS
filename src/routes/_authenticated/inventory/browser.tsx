/* eslint-disable react-refresh/only-export-components -- Route file exports route config + component */
/**
 * Inventory Browser Route
 *
 * Main inventory list page with filtering, multiple view modes, and URL-synced state.
 *
 * LAYOUT: full-width (data-dense table view)
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 * @see src/components/domain/inventory/inventory-browser.tsx
 */

import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { InventoryTableSkeleton } from "@/components/skeletons/inventory";

// ============================================================================
// LAZY LOADED PAGE COMPONENT
// ============================================================================

const InventoryBrowserPage = lazy(() => import("./inventory-browser-page"));

// ============================================================================
// SEARCH PARAMS SCHEMA
// ============================================================================

export const INVENTORY_STATUS_VALUES = ["available", "allocated", "sold", "damaged", "returned", "quarantined"] as const;
export const QUALITY_STATUS_VALUES = ["good", "damaged", "expired", "quarantined"] as const;
const AGE_RANGE_VALUES = ["all", "0-30", "31-60", "61-90", "90+"] as const;

/** Normalize comma-separated string: filter invalid values, return cleaned string or undefined. */
function normalizeCommaList(val: string | undefined, allowed: readonly string[]): string | undefined {
  if (!val?.trim()) return undefined;
  const set = new Set(allowed);
  const filtered = val.split(",").map((s) => s.trim()).filter((s) => set.has(s));
  return filtered.length > 0 ? filtered.join(",") : undefined;
}

export const searchParamsSchema = z.object({
  view: z.enum(['inventory', 'serialized']).optional().default('inventory'),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).optional().default(20),
  search: z.string().optional(),
  serializedSearch: z.string().optional(),
  serializedId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  /** Comma-separated status values for multi-select presets. Invalid values filtered out. */
  status: z.string().optional().transform((v) => normalizeCommaList(v, INVENTORY_STATUS_VALUES)),
  /** Comma-separated quality status values. Invalid values filtered out. */
  qualityStatus: z.string().optional().transform((v) => normalizeCommaList(v, QUALITY_STATUS_VALUES)),
  ageRange: z.enum(AGE_RANGE_VALUES).optional(),
  /** Quantity range - min */
  minQuantity: z.coerce.number().nonnegative().optional(),
  /** Quantity range - max */
  maxQuantity: z.coerce.number().nonnegative().optional(),
  /** Value range - min */
  minValue: z.coerce.number().nonnegative().optional(),
  /** Value range - max */
  maxValue: z.coerce.number().nonnegative().optional(),
  lowStock: z.coerce.boolean().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/inventory/browser")({
  validateSearch: searchParamsSchema,
  component: function InventoryBrowserRouteComponent() {
    const search = Route.useSearch();
    return (
      <Suspense fallback={
        <PageLayout variant="full-width">
          <PageLayout.Header title="Inventory Browser" />
          <PageLayout.Content>
            <InventoryTableSkeleton />
          </PageLayout.Content>
        </PageLayout>
      }>
        <InventoryBrowserPage search={search} />
      </Suspense>
    );
  },
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/inventory" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Inventory Browser" />
      <PageLayout.Content>
        <InventoryTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});
