/**
 * Warranty Validation Schemas
 *
 * Zod schemas for warranty CRUD, retrieval, and notification settings.
 *
 * @see drizzle/schema/warranty/warranties.ts
 * @see src/server/functions/warranty/warranties.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json
 */

import { z } from 'zod';
import { warrantyPolicyTypeSchema } from './policies';

// ============================================================================
// ENUMS (must match drizzle schema)
// ============================================================================

export const warrantyStatusValues = [
  'active',
  'expiring_soon',
  'expired',
  'voided',
  'transferred',
] as const;

export const warrantyStatusSchema = z.enum(warrantyStatusValues);
export type WarrantyStatus = z.infer<typeof warrantyStatusSchema>;

// ============================================================================
// METADATA SCHEMA
// ============================================================================

export const warrantyMetadataSchema = z
  .object({
    installationNotes: z.string().optional(),
    batteryCapacity: z.number().positive().optional(),
    systemVoltage: z.number().positive().optional(),
    installationDate: z.string().optional(),
    commissioningDate: z.string().optional(),
    serialNumbers: z.array(z.string()).optional(),
    customField1: z.string().optional(),
    customField2: z.string().optional(),
  })
  .passthrough(); // Allow additional properties for extensibility

// ============================================================================
// CREATE WARRANTY
// ============================================================================

export const createWarrantySchema = z.object({
  organizationId: z.string().uuid(),
  customerId: z.string().uuid(),
  productId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  policyId: z.string().uuid(),
  serialNumber: z.string().min(1).max(255),
  installationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  metadata: warrantyMetadataSchema.optional(),
});

export type CreateWarrantyInput = z.infer<typeof createWarrantySchema>;

// ============================================================================
// UPDATE WARRANTY
// ============================================================================

export const updateWarrantySchema = z.object({
  status: warrantyStatusSchema.optional(),
  expiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  metadata: warrantyMetadataSchema.optional(),
});

export type UpdateWarrantyInput = z.infer<typeof updateWarrantySchema>;

// ============================================================================
// WARRANTY FILTERS
// ============================================================================

export const warrantyFiltersSchema = z.object({
  status: warrantyStatusSchema.optional(),
  statuses: z.array(warrantyStatusSchema).optional(),
  policyType: warrantyPolicyTypeSchema.optional(),
  customerId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  policyId: z.string().uuid().optional(),
  expiryFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  expiryTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['createdAt', 'expiryDate', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type WarrantyFilters = z.infer<typeof warrantyFiltersSchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export const warrantyResponseSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  customerId: z.string().uuid(),
  customer: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }),
  productId: z.string().uuid(),
  product: z.object({
    id: z.string().uuid(),
    name: z.string(),
    sku: z.string(),
  }),
  orderId: z.string().uuid().nullable(),
  projectId: z.string().uuid().nullable().optional(),
  policyId: z.string().uuid(),
  policy: z.object({
    id: z.string().uuid(),
    name: z.string(),
    type: z.string(),
    durationMonths: z.number(),
  }),
  serialNumber: z.string(),
  installationDate: z.coerce.date(),
  expiryDate: z.coerce.date(),
  status: warrantyStatusSchema,
  metadata: warrantyMetadataSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
});

export type WarrantyResponse = z.infer<typeof warrantyResponseSchema>;

export const warrantyListResponseSchema = z.object({
  warranties: z.array(warrantyResponseSchema),
  total: z.number(),
  hasMore: z.boolean(),
  nextOffset: z.number().optional(),
});

export type WarrantyListResponse = z.infer<typeof warrantyListResponseSchema>;

// ============================================================================
// EXPIRING WARRANTIES + OPT-OUT SETTINGS
// ============================================================================

export const getExpiringWarrantiesSchema = z.object({
  days: z.number().min(1).max(365).default(30),
  limit: z.number().min(1).max(100).default(10),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type GetExpiringWarrantiesInput = z.input<typeof getExpiringWarrantiesSchema>;

/**
 * Schema for expiring warranties report with full filtering and pagination.
 */
export const getExpiringWarrantiesReportSchema = z.object({
  days: z.number().min(1).max(365).default(30),
  customerId: z.string().optional(),
  productId: z.string().optional(),
  status: z.enum(['active', 'expired', 'all']).default('active'),
  sortBy: z.enum(['expiry_asc', 'expiry_desc', 'customer', 'product']).default('expiry_asc'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export type GetExpiringWarrantiesReportInput = z.input<typeof getExpiringWarrantiesReportSchema>;

/**
 * Schema for getting a single warranty by ID.
 */
export const getWarrantySchema = z.object({
  id: z.string().uuid(),
});

export type GetWarrantyInput = z.input<typeof getWarrantySchema>;

/**
 * Schema for updating warranty expiry alert opt-out setting.
 */
export const updateWarrantyOptOutSchema = z.object({
  warrantyId: z.string().uuid(),
  optOut: z.boolean(),
});

export type UpdateWarrantyOptOutInput = z.input<typeof updateWarrantyOptOutSchema>;

/**
 * Schema for updating customer warranty expiry alert opt-out setting.
 */
export const updateCustomerWarrantyOptOutSchema = z.object({
  customerId: z.string().uuid(),
  optOut: z.boolean(),
});

export type UpdateCustomerWarrantyOptOutInput = z.input<typeof updateCustomerWarrantyOptOutSchema>;
