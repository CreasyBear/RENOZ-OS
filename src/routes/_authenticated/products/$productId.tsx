/**
 * Product Detail Route
 *
 * Complete product management interface using Container/Presenter pattern.
 * Full-width layout with animated side panel following Orders gold standard.
 *
 * LAYOUT: full-width (data-rich detail view)
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see src/components/domain/orders/views/order-detail-view.tsx - Gold standard
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ProductDetailSkeleton } from "@/components/skeletons/products/detail-skeleton";
import { getProduct } from "@/server/functions/products/products";
import { ProductDetailContainer } from "@/components/domain/products/containers/product-detail-container";

export const Route = createFileRoute("/_authenticated/products/$productId")({
  loader: async ({ params }) => {
    const productData = await getProduct({ data: { id: params.productId } });
    return productData;
  },
  component: ProductDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/products" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Loading..." />
      <PageLayout.Content>
        <ProductDetailSkeleton tabCount={6} />
      </PageLayout.Content>
    </PageLayout>
  ),
});

function ProductDetailPage() {
  const navigate = useNavigate();
  const loaderData = Route.useLoaderData();
  const { product } = loaderData;

  return (
    <PageLayout variant="full-width">
      <ProductDetailContainer
        productId={product.id}
        loaderData={loaderData}
        onBack={() => navigate({ to: "/products" })}
        onEdit={() => navigate({ to: `/products/${product.id}/edit` as string })}
        onDuplicate={(newProductId) =>
          navigate({ to: "/products/$productId", params: { productId: newProductId } })
        }
      >
        {({ headerTitle, headerActions, content }) => (
          <>
            <PageLayout.Header
              title={
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate({ to: "/products" as string })}
                  >
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
      </ProductDetailContainer>
    </PageLayout>
  );
}
