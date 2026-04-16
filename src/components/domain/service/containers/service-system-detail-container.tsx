'use client';

/**
 * Service system detail container
 * @source serviceSystem from useServiceSystem hook
 */
import { useState } from 'react';
import { ErrorState } from '@/components/shared/error-state';
import { SupportDetailSkeleton } from '@/components/skeletons/support';
import { useServiceSystem, useTransferServiceSystemOwnership } from '@/hooks/service';
import { useUnifiedActivities } from '@/hooks/activities';
import { ServiceSystemDetailView } from '../views/service-system-detail-view';
import { TransferServiceSystemDialog } from '../dialogs/transfer-service-system-dialog';

export interface ServiceSystemDetailContainerProps {
  serviceSystemId: string;
}

export function ServiceSystemDetailContainer({
  serviceSystemId,
}: ServiceSystemDetailContainerProps) {
  const { data, isLoading, error, refetch } = useServiceSystem(serviceSystemId);
  const transferMutation = useTransferServiceSystemOwnership();
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    activities,
    isLoading: activitiesLoading,
    error: activitiesError,
  } = useUnifiedActivities({
    entityType: 'service_system',
    entityId: serviceSystemId,
    enabled: !!serviceSystemId,
  });

  if (isLoading) return <SupportDetailSkeleton />;

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to load service system"
        message={error instanceof Error ? error.message : 'Service system not found'}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <>
      <ServiceSystemDetailView
        serviceSystem={data}
        activities={activities ?? []}
        activitiesLoading={activitiesLoading}
        activitiesError={activitiesError}
        onTransferOwnership={() => setDialogOpen(true)}
        isTransferring={transferMutation.isPending}
      />
      <TransferServiceSystemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        serviceSystem={{
          id: data.id,
          displayName: data.displayName,
          currentOwnerName: data.currentOwner?.fullName,
        }}
        onSubmit={(payload) => transferMutation.mutateAsync(payload)}
        isSubmitting={transferMutation.isPending}
      />
    </>
  );
}
