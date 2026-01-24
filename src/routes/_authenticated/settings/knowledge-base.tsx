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
import { RouteErrorFallback } from '@/components/layout';
import { SettingsTreeSkeleton } from '@/components/skeletons/settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';
import { KbCategoryTree } from '@/components/domain/support/kb-category-tree';
import {
  KbCategoryFormDialog,
  type CategoryFormValues,
} from '@/components/domain/support/kb-category-form-dialog';
import {
  useKbCategories,
  useDeleteKbCategory,
  useCreateKbCategory,
  useUpdateKbCategory,
} from '@/hooks';
import { useConfirmation } from '@/hooks/use-confirmation';
import { toast } from 'sonner';
import type { KbCategoryResponse } from '@/lib/schemas/support/knowledge-base';

export const Route = createFileRoute('/_authenticated/settings/knowledge-base')({
  component: KnowledgeBaseSettingsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/settings" />
  ),
  pendingComponent: () => <SettingsTreeSkeleton />,
});

function KnowledgeBaseSettingsPage() {
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<KbCategoryResponse | null>(null);

  const {
    data: categories,
    isLoading,
    error,
  } = useKbCategories({
    includeArticleCount: true,
  });

  const confirm = useConfirmation();
  const deleteCategoryMutation = useDeleteKbCategory();
  const createCategoryMutation = useCreateKbCategory();
  const updateCategoryMutation = useUpdateKbCategory();

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: KbCategoryResponse) => {
    setEditingCategory(category);
    setCategoryDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setCategoryDialogOpen(false);
    setEditingCategory(null);
  };

  const handleDeleteCategory = async (category: KbCategoryResponse) => {
    const confirmed = await confirm.confirm({
      title: 'Delete Category',
      description:
        'Are you sure you want to delete this category? All articles in this category will be moved to the parent category.',
      confirmLabel: 'Delete Category',
      variant: 'destructive',
    });

    if (confirmed.confirmed) {
      try {
        await deleteCategoryMutation.mutateAsync(category.id);
        toast.success('Category deleted successfully');
      } catch {
        toast.error('Failed to delete category');
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
    <div className="container max-w-4xl space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Knowledge Base Settings</h1>
        <p className="text-muted-foreground">Manage categories for your knowledge base articles</p>
      </div>

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
            <div className="text-destructive py-8 text-center">Failed to load categories</div>
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
        onOpenChange={handleCloseDialog}
        category={editingCategory}
        categories={categories ?? []}
        isSubmitting={createCategoryMutation.isPending || updateCategoryMutation.isPending}
        onSubmit={handleSubmitCategory}
      />
    </div>
  );
}
