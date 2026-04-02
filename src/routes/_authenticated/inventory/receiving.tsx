/**
 * Receiving Route
 *
 * Route definition for manual non-PO inventory receiving with lazy-loaded component.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/inventory/receiving-page.tsx - Page component
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { z } from "zod";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { FormSkeleton } from "@/components/skeletons/shared/form-skeleton";

// ============================================================================
// LAZY LOADED PAGE COMPONENT
// ============================================================================

const ReceivingPage = lazy(() => import("./receiving-page"));

const inventoryReceivingSearchSchema = z.object({
  productId: z.string().uuid().optional(),
  source: z.enum(["product_detail", "inventory", "mobile"]).optional(),
  returnToProductId: z.string().uuid().optional(),
});

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/inventory/receiving")({
  validateSearch: inventoryReceivingSearchSchema,
  component: () => (
    <Suspense fallback={
      <PageLayout variant="full-width">
        <PageLayout.Header title="Receive Inventory" description="Record non-PO inbound stock and update inventory levels" />
        <PageLayout.Content>
          <FormSkeleton sections={2} />
        </PageLayout.Content>
      </PageLayout>
    }>
      <ReceivingPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/inventory" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Receive Inventory" description="Record non-PO inbound stock and update inventory levels" />
      <PageLayout.Content>
        <FormSkeleton sections={2} />
      </PageLayout.Content>
    </PageLayout>
  ),
});
