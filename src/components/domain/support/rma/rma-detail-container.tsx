/**
 * RMA Detail Container
 *
 * Container component that handles data fetching and business logic for the
 * RMA detail view. Follows the Container/Presenter pattern from STANDARDS.md.
 *
 * Routes must NOT call useQuery/useMutation directly (STANDARDS.md §3).
 * This container owns all RMA hooks and passes data to RmaDetailView.
 *
 * @source rma from useRma hook (via useRmaDetail)
 * @source mutations from useApproveRma, useRejectRma, useReceiveRma, useProcessRma, useCancelRma
 *
 * @see STANDARDS.md - Component Architecture
 * @see SCHEMA-TRACE.md - Data flow: Route → Container → View
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { useRmaDetail } from '@/hooks/support';
import { RmaDetailView } from './rma-detail-view';

interface RmaDetailContainerProps {
  rmaId: string;
}

export function RmaDetailContainer({ rmaId }: RmaDetailContainerProps) {
  const {
    rma,
    isLoading,
    error,
    onRetry,
    isPending,
    onApprove,
    onReject,
    onReceive,
    onProcess,
    onCancel,
    isCancelPending,
  } = useRmaDetail(rmaId);

  return (
    <RmaDetailView
      rma={rma}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      onSuccess={onRetry}
      isPending={isPending}
      onApprove={onApprove}
      onReject={onReject}
      onReceive={onReceive}
      onProcess={onProcess}
      onCancel={onCancel}
      isCancelPending={isCancelPending}
    />
  );
}
