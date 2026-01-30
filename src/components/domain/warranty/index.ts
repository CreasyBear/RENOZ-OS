/**
 * Warranty Domain Components
 *
 * Components for warranty policies, claims, certificates, and list views.
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json
 */

// --- List components ---
export { WarrantyListTable, type WarrantyListItem } from './warranty-list-table';
export { WarrantyListContainer, type WarrantyListContainerProps } from './warranty-list-container';
export { WarrantyListFilters, type WarrantyListFiltersProps } from './warranty-list-filters';
export { WarrantyDetailContainer, type WarrantyDetailContainerProps } from './warranty-detail-container';
export { WarrantyDetailView, type WarrantyDetailViewProps } from './warranty-detail-view';
export {
  WarrantyClaimsListContainer,
  type WarrantyClaimsListContainerProps,
} from './warranty-claims-list-container';
export {
  WarrantyClaimsListView,
  type WarrantyClaimsListViewProps,
} from './warranty-claims-list-view';
export {
  WarrantyClaimDetailContainer,
  type WarrantyClaimDetailContainerProps,
} from './warranty-claim-detail-container';
export {
  WarrantyClaimDetailView,
  type WarrantyClaimDetailViewProps,
} from './warranty-claim-detail-view';

// --- Policies ---
export { WarrantyPolicyList } from './warranty-policy-list';
export { WarrantyPolicyFormDialog } from './warranty-policy-form-dialog';
export {
  WarrantyPolicySettingsContainer,
} from './warranty-policy-settings-container';
export {
  WarrantyPolicySettingsView,
  type WarrantyPolicySettingsViewProps,
  type WarrantyPolicyFormPayload,
} from './warranty-policy-settings-view';

// --- Claims ---
export { WarrantyClaimFormDialog, type WarrantyClaimFormDialogProps } from './warranty-claim-form-dialog';
export { ClaimApprovalDialog, type ClaimApprovalDialogProps } from './claim-approval-dialog';

// --- Certificates ---
export {
  WarrantyCertificateButton,
  WarrantyCertificateLink,
  type WarrantyCertificateButtonProps,
  type WarrantyCertificateLinkProps,
} from './warranty-certificate-button';
export {
  WarrantyCertificateTemplate,
  type WarrantyPolicyType,
  type WarrantyCoverageDetails,
  type CustomerAddress,
  type WarrantyCertificateProps,
} from './warranty-certificate-template';

// --- Extensions ---
export {
  WarrantyExtensionHistory,
  WarrantyExtensionHistoryCompact,
  type WarrantyExtensionHistoryProps,
  type WarrantyExtensionHistoryCompactProps,
  type WarrantyExtensionItem,
} from './warranty-extension-history';
export { ExtendWarrantyDialog, type ExtendWarrantyDialogProps } from './extend-warranty-dialog';

// --- Bulk import ---
export { BulkWarrantyImportDialog } from './bulk-warranty-import-dialog';
export {
  WarrantyImportSettingsContainer,
} from './warranty-import-settings-container';
export {
  WarrantyImportSettingsView,
  type WarrantyImportSettingsViewProps,
} from './warranty-import-settings-view';

// --- SLA ---
export { SlaCountdownBadge, type SlaCountdownBadgeProps } from './sla-countdown-badge';
