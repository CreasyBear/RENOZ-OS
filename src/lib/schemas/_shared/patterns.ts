/**
 * Reusable Zod Schema Patterns
 *
 * Common validation patterns for consistent API contracts.
 * Import these helpers to reduce boilerplate and ensure consistency.
 *
 * @example
 * import { paginationSchema, idParamSchema, filterSchema } from "./patterns";
 *
 * export const CustomerListQuerySchema = paginationSchema.merge(filterSchema);
 */

import { z } from 'zod';

// ============================================================================
// ID PARAMETERS
// ============================================================================

/**
 * Single UUID validation (standalone, not wrapped in object).
 */
export const idSchema = z.string().uuid('Invalid ID format');

export type Id = z.infer<typeof idSchema>;

/**
 * Single UUID parameter validation (wrapped in object).
 */
export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export type IdParam = z.infer<typeof idParamSchema>;

/**
 * Multiple UUID parameters for bulk operations.
 */
export const idsParamSchema = z.object({
  ids: z
    .array(z.string().uuid('Invalid ID format'))
    .min(1, 'At least one ID required')
    .max(100, 'Maximum 100 IDs per request'),
});

export type IdsParam = z.infer<typeof idsParamSchema>;

// ============================================================================
// PAGINATION
// ============================================================================

/**
 * Offset-based pagination parameters.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type Pagination = z.infer<typeof paginationSchema>;

/**
 * Cursor-based pagination parameters.
 * More efficient for large datasets.
 */
export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CursorPagination = z.infer<typeof cursorPaginationSchema>;

/**
 * Paginated response wrapper.
 */
export const paginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      pageSize: z.number(),
      totalItems: z.number(),
      totalPages: z.number(),
    }),
  });

/**
 * Cursor-paginated response wrapper.
 */
export const cursorPaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().nullable(),
    hasNextPage: z.boolean(),
  });

// ============================================================================
// FILTERS
// ============================================================================

/**
 * Base filter schema for list queries.
 */
export const filterSchema = z.object({
  search: z.string().max(255).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export type Filter = z.infer<typeof filterSchema>;

/**
 * Date range with validation.
 */
export const dateRangeSchema = z
  .object({
    dateFrom: z.coerce.date(),
    dateTo: z.coerce.date(),
  })
  .refine((data) => data.dateFrom <= data.dateTo, {
    message: 'End date must be after start date',
    path: ['dateTo'],
  });

export type DateRange = z.infer<typeof dateRangeSchema>;

// ============================================================================
// COMMON FIELD PATTERNS
// ============================================================================

/**
 * Email field with proper validation.
 */
const emptyStringToUndefined = (value: unknown) => (value === '' ? undefined : value);
const trimStringToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

export const emailSchema = z.string().email('Invalid email address').max(255);
export const optionalEmailSchema = z
  .preprocess(trimStringToUndefined, z.string().email('Invalid email address').max(255))
  .optional();

/**
 * Phone number - flexible for international formats.
 */
const normalizeUrl = (value: unknown) => {
  if (typeof value !== 'string') return value;
  if (value === '') return value;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
};

export const phoneSchema = z
  .preprocess(emptyStringToUndefined, z
    .string()
    .min(6, 'Phone number too short')
    .max(20, 'Phone number too long')
    .regex(/^[+\d\s()-]+$/, 'Invalid phone format'))
  .optional();

/**
 * URL field.
 */
export const urlSchema = z
  .preprocess(
    (value) => normalizeUrl(emptyStringToUndefined(value)),
    z.string().url('Invalid URL').max(2000)
  )
  .optional();

/**
 * Currency amount (positive, 2 decimal places).
 */
export const currencySchema = z.coerce
  .number()
  .nonnegative('Amount must be positive')
  .multipleOf(0.01, 'Amount must have at most 2 decimal places');

/**
 * Percentage (0-100, 2 decimal places).
 */
export const percentageSchema = z.coerce
  .number()
  .min(0, 'Percentage must be 0 or greater')
  .max(100, 'Percentage cannot exceed 100')
  .multipleOf(0.01);

/**
 * Quantity (positive, 3 decimal places for fractional units).
 */
export const quantitySchema = z.coerce
  .number()
  .nonnegative('Quantity must be positive')
  .multipleOf(0.001);

// ============================================================================
// ADDRESS SCHEMA
// ============================================================================

export const addressSchema = z.object({
  street1: z.string().min(1, 'Street address required').max(255),
  street2: z.string().max(255).optional(),
  city: z.string().min(1, 'City required').max(100),
  state: z.string().min(1, 'State required').max(100),
  postalCode: z.string().min(1, 'Postal code required').max(20),
  country: z.string().min(2).max(2).default('AU'), // ISO country code
});

export type Address = z.infer<typeof addressSchema>;

// ============================================================================
// TIMESTAMP SCHEMAS
// ============================================================================

/**
 * Timestamps for API responses.
 */
export const timestampFieldsSchema = z.object({
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type TimestampFields = z.infer<typeof timestampFieldsSchema>;

/**
 * Audit fields for API responses.
 */
export const auditFieldsSchema = z.object({
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
});

export type AuditFields = z.infer<typeof auditFieldsSchema>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create an enum schema from canonical enum values.
 *
 * @example
 * const orderStatusSchema = createEnumSchema(["draft", "confirmed", ...]);
 */
export const createEnumSchema = <T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values);

/**
 * Make all fields in a schema optional except specified keys.
 *
 * @example
 * const UpdateSchema = partialExcept(CreateSchema, ["id", "organizationId"]);
 */
export const partialExcept = <T extends z.ZodObject<any>, K extends keyof z.infer<T>>(
  schema: T,
  requiredKeys: K[]
) => {
  const shape = schema.shape;
  const partialShape: any = {};

  for (const key of Object.keys(shape)) {
    if (requiredKeys.includes(key as K)) {
      partialShape[key] = shape[key];
    } else {
      partialShape[key] = shape[key].optional();
    }
  }

  return z.object(partialShape);
};
