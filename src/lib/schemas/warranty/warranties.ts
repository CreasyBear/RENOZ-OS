/**
 * Warranty Validation Schemas
 *
 * Zod schemas for warranty CRUD, retrieval, and notification settings.
 *
 * @see drizzle/schema/warranty/warranties.ts
 * @see src/server/functions/warranty/core/warranties.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json
 */

import type { ReactNode } from 'react';
import { z } from 'zod';
import { warrantyPolicyTypeSchema } from './policies';
import type { WarrantyClaimListItem } from './claims';
import type { WarrantyExtensionItem } from './extensions';
import type { WarrantyClaimTypeValue } from './claims';
import type { WarrantyExtensionTypeValue } from './extensions';
import type { UnifiedActivity } from '../unified-activity';

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

export function isWarrantyStatusValue(v: unknown): v is WarrantyStatus {
  return warrantyStatusSchema.safeParse(v).success;
}

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

// ============================================================================
// EXPIRING WARRANTY ITEM TYPES (for dashboard widgets and reports)
// ============================================================================

/**
 * Urgency level for expiring warranties.
 */
export type WarrantyUrgencyLevel = 'urgent' | 'warning' | 'approaching' | 'healthy';

/**
 * Individual expiring warranty item for dashboard widgets and reports.
 */
export interface ExpiringWarrantyItem {
  id: string;
  warrantyNumber: string;
  customerId: string;
  customerName: string | null;
  productId: string;
  productName: string | null;
  productSerial: string | null;
  policyType: 'battery_performance' | 'inverter_manufacturer' | 'installation_workmanship';
  policyName: string;
  expiryDate: string;
  daysUntilExpiry: number;
  urgencyLevel: WarrantyUrgencyLevel;
  currentCycleCount: number | null;
  cycleLimit: number | null;
}

/**
 * Response type for expiring warranties query (dashboard widget).
 */
export interface GetExpiringWarrantiesResult {
  warranties: ExpiringWarrantyItem[];
  totalCount: number;
}

/**
 * Response type for expiring warranties report (full page with pagination).
 */
export interface ExpiringWarrantiesReportResult {
  warranties: ExpiringWarrantyItem[];
  totalCount: number;
  totalValue: number;
  avgDaysToExpiry: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Individual warranty list item (for list views).
 */
export interface WarrantyListItem {
  id: string;
  warrantyNumber: string;
  customerId: string;
  customerName: string | null;
  productId: string;
  productName: string | null;
  productSku: string | null;
  productSerial: string | null;
  warrantyPolicyId: string;
  policyName: string;
  policyType: 'battery_performance' | 'inverter_manufacturer' | 'installation_workmanship';
  registrationDate: string;
  expiryDate: string;
  status: WarrantyStatus;
  currentCycleCount: number | null;
  cycleLimit: number | null;
  expiryAlertOptOut: boolean;
  certificateUrl: string | null;
}

/**
 * Response type for listing warranties with pagination.
 */
export interface ListWarrantiesResult {
  warranties: WarrantyListItem[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}

/**
 * Warranty detail response type (for detail views).
 * Matches the structure returned by getWarranty server function.
 */
export interface WarrantyDetail {
  id: string;
  warrantyNumber: string;
  organizationId: string;
  customerId: string;
  customerName: string | null;
  productId: string;
  productName: string | null;
  productSerial: string | null;
  warrantyPolicyId: string;
  policyName: string;
  policyType: 'battery_performance' | 'inverter_manufacturer' | 'installation_workmanship';
  registrationDate: string;
  expiryDate: string;
  status: WarrantyStatus;
  currentCycleCount: number | null;
  cycleLimit: number | null;
  assignedUserId: string | null;
  expiryAlertOptOut: boolean;
  lastExpiryAlertSent: string | null;
  certificateUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string | null;
    productSku: string | null;
    productSerial: string | null;
    warrantyStartDate: string;
    warrantyEndDate: string;
    warrantyPeriodMonths: number;
    installationNotes: string | null;
  }>;
}

// ============================================================================
// VIEW / CONTAINER PROPS (SCHEMA-TRACE: types in schemas, not components)
// ============================================================================

/** Render props for WarrantyDetailContainer render prop pattern */
export interface WarrantyDetailContainerRenderProps {
  /** Header actions (CTAs) for PageLayout.Header when using layout pattern */
  headerActions?: ReactNode;
  /** Main content */
  content: ReactNode;
}

/** Props for WarrantyDetailContainer */
export interface WarrantyDetailContainerProps {
  warrantyId: string;
  children?: (props: WarrantyDetailContainerRenderProps) => ReactNode;
}

/** Certificate status for warranty detail view */
export interface WarrantyCertificateStatus {
  exists: boolean;
  certificateUrl: string | null;
}

/** Options for createWarrantyColumns */
export interface CreateWarrantyColumnsOptions {
  onSelect: (id: string, checked: boolean) => void;
  onShiftClickRange: (rowIndex: number) => void;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  onSelectAll: (checked: boolean) => void;
  isSelected: (id: string) => boolean;
  onViewWarranty: (id: string) => void;
  onViewCertificate?: (id: string) => void;
  onVoidWarranty?: (id: string) => void;
  onTransferWarranty?: (id: string) => void;
}

/** Props for WarrantyDetailView */
export interface WarrantyDetailViewProps {
  warranty: WarrantyDetail;
  /** When true, EntityHeader omits actions (used when PageLayout.Header renders them) */
  headerActionsInLayout?: boolean;
  onDelete?: () => void;
  claims: WarrantyClaimListItem[];
  extensions: WarrantyExtensionItem[];
  certificateStatus: WarrantyCertificateStatus | null | undefined;
  isClaimsLoading: boolean;
  isExtensionsLoading: boolean;
  isExtensionsError: boolean;
  isCertificateLoading: boolean;
  isOptOutUpdating: boolean;
  isSubmittingClaim: boolean;
  isSubmittingApproval: boolean;
  isSubmittingExtend: boolean;
  isClaimDialogOpen: boolean;
  isApprovalDialogOpen: boolean;
  isExtendDialogOpen: boolean;
  pendingClaimAction?: {
    claimId: string;
    action: 'review' | 'open' | 'resolve';
  } | null;
  selectedClaimForApproval: WarrantyClaimListItem | null;
  onClaimRowClick: (claimId: string) => void;
  onResolveClaimRow?: (claimId: string) => void;
  onReviewClaim: (claim: WarrantyClaimListItem) => void;
  onClaimDialogOpenChange: (open: boolean) => void;
  onApprovalDialogOpenChange: (open: boolean) => void;
  onExtendDialogOpenChange: (open: boolean) => void;
  onRetryExtensions: () => void;
  onClaimsSuccess: () => void;
  onExtensionsSuccess: () => void;
  onSubmitClaim: (payload: {
    warrantyId: string;
    claimType: WarrantyClaimTypeValue;
    description: string;
    cycleCountAtClaim?: number;
    notes?: string;
  }) => Promise<void>;
  onApproveClaim: (payload: { claimId: string; notes?: string }) => Promise<void>;
  onDenyClaim: (payload: { claimId: string; denialReason: string; notes?: string }) => Promise<void>;
  onRequestInfoClaim: (payload: { claimId: string; notes: string }) => Promise<void>;
  onExtendWarranty: (payload: {
    warrantyId: string;
    extensionType: WarrantyExtensionTypeValue;
    extensionMonths: number;
    price: number | null;
    notes: string | null;
  }) => Promise<void>;
  onToggleOptOut: (checked: boolean) => void;
  certificateError?: string | null;
  onRetryCertificate?: () => void;
  onDownloadCertificate?: () => void;
  onGenerateCertificate?: () => void;
  onRegenerateCertificate?: () => void;
  isCertificateGenerating?: boolean;
  isCertificateRegenerating?: boolean;
  activities?: UnifiedActivity[];
  activitiesLoading?: boolean;
  activitiesError?: Error | null;
  onLogActivity?: () => void;
  onScheduleFollowUp?: () => void;
}
