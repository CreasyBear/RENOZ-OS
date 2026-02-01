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
export {
  createWarrantyColumns,
  type WarrantyTableItem,
  type CreateWarrantyColumnsOptions,
} from './tables/warranty-columns';

// --- List components ---
export { WarrantyListTable, type WarrantyListItem } from './tables/warranty-list-table';
export { WarrantyListContainer, type WarrantyListContainerProps } from './containers/warranty-list-container';
export { WarrantyDetailContainer, type WarrantyDetailContainerProps } from './containers/warranty-detail-container';
export { WarrantyDetailView, type WarrantyDetailViewProps } from './views/warranty-detail-view';
export {
  WarrantyClaimsListContainer,
  type WarrantyClaimsListContainerProps,
} from './containers/warranty-claims-list-container';
export {
  WarrantyClaimsListView,
  type WarrantyClaimsListViewProps,
} from './views/warranty-claims-list-view';
export {
  WarrantyClaimDetailContainer,
  type WarrantyClaimDetailContainerProps,
} from './containers/warranty-claim-detail-container';
export {
  WarrantyClaimDetailView,
  type WarrantyClaimDetailViewProps,
} from './views/warranty-claim-detail-view';

// --- Policies ---
export { WarrantyPolicyList } from './views/warranty-policy-list';
export { WarrantyPolicyFormDialog } from './dialogs/warranty-policy-form-dialog';
export {
  WarrantyPolicySettingsContainer,
} from './containers/warranty-policy-settings-container';
export {
  WarrantyPolicySettingsView,
  type WarrantyPolicySettingsViewProps,
  type WarrantyPolicyFormPayload,
} from './views/warranty-policy-settings-view';

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
export {
  WarrantyCertificateTemplate,
  type WarrantyPolicyType,
  type WarrantyCoverageDetails,
  type CustomerAddress,
  type WarrantyCertificateProps,
} from './templates/warranty-certificate-template';

// --- Extensions ---
export {
  WarrantyExtensionHistory,
  WarrantyExtensionHistoryCompact,
  type WarrantyExtensionHistoryProps,
  type WarrantyExtensionHistoryCompactProps,
  type WarrantyExtensionItem,
} from './views/warranty-extension-history';
export { ExtendWarrantyDialog, type ExtendWarrantyDialogProps } from './dialogs/extend-warranty-dialog';

// --- Bulk import ---
export { BulkWarrantyImportDialog } from './dialogs/bulk-warranty-import-dialog';
export {
  WarrantyImportSettingsContainer,
} from './containers/warranty-import-settings-container';
export {
  WarrantyImportSettingsView,
  type WarrantyImportSettingsViewProps,
} from './views/warranty-import-settings-view';

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
  type WarrantyPolicyType as WarrantyPolicyTypeFilter,
} from './warranty-filter-config';
