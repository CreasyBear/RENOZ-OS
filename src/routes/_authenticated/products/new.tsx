/**
 * New Product Route
 *
 * Product creation page with comprehensive form.
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
import { useCreateProduct } from "@/hooks/products";
import { getCategoryTree } from "@/server/functions/products/products";
import type { Category, CategoryWithChildren } from "@/lib/schemas/products";

export const Route = createFileRoute("/_authenticated/products/new")({
  loader: async () => {
    const categoryTree = await getCategoryTree({});
    return { categoryTree };
  },
  component: NewProductPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/products" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Create Product" />
      <PageLayout.Content>
        <FormSkeleton sections={4} />
      </PageLayout.Content>
    </PageLayout>
  ),
});

function NewProductPage() {
  const navigate = useNavigate();
  const createProduct = useCreateProduct();
  const loaderData = Route.useLoaderData() as { categoryTree: CategoryWithChildren[] };
  const { categoryTree } = loaderData;

  // Flatten category tree for select
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

  const handleSubmit = async (data: ProductFormValues) => {
    await createProduct.mutateAsync({
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
    });
    navigate({ to: "/products" });
  };

  const handleCancel = () => {
    navigate({ to: "/products" });
  };

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title={
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/products" })}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span>Create Product</span>
          </div>
        }
      />

      <PageLayout.Content>
        <div className="max-w-4xl">
          <ProductForm
            categories={flatCategories}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </div>
      </PageLayout.Content>
    </PageLayout>
  );
}
