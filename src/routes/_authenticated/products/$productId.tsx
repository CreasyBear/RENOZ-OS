/**
 * Product Detail Route
 *
 * Complete product management interface using Container/Presenter pattern.
 * Full-width layout with animated side panel following Customer detail standard.
 *
 * LAYOUT: full-width (data-rich detail view)
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see src/components/domain/customers/views/customer-detail-view.tsx - Gold standard
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { PageLayout, RouteErrorFallback, DetailPageBackButton } from "@/components/layout";
import { ProductDetailSkeleton } from "@/components/skeletons/products/detail-skeleton";
import { getProduct } from "@/server/functions/products/products";
import { ProductDetailContainer } from "@/components/domain/products/containers/product-detail-container";
import type { GetProductResponse } from "@/lib/schemas/products";

export const Route = createFileRoute("/_authenticated/products/$productId")({
  loader: async ({ params }): Promise<GetProductResponse> => {
    const productData = await getProduct({ data: { id: params.productId } });
    return productData;
  },
  component: ProductDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/products" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title={null} />
      <PageLayout.Content>
        <ProductDetailSkeleton tabCount={6} />
      </PageLayout.Content>
    </PageLayout>
  ),
});

function ProductDetailPage() {
  const navigate = useNavigate();
  const loaderData = Route.useLoaderData();
  if (!loaderData?.product) {
    return null; // Route guarantees loader runs; edge case for direct nav
  }
  const { product } = loaderData;

  return (
    <ProductDetailContainer
      productId={product.id}
      loaderData={loaderData}
      onBack={() => navigate({ to: "/products" })}
      onEdit={(editProductId) =>
        navigate({ to: "/products/$productId/edit", params: { productId: editProductId } })
      }
      onDuplicate={(newProductId) =>
        navigate({ to: "/products/$productId", params: { productId: newProductId } })
      }
    >
      {({ headerActions, content }) => (
        <PageLayout variant="full-width">
          <PageLayout.Header
            title={null}
            leading={<DetailPageBackButton to="/products" aria-label="Back to products" />}
            actions={headerActions}
          />
          <PageLayout.Content>{content}</PageLayout.Content>
        </PageLayout>
      )}
    </ProductDetailContainer>
  );
}
