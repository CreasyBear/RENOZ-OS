/**
 * Order Detail Page
 *
 * Extracted for code-splitting - see $orderId.tsx for route definition.
 */
import { PageLayout, DetailPageBackButton } from "@/components/layout";
import { OrderDetailContainer } from "@/components/domain/orders";

interface OrderDetailPageProps {
  orderId: string;
  search: { fromIssueId?: string; edit?: boolean; pick?: boolean; ship?: boolean };
}

export default function OrderDetailPage({ orderId, search }: OrderDetailPageProps) {
  return (
    <OrderDetailContainer orderId={orderId} fromIssueId={search.fromIssueId} edit={search.edit} pick={search.pick} ship={search.ship}>
      {({ headerActions, backLinkSearch, content }) => (
        <PageLayout variant="full-width">
          <PageLayout.Header
            title={null}
            leading={
              <DetailPageBackButton
                to="/orders"
                aria-label="Back to orders"
                search={backLinkSearch}
              />
            }
            actions={headerActions}
          />
          <PageLayout.Content>{content}</PageLayout.Content>
        </PageLayout>
      )}
    </OrderDetailContainer>
  );
}
