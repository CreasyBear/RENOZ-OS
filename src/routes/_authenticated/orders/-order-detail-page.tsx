/**
 * Order Detail Page
 *
 * Extracted for code-splitting - see $orderId.tsx for route definition.
 */
import { PageLayout, DetailPageBackButton } from "@/components/layout";
import { OrderDetailContainer } from "@/components/domain/orders/containers/order-detail-container";

interface OrderDetailPageProps {
  orderId: string;
  search: {
    fromIssueId?: string;
    action?: string;
    edit?: boolean;
    pick?: boolean;
    ship?: boolean;
    payment?: boolean;
  };
}

export default function OrderDetailPage({ orderId, search }: OrderDetailPageProps) {
  const paymentIntent = search.payment || search.action === 'payment';
  return (
    <OrderDetailContainer
      orderId={orderId}
      fromIssueId={search.fromIssueId}
      edit={search.edit}
      pick={search.pick}
      ship={search.ship}
      payment={paymentIntent}
    >
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
