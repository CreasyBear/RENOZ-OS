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
import {
  formatServiceReadError,
  SERVICE_READ_MESSAGES,
} from '@/lib/service/read-error-messages';
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
        title="Service linkage review unavailable"
        message={
          error
            ? formatServiceReadError(error, SERVICE_READ_MESSAGES.linkageReviewDetail)
            : SERVICE_READ_MESSAGES.linkageReviewNotFound
        }
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
