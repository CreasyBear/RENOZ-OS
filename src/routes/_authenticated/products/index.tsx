/**
 * Products List Route
 *
 * Main product catalog page with search, filtering, and data table.
 *
 * LAYOUT: full-width (data-dense table view)
 *
 * @see UI_UX_STANDARDIZATION_PRD.md
 */
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Plus, Download, Upload, X, Loader2, Trash2, Tag, Package, AlertTriangle, Layers, DollarSign } from "lucide-react";
import { z } from "zod";

import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useConfirmation } from "@/hooks";
import { ProductTableSkeleton } from "@/components/skeletons/products/table-skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { confirmations } from "@/hooks/_shared/use-confirmation";
import { useBulkDeleteProducts } from "@/hooks/products";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchEmptyState } from "@/components/shared/search-empty-state";
import { MetricCard } from "@/components/shared/metric-card";
import { listProducts, getCategoryTree } from "@/server/functions/products/products";
import { exportProducts } from "@/server/functions/products/product-bulk-ops";
import { useState as useStateCallback } from "react";
import { ProductTable } from "@/components/domain/products/product-table";
import { CategorySidebar } from "@/components/domain/products";
import { useOrgFormat } from "@/hooks/use-org-format";
import { DomainFilterBar } from "@/components/shared/filters";
import {
  PRODUCT_FILTER_CONFIG,
  DEFAULT_PRODUCT_FILTERS,
  type ProductFiltersState,
} from "@/components/domain/products/product-filter-config";
import { useTransformedFilterUrlState } from "@/hooks/filters/use-filter-url-state";

// Search params schema for URL-based filtering
const searchParamsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).optional().default(20),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(["active", "inactive", "discontinued"]).optional(),
  type: z.enum(["physical", "service", "digital", "bundle"]).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

type SearchParams = z.infer<typeof searchParamsSchema>;

export const Route = createFileRoute("/_authenticated/products/")({
  validateSearch: searchParamsSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    // Fetch products and categories in parallel
    const [productsResult, categoryTree] = await Promise.all([
      listProducts({ data: deps }),
      getCategoryTree(),
    ]);
    return { productsResult, categoryTree };
  },
  component: ProductsPage,
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

// ============================================================================
// URL FILTER TRANSFORMERS
// ============================================================================

/** Transform URL search params to ProductFiltersState */
const fromUrlParams = (search: SearchParams): ProductFiltersState => ({
  search: search.search ?? "",
  status: search.status ? [search.status] : [],
  type: search.type ? [search.type] : [],
  priceRange: null, // Not yet in URL schema
  tags: [],
});

/** Transform ProductFiltersState to URL search params */
const toUrlParams = (filters: ProductFiltersState): Record<string, unknown> => ({
  search: filters.search || undefined,
  status: filters.status.length > 0 ? filters.status[0] : undefined,
  type: filters.type.length > 0 ? filters.type[0] : undefined,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ProductsPage() {
  const navigate = useNavigate();
  const { formatCurrency } = useOrgFormat();
  const confirm = useConfirmation();
  const bulkDeleteProducts = useBulkDeleteProducts();
  const search = Route.useSearch() as SearchParams;
  const loaderData = Route.useLoaderData() as {
    productsResult: Awaited<ReturnType<typeof listProducts>>;
    categoryTree: Awaited<ReturnType<typeof getCategoryTree>>;
  };
  const { productsResult, categoryTree } = loaderData;

  // URL-synced filter state with transformations
  const { filters, setFilters } = useTransformedFilterUrlState({
    currentSearch: search,
    navigate,
    defaults: DEFAULT_PRODUCT_FILTERS,
    fromUrlParams,
    toUrlParams,
    resetPageOnChange: ['search', 'status', 'type'],
  });

  // Handle filter changes
  const handleFiltersChange = (newFilters: ProductFiltersState) => {
    setFilters(newFilters);
  };

  // Selected rows for bulk actions
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // Update URL search params (for pagination, sort, category)
  const updateSearch = (updates: Partial<SearchParams>) => {
    const newSearch = {
      ...search,
      ...updates,
      // Reset to page 1 when filters change (unless page is explicitly set)
      page: updates.page ?? 1,
    };
    navigate({
      to: ".",
      search: newSearch as Record<string, unknown>,
    });
  };

  // Check if any filters are active
  const hasActiveFilters =
    search.search || search.categoryId || search.status || search.type;

  // Calculate product stats from loaded data
  const productStats = useMemo(() => {
    const products = productsResult.products;
    const totalProducts = productsResult.total;
    const activeProducts = products.filter(p => p.status === 'active').length;
    const lowStockCount = products.filter(p =>
      p.trackInventory &&
      (p as any).stockStatus === 'low_stock'
    ).length;
    const totalValue = products.reduce((sum, p) => sum + (p.basePrice || 0), 0);

    return [
      {
        title: 'Total Products',
        value: totalProducts,
        subtitle: 'In catalog',
        icon: Package,
      },
      {
        title: 'Active',
        value: activeProducts,
        subtitle: 'Available for sale',
        icon: Layers,
      },
      {
        title: 'Low Stock',
        value: lowStockCount,
        subtitle: 'Need reordering',
        icon: AlertTriangle,
        alert: lowStockCount > 0,
      },
      {
        title: 'Avg Price',
        value:
          totalProducts > 0
            ? formatCurrency(totalValue / totalProducts, { cents: false, showCents: true })
            : formatCurrency(0, { cents: false, showCents: true }),
        subtitle: 'Per product',
        icon: DollarSign,
      },
    ];
  }, [productsResult, formatCurrency]);

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Products"
        description={`${productsResult.total} products in catalog`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/products/import"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Link>
            <ExportButton />
            <Button
              onClick={() => navigate({ to: "/products/new" as string })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
        }
      />

      <PageLayout.Content className="flex gap-6">
        {/* Category sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <CategorySidebar
            categories={categoryTree}
            selectedCategoryId={search.categoryId}
            onSelectCategory={(categoryId) =>
              updateSearch({ categoryId: categoryId ?? undefined })
            }
          />
        </aside>

        {/* Main content */}
        <div className="flex-1 space-y-4">
          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {productStats.map((stat) => (
              <MetricCard
                key={stat.title}
                title={stat.title}
                value={stat.value}
                subtitle={stat.subtitle}
                icon={stat.icon}
                alert={stat.alert}
                isLoading={false}
              />
            ))}
          </div>

          {/* Filters bar using DomainFilterBar */}
          <DomainFilterBar<ProductFiltersState>
            config={PRODUCT_FILTER_CONFIG}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            defaultFilters={DEFAULT_PRODUCT_FILTERS}
            resultCount={productsResult.total}
          />

          {/* Category filter badge (managed separately via sidebar) */}
          {search.categoryId && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                Category filtered
                <button
                  onClick={() => updateSearch({ categoryId: undefined })}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            </div>
          )}

          {/* Bulk actions bar (when rows selected) */}
          {selectedRows.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {selectedRows.length} product{selectedRows.length > 1 ? "s" : ""} selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRows([])}
                  className="h-auto py-1"
                >
                  Clear
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Tag className="mr-2 h-4 w-4" />
                  Update Status
                </Button>
                <Button variant="outline" size="sm">
                  <Upload className="mr-2 h-4 w-4" />
                  Update Category
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    const { confirmed } = await confirm.confirm({
                      ...confirmations.bulkDelete(selectedRows.length, 'products'),
                    });
                    if (confirmed) {
                      bulkDeleteProducts.mutate(selectedRows, {
                        onSuccess: () => {
                          setSelectedRows([]);
                        },
                      });
                    }
                  }}
                  disabled={bulkDeleteProducts.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          )}

          {/* Product table */}
          {productsResult.products.length === 0 ? (
            hasActiveFilters ? (
              <SearchEmptyState
                query={search.search ?? ""}
                hasFilters={!!(search.categoryId || search.status || search.type)}
                onClearSearch={() => {
                  setFilters({ ...filters, search: "" });
                }}
                onClearFilters={() => {
                  setFilters(DEFAULT_PRODUCT_FILTERS);
                  updateSearch({ categoryId: undefined });
                }}
              />
            ) : (
              <EmptyState
                title="No products yet"
                message="Get started by adding your first product to the catalog"
                primaryAction={{
                  label: "Add Product",
                  onClick: () => navigate({ to: "/products/new" as string }),
                }}
              />
            )
          ) : (
            <ProductTable
              products={productsResult.products}
              total={productsResult.total}
              page={search.page ?? 1}
              pageSize={search.pageSize ?? 20}
              sortBy={search.sortBy}
              sortOrder={search.sortOrder ?? "desc"}
              selectedRows={selectedRows}
              onSelectionChange={setSelectedRows}
              onPageChange={(page) => updateSearch({ page })}
              onPageSizeChange={(pageSize) => updateSearch({ pageSize })}
              onSortChange={(sortBy, sortOrder) =>
                updateSearch({ sortBy, sortOrder })
              }
              onRowClick={(product) =>
                navigate({ to: `/products/${product.id}` as string })
              }
            />
          )}
        </div>
      </PageLayout.Content>

      {/* Confirmation Dialog */}
      <ConfirmationDialog />
    </PageLayout>
  );
}

/**
 * Export button with loading state
 */
function ExportButton() {
  const [isExporting, setIsExporting] = useStateCallback(false);
  const search = Route.useSearch() as SearchParams;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportProducts({
        data: {
          categoryId: search.categoryId,
          status: search.status,
          type: search.type,
        },
      });

      // Create and download the CSV file
      const blob = new Blob([result.content], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
      {isExporting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Export
    </Button>
  );
}
