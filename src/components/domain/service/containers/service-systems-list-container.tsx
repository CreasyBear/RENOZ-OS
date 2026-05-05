'use client';

/**
 * Service systems list container
 * @source service systems from useServiceSystems hook
 */
import { ErrorState } from '@/components/shared/error-state';
import { SupportTableSkeleton } from '@/components/skeletons/support';
import { useServiceSystems } from '@/hooks/service';
import type { ListServiceSystemsInput } from '@/lib/schemas/service';
import {
  formatServiceReadError,
  SERVICE_READ_MESSAGES,
} from '@/lib/service/read-error-messages';
import { ServiceSystemsListView } from '../views/service-systems-list-view';

export interface ServiceSystemsListContainerProps {
  search: ListServiceSystemsInput;
  onSearchChange: (updates: Partial<ListServiceSystemsInput>) => void;
}

export function ServiceSystemsListContainer({
  search,
  onSearchChange,
}: ServiceSystemsListContainerProps) {
  const { data, isLoading, error, refetch } = useServiceSystems(search);

  if (isLoading) return <SupportTableSkeleton />;

  if (error) {
    return (
      <ErrorState
        title="Service systems unavailable"
        message={formatServiceReadError(error, SERVICE_READ_MESSAGES.systemsList)}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <ServiceSystemsListView
      systems={data?.items ?? []}
      search={search.search ?? ''}
      ownershipStatus={search.ownershipStatus}
      onSearchChange={(value) => onSearchChange({ search: value || undefined })}
      onOwnershipStatusChange={(ownershipStatus) => onSearchChange({ ownershipStatus })}
    />
  );
}
