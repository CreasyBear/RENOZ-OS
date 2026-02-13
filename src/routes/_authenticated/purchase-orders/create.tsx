/**
 * Purchase Order Creation Route
 *
 * 3-step wizard for creating purchase orders:
 * 1. Select Supplier
 * 2. Add Line Items
 * 3. Review & Submit
 *
 * @see _Initiation/_prd/sprints/sprint-01-route-cleanup.prd.json (SPRINT-01-005)
 */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { Button } from "@/components/ui/button";

const PurchaseOrderCreatePage = lazy(() => import("./-create-page"));

function PurchaseOrderCreateError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <RouteErrorFallback
      error={error}
      parentRoute="/purchase-orders"
      onRetry={() => router.invalidate()}
    />
  );
}

export const Route = createFileRoute("/_authenticated/purchase-orders/create")({
  component: () => (
    <Suspense fallback={
      <PageLayout variant="full-width">
        <PageLayout.Header
          title="Create Purchase Order"
          description="Create a new purchase order for a supplier"
          actions={
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          }
        />
        <PageLayout.Content>
          <div className="space-y-4">
            <div className="h-24 bg-muted rounded animate-pulse" />
            <div className="h-96 bg-muted rounded animate-pulse" />
          </div>
        </PageLayout.Content>
      </PageLayout>
    }>
      <PurchaseOrderCreatePage />
    </Suspense>
  ),
  errorComponent: PurchaseOrderCreateError,
});
