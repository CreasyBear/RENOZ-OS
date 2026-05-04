'use client';

/**
 * Service linkage reviews list container
 * @source reviews from useServiceLinkageReviews hook
 */
import { ErrorState } from '@/components/shared/error-state';
import { SupportTableSkeleton } from '@/components/skeletons/support';
import { useServiceLinkageReviews } from '@/hooks/service';
import type { ServiceLinkageReviewReason, ServiceLinkageReviewStatus } from '@/lib/schemas/service';
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
        title="Failed to load service linkage reviews"
        message={error instanceof Error ? error.message : 'Unknown review error'}
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
