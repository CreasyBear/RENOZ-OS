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
import {
  formatServiceReadError,
  SERVICE_READ_MESSAGES,
} from '@/lib/service/read-error-messages';
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
  const activityHistoryError = activitiesError
    ? new Error(formatServiceReadError(activitiesError, SERVICE_READ_MESSAGES.activityHistory))
    : null;

  if (isLoading) return <SupportDetailSkeleton />;

  if (error || !data) {
    return (
      <ErrorState
        title="Service system unavailable"
        message={
          error
            ? formatServiceReadError(error, SERVICE_READ_MESSAGES.systemDetail)
            : SERVICE_READ_MESSAGES.systemNotFound
        }
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
        activitiesError={activityHistoryError}
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
