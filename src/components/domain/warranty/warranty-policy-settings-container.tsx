/**
 * Warranty Policy Settings Container
 *
 * Handles data fetching and mutations for warranty policy settings.
 *
 * @source policies from useWarrantyPolicies hook
 * @source mutations from warranty policy hooks
 */

'use client';

import { useState } from 'react';
import { useConfirmation } from '@/hooks';
import {
  useWarrantyPolicies,
  useDeleteWarrantyPolicy,
  useSetDefaultWarrantyPolicy,
  useSeedDefaultWarrantyPolicies,
  useCreateWarrantyPolicy,
  useUpdateWarrantyPolicy,
} from '@/hooks/warranty';
import { WarrantyPolicySettingsView } from './warranty-policy-settings-view';
import type { WarrantyPolicy } from '../../../../drizzle/schema';
import type { WarrantyPolicySettingsViewProps } from './warranty-policy-settings-view';

type WarrantyPolicyFormPayload = WarrantyPolicySettingsViewProps['onSubmitPolicy'] extends (
  payload: infer P
) => Promise<void>
  ? P
  : never;

export function WarrantyPolicySettingsContainer() {
  const confirm = useConfirmation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<WarrantyPolicy | null>(null);
  const [pendingDefaultPolicyId, setPendingDefaultPolicyId] = useState<string | null>(null);

  const { data: policies = [], isLoading, error, refetch } = useWarrantyPolicies({
    isActive: true,
  });
  const deleteMutation = useDeleteWarrantyPolicy();
  const setDefaultMutation = useSetDefaultWarrantyPolicy();
  const seedDefaultsMutation = useSeedDefaultWarrantyPolicies();
  const createMutation = useCreateWarrantyPolicy();
  const updateMutation = useUpdateWarrantyPolicy();

  const handleCreatePolicy = () => {
    setEditingPolicy(null);
    setDialogOpen(true);
  };

  const handleEditPolicy = (policy: WarrantyPolicy) => {
    setEditingPolicy(policy);
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setDialogOpen(false);
      setEditingPolicy(null);
      return;
    }
    setDialogOpen(true);
  };

  const handleDeletePolicy = async (policy: WarrantyPolicy) => {
    const confirmed = await confirm.confirm({
      title: 'Delete Warranty Policy',
      description:
        'Are you sure you want to delete this warranty policy? This action cannot be undone.',
      confirmLabel: 'Delete Policy',
      variant: 'destructive',
    });

    if (confirmed.confirmed) {
      try {
        await deleteMutation.mutateAsync(policy.id);
      } catch {
        // Error toast handled by mutation
      }
    }
  };

  const handleSetDefaultPolicy = async (policy: WarrantyPolicy) => {
    const confirmed = await confirm.confirm({
      title: 'Set Default Policy',
      description: `Are you sure you want to set "${policy.name}" as the default warranty policy? This will be used for new products without a specific policy.`,
      confirmLabel: 'Set as Default',
    });

    if (confirmed.confirmed) {
      setPendingDefaultPolicyId(policy.id);
      try {
        await setDefaultMutation.mutateAsync(policy.id);
      } catch {
        // Error toast handled by mutation
      } finally {
        setPendingDefaultPolicyId(null);
      }
    }
  };

  const handleSeedDefaults = async () => {
    try {
      await seedDefaultsMutation.mutateAsync({});
    } catch {
      // Error toast handled by mutation
    }
  };

  const handleSubmitPolicy = async (payload: WarrantyPolicyFormPayload) => {
    if (payload.policyId) {
      const { policyId, ...dataToSave } = payload;
      await updateMutation.mutateAsync({
        policyId,
        ...dataToSave,
      });
      return;
    }
    const dataToSave = { ...payload };
    delete (dataToSave as { policyId?: string }).policyId;
    await createMutation.mutateAsync(dataToSave);
  };

  const errorState =
    error instanceof Error ? error : error ? new Error('Failed to load') : null;

  return (
    <WarrantyPolicySettingsView
      policies={policies}
      isLoading={isLoading}
      error={errorState}
      onRetry={refetch}
      onDeletePolicy={handleDeletePolicy}
      onSetDefault={handleSetDefaultPolicy}
      onSeedDefaults={handleSeedDefaults}
      isSeedingDefaults={seedDefaultsMutation.isPending}
      pendingDefaultPolicyId={pendingDefaultPolicyId}
      onCreatePolicy={handleCreatePolicy}
      onEditPolicy={handleEditPolicy}
      dialogOpen={dialogOpen}
      editingPolicy={editingPolicy}
      onDialogOpenChange={handleDialogOpenChange}
      onSubmitPolicy={handleSubmitPolicy}
      isSubmitting={createMutation.isPending || updateMutation.isPending}
    />
  );
}
