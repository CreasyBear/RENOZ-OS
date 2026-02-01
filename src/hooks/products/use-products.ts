/**
 * Products Hooks
 *
 * TanStack Query hooks for product management:
 * - Product list with pagination and filtering
 * - Product details
 * - Product CRUD operations
 *
 * @see src/server/functions/products/products.ts
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '../_shared/use-toast';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  duplicateProduct,
  quickSearchProducts,
  listCategories,
  getCategoryTree,
  createCategory,
  updateCategory,
  deleteCategory,
  parseImportFile,
  importProducts,
} from '@/server/functions/products';
import { bulkDeleteProducts } from '@/server/functions/products/product-bulk-ops';

// ============================================================================
// TYPES
// ============================================================================

export interface ProductFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: 'physical' | 'service' | 'digital' | 'bundle';
  status?: 'active' | 'draft' | 'discontinued' | 'archived';
  categoryId?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UseProductsOptions extends ProductFilters {
  enabled?: boolean;
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch products with filtering and pagination
 */
export function useProducts(options: UseProductsOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: () => listProducts({ data: filters as Record<string, unknown> }),
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch single product with all related data
 */
export function useProduct(productId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.products.detail(productId),
    queryFn: () => getProduct({ data: { id: productId } }),
    enabled: enabled && !!productId,
    staleTime: 60 * 1000,
  });
}

/**
 * Search products by query string
 */
export function useProductSearch(
  query: string,
  options: { categoryId?: string; limit?: number } = {},
  enabled = true
) {
  return useQuery({
    queryKey: [...queryKeys.products.all, 'search', query, options],
    queryFn: () => quickSearchProducts({ data: { q: query, ...options } }),
    enabled: enabled && query.length >= 2,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch categories list
 */
export function useCategories(
  options: { parentId?: string | null; includeInactive?: boolean } = {},
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.categories.list(),
    queryFn: () => listCategories({ data: options }),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch category tree structure
 */
export function useCategoryTree(enabled = true) {
  return useQuery({
    queryKey: queryKeys.categories.tree(),
    queryFn: () => getCategoryTree(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new product
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof createProduct>[0]['data']) =>
      createProduct({ data }),
    onSuccess: () => {
      toast.success('Product created');
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create product');
    },
  });
}

/**
 * Update an existing product
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Omit<Parameters<typeof updateProduct>[0]['data'], 'id'> }) =>
      updateProduct({ data: { id, ...data } }),
    onSuccess: (_, variables) => {
      toast.success('Product updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(variables.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update product');
    },
  });
}

/**
 * Delete a product (soft delete)
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => deleteProduct({ data: { id: productId } }),
    onSuccess: () => {
      toast.success('Product deleted');
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete product');
    },
  });
}

/**
 * Bulk delete multiple products (soft delete)
 */
export function useBulkDeleteProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productIds: string[]) =>
      bulkDeleteProducts({ data: { productIds } }),
    onSuccess: (_, productIds) => {
      toast.success(`Deleted ${productIds.length} product${productIds.length > 1 ? 's' : ''}`);
      // Remove each deleted product from cache
      productIds.forEach((id) => {
        queryClient.removeQueries({ queryKey: queryKeys.products.detail(id) });
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete products');
    },
  });
}

/**
 * Duplicate a product with all related data
 */
export function useDuplicateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => duplicateProduct({ data: { id: productId } }),
    onSuccess: (newProduct) => {
      toast.success('Product duplicated successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      return newProduct;
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to duplicate product');
    },
  });
}

/**
 * Create a new category
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof createCategory>[0]['data']) =>
      createCategory({ data }),
    onSuccess: () => {
      toast.success('Category created');
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create category');
    },
  });
}

/**
 * Update an existing category
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Omit<Parameters<typeof updateCategory>[0]['data'], 'id'> }) =>
      updateCategory({ data: { id, ...data } }),
    onSuccess: () => {
      toast.success('Category updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update category');
    },
  });
}

/**
 * Delete a category
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (categoryId: string) => deleteCategory({ data: { id: categoryId } }),
    onSuccess: () => {
      toast.success('Category deleted');
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete category');
    },
  });
}

// ============================================================================
// JOB MATERIALS PRODUCT SELECTOR
// ============================================================================

export interface UseProductsForJobMaterialsOptions {
  jobId: string;
  enabled?: boolean;
}

/**
 * Fetch products for job materials selector.
 * Returns a simplified product list suitable for material selection.
 */
export function useProductsForJobMaterials(options: UseProductsForJobMaterialsOptions) {
  const { jobId, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.products.jobMaterials(jobId),
    queryFn: () =>
      listProducts({
        data: {
          page: 1,
          pageSize: 200,
          sortBy: 'name',
          sortOrder: 'asc',
        },
      }),
    enabled: enabled && !!jobId,
    staleTime: 60 * 1000,
    select: (data) =>
      data?.products.map((product) => ({
        id: product.id,
        sku: product.sku ?? null,
        name: product.name,
        description: product.description ?? null,
        unitPrice: product.basePrice ?? 0,
      })) ?? [],
  });
}

// ============================================================================
// IMPORT/EXPORT HOOKS
// ============================================================================

export interface ImportPreviewRow {
  row: number;
  data: {
    sku: string;
    name: string;
    description?: string;
    categoryName?: string;
    type?: 'physical' | 'service' | 'digital' | 'bundle';
    status?: 'active' | 'inactive' | 'discontinued';
    basePrice: number;
    costPrice?: number;
    weight?: number;
    barcode?: string;
    tags?: string[];
  };
  isValid: boolean;
  errors: string[];
}

export interface ImportPreview {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  rows: ImportPreviewRow[];
  headers: string[];
}

/**
 * Parse and preview CSV import file
 * Client-side: reads File, sends content to server
 */
export function useParseImportFile() {
  return useMutation({
    mutationFn: async ({ file, hasHeaders = true }: { file: File; hasHeaders?: boolean }) => {
      const content = await file.text();
      return parseImportFile({ data: { content, hasHeaders } }) as Promise<ImportPreview>;
    },
  });
}

export interface ImportProductsResult {
  success: boolean;
  totalProcessed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  results: Array<{
    row: number;
    sku: string;
    status: 'created' | 'updated' | 'skipped' | 'error';
    message?: string;
    productId?: string;
  }>;
}

/**
 * Import products from parsed CSV data
 */
export function useImportProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      rows: Array<{
        sku: string;
        name: string;
        description?: string;
        categoryName?: string;
        type?: 'physical' | 'service' | 'digital' | 'bundle';
        status?: 'active' | 'inactive' | 'discontinued';
        basePrice: number;
        costPrice?: number;
        weight?: number;
        barcode?: string;
        tags?: string[];
      }>;
      mode?: 'create_only' | 'update_only' | 'create_or_update';
      skipErrors?: boolean;
    }) => importProducts({ data }),
    onSuccess: (result) => {
      toast.success(`Import complete: ${result.created} created, ${result.updated} updated`);
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      return result as ImportProductsResult;
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to import products');
    },
  });
}
