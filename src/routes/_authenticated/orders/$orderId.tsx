/**
 * Order Detail Route
 *
 * Individual order view with tabs for overview, items, fulfillment, and activity.
 * Uses Container/Presenter pattern via OrderDetailContainer.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see STANDARDS.md - Container/Presenter pattern
 */
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { lazy, Suspense } from 'react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { OrderDetailSkeleton } from '@/components/skeletons/orders';

const OrderDetailPage = lazy(() => import('./-order-detail-page'));

const orderDetailSearchSchema = z.object({
  fromIssueId: z.string().uuid().optional(),
  edit: z.boolean().optional(),
});

export const Route = createFileRoute('/_authenticated/orders/$orderId')({
  validateSearch: orderDetailSearchSchema,
  component: function OrderDetailRouteComponent() {
    const { orderId } = Route.useParams();
    const search = Route.useSearch();
    return (
      <Suspense fallback={
        <PageLayout variant="full-width">
          <PageLayout.Header title={null} />
          <PageLayout.Content>
            <OrderDetailSkeleton />
          </PageLayout.Content>
        </PageLayout>
      }>
        <OrderDetailPage orderId={orderId} search={search} />
      </Suspense>
    );
  },
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/orders" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title={null} />
      <PageLayout.Content>
        <OrderDetailSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});
