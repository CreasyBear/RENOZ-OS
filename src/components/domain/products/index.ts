/**
 * Products Domain Components
 *
 * Components for product catalog management, including tables, forms,
 * category navigation, pricing, and inventory features.
 *
 * Note: Product data fetching uses TanStack Router loader pattern in routes,
 * not hooks. See src/routes/_authenticated/products/ for data loading.
 */

// --- Status & Type Configuration ---
export {
  PRODUCT_STATUS_CONFIG,
  PRODUCT_TYPE_CONFIG,
  STOCK_STATUS_CONFIG,
  calculateMargin,
  formatMargin,
  getStockStatusConfig,
} from './product-status-config';
export type { ProductStatus, ProductType, StockStatus } from '@/lib/schemas/products';

// --- Column Definitions ---
export {
  createProductColumns,
  type CreateProductColumnsOptions,
} from './product-columns';
export type { ProductTableItem } from '@/lib/schemas/products';

// --- Core Product Components ---
export { ProductTable } from './product-table';

// --- Filter Config (FILTER-STANDARDS compliant) ---
export {
  PRODUCT_FILTER_CONFIG,
  PRODUCT_STATUS_OPTIONS as NEW_PRODUCT_STATUS_OPTIONS,
  PRODUCT_TYPE_OPTIONS as NEW_PRODUCT_TYPE_OPTIONS,
  DEFAULT_PRODUCT_FILTERS,
  createProductFilterConfig,
  type ProductFiltersState,
} from './product-filter-config';
export { ProductSearchInterface as SearchInterface } from './search-interface';

// --- Product Form ---
export { ProductForm } from './product-form';
export type { ProductFormProps, ProductFormValues } from './product-form';

// --- Categories ---
export * from './categories';

// --- Pricing ---
export * from './pricing';

// --- Inventory ---
export * from './inventory';

// --- Bundles ---
export * from './bundles';

// --- Attributes ---
export * from './attributes';

// --- Images ---
export * from './images';

// --- Bulk Operations ---
export * from './bulk';

// --- Product Detail Tabs ---
export { ProductOverviewTab as OverviewTab } from './tabs/overview-tab';
export { ProductPricingTab as PricingTab } from './tabs/pricing-tab';
export { ProductInventoryTab as InventoryTab } from './tabs/inventory-tab';
export { ProductImagesTab as ImagesTab } from './tabs/images-tab';
export { ProductAttributesTab as AttributesTab } from './tabs/attributes-tab';
export { ProductRelationsTab as RelationsTab } from './tabs/relations-tab';

// --- Container/Presenter Pattern (Gold Standard) ---
export { ProductDetailContainer } from './containers/product-detail-container';
export type { ProductDetailContainerProps, ProductDetailContainerRenderProps } from './containers/product-detail-container';
export { ProductDetailView } from './views/product-detail-view';
export type { ProductDetailViewProps } from './views/product-detail-view';
export type {
  ProductWithRelations,
  Category as ProductCategory,
  PriceTier as ProductPriceTier,
  ProductImage,
} from '@/lib/schemas/products';
