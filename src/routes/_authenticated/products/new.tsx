/**
 * New Product Route
 *
 * Product creation page with comprehensive form.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { PageLayout, RouteErrorFallback } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { FormSkeleton } from "@/components/skeletons/shared/form-skeleton";
import { ProductForm, type ProductFormValues } from "@/components/domain/products/product-form";
import { createProduct, getCategoryTree, type CategoryWithChildren } from "@/server/functions/products/products";

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
    <PageLayout variant="container">
      <FormSkeleton sections={4} />
    </PageLayout>
  ),
});

function NewProductPage() {
  const navigate = useNavigate();
  const loaderData = Route.useLoaderData() as { categoryTree: CategoryWithChildren[] };
  const { categoryTree } = loaderData;

  // Flatten category tree for select
  const flattenCategories = (
    categories: CategoryWithChildren[],
    prefix = ""
  ): Array<{ id: string; name: string; parentId: string | null }> => {
    return categories.flatMap((cat: CategoryWithChildren) => {
      const name = prefix ? `${prefix} > ${cat.name}` : cat.name;
      const children = cat.children
        ? flattenCategories(cat.children, name)
        : [];
      return [
        { id: cat.id, name, parentId: cat.parentId },
        ...children,
      ];
    });
  };

  const flatCategories = flattenCategories(categoryTree);

  const handleSubmit = async (data: ProductFormValues) => {
    await createProduct({
      data: {
        ...data,
        categoryId: data.categoryId ?? undefined,
        costPrice: data.costPrice ?? undefined,
        weight: data.weight ?? undefined,
        dimensions: data.dimensions ?? undefined,
        seoTitle: data.seoTitle ?? undefined,
        seoDescription: data.seoDescription ?? undefined,
        barcode: data.barcode ?? undefined,
        specifications: (data.specifications ?? undefined) as Record<string, string> | undefined,
      },
    });
    navigate({ to: "/products" as string });
  };

  const handleCancel = () => {
    navigate({ to: "/products" as string });
  };

  return (
    <PageLayout variant="container">
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
