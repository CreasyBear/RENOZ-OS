/**
 * Warranty Server Functions
 *
 * Barrel export for all warranty domain server functions.
 */

// Warranties (core)
export {
  getExpiringWarranties,
  listWarranties,
  getExpiringWarrantiesReport,
  getExpiringWarrantiesFilterOptions,
  getWarranty,
  updateWarrantyOptOut,
  updateCustomerWarrantyOptOut,
} from './core/warranties';

// Warranty Policies
export {
  createWarrantyPolicy,
  updateWarrantyPolicy,
  listWarrantyPolicies,
  getWarrantyPolicy,
  deleteWarrantyPolicy,
  getDefaultWarrantyPolicy,
  setDefaultWarrantyPolicy,
  resolveWarrantyPolicy,
  assignWarrantyPolicyToProduct,
  assignDefaultWarrantyPolicyToCategory,
  seedDefaultWarrantyPolicies,
  getWarrantyPoliciesWithSla,
  triggerWarrantyRegistrationNotification,
} from './policies/warranty-policies';

// Warranty Claims
export {
  createWarrantyClaim,
  updateClaimStatus,
  approveClaim,
  denyClaim,
  resolveClaim,
  listWarrantyClaims,
  getWarrantyClaim,
  assignClaim,
} from './claims/warranty-claims';

// Warranty Extensions
export {
  extendWarranty,
  listWarrantyExtensions,
  getExtensionHistory,
  getExtensionById,
} from './extensions/warranty-extensions';

// Warranty Certificates
export {
  generateWarrantyCertificate,
  getWarrantyCertificate,
  regenerateWarrantyCertificate,
} from './certificates/warranty-certificates';

// Warranty Analytics
export {
  getWarrantyAnalyticsSummary,
  getClaimsByProduct,
  getClaimsTrend,
  getClaimsByType,
  getSlaComplianceMetrics,
  getCycleCountAtClaim,
  getExtensionVsResolution,
  exportWarrantyAnalytics,
  getWarrantyAnalyticsFilterOptions,
} from './analytics/warranty-analytics';

// Bulk Import
export {
  csvWarrantyRowSchema,
  previewBulkWarrantyImportSchema,
  bulkRegisterWarrantiesSchema,
  previewBulkWarrantyImport,
  bulkRegisterWarrantiesFromCsv,
} from './bulk-import/warranty-bulk-import';
