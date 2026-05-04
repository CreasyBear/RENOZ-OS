'use client';

/**
 * Service linkage review detail container
 * @source review from useServiceLinkageReview hook
 */
import { useState } from 'react';
import { ErrorState } from '@/components/shared/error-state';
import { SupportDetailSkeleton } from '@/components/skeletons/support';
import {
  useResolveServiceLinkageReview,
  useServiceLinkageReview,
} from '@/hooks/service';
import { ResolveServiceLinkageReviewDialog } from '../dialogs/resolve-service-linkage-review-dialog';
import { ServiceLinkageReviewDetailView } from '../views/service-linkage-review-detail-view';

export interface ServiceLinkageReviewDetailContainerProps {
  reviewId: string;
}

export function ServiceLinkageReviewDetailContainer({
  reviewId,
}: ServiceLinkageReviewDetailContainerProps) {
  const { data, isLoading, error, refetch } = useServiceLinkageReview(reviewId);
  const resolveMutation = useResolveServiceLinkageReview();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  if (isLoading) return <SupportDetailSkeleton />;

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to load service linkage review"
        message={error instanceof Error ? error.message : 'Service linkage review not found'}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <>
      <ServiceLinkageReviewDetailView
        review={data}
        onLinkExisting={(serviceSystemId) =>
          resolveMutation.mutate({
            reviewId: data.id,
            resolutionType: 'link_existing',
            serviceSystemId,
          })
        }
        onCreateNew={() => setCreateDialogOpen(true)}
        isSubmitting={resolveMutation.isPending}
      />
      <ResolveServiceLinkageReviewDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        review={{
          id: data.id,
          ownerName: data.snapshot.ownerName,
          ownerEmail: data.snapshot.ownerEmail,
          ownerPhone: data.snapshot.ownerPhone,
          siteAddress: data.snapshot.siteAddress ?? null,
        }}
        onSubmit={(payload) => resolveMutation.mutateAsync(payload)}
        isSubmitting={resolveMutation.isPending}
      />
    </>
  );
}
