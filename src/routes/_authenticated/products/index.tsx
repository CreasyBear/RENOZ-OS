/* eslint-disable react-refresh/only-export-components -- Route file exports route config + component */
/**
 * Products List Route
 *
 * Main product catalog page with search, filtering, and data table.
 *
 * LAYOUT: full-width (data-dense table view)
 *
 * @see UI_UX_STANDARDIZATION_PRD.md
 */

import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { ProductTableSkeleton } from "@/components/skeletons/products/table-skeleton";
import { listProducts, getCategoryTree } from "@/server/functions/products/products";

// ============================================================================
// LAZY LOADED PAGE COMPONENT
// ============================================================================

const ProductsPage = lazy(() => import("./products-page"));

// ============================================================================
// SEARCH PARAMS SCHEMA
// ============================================================================

export const searchParamsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).optional().default(20),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(["active", "inactive", "discontinued"]).optional(),
  type: z.enum(["physical", "service", "digital", "bundle"]).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  tag: z.string().uuid().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/products/")({
  validateSearch: searchParamsSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    // Transform URL params for listProducts (tag → tags array)
    const listParams = {
      ...deps,
      tags: deps.tag ? [deps.tag] : undefined,
    };
    delete (listParams as Record<string, unknown>).tag;

    // Fetch products and categories in parallel
    const [productsResult, categoryTree] = await Promise.all([
      listProducts({ data: listParams }),
      getCategoryTree(),
    ]);
    return { productsResult, categoryTree };
  },
  component: function ProductsRouteComponent() {
    const search = Route.useSearch();
    const loaderData = Route.useLoaderData();
    return (
      <Suspense fallback={
        <PageLayout variant="full-width">
          <PageLayout.Header title="Products" />
          <PageLayout.Content>
            <ProductTableSkeleton />
          </PageLayout.Content>
        </PageLayout>
      }>
        <ProductsPage search={search} loaderData={loaderData} />
      </Suspense>
    );
  },
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Products" />
      <PageLayout.Content>
        <ProductTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});
