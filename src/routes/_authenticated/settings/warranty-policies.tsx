/**
 * Warranty Policies Settings Route
 *
 * Management page for warranty policies. Allows creating, editing,
 * and configuring default policies for batteries, inverters, and installations.
 *
 * @see src/components/domain/warranty/warranty-policy-list.tsx
 * @see src/components/domain/warranty/warranty-policy-form-dialog.tsx
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json - DOM-WAR-001c
 */

import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { RouteErrorFallback } from '@/components/layout';
import { SettingsPageSkeleton } from '@/components/skeletons/settings';
import { PageLayout } from '@/components/layout/page-layout';
import { WarrantyPolicyList } from '@/components/domain/warranty/warranty-policy-list';
import { WarrantyPolicyFormDialog } from '@/components/domain/warranty/warranty-policy-form-dialog';
import {
  useWarrantyPolicies,
  useDeleteWarrantyPolicy,
  useSetDefaultWarrantyPolicy,
  useSeedDefaultWarrantyPolicies,
  useCreateWarrantyPolicy,
  useUpdateWarrantyPolicy,
} from '@/hooks';
import { useConfirmation } from '@/hooks/use-confirmation';
import type { WarrantyPolicy, WarrantyPolicyTerms } from '../../../../drizzle/schema';
import type { WarrantyPolicyTypeValue } from '@/lib/schemas/warranty/policies';

export const Route = createFileRoute('/_authenticated/settings/warranty-policies')({
  component: WarrantyPoliciesSettingsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/settings" />
  ),
  pendingComponent: () => <SettingsPageSkeleton />,
});

function WarrantyPoliciesSettingsPage() {
  const confirm = useConfirmation();

  // Dialog state
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

  // Handle create new policy
  const handleCreatePolicy = () => {
    setEditingPolicy(null);
    setDialogOpen(true);
  };

  // Handle edit policy
  const handleEditPolicy = (policy: WarrantyPolicy) => {
    setEditingPolicy(policy);
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
      } catch (_err) {
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
      } catch (_err) {
        // Error toast handled by mutation
      } finally {
        setPendingDefaultPolicyId(null);
      }
    }
  };

  const handleSeedDefaults = async () => {
    try {
      await seedDefaultsMutation.mutateAsync({});
    } catch (_err) {
      // Error toast handled by mutation
    }
  };

  const handleSubmitPolicy = async (payload: {
    policyId?: string;
    name: string;
    description: string | null;
    type: WarrantyPolicyTypeValue;
    durationMonths: number;
    cycleLimit: number | null;
    terms: WarrantyPolicyTerms;
    isDefault: boolean;
    isActive: boolean;
  }) => {
    if (payload.policyId) {
      const { policyId, ...dataToSave } = payload;
      await updateMutation.mutateAsync({
        policyId,
        ...dataToSave,
      });
      return;
    }
    const { policyId: _policyId, ...dataToSave } = payload;
    await createMutation.mutateAsync(dataToSave);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingPolicy(null);
  };

  return (
    <PageLayout>
      <PageLayout.Header
        title="Warranty Policies"
        description="Define and manage warranty coverage for batteries, inverters, and installations"
      />

      <PageLayout.Content>
        <WarrantyPolicyList
          policies={policies}
          isLoading={isLoading}
          error={error instanceof Error ? error : error ? new Error('Failed to load') : null}
          onRetry={refetch}
          onDeletePolicy={handleDeletePolicy}
          onSetDefault={handleSetDefaultPolicy}
          onSeedDefaults={handleSeedDefaults}
          isSeedingDefaults={seedDefaultsMutation.isPending}
          pendingDefaultPolicyId={pendingDefaultPolicyId}
          onCreatePolicy={handleCreatePolicy}
          onEditPolicy={handleEditPolicy}
          showCreateButton
        />

        <WarrantyPolicyFormDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          policy={editingPolicy}
          onSubmit={handleSubmitPolicy}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          onSuccess={handleDialogClose}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
