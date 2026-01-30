/**
 * Warranty Hooks
 *
 * Hooks for warranty management, policies, claims, analytics, and certificates.
 */

// --- Core warranty hooks ---
export { useWarranties, useWarranty, useUpdateWarrantyOptOut } from './use-warranties';
export {
  useExpiringWarranties,
  useExpiringWarrantiesReport,
  useExpiringWarrantiesFilterOptions,
} from './use-expiring-warranties';

// --- Claims hooks ---
export {
  useWarrantyClaims,
  useWarrantyClaimsByWarranty,
  useWarrantyClaimsByCustomer,
  useWarrantyClaim,
  useCreateWarrantyClaim,
  useUpdateClaimStatus,
  useApproveClaim,
  useDenyClaim,
  useResolveClaim,
  useAssignClaim,
  getSlaDueStatus,
  claimStatusConfig,
  claimTypeConfig,
  resolutionTypeConfig,
  formatClaimDate,
  formatClaimDateTime,
  formatClaimCost,
} from './use-warranty-claims';

// --- Certificate hooks ---
export {
  useWarrantyCertificate,
  useGenerateWarrantyCertificate,
  useRegenerateWarrantyCertificate,
} from './use-warranty-certificates';

// --- Extensions hooks ---
export {
  useWarrantyExtensions,
  useExtensionHistory,
  useExtensionById,
  useExtendWarranty,
} from './use-warranty-extensions';

// --- Policies hooks ---
export {
  useWarrantyPolicies,
  useWarrantyPoliciesWithSla,
  useWarrantyPolicy,
  useDefaultWarrantyPolicy,
  useResolveWarrantyPolicy,
  useCreateWarrantyPolicy,
  useUpdateWarrantyPolicy,
  useDeleteWarrantyPolicy,
  useSetDefaultWarrantyPolicy,
  useSeedDefaultWarrantyPolicies,
  useAssignWarrantyPolicyToProduct,
  useAssignDefaultWarrantyPolicyToCategory,
} from './use-warranty-policies';

// --- Analytics hooks ---
export {
  useWarrantyAnalyticsSummary,
  useClaimsByProduct,
  useClaimsTrend,
  useClaimsByType,
  useSlaComplianceMetrics,
  useCycleCountAtClaim,
  useExtensionVsResolution,
  useWarrantyAnalyticsFilterOptions,
  useExportWarrantyAnalytics,
  useWarrantyAnalyticsDashboard,
} from './use-warranty-analytics';

// --- Bulk import hooks ---
export { usePreviewWarrantyImport, useBulkRegisterWarranties } from './use-warranty-bulk-import';

// --- Re-export key types ---
export type { WarrantyFilters, WarrantyStatus } from '@/lib/schemas/warranty/warranties';
export type {
  WarrantyClaimStatusValue,
  WarrantyClaimTypeValue,
  WarrantyClaimResolutionTypeValue,
} from '@/lib/schemas/warranty/claims';
export type { WarrantyPolicyTypeValue } from '@/lib/schemas/warranty/policies';
export type { WarrantyAnalyticsFilter } from '@/lib/schemas/warranty/analytics';
