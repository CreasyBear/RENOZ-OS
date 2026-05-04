/**
 * Warranty Schemas
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json
 */

// --- Core schemas ---
export * from './warranties';
export * from './entitlements';
export * from './owner-records';
export * from './policies';
export * from './claims';
export * from './extensions';
export * from './certificates';
export * from './analytics';
export * from './bulk-import';

// --- Re-export key types ---
export type {
  WarrantyEntitlementEvidenceType,
  WarrantyEntitlementStatus,
  WarrantyEntitlementProvisioningIssueCode,
  WarrantyEntitlementFilters,
  GetWarrantyEntitlementInput,
  ActivateWarrantyFromEntitlementInput,
  WarrantyEntitlementListItem,
  ListWarrantyEntitlementsResult,
  WarrantyEntitlementDetail,
} from './entitlements';
export type {
  WarrantyOwnerAddress,
  WarrantyOwnerRecord,
  WarrantyOwnerRecordInput,
  GetWarrantyOwnerRecordInput,
} from './owner-records';
export type {
  WarrantyStatus,
  CreateWarrantyInput,
  UpdateWarrantyInput,
  TransferWarrantyInput,
  WarrantyFilters,
  WarrantyResponse,
  WarrantyListResponse,
  GetExpiringWarrantiesInput,
  GetExpiringWarrantiesReportInput,
  GetWarrantyInput,
  UpdateWarrantyOptOutInput,
  UpdateCustomerWarrantyOptOutInput,
  // Expiring warranty types (for widgets and reports)
  WarrantyUrgencyLevel,
  ExpiringWarrantyItem,
  GetExpiringWarrantiesResult,
  ExpiringWarrantiesReportResult,
  WarrantyListItem,
  ListWarrantiesResult,
  WarrantyDetail,
  WarrantyServiceLinkageStatus,
  WarrantyPendingServiceReview,
  WarrantySystemHistoryPreviewItem,
  WarrantyDetailContainerRenderProps,
  WarrantyDetailContainerProps,
  WarrantyCertificateStatus,
  CreateWarrantyColumnsOptions,
  WarrantyDetailViewProps,
} from './warranties';
export type {
  WarrantyPolicyTypeValue,
  CreateWarrantyPolicyInput,
  UpdateWarrantyPolicyInput,
  GetWarrantyPoliciesInput,
  GetWarrantyPolicyByIdInput,
  ResolveWarrantyPolicyInput,
  AssignWarrantyPolicyToProductInput,
  AssignDefaultWarrantyPolicyToCategoryInput,
  SeedDefaultPoliciesInput,
  // Client-safe entity types
  WarrantyPolicy,
  WarrantyPolicyTerms,
  WarrantyPolicyFormPayload,
  WarrantyPolicySettingsViewProps,
} from './policies';
export {
  isWarrantyClaimStatusValue,
  isWarrantyClaimTypeValue,
  isWarrantyClaimResolutionTypeValue,
  isWarrantyClaimantRoleValue,
  warrantyClaimQuickFilterSchema,
  warrantyClaimQuickFilterValues,
} from './claims';
export type {
  WarrantyClaimStatusValue,
  WarrantyClaimTypeValue,
  WarrantyClaimResolutionTypeValue,
  WarrantyClaimantRoleValue,
  WarrantyClaimQuickFilterValue,
  WarrantyClaimantSnapshot,
  CreateWarrantyClaimInput,
  UpdateClaimStatusInput,
  ApproveClaimInput,
  DenyClaimInput,
  ResolveClaimInput,
  ListWarrantyClaimsInput,
  GetWarrantyClaimInput,
  AssignClaimInput,
  WarrantyClaimListItem,
  ListWarrantyClaimsResult,
  WarrantyClaimSummary,
  WarrantyClaimPagination,
  WarrantyClaimsSearchParams,
  WarrantyClaimsListContainerProps,
  WarrantyClaimsListViewProps,
  WarrantyClaimDetailContainerRenderProps,
  WarrantyClaimDetailContainerProps,
  WarrantyClaimDetailViewProps,
  WarrantyClaimDetailViewClaim,
  SlaDueStatus,
} from './claims';
export type {
  WarrantyExtensionTypeValue,
  ExtendWarrantyInput,
  ListWarrantyExtensionsInput,
  GetExtensionHistoryInput,
  GetExtensionByIdInput,
  WarrantyExtensionItem,
  ListWarrantyExtensionsResult,
  WarrantyExtensionHistoryProps,
  WarrantyExtensionHistoryCompactProps,
} from './extensions';
export type {
  GenerateWarrantyCertificateInput,
  GetWarrantyCertificateInput,
  RegenerateWarrantyCertificateInput,
  WarrantyCoverageDetails,
  WarrantyCertificateCustomerAddress,
  WarrantyCertificateProps,
} from './certificates';
export type {
  WarrantyAnalyticsFilter,
  GetWarrantyAnalyticsSummaryInput,
  GetClaimsByProductInput,
  GetClaimsTrendInput,
  GetClaimsByTypeInput,
  GetSlaComplianceMetricsInput,
  GetCycleCountAtClaimInput,
  GetExtensionVsResolutionInput,
  ExportWarrantyAnalyticsInput,
} from './analytics';
export type {
  CsvWarrantyRow,
  ColumnMapping,
  PreviewBulkWarrantyImportInput,
  ValidatedWarrantyRow,
  BulkRegisterWarrantiesInput,
  WarrantyImportSettingsViewProps,
} from './bulk-import';
