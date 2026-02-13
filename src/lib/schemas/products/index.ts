/**
 * Product Schemas
 *
 * Provides validation schemas and types for product catalog operations.
 */

// --- Core Product Schemas ---
export * from './products';
export * from './normalize';

// --- Category Editor Schemas ---
export * from './category-editor';

// --- Re-export key types for convenience ---
export type {
  Product,
  ProductWithRelations,
  ProductTableItem,
  ProductType,
  ProductStatus,
  TaxType,
  StockStatus,
  Category,
  CategoryWithChildren,
  CategoryNode,
  PriceTier,
  ProductImage,
  GalleryImage,
  CustomerPrice,
  ProductWithInventory,
  ProductSearchResult,
  ProductSearchItem,
  ProductSearchHit,
  ListProductsResult,
  MovementType,
  ProductMovementHistoryItem,
  StockAdjustmentLocation,
  StockAdjustmentPayload,
  NavigationLink,
  ProductMetadata,
  ProductDimensions,
  ProductSpecifications,
  GetProductResponse,
  GetProductEditLoaderData,
} from './products';
