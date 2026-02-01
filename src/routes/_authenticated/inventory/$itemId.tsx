/**
 * Inventory Item Detail Route
 *
 * Uses Container/Presenter pattern with InventoryDetailContainer.
 * Full-width layout following Order Detail gold standard.
 *
 * LAYOUT: full-width (data-rich detail view)
 *
 * @see UI_UX_STANDARDIZATION_PRD.md
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see src/components/domain/orders/containers/order-detail-container.tsx
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { InventoryDetailSkeleton } from "@/components/skeletons/inventory";
import { Button } from "@/components/ui/button";
import { InventoryDetailContainer } from "@/components/domain/inventory";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/inventory/$itemId" as any)({
  component: InventoryItemPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/inventory" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Loading..." />
      <PageLayout.Content>
        <InventoryDetailSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function InventoryItemPage() {
  const navigate = useNavigate();
  const { itemId } = Route.useParams() as { itemId: string };

  const handleBack = useCallback(() => {
    navigate({ to: "/inventory" });
  }, [navigate]);

  return (
    <PageLayout variant="full-width">
      <InventoryDetailContainer
        itemId={itemId}
        onBack={handleBack}
      >
        {({ headerTitle, headerActions, content }) => (
          <>
            <PageLayout.Header
              title={
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  {headerTitle}
                </div>
              }
              actions={headerActions}
            />
            <PageLayout.Content className="p-0">
              {content}
            </PageLayout.Content>
          </>
        )}
      </InventoryDetailContainer>
    </PageLayout>
  );
}

export default InventoryItemPage;
