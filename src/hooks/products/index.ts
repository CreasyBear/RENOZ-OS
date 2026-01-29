/**
 * Products Hooks
 *
 * Provides hooks for product and category management.
 */

export {
  useProducts,
  useProduct,
  useProductSearch,
  useCategories,
  useCategoryTree,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useDuplicateProduct,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useProductsForJobMaterials,
  useParseImportFile,
  useImportProducts,
  type ImportPreview,
  type ImportPreviewRow,
  type ImportProductsResult,
} from './use-products';

// Re-export types
export type {
  ProductFilters,
  UseProductsOptions,
  UseProductsForJobMaterialsOptions,
} from './use-products';
