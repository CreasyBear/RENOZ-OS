/**
 * Product Zod Schemas
 *
 * Validation schemas for product catalog operations.
 * Enhanced with categories, pricing tiers, bundles, images, attributes, and relations.
 *
 * @see _Initiation/_prd/2-domains/products/products.prd.json for specification
 */

import { z } from 'zod';
import {
  currencySchema,
  quantitySchema,
  percentageSchema,
  paginationSchema,
  filterSchema,
  idParamSchema,
} from '../_shared/patterns';
import { cursorPaginationSchema } from '@/lib/db/pagination';

// ============================================================================
// ENUMS (must match canonical-enums.json)
// ============================================================================

export const productTypeValues = ['physical', 'service', 'digital', 'bundle'] as const;

export const productStatusValues = ['active', 'inactive', 'discontinued'] as const;

export const taxTypeValues = ['gst', 'gst_free', 'input_taxed', 'export'] as const;

export const TAX_TYPE_LABELS: Record<(typeof taxTypeValues)[number], string> = {
  gst: 'GST',
  gst_free: 'GST Free',
  input_taxed: 'Input Taxed',
  export: 'Export',
} as const;

export function getTaxTypeLabel(taxType: string | null | undefined): string {
  if (!taxType) return 'GST';
  return TAX_TYPE_LABELS[taxType as (typeof taxTypeValues)[number]] ?? taxType;
}

export const attributeTypeValues = [
  'text',
  'number',
  'boolean',
  'select',
  'multiselect',
  'date',
] as const;

export const productRelationTypeValues = [
  'accessory',
  'alternative',
  'upgrade',
  'compatible',
  'bundle',
] as const;

export const productTypeSchema = z.enum(productTypeValues);
export const productStatusSchema = z.enum(productStatusValues);
export const taxTypeSchema = z.enum(taxTypeValues);
export const attributeTypeSchema = z.enum(attributeTypeValues);
export const productRelationTypeSchema = z.enum(productRelationTypeValues);

// ============================================================================
// PRODUCT DIMENSIONS
// ============================================================================

export const productDimensionsSchema = z.object({
  length: z.number().nonnegative().optional(),
  width: z.number().nonnegative().optional(),
  height: z.number().nonnegative().optional(),
  unit: z.enum(['mm', 'cm', 'm', 'in']).optional(),
});

export type ProductDimensions = z.infer<typeof productDimensionsSchema>;

// ============================================================================
// PRODUCT SPECIFICATIONS
// ============================================================================

export const productSpecificationsSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()])
);

export type ProductSpecifications = z.infer<typeof productSpecificationsSchema>;

// ============================================================================
// PRODUCT PRICING (Legacy JSONB)
// ============================================================================

export const bulkPricingSchema = z.object({
  minQty: z.number().int().positive(),
  price: currencySchema,
});

export const productPricingSchema = z.object({
  costPrice: currencySchema.optional(),
  markup: percentageSchema.optional(),
  minMargin: percentageSchema.optional(),
  bulkPricing: z.array(bulkPricingSchema).optional(),
});

export type ProductPricing = z.infer<typeof productPricingSchema>;

// ============================================================================
// PRODUCT METADATA
// ============================================================================

export const productMetadataSchema = z
  .object({
    manufacturer: z.string().max(255).optional(),
    brand: z.string().max(255).optional(),
    model: z.string().max(255).optional(),
    warranty: z.string().max(255).optional(),
    leadTime: z.number().int().nonnegative().optional(),
  })
  .passthrough()
  .transform((v) => v as Record<string, string | number | boolean | null | undefined>);

export type ProductMetadata = z.infer<typeof productMetadataSchema>;

// ============================================================================
// CREATE PRODUCT
// ============================================================================

export const createProductSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(100),
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(5000).optional(),
  barcode: z.string().max(50).optional(),
  categoryId: z.string().uuid().optional(),
  type: productTypeSchema.default('physical'),
  status: productStatusSchema.default('active'),
  isSerialized: z.boolean().default(false),
  trackInventory: z.boolean().default(true),
  basePrice: currencySchema.default(0),
  costPrice: currencySchema.optional(),
  taxType: taxTypeSchema.default('gst'),
  weight: z.number().nonnegative().multipleOf(0.001).optional(), // numeric(8,3)
  dimensions: productDimensionsSchema.default({}),
  specifications: productSpecificationsSchema.default({}),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  xeroItemId: z.string().max(255).optional(),
  pricing: productPricingSchema.default({}), // Legacy JSONB field
  warrantyPolicyId: z.string().uuid().optional(),
  // Legacy fields
  isActive: z.boolean().default(true),
  isSellable: z.boolean().default(true),
  isPurchasable: z.boolean().default(true),
  reorderPoint: quantitySchema.default(0),
  reorderQty: quantitySchema.default(0),
  metadata: productMetadataSchema.default({}),
});

export type CreateProduct = z.infer<typeof createProductSchema>;

// ============================================================================
// UPDATE PRODUCT
// ============================================================================

export const updateProductSchema = createProductSchema.partial();

export type UpdateProduct = z.infer<typeof updateProductSchema>;

// ============================================================================
// PRODUCT (output)
// ============================================================================

export const productSchema = createProductSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  description: z.string().max(5000).nullable().optional().default(null), // DB returns null; output string | null per SCHEMA-TRACE §8
  barcode: z.string().max(50).optional().nullable(), // DB returns null for optional fields
  categoryId: z.string().uuid().optional().nullable(),
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
  xeroItemId: z.string().max(255).optional().nullable(),
  tags: z
    .array(z.string().max(50))
    .max(20)
    .nullable()
    .optional()
    .transform((v) => v ?? []),
  weight: z.number().nonnegative().multipleOf(0.001).nullable(), // numeric(8,3) - nullable in output
  pricing: productPricingSchema.nullable(), // nullable in output
  warrantyPolicyId: z.string().uuid().nullable(), // nullable in output
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
  deletedAt: z.coerce.date().nullable(),
});

export type Product = z.infer<typeof productSchema>;

// ============================================================================
// PRODUCT FILTERS
// ============================================================================

export const productFilterSchema = filterSchema.extend({
  type: productTypeSchema.optional(),
  status: productStatusSchema.optional(),
  categoryId: z.string().uuid().optional(),
  isActive: z.coerce.boolean().optional(),
  isSellable: z.coerce.boolean().optional(),
  tags: z.array(z.string()).optional(),
  minPrice: currencySchema.optional(),
  maxPrice: currencySchema.optional(),
});

export type ProductFilter = z.infer<typeof productFilterSchema>;

// ============================================================================
// PRODUCT LIST QUERY
// ============================================================================

export const productListQuerySchema = paginationSchema.merge(productFilterSchema);

export type ProductListQuery = z.infer<typeof productListQuerySchema>;

/**
 * Cursor-based pagination query for products (recommended for large datasets).
 */
export const productCursorQuerySchema = cursorPaginationSchema.merge(productFilterSchema);

export type ProductCursorQuery = z.infer<typeof productCursorQuerySchema>;

// ============================================================================
// PRODUCT PARAMS
// ============================================================================

export const productParamsSchema = idParamSchema;
export type ProductParams = z.infer<typeof productParamsSchema>;

// ============================================================================
// CATEGORY SCHEMAS
// ============================================================================

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  parentId: z.string().uuid().optional(),
  sortOrder: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
  defaultWarrantyPolicyId: z.string().uuid().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categorySchema = createCategorySchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  description: z.string().max(500).nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  defaultWarrantyPolicyId: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CreateCategory = z.infer<typeof createCategorySchema>;
export type UpdateCategory = z.infer<typeof updateCategorySchema>;
export type Category = z.infer<typeof categorySchema>;

// ============================================================================
// PRICE TIER SCHEMAS
// ============================================================================

export const createPriceTierSchema = z.object({
  productId: z.string().uuid(),
  minQuantity: z.number().int().positive('Min quantity must be positive'),
  maxQuantity: z.number().int().positive().nullable().optional(),
  price: currencySchema,
  discountPercent: percentageSchema.nullable().default(null),
  isActive: z.boolean().default(true),
});

export const updatePriceTierSchema = createPriceTierSchema.partial().omit({ productId: true });

export const priceTierSchema = createPriceTierSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  maxQuantity: z.number().int().positive().nullable(),
  createdAt: z.coerce.date(),
});

export type CreatePriceTier = z.infer<typeof createPriceTierSchema>;
export type UpdatePriceTier = z.infer<typeof updatePriceTierSchema>;
export type PriceTier = z.infer<typeof priceTierSchema>;

// ============================================================================
// CUSTOMER PRICE SCHEMAS
// ============================================================================

export const createCustomerPriceSchema = z.object({
  customerId: z.string().uuid(),
  productId: z.string().uuid(),
  price: currencySchema,
  discountPercent: percentageSchema.nullable().default(null),
  validFrom: z.coerce.date().optional(),
  validTo: z.coerce.date().nullable().optional(),
});

export const updateCustomerPriceSchema = createCustomerPriceSchema.partial().omit({
  customerId: true,
  productId: true,
});

export const customerPriceSchema = createCustomerPriceSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date().nullable(),
  createdBy: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
});

export type CreateCustomerPrice = z.infer<typeof createCustomerPriceSchema>;
export type UpdateCustomerPrice = z.infer<typeof updateCustomerPriceSchema>;
export type CustomerPrice = z.infer<typeof customerPriceSchema>;

// ============================================================================
// BUNDLE COMPONENT SCHEMAS
// ============================================================================

export const bundleComponentSchema = z.object({
  componentProductId: z.string().uuid(),
  quantity: quantitySchema.min(1),
  isOptional: z.boolean().default(false),
  sortOrder: z.number().int().nonnegative().default(0),
});

export const createBundleSchema = z.object({
  bundleProductId: z.string().uuid(),
  components: z.array(bundleComponentSchema).min(1, 'At least one component is required'),
});

export const productBundleSchema = bundleComponentSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  bundleProductId: z.string().uuid(),
  createdAt: z.coerce.date(),
});

export type BundleComponent = z.infer<typeof bundleComponentSchema>;
export type CreateBundle = z.infer<typeof createBundleSchema>;
export type ProductBundle = z.infer<typeof productBundleSchema>;

// ============================================================================
// PRODUCT IMAGE SCHEMAS
// ============================================================================

export const imageDimensionsSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const createProductImageSchema = z.object({
  productId: z.string().uuid(),
  imageUrl: z.string().url(),
  altText: z.string().max(255).nullable().optional(),
  caption: z.string().max(500).nullable().optional(),
  sortOrder: z.number().int().nonnegative().default(0),
  isPrimary: z.boolean().default(false),
  fileSize: z.number().int().nonnegative().nullable().default(null),
  dimensions: imageDimensionsSchema.nullable().optional(),
});

export const updateProductImageSchema = createProductImageSchema.partial().omit({
  productId: true,
  imageUrl: true,
});

export const productImageSchema = createProductImageSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  uploadedBy: z.string().uuid(),
  createdAt: z.coerce.date(),
});

export type CreateProductImage = z.infer<typeof createProductImageSchema>;
export type UpdateProductImage = z.infer<typeof updateProductImageSchema>;
export type ProductImage = z.infer<typeof productImageSchema>;

/** Form schema for image editor (alt text, caption) */
export const imageEditFormSchema = z.object({
  altText: z
    .string()
    .max(255, 'Alt text must be 255 characters or less')
    .optional(),
  caption: z
    .string()
    .max(1000, 'Caption must be 1000 characters or less')
    .optional(),
});
export type ImageEditFormValues = z.infer<typeof imageEditFormSchema>;

/**
 * Response schema for getProduct. Validates normalized DB output.
 * Use in server handler after normalizing null metadata/description/fileSize/discountPercent.
 */
// Wire types for ServerFn boundary: z.record produces {}[] for serialization (SCHEMA-TRACE §4)
const flexibleRecordSchema = z.record(z.string(), z.any());

export const getProductResponseSchema = z.object({
  product: productSchema,
  category: categorySchema.nullable(),
  images: z.array(productImageSchema),
  priceTiers: z.array(priceTierSchema),
  attributeValues: z.array(flexibleRecordSchema),
  relations: z.array(flexibleRecordSchema),
  bundleComponents: z.array(flexibleRecordSchema).optional(),
});

export type GetProductResponse = z.infer<typeof getProductResponseSchema>;

/** Loader data for product edit route (getProduct + categoryTree). */
export type GetProductEditLoaderData = GetProductResponse & { categoryTree: CategoryWithChildren[] };

/** Type guard for GetProductResponse (use after runtime checks). */
export function isGetProductResponse(v: unknown): v is GetProductResponse {
  return (
    v != null &&
    typeof v === 'object' &&
    'product' in (v as object) &&
    (v as GetProductResponse).product != null
  );
}

// ============================================================================
// PRODUCT ATTRIBUTE DEFINITION SCHEMAS
// ============================================================================

export const attributeOptionsSchema = z
  .object({
    choices: z
      .array(
        z.object({
          value: z.string(),
          label: z.string(),
          sortOrder: z.number().int().optional(),
        })
      )
      .optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
    placeholder: z.string().optional(),
  })
  .passthrough();

export const createProductAttributeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  attributeType: attributeTypeSchema,
  description: z.string().max(500).optional(),
  options: attributeOptionsSchema.default({}),
  isRequired: z.boolean().default(false),
  isFilterable: z.boolean().default(false),
  isSearchable: z.boolean().default(false),
  categoryIds: z.array(z.string().uuid()).default([]),
  sortOrder: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
});

export const updateProductAttributeSchema = createProductAttributeSchema.partial();

export const productAttributeSchema = createProductAttributeSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  createdBy: z.string().uuid(),
  createdAt: z.coerce.date(),
});

export type CreateProductAttribute = z.infer<typeof createProductAttributeSchema>;
export type UpdateProductAttribute = z.infer<typeof updateProductAttributeSchema>;
export type ProductAttribute = z.infer<typeof productAttributeSchema>;

// ============================================================================
// PRODUCT ATTRIBUTE VALUE SCHEMAS
// ============================================================================

export const setAttributeValueSchema = z.object({
  productId: z.string().uuid(),
  attributeId: z.string().uuid(),
  value: z.unknown(), // JSONB can hold any type
});

export const bulkSetAttributeValuesSchema = z.object({
  productId: z.string().uuid(),
  values: z.record(z.string().uuid(), z.unknown()), // attributeId -> value
});

export const productAttributeValueSchema = setAttributeValueSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type SetAttributeValue = z.infer<typeof setAttributeValueSchema>;
export type BulkSetAttributeValues = z.infer<typeof bulkSetAttributeValuesSchema>;
export type ProductAttributeValue = z.infer<typeof productAttributeValueSchema>;

// ============================================================================
// PRODUCT RELATION SCHEMAS
// ============================================================================

export const createProductRelationSchema = z.object({
  productId: z.string().uuid(),
  relatedProductId: z.string().uuid(),
  relationType: productRelationTypeSchema,
  sortOrder: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
});

export const updateProductRelationSchema = createProductRelationSchema.partial().omit({
  productId: true,
  relatedProductId: true,
});

export const productRelationSchema = createProductRelationSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  createdBy: z.string().uuid(),
  createdAt: z.coerce.date(),
});

export type CreateProductRelation = z.infer<typeof createProductRelationSchema>;
export type UpdateProductRelation = z.infer<typeof updateProductRelationSchema>;
export type ProductRelation = z.infer<typeof productRelationSchema>;

// ============================================================================
// PRICE RESOLUTION SCHEMAS
// ============================================================================

export const getPriceQuerySchema = z.object({
  customerId: z.string().uuid().optional(),
  quantity: z.number().int().positive().default(1),
});

export const priceResolutionResultSchema = z.object({
  basePrice: currencySchema,
  finalPrice: currencySchema,
  discount: currencySchema,
  tier: priceTierSchema.optional(),
  customerPrice: customerPriceSchema.optional(),
});

export type GetPriceQuery = z.infer<typeof getPriceQuerySchema>;
export type PriceResolutionResult = z.infer<typeof priceResolutionResultSchema>;

// ============================================================================
// INVENTORY MOVEMENT TYPES (import for ProductMovementHistoryItem only)
// ============================================================================

import type { MovementType } from '../inventory';

// Re-export for consumers (inventory-history imports from products)
export type { MovementType } from '../inventory';

// Movement interface for product inventory history display (nested product/location)
export interface ProductMovementHistoryItem {
  id: string;
  movementType: MovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  unitCost: number;
  totalCost: number;
  referenceType: string | null;
  referenceId: string | null;
  metadata: Record<string, unknown> | null;
  notes: string | null;
  movementDate?: Date | string;
  totalQuantity: number;
  runningBalance: number;
  createdAt: Date;
  createdBy: string | null;
  product: {
    id: string;
    sku: string;
    name: string;
  };
  location: {
    id: string;
    code: string;
    name: string;
  };
}

// ============================================================================
// STOCK ADJUSTMENT TYPES
// ============================================================================

export interface StockAdjustmentLocation {
  id: string;
  locationCode: string; // Matches Location type from inventory schema
  name: string;
}

export interface StockAdjustmentPayload {
  locationId: string;
  adjustmentType: 'add' | 'subtract' | 'set';
  quantity: number;
  reason: string;
  notes?: string;
  currentStock: number;
}

// ============================================================================
// PRODUCT WITH RELATIONS (Detail View)
// ============================================================================

export interface ProductWithRelations extends Omit<Product, 'barcode' | 'description'> {
  /** DB returns string | null */
  description: string | null;
  /** DB returns string | null; loader normalizes to undefined when null */
  barcode?: string | null;
}

// ============================================================================
// PRODUCT TABLE ITEM (List View)
// ============================================================================

export type ProductType = z.infer<typeof productTypeSchema>;
export type ProductStatus = z.infer<typeof productStatusSchema>;
export type TaxType = z.infer<typeof taxTypeSchema>;

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'not_tracked';

export interface ProductTableItem {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  categoryId: string | null;
  categoryName?: string | null;
  type: ProductType;
  status: ProductStatus;
  basePrice: number;
  costPrice: number | null;
  isActive: boolean;
  trackInventory?: boolean;
  totalQuantity?: number;
  stockStatus?: StockStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ============================================================================
// CATEGORY WITH CHILDREN (Tree Structure)
// ============================================================================

export interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[];
  productCount?: number;
}

// ============================================================================
// CATEGORY NODE (Tree Component)
// ============================================================================

export interface CategoryNode {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
  children: CategoryNode[];
}

// ============================================================================
// PRODUCT WITH INVENTORY (List Response)
// ============================================================================

export interface ProductWithInventory extends Omit<Product, 'categoryId'> {
  /** List output normalizes undefined to null per SCHEMA-TRACE §8 */
  categoryId: string | null;
  categoryName: string | null;
  totalQuantity: number;
  stockStatus: StockStatus;
}

// ============================================================================
// PRODUCT SEARCH RESULT
// ============================================================================

/**
 * Product from quick search - dimensions may differ from schema due to DB jsonb.
 * Use when quickSearchProducts returns raw Drizzle rows.
 */
export interface ProductSearchItem extends Omit<Product, 'dimensions' | 'description' | 'metadata' | 'tags' | 'barcode'> {
  dimensions?: unknown;
  description?: string | null;
  /** DB returns ProductMetadata | null; search results may have null */
  metadata?: ProductMetadata | Record<string, string | number | boolean | null | undefined> | null;
  /** DB returns string[] | null; normalize to [] when null */
  tags?: string[] | null;
  /** DB returns string | null */
  barcode?: string | null;
}

export interface ProductSearchResult {
  products: ProductSearchItem[];
  total: number;
}

/** Minimal product hit for search results in dialogs (e.g. amendment item_add) */
export interface ProductSearchHit {
  id: string;
  name: string;
  sku: string | null;
  basePrice: number | null;
}

// ============================================================================
// LIST PRODUCTS RESULT
// ============================================================================

export interface ListProductsResult {
  products: ProductWithInventory[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================================
// NAVIGATION LINK (Cross-Entity Navigation)
// ============================================================================

export interface NavigationLink {
  to: string;
  params: Record<string, string>;
  label: string;
}

// ============================================================================
// GALLERY IMAGE (Image Gallery Component)
// ============================================================================

/** Alias for ProductImage; kept for backwards compatibility with gallery components. */
export type GalleryImage = ProductImage;
