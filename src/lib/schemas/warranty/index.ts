/**
 * Warranty Schemas
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json
 */

// --- Core schemas ---
export * from './warranties';
export * from './policies';
export * from './claims';
export * from './extensions';
export * from './certificates';
export * from './analytics';
export * from './bulk-import';

// --- Re-export key types ---
export type {
  WarrantyStatus,
  CreateWarrantyInput,
  UpdateWarrantyInput,
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
} from './claims';
export type {
  WarrantyClaimStatusValue,
  WarrantyClaimTypeValue,
  WarrantyClaimResolutionTypeValue,
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
