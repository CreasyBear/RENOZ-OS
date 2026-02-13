/**
 * Warranty Extension Validation Schemas
 *
 * Zod schemas for warranty extension operations.
 *
 * @see drizzle/schema/warranty-extensions.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-007b
 */

import { z } from 'zod';
import { currencySchema } from '../_shared/patterns';
import { cursorPaginationSchema } from '@/lib/db/pagination';

// ============================================================================
// ENUMS
// ============================================================================

export const warrantyExtensionTypeSchema = z.enum([
  'paid_extension',
  'promotional',
  'loyalty_reward',
  'goodwill',
]);

export type WarrantyExtensionTypeValue = z.infer<typeof warrantyExtensionTypeSchema>;

export function isWarrantyExtensionTypeValue(
  v: unknown
): v is WarrantyExtensionTypeValue {
  return warrantyExtensionTypeSchema.safeParse(v).success;
}

// ============================================================================
// EXTEND WARRANTY
// ============================================================================

/**
 * Schema for extending a warranty.
 * - warrantyId: The warranty to extend
 * - extensionType: Type of extension (paid, promotional, loyalty, goodwill)
 * - extensionMonths: Number of months to extend
 * - price: Price paid (required for paid_extension, optional for others)
 * - notes: Optional notes/reason for extension
 */
export const extendWarrantySchema = z
  .object({
    warrantyId: z.string().uuid('Invalid warranty ID'),
    extensionType: warrantyExtensionTypeSchema,
    extensionMonths: z
      .number()
      .int('Extension months must be a whole number')
      .positive('Extension months must be positive')
      .max(120, 'Maximum extension is 120 months (10 years)'),
    price: currencySchema.nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
  })
  .refine(
    (data) => {
      // Paid extensions require a price
      if (data.extensionType === 'paid_extension') {
        return data.price !== null && data.price !== undefined && data.price > 0;
      }
      return true;
    },
    {
      message: 'Price is required for paid extensions',
      path: ['price'],
    }
  );

export type ExtendWarrantyInput = z.infer<typeof extendWarrantySchema>;

// ============================================================================
// LIST WARRANTY EXTENSIONS
// ============================================================================

/**
 * Schema for listing extensions for a specific warranty.
 */
export const listWarrantyExtensionsSchema = z.object({
  warrantyId: z.string().uuid('Invalid warranty ID'),
});

export type ListWarrantyExtensionsInput = z.infer<typeof listWarrantyExtensionsSchema>;

// ============================================================================
// GET EXTENSION HISTORY
// ============================================================================

/**
 * Schema for getting all extensions with pagination.
 * Supports filtering by extension type and date range.
 */
export const getExtensionHistorySchema = z.object({
  extensionType: warrantyExtensionTypeSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z
    .enum(['created_at_asc', 'created_at_desc', 'extension_months'])
    .default('created_at_desc'),
});

export type GetExtensionHistoryInput = z.input<typeof getExtensionHistorySchema>;

export const getExtensionHistoryCursorSchema = cursorPaginationSchema.merge(
  z.object({
    extensionType: warrantyExtensionTypeSchema.optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })
);

export type GetExtensionHistoryCursorInput = z.infer<typeof getExtensionHistoryCursorSchema>;

// ============================================================================
// GET EXTENSION BY ID
// ============================================================================

export const getExtensionByIdSchema = z.object({
  extensionId: z.string().uuid('Invalid extension ID'),
});

export type GetExtensionByIdInput = z.infer<typeof getExtensionByIdSchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Warranty extension item (for list views).
 * Matches the structure returned by listWarrantyExtensions server function.
 */
export interface WarrantyExtensionItem {
  id: string;
  warrantyId: string;
  warrantyNumber: string;
  extensionType: WarrantyExtensionTypeValue;
  extensionMonths: number;
  previousExpiryDate: string;
  newExpiryDate: string;
  price: number | null;
  notes: string | null;
  approvedById: string | null;
  createdAt: string;
}

/**
 * Response type for listing warranty extensions.
 * Matches the structure returned by listWarrantyExtensions server function.
 */
export interface ListWarrantyExtensionsResult {
  warrantyNumber: string;
  extensions: WarrantyExtensionItem[];
}

/** Props for WarrantyExtensionHistory */
export interface WarrantyExtensionHistoryProps {
  warrantyId: string;
  originalExpiryDate?: Date | string;
  onExtendClick?: () => void;
  showExtendButton?: boolean;
  className?: string;
  extensions?: WarrantyExtensionItem[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

/** Props for WarrantyExtensionHistoryCompact */
export interface WarrantyExtensionHistoryCompactProps {
  warrantyId: string;
  maxItems?: number;
  extensions?: WarrantyExtensionItem[];
  isLoading?: boolean;
}
