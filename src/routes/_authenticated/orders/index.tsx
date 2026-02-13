/* eslint-disable react-refresh/only-export-components -- Route file exports route config + component */
/**
 * Orders Index Route
 *
 * Route definition for order list page with lazy-loaded component.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/orders/orders-page.tsx - Page component
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { z } from "zod";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { OrdersTableSkeleton } from "@/components/skeletons/orders";

export const orderSearchSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  search: z.string().optional().default(""),
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  minTotal: z.coerce.number().optional(),
  maxTotal: z.coerce.number().optional(),
  customerId: z.string().uuid().optional(),
  fromIssueId: z.string().uuid().optional(),
});

// Lazy load the heavy orders page component
const OrdersPage = lazy(() => import("./orders-page"));

export const Route = createFileRoute("/_authenticated/orders/")({
  validateSearch: orderSearchSchema,
  component: function OrdersRouteComponent() {
    const search = Route.useSearch();
    return (
      <Suspense fallback={
        <PageLayout variant="full-width">
          <PageLayout.Header
            title="Orders"
            description="Manage customer orders and fulfillment"
          />
          <PageLayout.Content>
            <OrdersTableSkeleton />
          </PageLayout.Content>
        </PageLayout>
      }>
        <OrdersPage search={search} />
      </Suspense>
    );
  },
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Orders"
        description="Manage customer orders and fulfillment"
      />
      <PageLayout.Content>
        <OrdersTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});
