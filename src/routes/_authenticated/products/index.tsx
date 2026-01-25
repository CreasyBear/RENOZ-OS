/**
 * Products List Route
 *
 * Main product catalog page with search, filtering, and data table.
 *
 * Features:
 * - Full-text search with autocomplete
 * - Category tree navigation sidebar
 * - Advanced filtering (status, type, price range)
 * - Sortable data table with pagination
 * - Bulk selection and actions
 * - Quick actions per row
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Download, Upload, Search, X } from "lucide-react";
import { z } from "zod";

import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ProductTableSkeleton } from "@/components/skeletons/products/table-skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchEmptyState } from "@/components/shared/search-empty-state";
import { listProducts, getCategoryTree } from "@/lib/server/functions/products";
import { ProductTable } from "@/components/domain/products/product-table";
import { CategorySidebar } from "@/components/domain/products";

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

function ProductsPage() {
  // Use type assertions since route types aren't generated yet
  const navigate = useNavigate();
  const search = Route.useSearch() as SearchParams;
  const loaderData = Route.useLoaderData() as {
    productsResult: Awaited<ReturnType<typeof listProducts>>;
    categoryTree: Awaited<ReturnType<typeof getCategoryTree>>;
  };
  const { productsResult, categoryTree } = loaderData;

  // Local state for search input (debounced before URL update)
  const [searchInput, setSearchInput] = useState(search.search ?? "");

  // Selected rows for bulk actions
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // Update URL search params
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

  // Handle search with debounce
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSearch({ search: searchInput || undefined });
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchInput("");
    navigate({
      to: ".",
      search: {
        page: 1,
        pageSize: search.pageSize,
        sortOrder: "desc",
      },
    });
  };

  // Check if any filters are active
  const hasActiveFilters =
    search.search || search.categoryId || search.status || search.type;

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Products"
        description={`${productsResult.total} products in catalog`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
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
          {/* Search and filters bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search input */}
            <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products by name, SKU, or description..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>

            {/* Quick filters */}
            <div className="flex gap-2">
              <Select
                value={search.status ?? "all"}
                onValueChange={(value) =>
                  updateSearch({
                    status: value === "all" ? undefined : (value as SearchParams["status"]),
                  })
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={search.type ?? "all"}
                onValueChange={(value) =>
                  updateSearch({
                    type: value === "all" ? undefined : (value as SearchParams["type"]),
                  })
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="physical">Physical</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="digital">Digital</SelectItem>
                  <SelectItem value="bundle">Bundle</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground"
                >
                  <X className="mr-1 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Active filter badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {search.search && (
                <Badge variant="secondary">
                  Search: {search.search}
                  <button
                    onClick={() => {
                      setSearchInput("");
                      updateSearch({ search: undefined });
                    }}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {search.categoryId && (
                <Badge variant="secondary">
                  Category filtered
                  <button
                    onClick={() => updateSearch({ categoryId: undefined })}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {search.status && (
                <Badge variant="secondary">
                  Status: {search.status}
                  <button
                    onClick={() => updateSearch({ status: undefined })}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {search.type && (
                <Badge variant="secondary">
                  Type: {search.type}
                  <button
                    onClick={() => updateSearch({ type: undefined })}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          {/* Bulk actions bar (when rows selected) */}
          {selectedRows.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm">
                {selectedRows.length} product{selectedRows.length > 1 ? "s" : ""} selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Update Status
                </Button>
                <Button variant="outline" size="sm">
                  Update Category
                </Button>
                <Button variant="destructive" size="sm">
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
                  setSearchInput("");
                  updateSearch({ search: undefined });
                }}
                onClearFilters={clearFilters}
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
    </PageLayout>
  );
}
