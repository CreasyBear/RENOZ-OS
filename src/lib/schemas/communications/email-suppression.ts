/**
 * Email Suppression Schemas
 *
 * Zod validation schemas for email suppression operations.
 *
 * @see INT-RES-003
 */

import { z } from "zod";
import { cursorPaginationSchema } from "@/lib/db/pagination";

// ============================================================================
// ENUMS
// ============================================================================

export const suppressionReasonSchema = z.enum([
  "bounce",
  "complaint",
  "unsubscribe",
  "manual",
]);
export type SuppressionReason = z.infer<typeof suppressionReasonSchema>;

export const bounceTypeSchema = z.enum(["hard", "soft"]);
export type BounceType = z.infer<typeof bounceTypeSchema>;

// ============================================================================
// METADATA SCHEMA
// ============================================================================

export const suppressionMetadataSchema = z.object({
  emailSubject: z.string().optional(),
  campaignId: z.string().uuid().optional(),
  ipHash: z.string().optional(),
  userAgent: z.string().optional(),
  notes: z.string().optional(),
  bounceMessage: z.string().optional(),
});
export type SuppressionMetadata = z.infer<typeof suppressionMetadataSchema>;

// ============================================================================
// LIST FILTERS
// ============================================================================

export const suppressionListFiltersSchema = z.object({
  reason: suppressionReasonSchema.optional(),
  search: z.string().optional(),
  includeDeleted: z.boolean().optional().default(false),
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().positive().max(100).optional().default(20),
  sortBy: z
    .enum(["email", "reason", "createdAt"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});
export type SuppressionListFilters = z.infer<
  typeof suppressionListFiltersSchema
>;

export const suppressionListCursorSchema = cursorPaginationSchema.merge(
  z.object({
    reason: suppressionReasonSchema.optional(),
    search: z.string().optional(),
    includeDeleted: z.boolean().optional().default(false),
  })
);
export type SuppressionListCursorInput = z.infer<typeof suppressionListCursorSchema>;

// ============================================================================
// CHECK SUPPRESSION
// ============================================================================

export const checkSuppressionSchema = z.object({
  email: z.string().email("Invalid email address"),
});
export type CheckSuppressionInput = z.infer<typeof checkSuppressionSchema>;

export const checkSuppressionBatchSchema = z.object({
  emails: z
    .array(z.string().email("Invalid email address"))
    .min(1)
    .max(1000, "Maximum 1000 emails per batch"),
});
export type CheckSuppressionBatchInput = z.infer<
  typeof checkSuppressionBatchSchema
>;

// ============================================================================
// ADD SUPPRESSION
// ============================================================================

export const addSuppressionSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .transform((e) => e.toLowerCase().trim()),
  reason: suppressionReasonSchema,
  bounceType: bounceTypeSchema.optional(),
  source: z
    .enum(["webhook", "manual", "import", "api"])
    .optional()
    .default("manual"),
  resendEventId: z.string().optional(),
  metadata: suppressionMetadataSchema.optional(),
});
export type AddSuppressionInput = z.infer<typeof addSuppressionSchema>;

// ============================================================================
// REMOVE SUPPRESSION
// ============================================================================

export const removeSuppressionSchema = z.object({
  id: z.string().uuid("Invalid suppression ID"),
  reason: z.string().min(1, "Reason is required for removal").optional(),
});
export type RemoveSuppressionInput = z.infer<typeof removeSuppressionSchema>;

// ============================================================================
// SUPPRESSION RECORD (Output)
// ============================================================================

export const suppressionRecordSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  email: z.string().email(),
  reason: suppressionReasonSchema,
  bounceType: bounceTypeSchema.nullable(),
  source: z.string().nullable(),
  resendEventId: z.string().nullable(),
  metadata: suppressionMetadataSchema.nullable(),
  createdAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
  deletedBy: z.string().uuid().nullable(),
  deletedReason: z.string().nullable(),
});
export type SuppressionRecord = z.infer<typeof suppressionRecordSchema>;

// ============================================================================
// CHECK RESULT (Output)
// ============================================================================

export const checkSuppressionResultSchema = z.object({
  email: z.string().email(),
  isSuppressed: z.boolean(),
  reason: suppressionReasonSchema.nullable(),
  bounceType: bounceTypeSchema.nullable(),
  suppressedAt: z.coerce.date().nullable(),
});
export type CheckSuppressionResult = z.infer<
  typeof checkSuppressionResultSchema
>;

export const checkSuppressionBatchResultSchema = z.object({
  results: z.array(checkSuppressionResultSchema),
  suppressedCount: z.number().int().nonnegative(),
  totalChecked: z.number().int().positive(),
});
export type CheckSuppressionBatchResult = z.infer<
  typeof checkSuppressionBatchResultSchema
>;

// ============================================================================
// LIST RESULT (Output)
// ============================================================================

export const suppressionListResultSchema = z.object({
  items: z.array(suppressionRecordSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  hasMore: z.boolean(),
});
export type SuppressionListResult = z.infer<typeof suppressionListResultSchema>;

// ============================================================================
// FORM SCHEMAS (UI validation)
// ============================================================================

export const addSuppressionFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  reason: suppressionReasonSchema,
  notes: z.string().optional(),
});
export type AddSuppressionFormValues = z.infer<typeof addSuppressionFormSchema>;

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

/**
 * Form values for add suppression dialog (re-exported from schema)
 */

/**
 * Props for AddSuppressionDialog component
 */
export interface AddSuppressionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}
