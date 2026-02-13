/**
 * CategoryEditor Component
 *
 * Dialog for creating and editing categories with
 * parent selection, attributes inheritance, and settings.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Folder, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      parentId: null,
      isActive: true,
      inheritAttributes: true,
      seoTitle: "",
      seoDescription: "",
    },
  });


  const handleSubmit = async (data: CategoryFormData) => {
    setIsSubmitting(true);
    try {
      await onSave(data);
      onOpenChange(false);
    } catch (error) {
      toastError(
        error instanceof Error ? error.message : "Failed to save category"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen) {
      if (category) {
        form.reset({
          name: category.name,
          description: category.description ?? "",
          parentId: category.parentId ?? null,
          isActive: category.isActive,
          inheritAttributes: true, // Default, would come from category data
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
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            {mode === "create" ? "Create Category" : "Edit Category"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new category to organize your products"
              : "Update the category details"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Electronics" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description for this category..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Parent Category */}
            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Parent Category
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex">
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Select a parent to create a subcategory
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="None (top-level category)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None (top-level category)</SelectItem>
                      {availableParents.map((parent) => (
                        <SelectItem key={parent.id} value={parent.id}>
                          <span style={{ paddingLeft: `${parent.depth * 12}px` }}>
                            {parent.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status */}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Inactive categories are hidden from product selection
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Inherit Attributes */}
            <FormField
              control={form.control}
              name="inheritAttributes"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      Inherit Parent Attributes
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex">
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          Products in this category will inherit attributes from parent categories
                        </TooltipContent>
                      </Tooltip>
                    </FormLabel>
                    <FormDescription>
                      Include parent category attributes in this category
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* SEO Fields - Collapsible */}
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-sm font-medium">SEO Settings</Label>

              <FormField
                control={form.control}
                name="seoTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SEO Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Category page title for search engines"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value?.length ?? 0}/70 characters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="seoDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SEO Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description for search engine results"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value?.length ?? 0}/160 characters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? mode === "create"
                    ? "Creating..."
                    : "Saving..."
                  : mode === "create"
                    ? "Create Category"
                    : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
