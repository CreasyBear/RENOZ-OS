/**
 * Warranty Policy Settings View
 *
 * Pure UI component that renders the policy list and form dialog.
 */

'use client';

import { WarrantyPolicyList } from './warranty-policy-list';
import { WarrantyPolicyFormDialog } from '../dialogs/warranty-policy-form-dialog';
import type { WarrantyPolicySettingsViewProps } from '@/lib/schemas/warranty';

export function WarrantyPolicySettingsView({
  policies,
  isLoading,
  error,
  onRetry,
  onDeletePolicy,
  onSetDefault,
  onSeedDefaults,
  isSeedingDefaults,
  pendingDefaultPolicyId,
  onCreatePolicy,
  onEditPolicy,
  dialogOpen,
  editingPolicy,
  onDialogOpenChange,
  onSubmitPolicy,
  isSubmitting,
}: WarrantyPolicySettingsViewProps) {
  return (
    <>
      <WarrantyPolicyList
        policies={policies}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        onDeletePolicy={onDeletePolicy}
        onSetDefault={onSetDefault}
        onSeedDefaults={onSeedDefaults}
        isSeedingDefaults={isSeedingDefaults}
        pendingDefaultPolicyId={pendingDefaultPolicyId}
        onCreatePolicy={onCreatePolicy}
        onEditPolicy={onEditPolicy}
        showCreateButton
      />

      <WarrantyPolicyFormDialog
        open={dialogOpen}
        onOpenChange={onDialogOpenChange}
        policy={editingPolicy}
        onSubmit={onSubmitPolicy}
        isSubmitting={isSubmitting}
        onSuccess={() => onDialogOpenChange(false)}
      />
    </>
  );
}
