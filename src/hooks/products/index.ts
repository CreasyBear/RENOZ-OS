/**
 * Products Hooks
 *
 * Provides hooks for product and category management.
 */

// Core product CRUD hooks
export {
  useProducts,
  useProduct,
  useProductSearch,
  useSearchProducts,
  useCategories,
  useCategoryTree,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useBulkDeleteProducts,
  useDuplicateProduct,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useProductsForJobMaterials,
  useParseImportFile,
  useImportProducts,
  useBulkUpdateProducts,
  useBulkAdjustPrices,
  useExportProducts,
  useImportTemplate,
  type ImportPreview,
  type ImportPreviewRow,
  type ImportProductsResult,
  type BulkUpdateProductsInput,
  type BulkAdjustPricesInput,
  type ExportProductsOptions,
} from './use-products';

// Product inventory hooks
export {
  useProductInventory,
  useProductInventoryStats,
  useProductInventorySummary,
  useProductCostLayers,
  useLowStockAlerts,
  useProductMovements,
  useAggregatedProductMovements,
  useInventoryLocations,
  useAdjustStock,
  useReceiveStock,
  type InventorySummary,
  type UseProductInventorySummaryOptions,
} from './use-product-inventory';

// Product attribute hooks
export {
  useProductAttributeDefinitions,
  useProductAttributeDefinition,
  useCreateAttributeDefinition,
  useUpdateAttributeDefinition,
  useDeleteAttributeDefinition,
  useProductAttributeValues,
  useProductRequiredAttributes,
  useSetProductAttribute,
  useSetProductAttributes,
  useDeleteProductAttribute,
  useFilterableAttributes,
  type AttributeDefinition,
  type AttributeValidation,
  type ListAttributesOptions,
} from './use-product-attributes';

// Product image hooks
export {
  useProductImages,
  useProductImageStats,
  useProductPrimaryImage,
  useAddProductImage,
  useUpdateProductImage,
  useDeleteProductImage,
  useDeleteProductImage as useDeleteImage, // Alias for backwards compatibility
  useSetPrimaryImage,
  useReorderProductImages,
  useBulkDeleteImages,
  useBulkUpdateAltText,
  type UseProductImagesOptions,
  type AddProductImageInput,
  type UpdateProductImageInput,
} from './use-product-images';

// Product pricing hooks
export {
  useResolvePrice,
  usePriceTiers,
  useCustomerPrices,
  usePriceHistory,
  useCreatePriceTier,
  useUpdatePriceTier,
  useDeletePriceTier,
  useSetPriceTiers,
  useSetCustomerPrice,
  useDeleteCustomerPrice,
  useBulkUpdatePrices,
  useApplyPriceAdjustment,
  type UsePriceTiersOptions,
  type UseCustomerPricesOptions,
  type UsePriceHistoryOptions,
  type UseResolvePriceOptions,
} from './use-product-pricing';

// Product bundle hooks
export {
  useBundleComponents,
  useCalculateBundlePrice,
  useValidateBundle,
  useExpandBundle,
  useBundlesContainingProduct,
  useAddBundleComponent,
  useUpdateBundleComponent,
  useRemoveBundleComponent,
  useSetBundleComponents,
  type BundleComponent,
  type UseBundleComponentsOptions,
  type AddBundleComponentInput,
  type UpdateBundleComponentInput,
  type RemoveBundleComponentInput,
  type SetBundleComponentsInput,
} from './use-product-bundles';

// Advanced search hooks
export {
  useSearchSuggestions,
  useSearchFacets,
  useRecordSearchEvent,
  type Suggestion,
  type Facets,
  type SearchFilters,
} from './use-product-search-advanced';

// Re-export types
export type {
  ProductFilters,
  UseProductsOptions,
  UseProductsForJobMaterialsOptions,
  UseSearchProductsOptions,
} from './use-products';
