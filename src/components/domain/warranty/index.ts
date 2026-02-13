/**
 * Warranty Domain Components
 *
 * Components for warranty policies, claims, certificates, and list views.
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json
 */

// --- Table infrastructure ---
export {
  WARRANTY_STATUS_CONFIG,
  isWarrantyExpiringSoon,
  isWarrantyExpired,
  formatExpiryDateRelative,
} from './tables/warranty-status-config';
export { createWarrantyColumns } from './tables/warranty-columns';
export type { CreateWarrantyColumnsOptions } from '@/lib/schemas/warranty';

// --- List components ---
export { WarrantyListTable, type WarrantyListItem } from './tables/warranty-list-table';
export { WarrantyListContainer, type WarrantyListContainerProps } from './containers/warranty-list-container';
export { WarrantyStatusChips } from './warranty-status-chips';
export { WarrantyDetailContainer, type WarrantyDetailContainerProps } from './containers/warranty-detail-container';
export { WarrantyDetailView, type WarrantyDetailViewProps } from './views/warranty-detail-view';
export { WarrantyClaimsListContainer } from './containers/warranty-claims-list-container';
export type { WarrantyClaimsListContainerProps } from '@/lib/schemas/warranty';
export {
  WarrantyClaimsListView,
  type WarrantyClaimsListViewProps,
} from './views/warranty-claims-list-view';
export {
  WarrantyClaimDetailContainer,
  type WarrantyClaimDetailContainerProps,
} from './containers/warranty-claim-detail-container';
export { WarrantyClaimDetailView } from './views/warranty-claim-detail-view';
export type { WarrantyClaimDetailViewProps } from '@/lib/schemas/warranty';

// --- Policies ---
export { WarrantyPolicyList } from './views/warranty-policy-list';
export { WarrantyPolicyFormDialog } from './dialogs/warranty-policy-form-dialog';
export {
  WarrantyPolicySettingsContainer,
} from './containers/warranty-policy-settings-container';
export { WarrantyPolicySettingsView } from './views/warranty-policy-settings-view';
export type { WarrantyPolicySettingsViewProps, WarrantyPolicyFormPayload } from '@/lib/schemas/warranty';

// --- Claims ---
export {
  WarrantyClaimFormDialog,
  type WarrantyClaimFormDialogProps,
} from './dialogs/warranty-claim-form-dialog';
export { ClaimApprovalDialog, type ClaimApprovalDialogProps } from './dialogs/claim-approval-dialog';

// --- Certificates ---
export {
  WarrantyCertificateButton,
  WarrantyCertificateLink,
  type WarrantyCertificateButtonProps,
  type WarrantyCertificateLinkProps,
} from './widgets/warranty-certificate-button';
export { WarrantyCertificateTemplate } from './templates/warranty-certificate-template';
export type {
  WarrantyCoverageDetails,
  WarrantyCertificateCustomerAddress,
  WarrantyCertificateProps,
} from '@/lib/schemas/warranty';

// --- Extensions ---
export {
  WarrantyExtensionHistory,
  WarrantyExtensionHistoryCompact,
  type WarrantyExtensionHistoryProps,
  type WarrantyExtensionHistoryCompactProps,
} from './views/warranty-extension-history';
// Re-export schema types for convenience
export type { WarrantyExtensionItem } from '@/lib/schemas/warranty/extensions';
export { ExtendWarrantyDialog, type ExtendWarrantyDialogProps } from './dialogs/extend-warranty-dialog';
export { TransferWarrantyDialog, type TransferWarrantyDialogProps } from './dialogs/transfer-warranty-dialog';

// --- Bulk import ---
export { BulkWarrantyImportDialog } from './dialogs/bulk-warranty-import-dialog';
export {
  WarrantyImportSettingsContainer,
} from './containers/warranty-import-settings-container';
export { WarrantyImportSettingsView } from './views/warranty-import-settings-view';
export type { WarrantyImportSettingsViewProps } from '@/lib/schemas/warranty';

// --- SLA ---
export { SlaCountdownBadge, type SlaCountdownBadgeProps } from './widgets/sla-countdown-badge';

// --- Filter Config (FILTER-STANDARDS compliant) ---
export {
  WARRANTY_FILTER_CONFIG,
  WARRANTY_STATUS_OPTIONS,
  WARRANTY_POLICY_TYPE_OPTIONS,
  DEFAULT_WARRANTY_FILTERS,
  createWarrantyFilterConfig,
  type WarrantyFiltersState,
  type WarrantyStatus,
} from './warranty-filter-config';

