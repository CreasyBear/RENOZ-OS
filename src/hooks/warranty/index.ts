/**
 * Warranty Hooks
 *
 * Hooks for warranty management, entitlements, policies, claims, analytics,
 * certificates, and extensions.
 */

// --- Core warranty hooks ---
export {
  useWarranties,
  useWarranty,
  useWarrantyStatusCounts,
  useUpdateWarrantyOptOut,
  useDeleteWarranty,
  useVoidWarranty,
  useTransferWarranty,
} from './core/use-warranties';

// --- Entitlement hooks ---
export {
  useWarrantyEntitlements,
  useWarrantyEntitlement,
  useActivateWarrantyFromEntitlement,
} from './entitlements/use-warranty-entitlements';
export {
  useExpiringWarranties,
  useExpiringWarrantiesReport,
  useExpiringWarrantiesFilterOptions,
} from './core/use-expiring-warranties';

// --- Claims hooks ---
export {
  useWarrantyClaims,
  useWarrantyClaimsByWarranty,
  useWarrantyClaimSummary,
  useWarrantyClaimsByCustomer,
  useWarrantyClaim,
  useCreateWarrantyClaim,
  useUpdateClaimStatus,
  useApproveClaim,
  useDenyClaim,
  useResolveClaim,
  useAssignClaim,
  useCancelWarrantyClaim,
  claimStatusConfig,
  claimTypeConfig,
  resolutionTypeConfig,
  formatClaimDate,
  formatClaimDateTime,
  formatClaimCost,
} from './claims/use-warranty-claims';

// --- Certificate hooks ---
export {
  useWarrantyCertificate,
  useGenerateWarrantyCertificate,
  useRegenerateWarrantyCertificate,
} from './certificates/use-warranty-certificates';

// --- Extensions hooks ---
export {
  useWarrantyExtensions,
  useExtensionHistory,
  useExtensionById,
  useExtendWarranty,
} from './extensions/use-warranty-extensions';

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
} from './policies/use-warranty-policies';

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
} from './analytics/use-warranty-analytics';

// --- Bulk import hooks ---
export {
  usePreviewWarrantyImport,
  useBulkRegisterWarranties,
} from './bulk-import/use-warranty-bulk-import';

// --- Detail view header actions ---
export { useWarrantyHeaderActions } from './use-warranty-header-actions';
export type {
  WarrantyHeaderActionsInput,
  WarrantyHeaderActionsResult,
} from './use-warranty-header-actions';

// --- Re-export key types ---
export type { WarrantyFilters, WarrantyStatus } from '@/lib/schemas/warranty/warranties';
export type {
  WarrantyEntitlementFilters,
  WarrantyEntitlementStatus,
  WarrantyEntitlementListItem,
  WarrantyEntitlementDetail,
  ActivateWarrantyFromEntitlementInput,
} from '@/lib/schemas/warranty/entitlements';
export type {
  WarrantyClaimantModeValue,
  WarrantyClaimantRoleValue,
  WarrantyClaimStatusValue,
  WarrantyClaimTypeValue,
  WarrantyClaimResolutionTypeValue,
} from '@/lib/schemas/warranty/claims';
export type { WarrantyPolicyTypeValue } from '@/lib/schemas/warranty/policies';
export type { WarrantyAnalyticsFilter } from '@/lib/schemas/warranty/analytics';
