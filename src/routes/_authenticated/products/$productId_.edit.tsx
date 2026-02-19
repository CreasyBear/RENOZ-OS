/**
 * Edit Product Route
 *
 * Product editing page with pre-populated form.
 *
 * LAYOUT: full-width
 *
 * @see UI_UX_STANDARDIZATION_PRD.md
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { FormSkeleton } from "@/components/skeletons/shared/form-skeleton";
import { ProductForm, type ProductFormValues } from "@/components/domain/products";
import { ErrorState } from "@/components/shared/error-state";
import { getProduct, updateProduct, getCategoryTree } from "@/server/functions/products/products";
import type { Category, CategoryWithChildren, GetProductEditLoaderData } from "@/lib/schemas/products";

export const Route = createFileRoute("/_authenticated/products/$productId_/edit")({
  loader: async ({ params }): Promise<GetProductEditLoaderData> => {
    const [productData, categoryTree] = await Promise.all([
      getProduct({ data: { id: params.productId } }),
      getCategoryTree({}),
    ]);
    return { ...productData, categoryTree };
  },
  component: EditProductPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/products" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Edit Product" />
      <PageLayout.Content>
        <FormSkeleton sections={4} />
      </PageLayout.Content>
    </PageLayout>
  ),
});

function EditProductPage() {
  const navigate = useNavigate();
  const loaderData = Route.useLoaderData();
  if (!loaderData?.product) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Header title="Edit Product" />
        <PageLayout.Content>
          <ErrorState
            title="Product not found"
            message="This product could not be loaded for editing."
            onRetry={() => navigate({ to: "/products" })}
            retryLabel="Back to Products"
          />
        </PageLayout.Content>
      </PageLayout>
    );
  }
  const { product, categoryTree } = loaderData;

  // Flatten category tree for select (preserve full Category shape)
  const flattenCategories = (
    categories: CategoryWithChildren[],
    prefix = ""
  ): Category[] => {
    return categories.flatMap((cat) => {
      const displayName = prefix ? `${prefix} > ${cat.name}` : cat.name;
      const children = cat.children
        ? flattenCategories(cat.children, displayName)
        : [];
      return [
        { ...cat, name: displayName },
        ...children,
      ];
    });
  };

  const flatCategories = flattenCategories(categoryTree);

  // Convert product data to form values
  const defaultValues: Partial<ProductFormValues> = {
    sku: product.sku,
    name: product.name,
    description: product.description ?? undefined,
    type: product.type as ProductFormValues["type"],
    status: product.status as ProductFormValues["status"],
    categoryId: product.categoryId,
    basePrice: product.basePrice ?? 0,
    costPrice: product.costPrice ?? null,
    trackInventory: product.trackInventory ?? true,
    isSerialized: product.isSerialized ?? false,
    isSellable: product.isSellable ?? true,
    isPurchasable: product.isPurchasable ?? true,
    weight: product.weight ?? null,
    dimensions: product.dimensions as ProductFormValues["dimensions"] ?? null,
    seoTitle: product.seoTitle ?? null,
    seoDescription: product.seoDescription ?? null,
    barcode: product.barcode ?? null,
    tags: product.tags ?? [],
    specifications: product.specifications as Record<string, unknown> ?? null,
    reorderPoint: product.reorderPoint ?? 0,
    reorderQty: product.reorderQty ?? 0,
  };

  const handleSubmit = async (data: ProductFormValues) => {
    await updateProduct({
      data: {
        id: product.id,
        ...data,
        categoryId: data.categoryId ?? undefined,
        costPrice: data.costPrice ?? undefined,
        weight: data.weight ?? undefined,
        dimensions: data.dimensions ?? undefined,
        seoTitle: data.seoTitle ?? undefined,
        seoDescription: data.seoDescription ?? undefined,
        barcode: data.barcode ?? undefined,
        warrantyPolicyId: data.warrantyPolicyId ?? undefined,
        specifications: (data.specifications ?? undefined) as Record<string, string> | undefined,
      },
    });
    navigate({ to: "/products/$productId", params: { productId: product.id } });
  };

  const handleCancel = () => {
    navigate({ to: "/products/$productId", params: { productId: product.id } });
  };

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title={
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/products/$productId", params: { productId: product.id } })}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <span>Edit Product</span>
              <p className="text-sm text-muted-foreground font-normal">
                {product.name} ({product.sku})
              </p>
            </div>
          </div>
        }
      />

      <PageLayout.Content>
        <div className="max-w-4xl">
          <ProductForm
            defaultValues={defaultValues}
            categories={flatCategories}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isEdit
          />
        </div>
      </PageLayout.Content>
    </PageLayout>
  );
}
