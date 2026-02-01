/**
 * Knowledge Base Category Form Dialog
 *
 * Dialog for creating and editing KB categories.
 *
 * @see src/hooks/use-knowledge-base.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-007b
 */

import { useEffect } from 'react';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import {
  TextField,
  TextareaField,
  NumberField,
  SelectField,
  SwitchField,
} from '@/components/shared/forms';
import type { KbCategoryResponse } from '@/lib/schemas/support/knowledge-base';

// ============================================================================
// FORM SCHEMA
// ============================================================================

const categoryFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  description: z.string().max(500).optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  sortOrder: z.coerce.number().int(),
  isActive: z.boolean(),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

interface KbCategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: KbCategoryResponse | null;
  /** From route container (useKbCategories). */
  categories?: KbCategoryResponse[];
  /** From route container (useCreateKbCategory/useUpdateKbCategory). */
  isSubmitting?: boolean;
  /** From route container (useCreateKbCategory/useUpdateKbCategory). */
  onSubmit: (values: CategoryFormValues) => Promise<void>;
}

export function KbCategoryFormDialog({
  open,
  onOpenChange,
  category,
  categories,
  isSubmitting,
  onSubmit,
}: KbCategoryFormDialogProps) {
  const isEditing = !!category;

  const form = useTanStackForm({
    schema: categoryFormSchema,
    defaultValues: {
      name: category?.name ?? '',
      slug: category?.slug ?? '',
      description: category?.description ?? '',
      parentId: category?.parentId ?? null,
      sortOrder: category?.sortOrder ?? 0,
      isActive: category?.isActive ?? true,
    },
    onSubmit: async (values) => {
      try {
        await onSubmit(values);
        onOpenChange(false);
        form.reset();
      } catch {
        // errors handled by container
      }
    },
  });

  // Reset form when category changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        name: category?.name ?? '',
        slug: category?.slug ?? '',
        description: category?.description ?? '',
        parentId: category?.parentId ?? null,
        sortOrder: category?.sortOrder ?? 0,
        isActive: category?.isActive ?? true,
      });
    }
  }, [open, category, form]);

  // Auto-generate slug from name when name changes and slug is empty
  const handleNameBlur = () => {
    const currentSlug = form.getFieldValue('slug');
    const currentName = form.getFieldValue('name');
    if (!currentSlug && currentName) {
      const generatedSlug = currentName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      form.setFieldValue('slug', generatedSlug);
    }
  };

  const isPending = isSubmitting ?? form.state.isSubmitting;

  // Filter out the current category and its children from parent options
  const availableParents = (categories ?? []).filter((c) => {
    if (!category) return true;
    // Can't be its own parent
    if (c.id === category.id) return false;
    // Can't select a child as parent (prevents circular refs)
    if (c.parentId === category.id) return false;
    return true;
  });

  const parentOptions = [
    { value: '', label: 'None (Top Level)' },
    ...availableParents.map((cat) => ({
      value: cat.id,
      label: cat.name,
    })),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Category' : 'Create Category'}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field name="name">
            {(field) => (
              <TextField
                field={field}
                label="Name"
                placeholder="Getting Started"
                required
                onBlur={handleNameBlur}
              />
            )}
          </form.Field>

          <form.Field name="slug">
            {(field) => (
              <TextField
                field={field}
                label="Slug"
                placeholder="getting-started"
                description="URL-friendly identifier (auto-generated from name)"
                required
              />
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <TextareaField
                field={field}
                label="Description"
                placeholder="Brief description of this category..."
                rows={3}
              />
            )}
          </form.Field>

          <form.Field name="parentId">
            {(field) => (
              <SelectField
                field={field}
                label="Parent Category"
                placeholder="Select parent category"
                description="Optional parent for nested categories"
                options={parentOptions}
              />
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-4">
            <form.Field name="sortOrder">
              {(field) => (
                <NumberField
                  field={field}
                  label="Sort Order"
                />
              )}
            </form.Field>

            <form.Field name="isActive">
              {(field) => (
                <SwitchField
                  field={field}
                  label="Active"
                  description="Show in knowledge base"
                />
              )}
            </form.Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
