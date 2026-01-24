/**
 * Warranty Claims Validation Schemas
 *
 * Zod schemas for warranty claim workflow operations.
 *
 * @see drizzle/schema/warranty-claims.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-006b
 */

import { z } from 'zod';
import { currencySchema } from '../_shared/patterns';

// ============================================================================
// ENUMS
// ============================================================================

export const warrantyClaimStatusSchema = z.enum([
  'submitted',
  'under_review',
  'approved',
  'denied',
  'resolved',
]);
export type WarrantyClaimStatusValue = z.infer<typeof warrantyClaimStatusSchema>;

export const warrantyClaimTypeSchema = z.enum([
  'cell_degradation',
  'bms_fault',
  'inverter_failure',
  'installation_defect',
  'other',
]);
export type WarrantyClaimTypeValue = z.infer<typeof warrantyClaimTypeSchema>;

export const warrantyClaimResolutionTypeSchema = z.enum([
  'repair',
  'replacement',
  'refund',
  'warranty_extension',
]);
export type WarrantyClaimResolutionTypeValue = z.infer<typeof warrantyClaimResolutionTypeSchema>;

// ============================================================================
// CREATE WARRANTY CLAIM
// ============================================================================

export const createWarrantyClaimSchema = z.object({
  warrantyId: z.string().uuid('Invalid warranty ID'),
  claimType: warrantyClaimTypeSchema,
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  cycleCountAtClaim: z.number().int().nonnegative().optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateWarrantyClaimInput = z.infer<typeof createWarrantyClaimSchema>;

// ============================================================================
// UPDATE CLAIM STATUS
// ============================================================================

export const updateClaimStatusSchema = z.object({
  claimId: z.string().uuid('Invalid claim ID'),
  status: warrantyClaimStatusSchema,
  notes: z.string().max(2000).optional(),
});

export type UpdateClaimStatusInput = z.infer<typeof updateClaimStatusSchema>;

// ============================================================================
// APPROVE CLAIM
// ============================================================================

export const approveClaimSchema = z.object({
  claimId: z.string().uuid('Invalid claim ID'),
  notes: z.string().max(2000).optional(),
});

export type ApproveClaimInput = z.infer<typeof approveClaimSchema>;

// ============================================================================
// DENY CLAIM
// ============================================================================

export const denyClaimSchema = z.object({
  claimId: z.string().uuid('Invalid claim ID'),
  denialReason: z.string().min(10, 'Denial reason must be at least 10 characters').max(2000),
  notes: z.string().max(2000).optional(),
});

export type DenyClaimInput = z.infer<typeof denyClaimSchema>;

// ============================================================================
// RESOLVE CLAIM
// ============================================================================

export const resolveClaimSchema = z.object({
  claimId: z.string().uuid('Invalid claim ID'),
  resolutionType: warrantyClaimResolutionTypeSchema,
  resolutionNotes: z.string().max(2000).optional(),
  cost: currencySchema.optional(), // Currency precision
  // For warranty_extension resolution type
  extensionMonths: z.number().int().positive().optional(),
  extensionCycles: z.number().int().positive().optional(),
});

export type ResolveClaimInput = z.infer<typeof resolveClaimSchema>;

// ============================================================================
// LIST WARRANTY CLAIMS
// ============================================================================

export const listWarrantyClaimsSchema = z.object({
  warrantyId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  status: warrantyClaimStatusSchema.optional(),
  claimType: warrantyClaimTypeSchema.optional(),
  assignedUserId: z.string().uuid().optional(),
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  // Sorting
  sortBy: z.enum(['submittedAt', 'claimNumber', 'status', 'claimType']).default('submittedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListWarrantyClaimsInput = z.input<typeof listWarrantyClaimsSchema>;

// ============================================================================
// GET WARRANTY CLAIM
// ============================================================================

export const getWarrantyClaimSchema = z.object({
  claimId: z.string().uuid('Invalid claim ID'),
});

export type GetWarrantyClaimInput = z.infer<typeof getWarrantyClaimSchema>;

// ============================================================================
// ASSIGN CLAIM
// ============================================================================

export const assignClaimSchema = z.object({
  claimId: z.string().uuid('Invalid claim ID'),
  assignedUserId: z.string().uuid('Invalid user ID').nullable(),
});

export type AssignClaimInput = z.infer<typeof assignClaimSchema>;
