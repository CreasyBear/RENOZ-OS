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
export { ProductTable } from './product-table'
export { ProductFilters } from './product-filters'
export { SearchInterface } from './search-interface'

// --- Product Form ---
export { ProductForm } from './product-form'
export { useProductForm } from './product-form/hooks/use-product-form'
export type { ProductFormProps, ProductFormValues } from './product-form/types'

// --- Category Components ---
export { CategorySidebar } from './category-sidebar'
export { CategoryTree } from './category-tree'
export { CategoryEditor } from './category-editor'

// --- Pricing Components ---
export { PricingEngine } from './pricing-engine'
export { PriceTiers } from './price-tiers'
export { PriceHistory } from './price-history'
export { CustomerPricing } from './customer-pricing'

// --- Inventory Components ---
export { InventoryHistory } from './inventory-history'
export { StockAdjustment } from './stock-adjustment'

// --- Bundle Components ---
export { BundleCreator } from './bundle-creator'
export { BundleEditor } from './bundle-editor'
export { ComponentSelector } from './component-selector'

// --- Attribute Components ---
export { AttributeDefinitions } from './attribute-definitions'
export { AttributeValueEditor } from './attribute-value-editor'

// --- Image Components ---
export { ImageGallery } from './image-gallery'
export { ImageUploader } from './image-uploader'
export { ImageEditor } from './image-editor'

// --- Bulk Operations ---
export { BulkImport } from './bulk-import'
export { BulkOperations } from './bulk-operations'

// --- Product Detail Tabs ---
export { OverviewTab } from './tabs/overview-tab'
export { PricingTab } from './tabs/pricing-tab'
export { InventoryTab } from './tabs/inventory-tab'
export { ImagesTab } from './tabs/images-tab'
export { AttributesTab } from './tabs/attributes-tab'
export { RelationsTab } from './tabs/relations-tab'
