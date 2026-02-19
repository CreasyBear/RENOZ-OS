/**
 * Products Page
 *
 * Main product catalog page with search, filtering, and data table.
 *
 * @source products from loader in route file
 * @source categories from loader in route file
 *
 * @see src/routes/_authenticated/products/index.tsx - Route definition with loader
 * @see src/server/functions/products/products.ts for data functions
 */

import { useState, useMemo } from "react";
import { useNavigate, Link, useRouter } from "@tanstack/react-router";
import { Plus, Download, Upload, X, Loader2, Trash2, Tag, Package, AlertTriangle, Layers, DollarSign, RefreshCw } from "lucide-react";

import { PageLayout } from "@/components/layout";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useConfirmation, toastError } from "@/hooks";
import { logger } from "@/lib/logger";
import { confirmations } from "@/hooks/_shared/use-confirmation";
import {
  useBulkDeleteProducts,
  useDeleteProduct,
  useDuplicateProduct,
  useExportProducts,
  type ProductFilters,
} from "@/hooks/products";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchEmptyState } from "@/components/shared/search-empty-state";
import { MetricCard } from "@/components/shared/metric-card";
import { listProducts, getCategoryTree } from "@/server/functions/products/products";
import { ProductTable } from "@/components/domain/products/product-table";
import { useOrgFormat } from "@/hooks/use-org-format";
import { DomainFilterBar } from "@/components/shared/filters";
import {
  PRODUCT_FILTER_CONFIG,
  DEFAULT_PRODUCT_FILTERS,
  type ProductFiltersState,
} from "@/components/domain/products/product-filter-config";
import { useTransformedFilterUrlState } from "@/hooks/filters/use-filter-url-state";
import type { searchParamsSchema } from "./index";
import type { z } from "zod";
import { normalizeProductForTable } from "@/lib/schemas/products/normalize";

type SearchParams = z.infer<typeof searchParamsSchema>;

// ============================================================================
// URL FILTER TRANSFORMERS
// ============================================================================

/** Transform URL search params to ProductFiltersState */
const fromUrlParams = (search: SearchParams): ProductFiltersState => {
  const priceRange =
    search.minPrice != null || search.maxPrice != null
      ? {
          min: search.minPrice ?? null,
          max: search.maxPrice ?? null,
        }
      : null;

  return {
    search: search.search ?? "",
    status: search.status ? [search.status] : [],
    type: search.type ? [search.type] : [],
    priceRange,
    tags: search.tag ? [search.tag] : [],
  };
};

/** Transform ProductFiltersState to URL search params */
const toUrlParams = (filters: ProductFiltersState): Record<string, unknown> => ({
  search: filters.search || undefined,
  status: filters.status.length > 0 ? filters.status[0] : undefined,
  type: filters.type.length > 0 ? filters.type[0] : undefined,
  minPrice: filters.priceRange?.min ?? undefined,
  maxPrice: filters.priceRange?.max ?? undefined,
  tag: filters.tags.length > 0 ? filters.tags[0] : undefined,
});

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

interface ProductsPageProps {
  search: SearchParams;
  loaderData: {
    productsResult: Awaited<ReturnType<typeof listProducts>>;
    categoryTree: Awaited<ReturnType<typeof getCategoryTree>>;
  };
}

export default function ProductsPage({ search, loaderData }: ProductsPageProps) {
  const router = useRouter();
  const navigate = useNavigate();
  const { formatCurrency } = useOrgFormat();
  const confirm = useConfirmation();
  const bulkDeleteProducts = useBulkDeleteProducts();
  const deleteProduct = useDeleteProduct();
  const duplicateProduct = useDuplicateProduct();
  const productsResult = useMemo(
    () => loaderData?.productsResult ?? { products: [], total: 0, page: 1, limit: 20, hasMore: false },
    [loaderData]
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // URL-synced filter state with transformations
  const { filters, setFilters } = useTransformedFilterUrlState({
    currentSearch: search,
    navigate,
    defaults: DEFAULT_PRODUCT_FILTERS,
    fromUrlParams,
    toUrlParams,
    resetPageOnChange: ['search', 'status', 'type', 'priceRange', 'tags'],
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
    const products = productsResult?.products ?? [];
    const totalProducts = productsResult?.total ?? 0;
    const activeProducts = products.filter(p => p.status === 'active').length;
    const lowStockCount = products.filter(p =>
      p.trackInventory &&
      ('stockStatus' in p ? p.stockStatus === 'low_stock' : false)
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
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setIsRefreshing(true);
                await router.invalidate();
                setIsRefreshing(false);
              }}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
            <Link
              to="/products/import"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Link>
            <ExportButton search={search} />
            <Button
              onClick={() => navigate({ to: "/products/new" })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
        }
      />

      <PageLayout.Content>
        <div className="space-y-3">
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
          {selectedRows.length >= 2 && (
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
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  title="Bulk status update is not available yet"
                >
                  <Tag className="mr-2 h-4 w-4" />
                  Update Status
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  title="Bulk category update is not available yet"
                >
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
                  onClick: () => navigate({ to: "/products/new" }),
                }}
              />
            )
          ) : (
            <ProductTable
              products={productsResult.products.map((p) => normalizeProductForTable(p))}
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
                navigate({ to: "/products/$productId", params: { productId: product.id } })
              }
              onEditProduct={(productId) =>
                navigate({ to: "/products/$productId/edit", params: { productId } })
              }
              onDuplicateProduct={(productId) => {
                duplicateProduct.mutate(productId);
              }}
              onDeleteProduct={async (productId) => {
                const product = productsResult.products.find((p) => p.id === productId);
                const { confirmed } = await confirm.confirm({
                  ...confirmations.delete(product?.name ?? "this product", "product"),
                });
                if (!confirmed) return;
                deleteProduct.mutate(productId);
              }}
            />
          )}
        </div>
      </PageLayout.Content>

      {/* Confirmation Dialog */}
    </PageLayout>
  );
}

// ============================================================================
// EXPORT BUTTON COMPONENT
// ============================================================================

interface ExportButtonProps {
  search: SearchParams;
}

function ExportButton({ search }: ExportButtonProps) {
  const exportProducts = useExportProducts();

  const handleExport = async () => {
    try {
      const result = await exportProducts.mutateAsync({
        filters: {
          categoryId: search.categoryId,
          // Cast status to match ProductFilters type (pre-existing schema mismatch)
          status: search.status as ProductFilters['status'],
          type: search.type,
        } as ProductFilters,
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
      logger.error('Export failed', error);
      toastError(error instanceof Error ? error.message : 'Failed to export products');
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={exportProducts.isPending}>
      {exportProducts.isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Export
    </Button>
  );
}
