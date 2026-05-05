'use client';

/**
 * Service linkage reviews list container
 * @source reviews from useServiceLinkageReviews hook
 */
import { ErrorState } from '@/components/shared/error-state';
import { SupportTableSkeleton } from '@/components/skeletons/support';
import { useServiceLinkageReviews } from '@/hooks/service';
import type { ServiceLinkageReviewReason, ServiceLinkageReviewStatus } from '@/lib/schemas/service';
import {
  formatServiceReadError,
  SERVICE_READ_MESSAGES,
} from '@/lib/service/read-error-messages';
import { ServiceLinkageReviewsListView } from '../views/service-linkage-reviews-list-view';

export interface ServiceLinkageReviewsListContainerProps {
  search: {
    status?: ServiceLinkageReviewStatus;
    reasonCode?: ServiceLinkageReviewReason;
  };
  onSearchChange: (
    updates: Partial<{
      status?: ServiceLinkageReviewStatus;
      reasonCode?: ServiceLinkageReviewReason;
    }>
  ) => void;
}

export function ServiceLinkageReviewsListContainer({
  search,
  onSearchChange,
}: ServiceLinkageReviewsListContainerProps) {
  const { data, isLoading, error, refetch } = useServiceLinkageReviews(search);

  if (isLoading) return <SupportTableSkeleton />;

  if (error) {
    return (
      <ErrorState
        title="Service linkage reviews unavailable"
        message={formatServiceReadError(error, SERVICE_READ_MESSAGES.linkageReviewsList)}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <ServiceLinkageReviewsListView
      reviews={data?.reviews ?? []}
      status={search.status ?? 'pending'}
      reasonCode={search.reasonCode}
      onStatusChange={(status) => onSearchChange({ status })}
      onReasonCodeChange={(reasonCode) => onSearchChange({ reasonCode })}
    />
  );
}
