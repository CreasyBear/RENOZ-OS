/**
 * Inventory Item Detail Page
 *
 * Extracted for code-splitting - see $itemId.tsx for route definition.
 */
import { useNavigate, useParams } from "@tanstack/react-router";
import { PageLayout, DetailPageBackButton } from "@/components/layout";
import { InventoryDetailContainer } from "@/components/domain/inventory/containers/inventory-detail-container";

export default function InventoryItemPage() {
  const navigate = useNavigate();
  const { itemId } = useParams({ strict: false });

  return (
    <InventoryDetailContainer
      itemId={itemId!}
      onBack={() => navigate({ to: "/inventory" })}
    >
      {({ headerActions, content }) => (
        <PageLayout variant="full-width">
          <PageLayout.Header
            title={null}
            leading={<DetailPageBackButton to="/inventory" aria-label="Back to inventory" />}
            actions={headerActions}
          />
          <PageLayout.Content>{content}</PageLayout.Content>
        </PageLayout>
      )}
    </InventoryDetailContainer>
  );
}
