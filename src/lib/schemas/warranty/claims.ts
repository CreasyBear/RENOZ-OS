/**
 * Warranty Claims Validation Schemas
 *
 * Zod schemas for warranty claim workflow operations.
 *
 * @see drizzle/schema/warranty-claims.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-006b
 */

import type { ReactNode } from 'react';
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
  'cancelled',
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
// TYPE GUARDS (SCHEMA-TRACE: replace `as` assertions in components)
// ============================================================================

export function isWarrantyClaimStatusValue(
  v: unknown
): v is WarrantyClaimStatusValue {
  return warrantyClaimStatusSchema.safeParse(v).success;
}

export function isWarrantyClaimTypeValue(v: unknown): v is WarrantyClaimTypeValue {
  return warrantyClaimTypeSchema.safeParse(v).success;
}

export function isWarrantyClaimResolutionTypeValue(
  v: unknown
): v is WarrantyClaimResolutionTypeValue {
  return warrantyClaimResolutionTypeSchema.safeParse(v).success;
}

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

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Warranty claim list item (for list views).
 * Matches the structure returned by listWarrantyClaims server function.
 */
export interface WarrantyClaimListItem {
  id: string;
  claimNumber: string;
  warrantyId: string;
  customerId: string;
  productId: string | null;
  claimType: WarrantyClaimTypeValue;
  status: WarrantyClaimStatusValue;
  cost: number | null;
  submittedAt: string | Date;
  description: string;
  cycleCountAtClaim: number | null;
  warranty: {
    warrantyNumber: string;
    productSerial: string | null;
  };
  customer: {
    id: string;
    name: string | null;
  };
  product: {
    id: string;
    name: string | null;
  } | null;
}

/** Pagination for warranty claims list */
export interface WarrantyClaimPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * Response type for listing warranty claims with pagination.
 * Matches the structure returned by listWarrantyClaims server function.
 */
export interface ListWarrantyClaimsResult {
  items: WarrantyClaimListItem[];
  pagination: WarrantyClaimPagination;
}

/** Search params for warranty claims list */
export interface WarrantyClaimsSearchParams {
  status?: WarrantyClaimStatusValue;
  type?: WarrantyClaimTypeValue;
  page: number;
  pageSize: number;
  sortBy: NonNullable<ListWarrantyClaimsInput['sortBy']>;
  sortOrder: NonNullable<ListWarrantyClaimsInput['sortOrder']>;
}

/** Props for WarrantyClaimsListContainer */
export interface WarrantyClaimsListContainerProps {
  search: WarrantyClaimsSearchParams;
  onSearchChange: (updates: Partial<WarrantyClaimsSearchParams>) => void;
  onRowClick: (claimId: string) => void;
}

/** Props for WarrantyClaimsListView */
export interface WarrantyClaimsListViewProps {
  status?: WarrantyClaimStatusValue;
  type?: WarrantyClaimTypeValue;
  claims: WarrantyClaimListItem[];
  pagination: WarrantyClaimPagination;
  isLoading: boolean;
  error: Error | null;
  onStatusChange: (value: WarrantyClaimStatusValue | undefined) => void;
  onTypeChange: (value: WarrantyClaimTypeValue | undefined) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  onRowClick: (claimId: string) => void;
  onRetry: () => void;
}

/** SLA due status for claim timeline display */
export interface SlaDueStatus {
  status: 'on_track' | 'at_risk' | 'breached' | 'completed';
  label: string;
  color: string;
  timeRemaining?: number;
  percentComplete?: number;
}

/** Render props for WarrantyClaimDetailContainer */
export interface WarrantyClaimDetailContainerRenderProps {
  /** Header actions (CTAs) for PageLayout.Header when using layout pattern */
  headerActions?: ReactNode;
  /** Main content */
  content: ReactNode;
}

/** Props for WarrantyClaimDetailContainer */
export interface WarrantyClaimDetailContainerProps {
  claimId: string;
  children?: (props: WarrantyClaimDetailContainerRenderProps) => ReactNode;
}

/** Claim shape for WarrantyClaimDetailView */
export interface WarrantyClaimDetailViewClaim {
  id: string;
  claimNumber: string;
  claimType: string;
  status: WarrantyClaimStatusValue;
  description: string;
  cost: number | null;
  submittedAt: string | Date;
  updatedAt?: string | Date;
  resolvedAt?: string | Date | null;
  approvedAt?: string | Date | null;
  denialReason?: string | null;
  resolutionType?: string | null;
  resolutionNotes?: string | null;
  notes?: string | null;
  cycleCountAtClaim?: number | null;
  customerId: string;
  product?: { id?: string | null; name?: string | null } | null;
  warrantyId: string;
  warranty?: { warrantyNumber?: string | null } | null;
  customer?: { name?: string | null } | null;
  approvedByUser?: { name?: string | null; email?: string | null } | null;
  slaTracking?: {
    responseDueAt?: Date | string | null;
    resolutionDueAt?: Date | string | null;
    respondedAt?: Date | string | null;
    resolvedAt?: Date | string | null;
  } | null;
}

/** EntityHeader action for claim workflow */
export interface WarrantyClaimHeaderAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}

/** Props for WarrantyClaimDetailView */
export interface WarrantyClaimDetailViewProps {
  claim: WarrantyClaimDetailViewClaim;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
  };
  secondaryActions?: WarrantyClaimHeaderAction[];
  responseSla: SlaDueStatus | null;
  resolutionSla: SlaDueStatus | null;
}
