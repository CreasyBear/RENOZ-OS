/**
 * Order Creation Route
 *
 * Multi-step wizard for creating new orders.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-CREATION-UI)
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { FormSkeleton } from "@/components/skeletons/shared";

const OrderCreatePage = lazy(() => import("./-create-page"));

export const Route = createFileRoute("/_authenticated/orders/create")({
  component: () => (
    <Suspense fallback={
      <PageLayout variant="full-width">
        <PageLayout.Header
          title="Create Order"
          description="Create a new customer order"
        />
        <PageLayout.Content>
          <FormSkeleton sections={3} />
        </PageLayout.Content>
      </PageLayout>
    }>
      <OrderCreatePage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/orders" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Create Order"
        description="Create a new customer order"
      />
      <PageLayout.Content>
        <FormSkeleton sections={3} />
      </PageLayout.Content>
    </PageLayout>
  ),
});
