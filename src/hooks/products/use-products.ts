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
import { useNavigate } from '@tanstack/react-router';
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
import { searchProducts } from '@/server/functions/products/product-search';
import {
  bulkDeleteProducts,
  bulkUpdateProducts,
  bulkAdjustPrices,
  exportProducts,
  getImportTemplate,
} from '@/server/functions/products/product-bulk-ops';

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
    queryFn: async () => {
      const result = await listProducts({ data: filters as Record<string, unknown> });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch single product with all related data
 */
export function useProduct(productId: string, enabled = true) {
  return useQuery<GetProductResponse>({
    queryKey: queryKeys.products.detail(productId),
    queryFn: async () => {
      const result = await getProduct({ data: { id: productId } });
      if (result == null) throw new Error('Query returned no data');

      return result;
    },
    enabled: enabled && !!productId,
    staleTime: 60 * 1000,
  });
}

import type { GetProductResponse, ProductSearchResult } from '@/lib/schemas/products';

/**
 * Search products by query string (quick search via quickSearchProducts)
 */
export function useProductSearch(
  query: string,
  options: { categoryId?: string; limit?: number } = {},
  enabled = true
) {
  return useQuery<ProductSearchResult>({
    queryKey: queryKeys.products.search(query, options),
    queryFn: async () => {
      const result = await quickSearchProducts({ data: { q: query, ...options } });
      if (result == null) throw new Error('Product search returned no data');
      return result as ProductSearchResult;
    },
    enabled: enabled && query.length >= 2,
    staleTime: 30 * 1000,
  });
}

export interface UseSearchProductsOptions {
  query: string;
  limit?: number;
  categoryId?: string;
  enabled?: boolean;
}

/**
 * Full-text product search (searchProducts) for dialogs and advanced search.
 */
export function useSearchProducts(options: UseSearchProductsOptions) {
  const { query, limit = 10, categoryId, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.products.search(query, { limit, categoryId }),
    queryFn: async () => {
      const result = await searchProducts({
        data: { query, limit, ...(categoryId ? { categoryId } : {}) },
      });
      if (result == null) throw new Error('Product search returned no data');
      return result;
    },
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
    queryFn: async () => {
      const result = await listCategories({ data: options });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
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
    queryFn: async () => {
      const result = await getCategoryTree();
      if (result == null) throw new Error('Category tree returned no data');
      return result;
    },
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
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: Parameters<typeof createProduct>[0]['data']) =>
      createProduct({ data }),
    onSuccess: (newProduct) => {
      toast.success('Product created', {
        action: {
          label: 'View Product',
          onClick: () => navigate({ to: '/products/$productId', params: { productId: newProduct.id } }),
        },
      });
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
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Omit<Parameters<typeof updateProduct>[0]['data'], 'id'> }) =>
      updateProduct({ data: { id, ...data } }),
    onSuccess: (_, variables) => {
      toast.success('Product updated', {
        action: {
          label: 'View Product',
          onClick: () => navigate({ to: '/products/$productId', params: { productId: variables.id } }),
        },
      });
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
    onSuccess: (_, variables) => {
      toast.success('Product deleted');
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(variables) });
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
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (productId: string) => duplicateProduct({ data: { id: productId } }),
    onSuccess: (newProduct) => {
      toast.success('Product duplicated successfully', {
        action: {
          label: 'View Product',
          onClick: () => navigate({ to: '/products/$productId', params: { productId: newProduct.id } }),
        },
      });
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
    queryFn: async () => {
      const result = await listProducts({
        data: {
          page: 1,
          pageSize: 200,
          sortBy: 'name',
          sortOrder: 'asc',
        },
      
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
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
  const navigate = useNavigate();

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
      toast.success(`Import complete: ${result.created} created, ${result.updated} updated`, {
        action: {
          label: 'View Products',
          onClick: () => navigate({ to: '/products' }),
        },
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      return result as ImportProductsResult;
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to import products');
    },
  });
}

// ============================================================================
// BULK UPDATE HOOKS
// ============================================================================

export interface BulkUpdateProductsInput {
  productIds: string[];
  updates: {
    status?: 'active' | 'inactive' | 'discontinued';
    categoryId?: string | null;
  };
}

/**
 * Bulk update multiple products' status or category
 */
export function useBulkUpdateProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkUpdateProductsInput) =>
      bulkUpdateProducts({ data }),
    onSuccess: (_result, variables) => {
      toast.success(`Updated ${variables.productIds.length} product${variables.productIds.length > 1 ? 's' : ''}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      // Invalidate individual product caches
      variables.productIds.forEach((id) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id) });
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update products');
    },
  });
}

export type BulkAdjustPricesInput = {
  productIds: string[];
  adjustment:
    | { type: 'percentage'; value: number; applyTo?: 'basePrice' | 'costPrice' | 'both' }
    | { type: 'fixed'; basePrice?: number; costPrice?: number };
};

/**
 * Bulk adjust prices for multiple products
 */
export function useBulkAdjustPrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkAdjustPricesInput) =>
      bulkAdjustPrices({ data }),
    onSuccess: (_, variables) => {
      toast.success(`Adjusted prices for ${variables.productIds.length} product${variables.productIds.length > 1 ? 's' : ''}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      // Invalidate individual product caches
      variables.productIds.forEach((id) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id) });
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to adjust prices');
    },
  });
}

export interface ExportProductsOptions {
  productIds?: string[];
  filters?: ProductFilters;
  format?: 'csv' | 'xlsx';
}

/**
 * Export products to CSV or Excel
 */
export function useExportProducts() {
  return useMutation({
    mutationFn: (options: ExportProductsOptions) =>
      exportProducts({ data: options }),
    onSuccess: () => {
      toast.success('Export complete');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to export products');
    },
  });
}

/**
 * Get the import template for CSV uploads
 */
export function useImportTemplate() {
  return useQuery({
    queryKey: queryKeys.products.bulk.template(),
    queryFn: async () => {
      const result = await getImportTemplate({
        data: {} 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - template doesn't change often
  });
}
