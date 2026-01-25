/**
 * Products Domain Components
 *
 * Components for product catalog management, including tables, forms,
 * category navigation, pricing, and inventory features.
 *
 * Note: Product data fetching uses TanStack Router loader pattern in routes,
 * not hooks. See src/routes/_authenticated/products/ for data loading.
 */

// --- Core Product Components ---
export { ProductTable } from './product-table';
export { ProductFilters } from './product-filters';
export { ProductSearchInterface as SearchInterface } from './search-interface';

// --- Product Form ---
export { ProductForm } from './product-form';
export { useProductForm } from './product-form/hooks/use-product-form';
export type { ProductFormProps, ProductFormValues } from './product-form/types';

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
