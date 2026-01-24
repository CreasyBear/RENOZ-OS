/**
 * Category Management Settings Route
 *
 * Provides a complete interface for managing product categories
 * with tree visualization, creation, editing, and reordering.
 */
import { useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, FolderTree, RefreshCw } from "lucide-react";
import { RouteErrorFallback } from '@/components/layout';
import { SettingsTreeSkeleton } from '@/components/skeletons/settings';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLayout } from "@/components/layout/page-layout";
import { CategoryTree } from "@/components/domain/products/category-tree";
import type { CategoryNode } from "@/components/domain/products/category-tree";
import { CategoryEditor } from "@/components/domain/products/category-editor";
import {
  getCategoryTree,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/server/functions/products";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings/categories")({
  component: CategoriesSettingsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/settings" />
  ),
  pendingComponent: () => <SettingsTreeSkeleton />,
  loader: async () => {
    const result = await getCategoryTree();
    return { categories: result as CategoryNode[] };
  },
});

function CategoriesSettingsPage() {
  const { categories: initialCategories } = Route.useLoaderData();

  const [categories, setCategories] = useState<CategoryNode[]>(initialCategories);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryNode | null>(null);

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editingCategory, setEditingCategory] = useState<CategoryNode | null>(null);
  const [parentForNew, setParentForNew] = useState<CategoryNode | null>(null);

  // Refresh categories from server
  const refreshCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getCategoryTree();
      setCategories(result as CategoryNode[]);
    } catch (error) {
      console.error("Failed to refresh categories:", error);
      toast.error("Failed to refresh categories");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle create new category
  const handleCreateCategory = () => {
    setEditingCategory(null);
    setParentForNew(null);
    setEditorMode("create");
    setEditorOpen(true);
  };

  // Handle add subcategory
  const handleAddSubcategory = (parent: CategoryNode) => {
    setEditingCategory(null);
    setParentForNew(parent);
    setEditorMode("create");
    setEditorOpen(true);
  };

  // Handle edit category
  const handleEditCategory = (category: CategoryNode) => {
    setEditingCategory(category);
    setParentForNew(null);
    setEditorMode("edit");
    setEditorOpen(true);
  };

  // Handle delete category
  const handleDeleteCategory = async (category: CategoryNode) => {
    try {
      await deleteCategory({ data: { id: category.id } });
      toast.success(`"${category.name}" has been deleted`);
      await refreshCategories();
      if (selectedCategory?.id === category.id) {
        setSelectedCategory(null);
      }
    } catch (error) {
      console.error("Failed to delete category:", error);
      toast.error("Failed to delete category");
    }
  };

  // Handle save from editor
  const handleSaveCategory = async (data: {
    name: string;
    description?: string;
    parentId?: string | null;
    isActive: boolean;
  }) => {
    try {
      if (editorMode === "create") {
        await createCategory({
          data: {
            name: data.name,
            description: data.description,
            parentId: data.parentId ?? undefined,
          },
        });
        toast.success(`"${data.name}" has been created`);
      } else if (editingCategory) {
        await updateCategory({
          data: {
            id: editingCategory.id,
            name: data.name,
            description: data.description,
            parentId: data.parentId ?? undefined,
          },
        });
        toast.success(`"${data.name}" has been updated`);
      }
      await refreshCategories();
    } catch (error) {
      console.error("Failed to save category:", error);
      throw error;
    }
  };

  // Handle move category
  const handleMoveCategory = async (
    categoryId: string,
    newParentId: string | null,
    newSortOrder: number
  ) => {
    try {
      await updateCategory({
        data: {
          id: categoryId,
          parentId: newParentId ?? undefined,
          sortOrder: newSortOrder,
        },
      });
      await refreshCategories();
    } catch (error) {
      console.error("Failed to move category:", error);
      toast.error("Failed to reorder category");
    }
  };

  // Handle duplicate category
  const handleDuplicateCategory = async (category: CategoryNode) => {
    try {
      await createCategory({
        data: {
          name: `${category.name} (Copy)`,
          description: category.description ?? undefined,
          parentId: category.parentId ?? undefined,
        },
      });
      toast.success(`Copy of "${category.name}" created`);
      await refreshCategories();
    } catch (error) {
      console.error("Failed to duplicate category:", error);
      toast.error("Failed to duplicate category");
    }
  };

  // Count total categories
  const countCategories = (nodes: CategoryNode[]): number => {
    return nodes.reduce((sum, node) => sum + 1 + countCategories(node.children), 0);
  };

  const totalCategories = countCategories(categories);

  return (
    <PageLayout>
      <PageLayout.Header
        title="Product Categories"
        description="Organize your products into a hierarchical category structure"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={refreshCategories} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={handleCreateCategory}>
              <Plus className="h-4 w-4 mr-2" />
              New Category
            </Button>
          </div>
        }
      />

      <PageLayout.Content>
        <div className="grid gap-6 md:grid-cols-[1fr,300px]">
          {/* Category tree */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FolderTree className="h-5 w-5" />
                  Category Tree
                </CardTitle>
                <CardDescription>
                  {totalCategories} categor{totalCategories === 1 ? "y" : "ies"}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <CategoryTree
                categories={categories}
                selectedId={selectedCategory?.id}
                onSelect={setSelectedCategory}
                onEdit={handleEditCategory}
                onDelete={handleDeleteCategory}
                onAddChild={handleAddSubcategory}
                onMove={handleMoveCategory}
                onDuplicate={handleDuplicateCategory}
                isLoading={isLoading}
                showProductCounts
                allowDragDrop={false}
              />
            </CardContent>
          </Card>

          {/* Selected category details */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Category Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedCategory ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Name</p>
                      <p className="font-medium">{selectedCategory.name}</p>
                    </div>

                    {selectedCategory.description && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Description</p>
                        <p className="text-sm">{selectedCategory.description}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <p className="text-sm">
                        {selectedCategory.isActive ? "Active" : "Inactive"}
                      </p>
                    </div>

                    {selectedCategory.productCount !== undefined && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Products</p>
                        <p className="text-sm">{selectedCategory.productCount} products</p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Subcategories</p>
                      <p className="text-sm">{selectedCategory.children.length} direct children</p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditCategory(selectedCategory)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddSubcategory(selectedCategory)}
                      >
                        Add Subcategory
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a category to view details
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tips</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>• Click the arrow to expand/collapse categories</p>
                <p>• Use the ⋮ menu for actions on each category</p>
                <p>• Subcategories inherit attributes from parents</p>
                <p>• Inactive categories are hidden from product forms</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageLayout.Content>

      {/* Category editor dialog */}
      <CategoryEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        category={editingCategory}
        parentCategory={parentForNew}
        allCategories={categories}
        onSave={handleSaveCategory}
        mode={editorMode}
      />
    </PageLayout>
  );
}
