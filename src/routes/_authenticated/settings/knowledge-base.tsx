/**
 * Knowledge Base Settings Page
 *
 * Category management for the knowledge base.
 *
 * @see src/components/domain/support/kb-category-tree.tsx
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-007b
 */

import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Plus, BookOpen, FolderTree } from 'lucide-react';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { SettingsTreeSkeleton } from '@/components/skeletons/settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { KbCategoryTree } from '@/components/domain/support/knowledge-base/kb-category-tree';
import { KbCategoryFormDialog, type CategoryFormValues } from '@/components/domain/support/knowledge-base/kb-category-form-dialog';
import {
  useKbCategories,
  useDeleteKbCategory,
  useCreateKbCategory,
  useUpdateKbCategory,
} from '@/hooks';
import { useConfirmation } from '@/hooks';
import { toast } from 'sonner';
import type { KbCategoryResponse } from '@/lib/schemas/support/knowledge-base';

export const Route = createFileRoute('/_authenticated/settings/knowledge-base')({
  component: KnowledgeBaseSettingsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/settings" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Knowledge Base Settings" description="Manage categories for your knowledge base articles" />
      <PageLayout.Content>
        <SettingsTreeSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

function KnowledgeBaseSettingsPage() {
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<KbCategoryResponse | null>(null);

  const {
    data: categories,
    isLoading,
    error,
    refetch,
  } = useKbCategories({
    includeArticleCount: true,
  });

  const confirm = useConfirmation();
  const deleteCategoryMutation = useDeleteKbCategory();
  const createCategoryMutation = useCreateKbCategory();
  const updateCategoryMutation = useUpdateKbCategory();
  const isCategorySubmitting = createCategoryMutation.isPending || updateCategoryMutation.isPending;

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: KbCategoryResponse) => {
    setEditingCategory(category);
    setCategoryDialogOpen(true);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isCategorySubmitting) return;
    setCategoryDialogOpen(nextOpen);
    if (!nextOpen) {
      setEditingCategory(null);
    }
  };

  const handleDeleteCategory = async (category: KbCategoryResponse) => {
    if (deleteCategoryMutation.isPending) return;
    const impactedCount = category.articleCount ?? 0;
    const impactMessage =
      impactedCount > 0
        ? `${impactedCount} article${impactedCount === 1 ? '' : 's'} will be moved to the parent category.`
        : 'No articles are currently assigned to this category.';

    const confirmed = await confirm.confirm({
      title: 'Delete Category',
      description: `Are you sure you want to delete this category? ${impactMessage}`,
      confirmLabel: 'Delete Category',
      variant: 'destructive',
    });

    if (confirmed.confirmed) {
      try {
        const result = await deleteCategoryMutation.mutateAsync(category.id);
        toast.success(result.message ?? 'Category deleted successfully');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete category');
      }
    }
  };

  const handleSubmitCategory = async (values: CategoryFormValues) => {
    try {
      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({
          categoryId: editingCategory.id,
          ...values,
        });
        toast.success('Category updated successfully');
      } else {
        await createCategoryMutation.mutateAsync({
          name: values.name,
          slug: values.slug,
          description: values.description,
          parentId: values.parentId,
          sortOrder: values.sortOrder,
          isActive: values.isActive,
        });
        toast.success('Category created successfully');
      }
    } catch (error) {
      toast.error(editingCategory ? 'Failed to update category' : 'Failed to create category');
      throw error;
    }
  };

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Knowledge Base Settings"
        description="Manage categories for your knowledge base articles"
      />
      <PageLayout.Content className="space-y-6">

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Root Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categories?.filter((c) => !c.parentId).length ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Active Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categories?.filter((c) => c.isActive).length ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Categories
            </CardTitle>
            <CardDescription>Organize articles into hierarchical categories</CardDescription>
          </div>
          <Button onClick={handleCreateCategory}>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState text="Loading categories..." />
          ) : error ? (
            <ErrorState
              title="Failed to load categories"
              message={error instanceof Error ? error.message : 'Unknown category loading error'}
              onRetry={() => void refetch()}
            />
          ) : categories && categories.length > 0 ? (
            <div className="rounded-lg border p-2">
              <KbCategoryTree
                categories={categories}
                onEdit={handleEditCategory}
                onDelete={handleDeleteCategory}
                showActions={true}
                showCounts={true}
              />
            </div>
          ) : (
            <EmptyState
              icon={BookOpen}
              message="No categories yet"
              primaryAction={{
                label: 'Create Category',
                onClick: handleCreateCategory,
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <KbCategoryFormDialog
        key={editingCategory?.id ?? 'new'}
        open={categoryDialogOpen}
        onOpenChange={handleDialogOpenChange}
        category={editingCategory}
        categories={categories ?? []}
        isSubmitting={isCategorySubmitting}
        onSubmit={handleSubmitCategory}
        submitError={
          editingCategory ? updateCategoryMutation.error?.message : createCategoryMutation.error?.message
        }
      />
      </PageLayout.Content>
    </PageLayout>
  );
}
