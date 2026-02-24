/**
 * Purchase Order Detail Route
 *
 * Individual purchase order view with approval workflow and goods receipt.
 * Implements Container/Presenter pattern following Orders gold standard.
 *
 * @see SUPP-PO-MANAGEMENT, SUPP-APPROVAL-WORKFLOW, SUPP-GOODS-RECEIPT stories
 * @see src/components/domain/orders/containers/order-detail-container.tsx
 */

import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useCallback } from 'react';
import { z } from 'zod';
import { RouteErrorFallback, PageLayout, DetailPageBackButton } from '@/components/layout';
import { AdminDetailSkeleton } from '@/components/skeletons/admin';
import { PODetailContainer } from '@/components/domain/purchase-orders';

const poDetailTabSchema = z.enum([
  'overview',
  'items',
  'costs',
  'receiving',
  'receipts',
  'activity',
]);

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/purchase-orders/$poId')({
  validateSearch: z.object({
    tab: poDetailTabSchema.optional().default('overview'),
    receive: z.union([z.literal('true'), z.literal('1')]).optional(),
  }),
  component: PurchaseOrderDetailPage,
  errorComponent: PurchaseOrderDetailError,
  pendingComponent: () => <AdminDetailSkeleton />,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function PurchaseOrderDetailPage() {
  const navigate = Route.useNavigate();
  const { poId } = Route.useParams();
  const search = Route.useSearch();

  // Handlers
  const handleBack = useCallback(() => {
    navigate({ to: '/purchase-orders' });
  }, [navigate]);

  const handleTabChange = useCallback(
    (tab: string) => {
      const parsed = poDetailTabSchema.safeParse(tab);
      if (!parsed.success) return;
      navigate({
        to: '/purchase-orders/$poId',
        params: { poId },
        search: (prev) => ({ ...prev, tab: parsed.data }),
        replace: true,
      });
    },
    [navigate, poId]
  );

  const handleReceiveModeClose = useCallback(() => {
    navigate({
      to: '/purchase-orders/$poId',
      params: { poId },
      search: (prev) => ({ ...prev, receive: undefined }),
      replace: true,
    });
  }, [navigate, poId]);

  return (
    <PageLayout variant="full-width">
      <PODetailContainer
        poId={poId}
        activeTab={search.tab}
        onTabChange={handleTabChange}
        onBack={handleBack}
        onEdit={() => navigate({ to: '/purchase-orders/$poId/edit', params: { poId } })}
        openReceiveOnMount={search.receive === 'true' || search.receive === '1'}
        onReceiveModeClose={handleReceiveModeClose}
      >
        {({ headerActions, content }) => (
          <>
            <PageLayout.Header
              title={null}
              leading={<DetailPageBackButton to="/purchase-orders" aria-label="Back to purchase orders" />}
              actions={headerActions}
            />
            <PageLayout.Content>{content}</PageLayout.Content>
          </>
        )}
      </PODetailContainer>
    </PageLayout>
  );
}

function PurchaseOrderDetailError({ error }: { error: Error }) {
  const router = useRouter();

  return (
    <RouteErrorFallback
      error={error}
      parentRoute="/purchase-orders"
      onRetry={() => router.invalidate()}
    />
  );
}
