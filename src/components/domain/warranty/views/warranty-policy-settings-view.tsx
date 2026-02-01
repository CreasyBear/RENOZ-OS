/**
 * Warranty Policy Settings View
 *
 * Pure UI component that renders the policy list and form dialog.
 */

'use client';

import { WarrantyPolicyList } from './warranty-policy-list';
import { WarrantyPolicyFormDialog } from '../dialogs/warranty-policy-form-dialog';
import type { WarrantyPolicy, WarrantyPolicyTerms } from 'drizzle/schema';
import type { WarrantyPolicyTypeValue } from '@/lib/schemas/warranty/policies';

export interface WarrantyPolicyFormPayload {
  policyId?: string;
  name: string;
  description: string | null;
  type: WarrantyPolicyTypeValue;
  durationMonths: number;
  cycleLimit: number | null;
  terms: WarrantyPolicyTerms;
  isDefault: boolean;
  isActive: boolean;
}

export interface WarrantyPolicySettingsViewProps {
  policies: WarrantyPolicy[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onDeletePolicy?: (policy: WarrantyPolicy) => void;
  onSetDefault?: (policy: WarrantyPolicy) => void;
  onSeedDefaults?: () => void;
  isSeedingDefaults?: boolean;
  pendingDefaultPolicyId?: string | null;
  onCreatePolicy?: () => void;
  onEditPolicy?: (policy: WarrantyPolicy) => void;
  dialogOpen: boolean;
  editingPolicy: WarrantyPolicy | null;
  onDialogOpenChange: (open: boolean) => void;
  onSubmitPolicy: (payload: WarrantyPolicyFormPayload) => Promise<void>;
  isSubmitting?: boolean;
}

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
