/**
 * CategoryEditor Component
 *
 * Dialog for creating and editing categories with
 * parent selection, attributes inheritance, and settings.
 */
import { useState, useEffect } from "react";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import { z } from "zod";
import { Folder } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  FormDialog,
  TextField,
  TextareaField,
  SelectField,
  SwitchField,
} from "@/components/shared/forms";
import { toastError } from "@/hooks";
import type { CategoryNode } from "@/lib/schemas/products";

// Validation schema
const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  parentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean(),
  inheritAttributes: z.boolean(),
  seoTitle: z.string().max(70, "SEO title should be under 70 characters").optional(),
  seoDescription: z.string().max(160, "SEO description should be under 160 characters").optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CategoryNode | null;
  parentCategory?: CategoryNode | null;
  allCategories: CategoryNode[];
  onSave: (data: CategoryFormData) => Promise<void>;
  mode: "create" | "edit";
}

// Flatten category tree for parent selection
function flattenCategories(
  categories: CategoryNode[],
  excludeId?: string,
  prefix = ""
): Array<{ id: string; name: string; depth: number }> {
  const result: Array<{ id: string; name: string; depth: number }> = [];

  const flatten = (nodes: CategoryNode[], depth: number, parentPath: string) => {
    nodes.forEach((node) => {
      if (node.id === excludeId) return; // Exclude self when editing

      const displayName = parentPath ? `${parentPath} / ${node.name}` : node.name;
      result.push({ id: node.id, name: displayName, depth });

      if (node.children.length > 0) {
        flatten(node.children, depth + 1, displayName);
      }
    });
  };

  flatten(categories, 0, prefix);
  return result;
}

const defaultFormValues: CategoryFormData = {
  name: "",
  description: "",
  parentId: null,
  isActive: true,
  inheritAttributes: true,
  seoTitle: "",
  seoDescription: "",
};

export function CategoryEditor({
  open,
  onOpenChange,
  category,
  parentCategory,
  allCategories,
  onSave,
  mode,
}: CategoryEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useTanStackForm<CategoryFormData>({
    schema: categorySchema,
    defaultValues: defaultFormValues,
    onSubmit: async (data) => {
      setSubmitError(null);
      setIsSubmitting(true);
      try {
        await onSave(data);
        onOpenChange(false);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Failed to save category";
        setSubmitError(msg);
        toastError(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  // Get available parent categories (excluding self and descendants)
  const getAvailableParents = () => {
    if (mode === "create") {
      return flattenCategories(allCategories);
    }

    // When editing, exclude self and all descendants
    const excludeIds = new Set<string>();
    const collectDescendants = (node: CategoryNode) => {
      excludeIds.add(node.id);
      node.children.forEach(collectDescendants);
    };

    if (category) {
      collectDescendants(category);
    }

    return flattenCategories(allCategories).filter((c) => !excludeIds.has(c.id));
  };

  const availableParents = getAvailableParents();

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      if (isSubmitting) return;
      setSubmitError(null);
      onOpenChange(false);
    } else {
      onOpenChange(newOpen);
    }
  };

  useEffect(() => {
    if (open) {
      setSubmitError(null);
      if (category) {
        form.reset({
          name: category.name,
          description: category.description ?? "",
          parentId: category.parentId ?? null,
          isActive: category.isActive,
          inheritAttributes: true,
          seoTitle: "",
          seoDescription: "",
        });
      } else {
        form.reset({
          name: "",
          description: "",
          parentId: parentCategory?.id ?? null,
          isActive: true,
          inheritAttributes: true,
          seoTitle: "",
          seoDescription: "",
        });
      }
    }
  }, [open, category, parentCategory, form]);

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={
        <span className="flex items-center gap-2">
          <Folder className="h-5 w-5" />
          {mode === "create" ? "Create Category" : "Edit Category"}
        </span>
      }
      description={
        mode === "create"
          ? "Create a new category to organize your products"
          : "Update the category details"
      }
      form={form}
      submitLabel={mode === "create" ? "Create Category" : "Save Changes"}
      submitError={submitError}
      submitDisabled={isSubmitting}
      size="lg"
      className="max-w-lg"
      resetOnClose={false}
    >
            {/* Name */}
            <form.Field name="name">
              {(field) => (
                <TextField
                  field={field}
                  label="Name"
                  placeholder="e.g., Electronics"
                  required
                />
              )}
            </form.Field>

            {/* Description */}
            <form.Field name="description">
              {(field) => (
                <TextareaField
                  field={field}
                  label="Description"
                  placeholder="Optional description for this category..."
                  rows={3}
                />
              )}
            </form.Field>

            {/* Parent Category */}
            <form.Field name="parentId">
              {(field) => (
                <SelectField
                  field={field}
                  label="Parent Category"
                  options={availableParents.map((p) => ({ value: p.id, label: p.name }))}
                  nullOption={{ value: "none", label: "None (top-level category)" }}
                  placeholder="None (top-level category)"
                  description="Select a parent to create a subcategory"
                />
              )}
            </form.Field>

            {/* Status */}
            <form.Field name="isActive">
              {(field) => (
                <SwitchField
                  field={field}
                  label="Active"
                  description="Inactive categories are hidden from product selection"
                  className="rounded-lg border p-3"
                />
              )}
            </form.Field>

            {/* Inherit Attributes */}
            <form.Field name="inheritAttributes">
              {(field) => (
                <SwitchField
                  field={field}
                  label="Inherit Parent Attributes"
                  description="Include parent category attributes in this category"
                  className="rounded-lg border p-3"
                />
              )}
            </form.Field>

            {/* SEO Fields - Collapsible */}
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-sm font-medium">SEO Settings</Label>

              <form.Field name="seoTitle">
                {(field) => (
                  <TextField
                    field={field}
                    label="SEO Title"
                    placeholder="Category page title for search engines"
                    description={`${field.state.value?.length ?? 0}/70 characters`}
                  />
                )}
              </form.Field>

              <form.Field name="seoDescription">
                {(field) => (
                  <TextareaField
                    field={field}
                    label="SEO Description"
                    placeholder="Brief description for search engine results"
                    rows={2}
                    description={`${field.state.value?.length ?? 0}/160 characters`}
                  />
                )}
              </form.Field>
            </div>
    </FormDialog>
  );
}
