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
} from './policies';
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
} from './claims';
export type {
  WarrantyExtensionTypeValue,
  ExtendWarrantyInput,
  ListWarrantyExtensionsInput,
  GetExtensionHistoryInput,
  GetExtensionByIdInput,
} from './extensions';
export type {
  GenerateWarrantyCertificateInput,
  GetWarrantyCertificateInput,
  RegenerateWarrantyCertificateInput,
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
} from './bulk-import';
